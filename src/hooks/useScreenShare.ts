'use client';

import { useState, useCallback, useRef } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { TelnyxVideoClient } from '@/lib/telnyx/client';

interface UseScreenShareOptions {
  client: TelnyxVideoClient | null;
}

interface UseScreenShareReturn {
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  error: string | null;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

/**
 * Hook para gestionar compartir pantalla
 */
export function useScreenShare({
  client,
}: UseScreenShareOptions): UseScreenShareReturn {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Usar ref para client para evitar dependencias inestables
  const clientRef = useRef(client);
  clientRef.current = client;

  // No usar destructuring del store - usar getState() directamente

  /**
   * Iniciar compartir pantalla - sin dependencias del store
   */
  const startScreenShare = useCallback(async () => {
    const currentClient = clientRef.current;
    if (!currentClient) {
      setError('No hay conexión activa');
      return;
    }

    // Usar setter funcional para verificar estado actual
    setIsScreenSharing(currentlySharing => {
      if (currentlySharing) return currentlySharing; // Ya está compartiendo

      // Iniciar proceso async
      (async () => {
        try {
          setError(null);

          // Solicitar compartir pantalla
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          } as DisplayMediaStreamOptions);

          streamRef.current = stream;
          setScreenStream(stream);

          // Publicar stream de pantalla en Telnyx
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          // Escuchar cuando el usuario deja de compartir desde el UI del navegador
          videoTrack.onended = () => {
            stopScreenShareInternal();
          };

          // Publicar en el cliente de Telnyx si tiene el método
          try {
            await currentClient.publishLocalStream('screen', new MediaStream([videoTrack, ...(audioTrack ? [audioTrack] : [])]));
          } catch {
            console.log('Publicando screen share como stream principal');
          }

          // Actualizar estado del participante local usando getState()
          const store = useRoomStore.getState();
          if (store.localParticipant) {
            store.setLocalParticipant({
              ...store.localParticipant,
              isScreenSharing: true,
              screenTrack: videoTrack,
            });
          }
        } catch (err) {
          console.error('Error al compartir pantalla:', err);
          setIsScreenSharing(false);

          if (err instanceof Error) {
            if (err.name === 'NotAllowedError') {
              setError('Permiso de compartir pantalla denegado');
            } else {
              setError('Error al iniciar compartir pantalla');
            }
          }
        }
      })();

      return true; // Marcamos como compartiendo
    });
  }, []); // Sin dependencias - usa refs

  /**
   * Función interna para detener (llamada desde event handler)
   */
  const stopScreenShareInternal = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    // Despublicar stream de pantalla
    const currentClient = clientRef.current;
    if (currentClient) {
      currentClient.unpublishLocalStream('screen').catch(() => {
        // Ignorar error si no estaba publicado
      });
    }

    // Actualizar estado del participante local usando getState()
    const store = useRoomStore.getState();
    if (store.localParticipant) {
      store.setLocalParticipant({
        ...store.localParticipant,
        isScreenSharing: false,
        screenTrack: undefined,
      });
    }
  }, []); // Sin dependencias

  /**
   * Detener compartir pantalla - sin dependencias
   */
  const stopScreenShare = useCallback(async () => {
    stopScreenShareInternal();
  }, [stopScreenShareInternal]);

  /**
   * Toggle compartir pantalla - sin dependencias inestables
   */
  const toggleScreenShare = useCallback(async () => {
    // Usar setter funcional para obtener el estado actual
    setIsScreenSharing(currentlySharing => {
      if (currentlySharing) {
        // Detener
        stopScreenShareInternal();
        return false;
      } else {
        // Iniciar - lo hace startScreenShare
        startScreenShare();
        return currentlySharing; // startScreenShare lo cambiará
      }
    });
  }, [startScreenShare, stopScreenShareInternal]);

  return {
    isScreenSharing,
    screenStream,
    error,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
  };
}
