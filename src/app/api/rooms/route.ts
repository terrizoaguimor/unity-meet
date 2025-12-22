import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createMeeting, getUserMeetings } from '@/lib/services/meeting.service';
import { MeetingType } from '@prisma/client';

/**
 * POST /api/rooms
 * Crear una nueva sala de videoconferencia
 * Note: This is a legacy endpoint, prefer using /api/meetings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Autenticación requerida para crear salas' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, maxParticipants = 50, type = 'INSTANT' } = body;

    // Create meeting in database
    const meeting = await createMeeting({
      hostId: session.user.id,
      title: name || 'Reunión de Unity Meet',
      type: type as MeetingType,
      maxParticipants,
      isPublic: true,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      room: {
        id: meeting.roomId,
        unique_name: meeting.title,
        max_participants: meeting.maxParticipants,
        created_at: meeting.createdAt.toISOString(),
        join_url: `${appUrl}/room/${meeting.roomId}`,
      },
      meeting,
    });
  } catch (error) {
    console.error('[Rooms] Error creating room:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear la sala',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rooms
 * Listar salas del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'LIVE' | 'ENDED' | 'CANCELLED' | null;

    const meetings = await getUserMeetings(session.user.id, {
      status: status || undefined,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      rooms: meetings.map((meeting) => ({
        id: meeting.roomId,
        unique_name: meeting.title,
        max_participants: meeting.maxParticipants,
        created_at: meeting.createdAt.toISOString(),
        has_active_session: meeting.status === 'LIVE',
        join_url: `${appUrl}/room/${meeting.roomId}`,
        status: meeting.status,
        type: meeting.type,
      })),
    });
  } catch (error) {
    console.error('[Rooms] Error listing rooms:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener salas',
      },
      { status: 500 }
    );
  }
}
