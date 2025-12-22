import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingByRoomId, addParticipant } from '@/lib/services/meeting.service';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a JWT token for Jitsi Self-Hosted
 * POST /api/jitsi/token
 *
 * For authenticated users: Checks meeting access and determines moderator status
 * For guests: Only allows access to public meetings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { roomName, userName, email, avatar, password: providedPassword } = body;

    if (!roomName || !userName) {
      return NextResponse.json(
        { success: false, error: 'roomName and userName are required' },
        { status: 400 }
      );
    }

    // Check if this is an existing meeting in the database
    const meeting = await getMeetingByRoomId(roomName);

    // Determine if user should be moderator and if access is allowed
    let isModerator = false;

    if (meeting) {
      // Check if user is the host (full moderator privileges)
      if (session?.user?.id === meeting.hostId) {
        isModerator = true;
      }

      // For private meetings, verify access
      if (!meeting.isPublic) {
        if (!session?.user) {
          return NextResponse.json(
            { success: false, error: 'Esta es una reunión privada. Debes iniciar sesión para unirte.' },
            { status: 403 }
          );
        }
      }

      // Check password requirements
      // Dual password system: hostPassword for hosts/moderators, participantPassword for participants
      const hasHostPassword = !!meeting.hostPassword;
      const hasParticipantPassword = !!meeting.participantPassword;
      const hasLegacyPassword = !!meeting.password;

      if (hasHostPassword || hasParticipantPassword || hasLegacyPassword) {
        if (!providedPassword) {
          return NextResponse.json(
            {
              success: false,
              error: 'Esta reunión requiere contraseña',
              requiresPassword: true,
              passwordType: hasHostPassword || hasParticipantPassword ? 'dual' : 'single',
            },
            { status: 401 }
          );
        }

        // Check if provided password matches host password (grants moderator)
        if (hasHostPassword && providedPassword === meeting.hostPassword) {
          isModerator = true;
          console.log('[Jitsi Token] Host password matched - granting moderator');
        }
        // Check if provided password matches participant password
        else if (hasParticipantPassword && providedPassword === meeting.participantPassword) {
          // Valid participant password, not moderator
          console.log('[Jitsi Token] Participant password matched');
        }
        // Check legacy single password (backwards compatibility)
        else if (hasLegacyPassword && providedPassword === meeting.password) {
          console.log('[Jitsi Token] Legacy password matched');
        }
        // No password matched
        else {
          return NextResponse.json(
            {
              success: false,
              error: 'Contraseña incorrecta',
              requiresPassword: true,
            },
            { status: 401 }
          );
        }
      }

      // Check meeting status
      if (meeting.status === 'ENDED') {
        return NextResponse.json(
          { success: false, error: 'Esta reunión ha finalizado.' },
          { status: 403 }
        );
      }

      if (meeting.status === 'CANCELLED') {
        return NextResponse.json(
          { success: false, error: 'Esta reunión ha sido cancelada.' },
          { status: 403 }
        );
      }

      // Check max participants
      if (meeting._count && meeting._count.participants >= meeting.maxParticipants) {
        return NextResponse.json(
          { success: false, error: 'Esta reunión ha alcanzado el número máximo de participantes.' },
          { status: 403 }
        );
      }

      // Register participant
      try {
        if (session?.user?.id) {
          await addParticipant(meeting.id, {
            userId: session.user.id,
            role: 'PARTICIPANT',
          });
        } else {
          // Guest participant
          await addParticipant(meeting.id, {
            guestName: userName,
            guestEmail: email,
            role: 'PARTICIPANT',
          });
        }
      } catch {
        // Participant might already be registered, continue
      }
    } else {
      // No meeting in database - this is an ad-hoc room
      // Only allow authenticated users to create ad-hoc rooms
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: 'Esta sala no existe. Solo usuarios autenticados pueden crear nuevas salas.' },
          { status: 404 }
        );
      }
      // Authenticated user creating ad-hoc room gets moderator
      isModerator = true;
    }

    // Jitsi Self-Hosted configuration
    const jitsiDomain = process.env.JITSI_DOMAIN;
    const appId = process.env.JITSI_JWT_APP_ID;
    const secret = process.env.JITSI_JWT_SECRET;

    if (!jitsiDomain || !appId || !secret) {
      console.error('[Jitsi Token] Missing environment variables:', {
        hasJitsiDomain: !!jitsiDomain,
        hasAppId: !!appId,
        hasSecret: !!secret,
      });
      return NextResponse.json(
        { success: false, error: 'Jitsi configuration missing' },
        { status: 500 }
      );
    }

    // Generate unique user ID
    const odId = session?.user?.id || uuidv4();

    // Token expiration - 2 hours from now
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (2 * 60 * 60);

    // Determine user details
    const finalUserName = session?.user?.name || userName;
    const finalEmail = session?.user?.email || email || `${userName.toLowerCase().replace(/\s+/g, '.')}@unity.meet`;
    const finalAvatar = session?.user?.avatar || avatar || '';

    // JWT payload for Jitsi Self-Hosted
    const payload = {
      aud: appId,
      iss: appId,
      sub: jitsiDomain,
      room: roomName,
      exp,
      nbf: now,
      iat: now,
      context: {
        user: {
          id: odId,
          name: finalUserName,
          email: finalEmail,
          avatar: finalAvatar,
          affiliation: isModerator ? 'owner' : 'member',
        },
        features: {
          livestreaming: 'false',
          recording: isModerator ? 'true' : 'false',
          transcription: 'false',
        },
      },
      moderator: isModerator,
    };

    // Sign the token with HS256 (symmetric key for self-hosted)
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT',
      },
    });

    return NextResponse.json({
      success: true,
      token,
      roomName,
      jitsiDomain,
      meeting: meeting ? {
        id: meeting.id,
        title: meeting.title,
        type: meeting.type,
        isHost: session?.user?.id === meeting.hostId,
      } : null,
    });
  } catch (error) {
    console.error('[Jitsi Token] Error generating token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
