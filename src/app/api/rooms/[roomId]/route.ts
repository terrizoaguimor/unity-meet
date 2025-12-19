import { NextRequest, NextResponse } from 'next/server';
import { getTelnyxAPI } from '@/lib/telnyx/api';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

/**
 * GET /api/rooms/[roomId]
 * Obtener información de una sala específica
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'ID de sala requerido' },
        { status: 400 }
      );
    }

    const telnyxApi = getTelnyxAPI();
    const response = await telnyxApi.getRoom(roomId);

    return NextResponse.json({
      success: true,
      room: {
        id: response.data.id,
        unique_name: response.data.unique_name,
        max_participants: response.data.max_participants,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        has_active_session: !!response.data.active_session_id,
        active_session_id: response.data.active_session_id,
      },
    });
  } catch (error) {
    console.error('Error al obtener sala:', error);

    // Verificar si es un error 404
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    const is404 = errorMessage.includes('no encontrada');

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: is404 ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/rooms/[roomId]
 * Eliminar una sala
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'ID de sala requerido' },
        { status: 400 }
      );
    }

    const telnyxApi = getTelnyxAPI();
    await telnyxApi.deleteRoom(roomId);

    return NextResponse.json({
      success: true,
      message: 'Sala eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar sala:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al eliminar la sala',
      },
      { status: 500 }
    );
  }
}
