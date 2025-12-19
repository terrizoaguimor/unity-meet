import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a JaaS JWT token for a participant
 * POST /api/jaas/token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, userName, moderator = false, email, avatar } = body;

    if (!roomName || !userName) {
      return NextResponse.json(
        { success: false, error: 'roomName and userName are required' },
        { status: 400 }
      );
    }

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
    const odId = uuidv4();

    // Token expiration - 2 hours from now
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (2 * 60 * 60);

    // JWT payload according to JaaS specification
    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      sub: appId,
      room: roomName, // Can be '*' for any room, or specific room name
      exp,
      nbf: now,
      context: {
        user: {
          id: odId,
          name: userName,
          email: email || `${userName.toLowerCase().replace(/\s+/g, '.')}@unity.meet`,
          avatar: avatar || '',
          moderator: moderator ? 'true' : 'false',
        },
        features: {
          livestreaming: 'false',
          recording: moderator ? 'true' : 'false',
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
    });
  } catch (error) {
    console.error('[JaaS Token] Error generating token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
