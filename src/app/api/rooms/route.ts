import { NextRequest, NextResponse } from 'next/server';
import { getTelnyxAPI } from '@/lib/telnyx/api';
import { generateRoomId } from '@/lib/utils/formatters';

/**
 * POST /api/rooms
 * Crear una nueva sala de videoconferencia
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, maxParticipants = 50 } = body;

    // Generar nombre único para la sala
    const roomId = generateRoomId();
    const uniqueName = name || `Unity Meet - ${roomId}`;

    // URL base de la aplicación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/webhooks/telnyx`;

    // Crear sala en Telnyx
    const telnyxApi = getTelnyxAPI();
    const response = await telnyxApi.createRoom({
      unique_name: uniqueName,
      max_participants: maxParticipants,
      enable_recording: false,
      webhook_event_url: webhookUrl,
    });

    return NextResponse.json({
      success: true,
      room: {
        id: response.data.id,
        unique_name: response.data.unique_name,
        max_participants: response.data.max_participants,
        created_at: response.data.created_at,
        join_url: `${appUrl}/room/${response.data.id}`,
      },
    });
  } catch (error) {
    console.error('Error al crear sala:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al crear la sala',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rooms
 * Listar salas disponibles (para admin)
 */
export async function GET() {
  try {
    const telnyxApi = getTelnyxAPI();
    const response = await telnyxApi.listRooms({ page_size: 20 });

    return NextResponse.json({
      success: true,
      rooms: response.data.map((room) => ({
        id: room.id,
        unique_name: room.unique_name,
        max_participants: room.max_participants,
        created_at: room.created_at,
        has_active_session: !!room.active_session_id,
      })),
      meta: response.meta,
    });
  } catch (error) {
    console.error('Error al listar salas:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al obtener salas',
      },
      { status: 500 }
    );
  }
}
