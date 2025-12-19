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

  const { setLocalParticipant } = useRoomStore();

  /**
   * Iniciar compartir pantalla
   */
  const startScreenShare = useCallback(async () => {
    if (!client) {
      setError('No hay conexión activa');
      return;
    }

    if (isScreenSharing) {
      return;
    }

    try {
      setError(null);

      // Solicitar compartir pantalla
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      } as DisplayMediaStreamOptions);

      streamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Publicar stream de pantalla en Telnyx
      // Usamos un streamKey diferente para diferenciar de la cámara
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      // Escuchar cuando el usuario deja de compartir desde el UI del navegador
      videoTrack.onended = () => {
        stopScreenShare();
      };

      // Publicar en el cliente de Telnyx si tiene el método
      // Nota: Esto depende de cómo el SDK de Telnyx maneje múltiples streams
      try {
        // Intentar agregar como stream separado
        await client.publishLocalStream('screen', new MediaStream([videoTrack, ...(audioTrack ? [audioTrack] : [])]));
      } catch {
        console.log('Publicando screen share como stream principal');
        // Si no soporta múltiples streams, reemplazamos el stream de cámara temporalmente
      }

      // Actualizar estado del participante local
      const store = useRoomStore.getState();
      if (store.localParticipant) {
        setLocalParticipant({
          ...store.localParticipant,
          isScreenSharing: true,
          screenTrack: videoTrack,
        });
      }
    } catch (err) {
      console.error('Error al compartir pantalla:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permiso de compartir pantalla denegado');
        } else {
          setError('Error al iniciar compartir pantalla');
        }
      }
    }
  }, [client, isScreenSharing, setLocalParticipant]);

  /**
   * Detener compartir pantalla
   */
  const stopScreenShare = useCallback(async () => {
    if (streamRef.current) {
      // Detener todos los tracks
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    // Despublicar stream de pantalla
    if (client) {
      try {
        await client.unpublishLocalStream('screen');
      } catch {
        // Ignorar error si no estaba publicado
      }
    }

    // Actualizar estado del participante local
    const store = useRoomStore.getState();
    if (store.localParticipant) {
      setLocalParticipant({
        ...store.localParticipant,
        isScreenSharing: false,
        screenTrack: undefined,
      });
    }
  }, [client, setLocalParticipant]);

  /**
   * Toggle compartir pantalla
   */
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  return {
    isScreenSharing,
    screenStream,
    error,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
  };
}
