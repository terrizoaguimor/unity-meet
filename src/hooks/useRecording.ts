'use client';

import { useState, useRef, useCallback } from 'react';

interface UseRecordingOptions {
  roomId: string;
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
 * Hook para grabar la reunión localmente y subir a DO Spaces
 */
export function useRecording({ roomId, onStatusChange }: UseRecordingOptions) {
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
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateStatus = useCallback((status: string) => {
    console.log(`[useRecording] ${status}`);
    onStatusChange?.(status);
  }, [onStatusChange]);

  /**
   * Iniciar grabación
   */
  const startRecording = useCallback(async () => {
    try {
      updateStatus('Iniciando grabación...');
      setState(prev => ({ ...prev, error: null }));

      // Capturar pantalla con audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      // Intentar capturar audio del sistema
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch (err) {
        console.warn('[useRecording] Could not get mic audio:', err);
      }

      // Combinar streams
      const tracks = [...displayStream.getTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 3000000, // 3 Mbps
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
        await uploadRecording(blob);
      };

      // Detectar cuando el usuario deja de compartir
      displayStream.getVideoTracks()[0].onended = () => {
        if (state.isRecording) {
          stopRecording();
        }
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
  }, [updateStatus, state.isRecording]);

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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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
      updateStatus(`Error: ${message}`);

      // Ofrecer descarga local como fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${roomId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [roomId, state.duration, updateStatus]);

  return {
    ...state,
    startRecording,
    stopRecording,
    togglePause,
  };
}
