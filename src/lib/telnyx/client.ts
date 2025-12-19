'use client';

/**
 * Cliente de Telnyx Video para el navegador
 * Wrapper alrededor del SDK oficial de Telnyx v1.x
 */

import type {
  TelnyxRoomState,
  TelnyxParticipantState,
  SubscriptionOptions,
  TelnyxSDKEvent,
} from './types';

// Importar tipos del SDK
import type { Room, Events } from '@telnyx/video';

type EventCallback = (...args: unknown[]) => void;

/**
 * Clase wrapper para el SDK de Telnyx Video
 */
export class TelnyxVideoClient {
  private room: Room | null = null;
  private roomId: string;
  private token: string;
  private userName: string;
  private eventListeners: Map<TelnyxSDKEvent, Set<EventCallback>> = new Map();
  private isConnected = false;
  private localStream: MediaStream | null = null;

  constructor(config: { roomId: string; token: string; userName?: string }) {
    this.roomId = config.roomId;
    this.token = config.token;
    this.userName = config.userName || 'Usuario';
  }

  /**
   * Inicializar el SDK de Telnyx
   */
  async initialize(): Promise<void> {
    try {
      // Importar el SDK dinámicamente (solo en cliente)
      const { initialize } = await import('@telnyx/video');

      // Context similar to telnyx-meet reference implementation
      const context = JSON.stringify({
        displayName: this.userName,
        timestamp: Date.now(),
      });

      this.room = await initialize({
        roomId: this.roomId,
        clientToken: this.token,
        context, // Important: participant context
        logLevel: 'DEBUG',
        enableMessages: true,
      });

      // Configurar event listeners internos
      this.setupInternalListeners();
    } catch (error) {
      console.error('Error al inicializar Telnyx SDK:', error);
      throw new Error('No se pudo inicializar el SDK de video');
    }
  }

  /**
   * Configurar listeners internos del SDK
   */
  private setupInternalListeners(): void {
    if (!this.room) return;

    // IMPORTANTE: Listener para monitorear cambios de estado
    this.room.on('state_changed' as keyof Events, (newState: unknown) => {
      console.log('[TelnyxClient] state_changed:', newState);
    });

    // Mapear eventos del SDK a nuestros eventos
    const eventMappings: Array<{ sdkEvent: keyof Events; ourEvent: TelnyxSDKEvent }> = [
      { sdkEvent: 'connected', ourEvent: 'connected' },
      { sdkEvent: 'disconnected', ourEvent: 'disconnected' },
      { sdkEvent: 'participant_joined', ourEvent: 'participant_joined' },
      { sdkEvent: 'participant_left', ourEvent: 'participant_left' },
      { sdkEvent: 'stream_published', ourEvent: 'stream_published' },
      { sdkEvent: 'stream_unpublished', ourEvent: 'stream_unpublished' },
      { sdkEvent: 'subscription_started', ourEvent: 'subscription_started' },
      { sdkEvent: 'subscription_ended', ourEvent: 'subscription_ended' },
      { sdkEvent: 'audio_activity', ourEvent: 'audio_activity' },
    ];

    eventMappings.forEach(({ sdkEvent, ourEvent }) => {
      this.room!.on(sdkEvent, (...args: unknown[]) => {
        console.log(`[TelnyxClient] Event ${sdkEvent}:`, args);
        this.emit(ourEvent, ...args);
      });
    });

    // Manejar evento de conexión para actualizar estado
    this.room.on('connected', () => {
      console.log('[TelnyxClient] CONNECTED event fired!');
      this.isConnected = true;
    });

    this.room.on('disconnected', () => {
      console.log('[TelnyxClient] DISCONNECTED event fired!');
      this.isConnected = false;
    });
  }

  /**
   * Conectar a la sala
   * Usa el evento "connected" como señal de conexión exitosa
   */
  async connect(): Promise<void> {
    if (!this.room) {
      throw new Error('SDK no inicializado. Llama a initialize() primero');
    }

    return new Promise((resolve, reject) => {
      console.log('[TelnyxClient] Iniciando room.connect()...');
      console.log('[TelnyxClient] Room state before connect:', this.room!.getState());

      let unsubConnected: (() => void) | null = null;
      let unsubDisconnected: (() => void) | null = null;

      const cleanup = () => {
        if (unsubConnected) unsubConnected();
        if (unsubDisconnected) unsubDisconnected();
      };

      // Timeout de seguridad
      const timeout = setTimeout(() => {
        console.error('[TelnyxClient] Connect timeout (internal)');
        cleanup();
        reject(new Error('Timeout interno de conexión'));
      }, 25000);

      // Listener para conexión exitosa
      const onConnected = () => {
        console.log('[TelnyxClient] CONNECTED - conexión exitosa via evento');
        clearTimeout(timeout);
        cleanup();
        this.isConnected = true;
        resolve();
      };

      // Listener para desconexión/error
      const onDisconnected = () => {
        console.error('[TelnyxClient] DISCONNECTED durante connect');
        clearTimeout(timeout);
        cleanup();
        reject(new Error('Desconectado durante el intento de conexión'));
      };

      // SDK returns unsubscribe functions
      unsubConnected = this.room!.on('connected', onConnected);
      unsubDisconnected = this.room!.on('disconnected', onDisconnected);

      // Iniciar conexión
      this.room!.connect()
        .then(() => {
          console.log('[TelnyxClient] room.connect() promise resolved');
          // La promesa se resolvió pero esperamos el evento 'connected'
          // Si ya está conectado, resolve inmediatamente
          if (this.room!.getState().status === 'connected') {
            onConnected();
          }
        })
        .catch((error: unknown) => {
          console.error('[TelnyxClient] room.connect() promise rejected:', error);
          clearTimeout(timeout);
          cleanup();
          reject(error);
        });
    });
  }

  /**
   * Desconectar de la sala
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.isConnected = false;
    }

    // Detener tracks locales
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Limpiar listeners
    this.eventListeners.clear();
  }

  /**
   * Obtener stream de medios local
   */
  async getLocalMediaStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    const defaultConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );
      return this.localStream;
    } catch (error) {
      console.error('Error al obtener medios:', error);
      throw new Error('No se pudo acceder a la cámara/micrófono');
    }
  }

  /**
   * Publicar stream local en la sala
   */
  async publishLocalStream(
    streamKey: string = 'camera',
    stream?: MediaStream
  ): Promise<void> {
    if (!this.room) {
      throw new Error('SDK no inicializado');
    }

    const mediaStream = stream || this.localStream;

    if (!mediaStream) {
      throw new Error('No hay stream local disponible');
    }

    const audioTrack = mediaStream.getAudioTracks()[0];
    const videoTrack = mediaStream.getVideoTracks()[0];

    await this.room.addStream(streamKey, {
      audio: audioTrack,
      video: videoTrack,
    });
  }

  /**
   * Despublicar stream local
   */
  async unpublishLocalStream(streamKey: string = 'camera'): Promise<void> {
    if (!this.room) return;

    await this.room.removeStream(streamKey);
  }

  /**
   * Suscribirse al stream de un participante remoto
   */
  async subscribeToParticipant(
    participantId: string,
    streamKey: string,
    options?: SubscriptionOptions
  ): Promise<void> {
    if (!this.room) {
      throw new Error('SDK no inicializado');
    }

    await this.room.addSubscription(participantId, streamKey, {
      audio: options?.audio ?? true,
      video: options?.video ?? true,
    });
  }

  /**
   * Cancelar suscripción a un participante
   */
  async unsubscribeFromParticipant(
    participantId: string,
    streamKey: string
  ): Promise<void> {
    if (!this.room) return;

    await this.room.removeSubscription(participantId, streamKey);
  }

  /**
   * Obtener el MediaStream de un participante
   */
  getParticipantMediaStream(
    participantId: string,
    streamKey: string
  ): MediaStream | null {
    if (!this.room) return null;

    const stream = this.room.getParticipantStream(participantId, streamKey);

    if (!stream) return null;

    const tracks: MediaStreamTrack[] = [];

    if (stream.audioTrack) tracks.push(stream.audioTrack);
    if (stream.videoTrack) tracks.push(stream.videoTrack);

    return tracks.length > 0 ? new MediaStream(tracks) : null;
  }

  /**
   * Obtener estado actual de la sala
   */
  getState(): TelnyxRoomState | null {
    if (!this.room) return null;

    const state = this.room.getState();

    return {
      participants: new Map(
        Array.from(state.participants.entries()).map(([id, p]) => [
          id,
          {
            id: p.id,
            origin: p.origin,
            audio_muted: false,
            video_muted: false,
            streams: new Map(),
          } as TelnyxParticipantState,
        ])
      ),
      localParticipantId: this.room.getLocalParticipant()?.id || null,
      isConnected: this.isConnected,
    };
  }

  /**
   * Obtener lista de participantes
   */
  getParticipants(): Map<string, TelnyxParticipantState> {
    const state = this.getState();
    return state?.participants || new Map();
  }

  /**
   * Toggle de audio local
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle de video local
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Verificar si está conectado
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Obtener stream local actual
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Registrar un event listener
   */
  on(event: TelnyxSDKEvent, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remover un event listener
   */
  off(event: TelnyxSDKEvent, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emitir un evento a los listeners registrados
   */
  private emit(event: TelnyxSDKEvent, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(...args));
    }
  }
}

/**
 * Factory para crear instancias del cliente
 */
export function createTelnyxClient(roomId: string, token: string, userName?: string): TelnyxVideoClient {
  return new TelnyxVideoClient({ roomId, token, userName });
}
