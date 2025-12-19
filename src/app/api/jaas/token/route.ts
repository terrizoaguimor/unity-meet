import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingByRoomId, addParticipant } from '@/lib/services/meeting.service';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a JaaS JWT token for a participant
 * POST /api/jaas/token
 *
 * For authenticated users: Checks meeting access and determines moderator status
 * For guests: Only allows access to public meetings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { roomName, userName, email, avatar } = body;

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
    let allowAccess = true;

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

        // Check if user is host or has been invited
        // For now, allow authenticated users to join private meetings
        // In the future, we can add invitation verification here
        if (session.user.id !== meeting.hostId) {
          // TODO: Check if user is in participants list or has invitation
          // For now, we allow authenticated users to join
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
            role: isModerator ? 'PARTICIPANT' : 'PARTICIPANT', // Role is based on meeting role, not JaaS
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
        // For guests trying to join a non-existent room
        return NextResponse.json(
          { success: false, error: 'Esta sala no existe. Solo usuarios autenticados pueden crear nuevas salas.' },
          { status: 404 }
        );
      }
      // Authenticated user creating ad-hoc room gets moderator
      isModerator = true;
    }

    if (!allowAccess) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para unirte a esta reunión.' },
        { status: 403 }
      );
    }

    // JaaS configuration
    const appId = process.env.JAAS_APP_ID;
    const apiKeyId = process.env.JAAS_API_KEY_ID;
    const privateKeyBase64 = process.env.JAAS_PRIVATE_KEY;

    if (!appId || !apiKeyId || !privateKeyBase64) {
      console.error('[JaaS Token] Missing environment variables:', {
        hasAppId: !!appId,
        hasApiKeyId: !!apiKeyId,
        hasPrivateKey: !!privateKeyBase64,
      });
      return NextResponse.json(
        { success: false, error: 'JaaS configuration missing' },
        { status: 500 }
      );
    }

    // Decode base64 private key
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');

    // Generate unique user ID
    const odId = session?.user?.id || uuidv4();

    // Token expiration - 2 hours from now
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (2 * 60 * 60);

    // Determine user details
    const finalUserName = session?.user?.name || userName;
    const finalEmail = session?.user?.email || email || `${userName.toLowerCase().replace(/\s+/g, '.')}@unity.meet`;
    const finalAvatar = session?.user?.avatar || avatar || '';

    // JWT payload according to JaaS specification
    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      sub: appId,
      room: roomName,
      exp,
      nbf: now,
      context: {
        user: {
          id: odId,
          name: finalUserName,
          email: finalEmail,
          avatar: finalAvatar,
          moderator: isModerator ? 'true' : 'false',
        },
        features: {
          livestreaming: 'false',
          recording: isModerator ? 'true' : 'false',
          transcription: 'false',
          'sip-inbound-call': 'false',
          'sip-outbound-call': 'false',
          'inbound-call': 'false',
          'outbound-call': 'false',
        },
      },
    };

    // Sign the token with RS256
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        kid: apiKeyId,
        typ: 'JWT',
      },
    });

    return NextResponse.json({
      success: true,
      token,
      roomName,
      appId,
      meeting: meeting ? {
        id: meeting.id,
        title: meeting.title,
        type: meeting.type,
        isHost: session?.user?.id === meeting.hostId,
      } : null,
    });
  } catch (error) {
    console.error('[JaaS Token] Error generating token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
