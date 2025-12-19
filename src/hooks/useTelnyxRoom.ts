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

  // Refs para evitar dependencias inestables en callbacks
  const isAudioEnabledRef = useRef(isAudioEnabled);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const userNameRef = useRef(userName);
  const roomIdRef = useRef(roomId);

  // Mantener refs sincronizados
  isAudioEnabledRef.current = isAudioEnabled;
  isVideoEnabledRef.current = isVideoEnabled;
  userNameRef.current = userName;
  roomIdRef.current = roomId;

  // No usar destructuring del store - usar getState() directamente en callbacks
  // Esto evita que los callbacks se recreen cuando el store cambia

  /**
   * Obtener token de acceso del servidor
   */
  const getToken = useCallback(async (): Promise<string> => {
    const response = await fetch(`/api/rooms/${roomIdRef.current}/token`, {
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
  }, []); // Sin dependencias - usa ref

  /**
   * Configurar listeners de eventos del SDK
   * Sin dependencias - usa getState() para acciones del store
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

          useRoomStore.getState().addParticipant(participant);
        }
      });

      // Participante salió
      client.on('participant_left', (participantId: unknown) => {
        useRoomStore.getState().removeParticipant(participantId as string);
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
            useRoomStore.getState().updateParticipant(id, {
              audioTrack: mediaStream.getAudioTracks()[0],
              videoTrack: mediaStream.getVideoTracks()[0],
            });
          }
        }
      );

      // Actividad de audio (detectar quién habla)
      client.on('audio_activity', (participantId: unknown, isSpeaking: unknown) => {
        useRoomStore.getState().updateParticipant(participantId as string, {
          isSpeaking: isSpeaking as boolean,
        });
      });

      // Desconexión
      client.on('disconnected', () => {
        setConnectionState('disconnected');
        useRoomStore.getState().setConnectionState('disconnected');
      });
    },
    [] // Sin dependencias - usa getState()
  );

  /**
   * Conectar a la sala - sin dependencias del store
   */
  const connect = useCallback(async () => {
    if (clientRef.current?.getIsConnected()) {
      return;
    }

    try {
      setConnectionState('connecting');
      useRoomStore.getState().setConnectionState('connecting');
      setError(null);

      // Obtener token
      const token = await getToken();

      // Crear cliente
      const client = createTelnyxClient(roomIdRef.current, token);
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

      // Crear participante local - usar refs para valores actuales
      const localParticipant: Participant = {
        id: 'local',
        name: userNameRef.current,
        isHost: false,
        isMuted: !isAudioEnabledRef.current,
        isVideoOff: !isVideoEnabledRef.current,
        isSpeaking: false,
        isScreenSharing: false,
        joinedAt: new Date(),
        audioTrack: stream.getAudioTracks()[0],
        videoTrack: stream.getVideoTracks()[0],
      };

      // Usar getState() para todas las acciones del store
      const store = useRoomStore.getState();
      store.setLocalParticipant(localParticipant);
      setConnectionState('connected');
      store.setConnectionState('connected');

      // Establecer información de la sala
      store.setRoom({
        id: roomIdRef.current,
        name: `Sala ${roomIdRef.current}`,
        createdAt: new Date(),
        maxParticipants: 50,
        isRecording: false,
      });
    } catch (err) {
      console.error('Error al conectar:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setConnectionState('failed');
      useRoomStore.getState().setConnectionState('failed');
    }
  }, [getToken, setupEventListeners]); // Solo dependencias estables

  /**
   * Desconectar de la sala - sin dependencias de estado
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    // Usar setter funcional para acceder al stream actual
    setLocalStream(currentStream => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      return null;
    });

    setConnectionState('disconnected');

    // Usar getState() para acciones del store
    const store = useRoomStore.getState();
    store.setConnectionState('disconnected');
    store.reset();
  }, []); // Sin dependencias - usa getState()

  /**
   * Toggle de audio - sin dependencias de estado para evitar recreación
   */
  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => {
      const newState = !prev;

      if (clientRef.current) {
        clientRef.current.toggleAudio(newState);
      }

      // Actualizar estado del participante local usando getState() directamente
      const store = useRoomStore.getState();
      if (store.localParticipant) {
        store.setLocalParticipant({
          ...store.localParticipant,
          isMuted: !newState,
        });
      }

      return newState;
    });
  }, []); // Sin dependencias - usa refs y getState()

  /**
   * Toggle de video - sin dependencias de estado para evitar recreación
   */
  const toggleVideo = useCallback(() => {
    setIsVideoEnabled(prev => {
      const newState = !prev;

      if (clientRef.current) {
        clientRef.current.toggleVideo(newState);
      }

      // Actualizar estado del participante local usando getState() directamente
      const store = useRoomStore.getState();
      if (store.localParticipant) {
        store.setLocalParticipant({
          ...store.localParticipant,
          isVideoOff: !newState,
        });
      }

      return newState;
    });
  }, []); // Sin dependencias - usa refs y getState()

  // Ref para connect function estable
  const connectRef = useRef(connect);
  connectRef.current = connect;

  // Auto-conectar si está habilitado - solo depende de autoConnect
  useEffect(() => {
    if (autoConnect) {
      connectRef.current();
    }

    // Cleanup al desmontar
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [autoConnect]); // Solo autoConnect como dependencia

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
