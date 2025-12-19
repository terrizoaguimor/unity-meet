'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TelnyxVideoClient, createTelnyxClient } from '@/lib/telnyx/client';
import { useRoomStore } from '@/stores/roomStore';
import type { ConnectionState, Participant } from '@/types';

// Timeout para operaciones asíncronas
const OPERATION_TIMEOUT = 15000;
const CONNECT_TIMEOUT = 30000; // WebRTC connect puede tardar más

/**
 * Envolver una promesa con timeout
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${operationName} tardó más de ${timeoutMs / 1000}s`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

interface UseTelnyxRoomOptions {
  roomId: string;
  userName: string;
  autoConnect?: boolean;
  onStatusChange?: (status: string) => void;
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
  onStatusChange,
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
  const onStatusChangeRef = useRef(onStatusChange);

  // Mantener refs sincronizados
  isAudioEnabledRef.current = isAudioEnabled;
  isVideoEnabledRef.current = isVideoEnabled;
  userNameRef.current = userName;
  roomIdRef.current = roomId;
  onStatusChangeRef.current = onStatusChange;

  // Helper para actualizar status - estable porque usa refs
  const updateStatus = useCallback((status: string) => {
    console.log(`[useTelnyxRoom] ${status}`);
    onStatusChangeRef.current?.(status);
  }, []);

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
            isHandRaised: false,
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
   * Con timeouts para evitar que el loading quede colgado
   */
  const connect = useCallback(async () => {
    updateStatus('connect() iniciado');

    if (clientRef.current?.getIsConnected()) {
      updateStatus('Ya conectado, retornando');
      return;
    }

    try {
      updateStatus('Estableciendo estado...');
      setConnectionState('connecting');
      useRoomStore.getState().setConnectionState('connecting');
      setError(null);

      // 1. Obtener token (con timeout)
      updateStatus('1/7 Obteniendo token...');
      const token = await withTimeout(
        getToken(),
        OPERATION_TIMEOUT,
        'obtener token'
      );
      updateStatus('2/7 Token obtenido');

      // 2. Crear cliente con userName para el contexto
      const client = createTelnyxClient(roomIdRef.current, token, userNameRef.current);
      clientRef.current = client;

      // 3. Inicializar SDK (con timeout)
      updateStatus('3/7 Inicializando SDK...');
      await withTimeout(
        client.initialize(),
        OPERATION_TIMEOUT,
        'inicializar SDK'
      );
      updateStatus('4/7 SDK inicializado');

      // 4. Configurar event listeners
      setupEventListeners(client);

      // 4.5. Pequeña pausa para asegurar que el SDK está listo
      updateStatus('4/7 Esperando SDK...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Conectar a la sala (como en telnyx-meet)
      updateStatus('5/7 Conectando a la sala (WebRTC)...');
      console.log('[useTelnyxRoom] Llamando client.connect()...');
      console.log('[useTelnyxRoom] roomId:', roomIdRef.current);
      console.log('[useTelnyxRoom] token length:', token.length);

      try {
        await withTimeout(
          client.connect(),
          CONNECT_TIMEOUT,
          'conectar a la sala (WebRTC)'
        );
      } catch (connectError) {
        console.error('[useTelnyxRoom] Connect error details:', connectError);
        throw connectError;
      }

      updateStatus('6/7 Conectado a la sala');

      // 6. Obtener stream local DESPUÉS de conectar
      updateStatus('6/7 Obteniendo cámara/micrófono...');
      const stream = await withTimeout(
        client.getLocalMediaStream(),
        OPERATION_TIMEOUT,
        'acceder a cámara/micrófono'
      );
      setLocalStream(stream);
      updateStatus('6/7 Stream local obtenido');

      // 7. Publicar stream local (con timeout)
      updateStatus('7/7 Publicando stream...');
      await withTimeout(
        client.publishLocalStream('camera'),
        OPERATION_TIMEOUT,
        'publicar stream'
      );
      updateStatus('Completado!');

      // Crear participante local - usar refs para valores actuales
      const localParticipant: Participant = {
        id: 'local',
        name: userNameRef.current,
        isHost: false,
        isMuted: !isAudioEnabledRef.current,
        isVideoOff: !isVideoEnabledRef.current,
        isSpeaking: false,
        isScreenSharing: false,
        isHandRaised: false,
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

      updateStatus('Conexión completada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión';
      updateStatus(`ERROR: ${errorMessage}`);
      console.error('[useTelnyxRoom] Error al conectar:', err);

      // Limpiar cliente si existe
      if (clientRef.current) {
        try {
          clientRef.current.disconnect();
        } catch {
          // Ignorar errores de desconexión
        }
        clientRef.current = null;
      }

      setError(errorMessage);
      setConnectionState('failed');
      useRoomStore.getState().setConnectionState('failed');
    }
  }, [getToken, setupEventListeners, updateStatus]); // Solo dependencias estables

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
