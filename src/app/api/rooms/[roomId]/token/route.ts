import { NextRequest, NextResponse } from 'next/server';
import { getTelnyxAPI } from '@/lib/telnyx/api';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

/**
 * POST /api/rooms/[roomId]/token
 * Generar token de cliente para unirse a una sala
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'ID de sala requerido' },
        { status: 400 }
      );
    }

    // Obtener configuración opcional del body
    let tokenTtl = 600; // 10 minutos por defecto
    let refreshTokenTtl = 3600; // 1 hora por defecto

    try {
      const body = await request.json();
      tokenTtl = body.token_ttl_secs || tokenTtl;
      refreshTokenTtl = body.refresh_token_ttl_secs || refreshTokenTtl;
    } catch {
      // Body vacío está bien, usar valores por defecto
    }

    const telnyxApi = getTelnyxAPI();
    const response = await telnyxApi.generateClientToken(roomId, {
      token_ttl_secs: tokenTtl,
      refresh_token_ttl_secs: refreshTokenTtl,
    });

    return NextResponse.json({
      success: true,
      token: response.data.token,
      refresh_token: response.data.refresh_token,
      expires_at: response.data.token_expires_at,
    });
  } catch (error) {
    console.error('Error al generar token:', error);

    // Verificar si es un error de sala no encontrada
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
