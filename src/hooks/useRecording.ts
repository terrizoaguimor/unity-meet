'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseRecordingOptions {
  roomId: string;
  localStream?: MediaStream | null;
  onStatusChange?: (status: string) => void;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  recordingUrl: string | null;
}

/**
 * Hook para grabar la reunión y subir a DO Spaces
 * Graba directamente los streams de la reunión sin pedir compartir pantalla
 */
export function useRecording({ roomId, localStream, onStatusChange }: UseRecordingOptions) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    recordingUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const updateStatus = useCallback((status: string) => {
    console.log(`[useRecording] ${status}`);
    onStatusChange?.(status);
  }, [onStatusChange]);

  /**
   * Combinar todos los audio tracks de la reunión
   */
  const combineAudioTracks = useCallback(() => {
    // Buscar todos los elementos de audio en la página (participantes remotos)
    const audioElements = document.querySelectorAll<HTMLAudioElement>('audio');
    const videoElements = document.querySelectorAll<HTMLVideoElement>('video:not([muted])');

    // Crear AudioContext para mezclar audio
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const destination = audioContext.createMediaStreamDestination();
    destinationRef.current = destination;

    // Añadir audio local si existe
    if (localStream) {
      const localAudioTracks = localStream.getAudioTracks();
      if (localAudioTracks.length > 0) {
        try {
          const localSource = audioContext.createMediaStreamSource(new MediaStream(localAudioTracks));
          localSource.connect(destination);
          console.log('[useRecording] Added local audio');
        } catch (err) {
          console.warn('[useRecording] Could not add local audio:', err);
        }
      }
    }

    // Añadir audio de elementos audio (participantes remotos)
    audioElements.forEach((audioEl, index) => {
      try {
        if (audioEl.srcObject) {
          const source = audioContext.createMediaStreamSource(audioEl.srcObject as MediaStream);
          source.connect(destination);
          console.log(`[useRecording] Added audio element ${index}`);
        }
      } catch (err) {
        console.warn(`[useRecording] Could not add audio element ${index}:`, err);
      }
    });

    // Añadir audio de elementos video que no están silenciados
    videoElements.forEach((videoEl, index) => {
      try {
        if (videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0) {
            const source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
            source.connect(destination);
            console.log(`[useRecording] Added video audio ${index}`);
          }
        }
      } catch (err) {
        console.warn(`[useRecording] Could not add video audio ${index}:`, err);
      }
    });

    return destination.stream;
  }, [localStream]);

  /**
   * Iniciar grabación - graba el video local + todo el audio mezclado
   */
  const startRecording = useCallback(async () => {
    try {
      updateStatus('Iniciando grabación...');
      setState(prev => ({ ...prev, error: null }));

      // Obtener video local
      let videoTrack: MediaStreamTrack | null = null;
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTrack = videoTracks[0];
        }
      }

      // Si no hay video local, intentar obtener de la cámara
      if (!videoTrack) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
          });
          videoTrack = stream.getVideoTracks()[0];
        } catch (err) {
          console.warn('[useRecording] No video available:', err);
        }
      }

      // Combinar audio de todos los participantes
      const audioStream = combineAudioTracks();

      // Crear stream combinado
      const tracks: MediaStreamTrack[] = [];
      if (videoTrack) {
        tracks.push(videoTrack.clone());
      }
      audioStream.getAudioTracks().forEach(track => {
        tracks.push(track);
      });

      if (tracks.length === 0) {
        throw new Error('No hay tracks disponibles para grabar');
      }

      const combinedStream = new MediaStream(tracks);
      combinedStreamRef.current = combinedStream;

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000,  // 128 kbps
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        updateStatus('Procesando grabación...');
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Limpiar AudioContext
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        await uploadRecording(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Guardar chunks cada segundo

      // Iniciar timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }));

      updateStatus('Grabación iniciada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar grabación';
      console.error('[useRecording] Start error:', err);
      setState(prev => ({ ...prev, error: message }));
      updateStatus(`Error: ${message}`);
    }
  }, [localStream, combineAudioTracks, updateStatus]);

  /**
   * Detener grabación
   */
  const stopRecording = useCallback(() => {
    updateStatus('Deteniendo grabación...');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Limpiar streams
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => track.stop());
      combinedStreamRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
  }, [updateStatus]);

  /**
   * Pausar/Reanudar grabación
   */
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState(prev => ({ ...prev, isPaused: true }));
      updateStatus('Grabación pausada');
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      const pausedDuration = state.duration;
      startTimeRef.current = Date.now() - (pausedDuration * 1000);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);
      setState(prev => ({ ...prev, isPaused: false }));
      updateStatus('Grabación reanudada');
    }
  }, [state.duration, updateStatus]);

  /**
   * Subir grabación a DO Spaces
   */
  const uploadRecording = useCallback(async (blob: Blob) => {
    try {
      setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));
      updateStatus('Subiendo grabación...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${roomId}-${timestamp}.webm`;

      // Obtener URL firmada para subir
      const signedUrlResponse = await fetch('/api/recordings/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType: blob.type }),
      });

      if (!signedUrlResponse.ok) {
        throw new Error('No se pudo obtener URL de subida');
      }

      const { uploadUrl, publicUrl } = await signedUrlResponse.json();

      // Subir directamente a DO Spaces
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': blob.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo');
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 100,
        recordingUrl: publicUrl,
      }));

      updateStatus('Grabación guardada exitosamente');

      // Guardar referencia en el servidor
      await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          filename,
          url: publicUrl,
          duration: state.duration,
          size: blob.size,
        }),
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir grabación';
      console.error('[useRecording] Upload error:', err);
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: message,
      }));
      updateStatus(`Error de subida. Descargando localmente...`);

      // Ofrecer descarga local como fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${roomId}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      updateStatus('Grabación descargada localmente');
    }
  }, [roomId, state.duration, updateStatus]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    togglePause,
  };
}
