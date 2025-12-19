import { NextRequest, NextResponse } from 'next/server';
import type { TelnyxWebhookEvent } from '@/lib/telnyx/types';

/**
 * POST /api/webhooks/telnyx
 * Recibir webhooks de eventos de Telnyx
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TelnyxWebhookEvent;
    const event = body.data;

    console.log(`[Telnyx Webhook] Evento recibido: ${event.event_type}`, {
      id: event.id,
      room_id: event.payload.room_id,
      session_id: event.payload.session_id,
      occurred_at: event.occurred_at,
    });

    // Procesar según el tipo de evento
    switch (event.event_type) {
      case 'room.session.started':
        console.log(
          `[Telnyx] Sesión iniciada en sala ${event.payload.room_id}`
        );
        // Aquí podrías notificar a los usuarios suscritos, actualizar DB, etc.
        break;

      case 'room.session.ended':
        console.log(
          `[Telnyx] Sesión terminada en sala ${event.payload.room_id}`
        );
        // Limpiar recursos, actualizar estadísticas, etc.
        break;

      case 'room.participant.joined':
        console.log(
          `[Telnyx] Participante ${event.payload.participant_id} se unió a ${event.payload.room_id}`
        );
        // Actualizar contador de participantes, enviar notificaciones, etc.
        break;

      case 'room.participant.left':
        console.log(
          `[Telnyx] Participante ${event.payload.participant_id} salió de ${event.payload.room_id}`
        );
        // Actualizar contador, limpiar recursos del participante, etc.
        break;

      case 'room.recording.started':
        console.log(
          `[Telnyx] Grabación iniciada en sala ${event.payload.room_id}`
        );
        break;

      case 'room.recording.ended':
        console.log(
          `[Telnyx] Grabación terminada en sala ${event.payload.room_id}`,
          { recording_id: event.payload.recording_id }
        );
        // Procesar grabación, notificar al host, etc.
        break;

      default:
        console.log(`[Telnyx] Evento no manejado: ${event.event_type}`);
    }

    // Responder 200 OK para confirmar recepción
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Telnyx Webhook] Error al procesar:', error);

    // Aún respondemos 200 para evitar reintentos innecesarios
    // En producción podrías querer responder 500 para ciertos errores
    return NextResponse.json(
      { received: false, error: 'Error procesando webhook' },
      { status: 200 }
    );
  }
}

/**
 * GET /api/webhooks/telnyx
 * Endpoint de verificación (algunos servicios lo requieren)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telnyx webhook endpoint activo',
  });
}
