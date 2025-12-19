'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TelnyxVideoClient, createTelnyxClient } from '@/lib/telnyx/client';
import { useRoomStore } from '@/stores/roomStore';
import type { ConnectionState, Participant } from '@/types';

interface UseTelnyxRoomOptions {
  roomId: string;
  userName: string;
  autoConnect?: boolean;
}

interface UseTelnyxRoomReturn {
  // Estado de conexión
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  // Media local
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;

  // Acciones
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;

  // Cliente para acceso avanzado
  client: TelnyxVideoClient | null;
}

/**
 * Hook principal para conectar y gestionar una sala de Telnyx
 */
export function useTelnyxRoom({
  roomId,
  userName,
  autoConnect = false,
}: UseTelnyxRoomOptions): UseTelnyxRoomReturn {
  const clientRef = useRef<TelnyxVideoClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Store actions
  const {
    setRoom,
    setConnectionState: setStoreConnectionState,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setLocalParticipant,
    reset: resetStore,
  } = useRoomStore();

  /**
   * Obtener token de acceso del servidor
   */
  const getToken = useCallback(async (): Promise<string> => {
    const response = await fetch(`/api/rooms/${roomId}/token`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener el token de acceso');
    }

    const data = await response.json();

    if (!data.success || !data.token) {
      throw new Error(data.error || 'Token inválido');
    }

    return data.token;
  }, [roomId]);

  /**
   * Conectar a la sala
   */
  const connect = useCallback(async () => {
    if (clientRef.current?.getIsConnected()) {
      return;
    }

    try {
      setConnectionState('connecting');
      setStoreConnectionState('connecting');
      setError(null);

      // Obtener token
      const token = await getToken();

      // Crear cliente
      const client = createTelnyxClient(roomId, token);
      clientRef.current = client;

      // Inicializar SDK
      await client.initialize();

      // Configurar event listeners
      setupEventListeners(client);

      // Obtener stream local
      const stream = await client.getLocalMediaStream();
      setLocalStream(stream);

      // Conectar a la sala
      await client.connect();

      // Publicar stream local
      await client.publishLocalStream('camera');

      // Crear participante local
      const localParticipant: Participant = {
        id: 'local',
        name: userName,
        isHost: false,
        isMuted: !isAudioEnabled,
        isVideoOff: !isVideoEnabled,
        isSpeaking: false,
        isScreenSharing: false,
        joinedAt: new Date(),
        audioTrack: stream.getAudioTracks()[0],
        videoTrack: stream.getVideoTracks()[0],
      };

      setLocalParticipant(localParticipant);
      setConnectionState('connected');
      setStoreConnectionState('connected');

      // Establecer información de la sala
      setRoom({
        id: roomId,
        name: `Sala ${roomId}`,
        createdAt: new Date(),
        maxParticipants: 50,
        isRecording: false,
      });
    } catch (err) {
      console.error('Error al conectar:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setConnectionState('failed');
      setStoreConnectionState('failed');
    }
  }, [
    roomId,
    userName,
    getToken,
    isAudioEnabled,
    isVideoEnabled,
    setRoom,
    setStoreConnectionState,
    setLocalParticipant,
  ]);

  /**
   * Configurar listeners de eventos del SDK
   */
  const setupEventListeners = useCallback(
    (client: TelnyxVideoClient) => {
      // Participante unido
      client.on('participant_joined', (participantId: unknown, state: unknown) => {
        const id = participantId as string;
        const stateData = state as { participants: Map<string, { origin: string }> };
        const participantData = stateData.participants.get(id);

        if (participantData && participantData.origin !== 'local') {
          const participant: Participant = {
            id,
            name: `Participante ${id.slice(0, 6)}`,
            isHost: false,
            isMuted: false,
            isVideoOff: false,
            isSpeaking: false,
            isScreenSharing: false,
            joinedAt: new Date(),
          };

          addParticipant(participant);
        }
      });

      // Participante salió
      client.on('participant_left', (participantId: unknown) => {
        removeParticipant(participantId as string);
      });

      // Stream publicado - suscribirse
      client.on(
        'stream_published',
        async (participantId: unknown, streamKey: unknown, state: unknown) => {
          const id = participantId as string;
          const key = streamKey as string;
          const stateData = state as { participants: Map<string, { origin: string }> };
          const participant = stateData.participants.get(id);

          if (participant && participant.origin !== 'local') {
            try {
              await client.subscribeToParticipant(id, key);
            } catch (err) {
              console.error('Error al suscribirse:', err);
            }
          }
        }
      );

      // Suscripción iniciada - obtener stream
      client.on(
        'subscription_started',
        (participantId: unknown, streamKey: unknown) => {
          const id = participantId as string;
          const key = streamKey as string;
          const mediaStream = client.getParticipantMediaStream(id, key);

          if (mediaStream) {
            updateParticipant(id, {
              audioTrack: mediaStream.getAudioTracks()[0],
              videoTrack: mediaStream.getVideoTracks()[0],
            });
          }
        }
      );

      // Actividad de audio (detectar quién habla)
      client.on('audio_activity', (participantId: unknown, isSpeaking: unknown) => {
        updateParticipant(participantId as string, {
          isSpeaking: isSpeaking as boolean,
        });
      });

      // Desconexión
      client.on('disconnected', () => {
        setConnectionState('disconnected');
        setStoreConnectionState('disconnected');
      });
    },
    [addParticipant, removeParticipant, updateParticipant, setStoreConnectionState]
  );

  /**
   * Desconectar de la sala
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    setConnectionState('disconnected');
    setStoreConnectionState('disconnected');
    resetStore();
  }, [localStream, setStoreConnectionState, resetStore]);

  /**
   * Toggle de audio
   */
  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);

    if (clientRef.current) {
      clientRef.current.toggleAudio(newState);
    }

    // Actualizar estado del participante local
    const store = useRoomStore.getState();
    if (store.localParticipant) {
      setLocalParticipant({
        ...store.localParticipant,
        isMuted: !newState,
      });
    }
  }, [isAudioEnabled, setLocalParticipant]);

  /**
   * Toggle de video
   */
  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);

    if (clientRef.current) {
      clientRef.current.toggleVideo(newState);
    }

    // Actualizar estado del participante local
    const store = useRoomStore.getState();
    if (store.localParticipant) {
      setLocalParticipant({
        ...store.localParticipant,
        isVideoOff: !newState,
      });
    }
  }, [isVideoEnabled, setLocalParticipant]);

  // Auto-conectar si está habilitado
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup al desmontar
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [autoConnect, connect]);

  return {
    connectionState,
    isConnecting: connectionState === 'connecting',
    isConnected: connectionState === 'connected',
    error,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    client: clientRef.current,
  };
}
