/**
 * Tipos para la integración con Telnyx Video API
 */

// Respuesta de la API al crear una sala
export interface TelnyxRoomResponse {
  data: {
    id: string;
    unique_name: string;
    max_participants: number;
    enable_recording: boolean;
    webhook_event_url: string;
    created_at: string;
    updated_at: string;
    active_session_id: string | null;
    sessions: TelnyxSession[];
  };
}

// Sesión de una sala
export interface TelnyxSession {
  id: string;
  room_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Respuesta al generar token de cliente
export interface TelnyxClientTokenResponse {
  data: {
    token: string;
    refresh_token: string;
    token_expires_at: string;
    refresh_token_expires_at: string;
  };
}

// Payload para crear una sala
export interface CreateRoomPayload {
  unique_name: string;
  max_participants?: number;
  enable_recording?: boolean;
  webhook_event_url?: string;
}

// Payload para generar token
export interface GenerateTokenPayload {
  refresh_token_ttl_secs?: number;
  token_ttl_secs?: number;
}

// Eventos de webhook de Telnyx
export type TelnyxWebhookEventType =
  | 'room.session.started'
  | 'room.session.ended'
  | 'room.participant.joined'
  | 'room.participant.left'
  | 'room.recording.started'
  | 'room.recording.ended';

export interface TelnyxWebhookEvent {
  data: {
    event_type: TelnyxWebhookEventType;
    id: string;
    occurred_at: string;
    payload: {
      room_id: string;
      session_id: string;
      participant_id?: string;
      recording_id?: string;
    };
    record_type: string;
  };
}

// Estado del participante en el SDK
export interface TelnyxParticipantState {
  id: string;
  origin: 'local' | 'remote';
  audio_muted: boolean;
  video_muted: boolean;
  streams: Map<string, TelnyxStreamState>;
}

// Estado del stream
export interface TelnyxStreamState {
  key: string;
  participantId: string;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

// Configuración del cliente de Telnyx
export interface TelnyxVideoConfig {
  token: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Opciones para agregar un stream
export interface AddStreamOptions {
  audio?: MediaStreamTrack;
  video?: MediaStreamTrack;
}

// Opciones para suscribirse a un stream
export interface SubscriptionOptions {
  audio?: boolean;
  video?: boolean;
}

// Estado completo de la sala desde el SDK
export interface TelnyxRoomState {
  participants: Map<string, TelnyxParticipantState>;
  localParticipantId: string | null;
  isConnected: boolean;
}

// Eventos del SDK que escuchamos
export type TelnyxSDKEvent =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_updated'
  | 'stream_published'
  | 'stream_unpublished'
  | 'subscription_started'
  | 'subscription_ended'
  | 'audio_activity';

// Errores comunes de Telnyx
export interface TelnyxError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
