'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaDevice } from '@/types';

interface UseMediaDevicesReturn {
  // Listas de dispositivos
  audioInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  videoInputs: MediaDevice[];

  // Dispositivos seleccionados
  selectedAudioInput: string | undefined;
  selectedAudioOutput: string | undefined;
  selectedVideoInput: string | undefined;

  // Setters
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;

  // Estado
  isLoading: boolean;
  error: string | null;
  hasPermissions: boolean;

  // Acciones
  requestPermissions: () => Promise<boolean>;
  refreshDevices: () => Promise<void>;
}

/**
 * Hook para gestionar dispositivos de medios (cámara, micrófono, altavoces)
 */
export function useMediaDevices(): UseMediaDevicesReturn {
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>();
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>();
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Use refs to avoid infinite loops in callbacks
  const hasInitializedRef = useRef(false);
  const selectedAudioInputRef = useRef(selectedAudioInput);
  const selectedAudioOutputRef = useRef(selectedAudioOutput);
  const selectedVideoInputRef = useRef(selectedVideoInput);

  // Keep refs in sync
  useEffect(() => {
    selectedAudioInputRef.current = selectedAudioInput;
    selectedAudioOutputRef.current = selectedAudioOutput;
    selectedVideoInputRef.current = selectedVideoInput;
  }, [selectedAudioInput, selectedAudioOutput, selectedVideoInput]);

  /**
   * Obtener lista de dispositivos disponibles
   */
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioIn: MediaDevice[] = [];
      const audioOut: MediaDevice[] = [];
      const videoIn: MediaDevice[] = [];

      devices.forEach((device) => {
        const mediaDevice: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind as MediaDevice['kind'],
        };

        switch (device.kind) {
          case 'audioinput':
            audioIn.push(mediaDevice);
            break;
          case 'audiooutput':
            audioOut.push(mediaDevice);
            break;
          case 'videoinput':
            videoIn.push(mediaDevice);
            break;
        }
      });

      setAudioInputs(audioIn);
      setAudioOutputs(audioOut);
      setVideoInputs(videoIn);

      // Seleccionar dispositivos por defecto si no hay selección (only once)
      if (!selectedAudioInputRef.current && audioIn.length > 0) {
        setSelectedAudioInput(audioIn[0].deviceId);
      }
      if (!selectedAudioOutputRef.current && audioOut.length > 0) {
        setSelectedAudioOutput(audioOut[0].deviceId);
      }
      if (!selectedVideoInputRef.current && videoIn.length > 0) {
        setSelectedVideoInput(videoIn[0].deviceId);
      }
    } catch (err) {
      console.error('Error al enumerar dispositivos:', err);
      setError('No se pudieron obtener los dispositivos');
    }
  }, []); // No dependencies - uses refs instead

  /**
   * Solicitar permisos de cámara y micrófono
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Solicitar acceso a cámara y micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Detener los tracks inmediatamente (solo queríamos permisos)
      stream.getTracks().forEach((track) => track.stop());

      setHasPermissions(true);

      // Ahora que tenemos permisos, podemos obtener los labels de dispositivos
      await enumerateDevices();

      return true;
    } catch (err) {
      console.error('Error al solicitar permisos:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permisos de cámara/micrófono denegados');
        } else if (err.name === 'NotFoundError') {
          setError('No se encontró cámara o micrófono');
        } else {
          setError('Error al acceder a dispositivos de medios');
        }
      }

      setHasPermissions(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [enumerateDevices]);

  /**
   * Refrescar lista de dispositivos
   */
  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    await enumerateDevices();
    setIsLoading(false);
  }, [enumerateDevices]);

  // Escuchar cambios en dispositivos (conectar/desconectar)
  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  // Verificar permisos iniciales - only run once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const checkInitialPermissions = async () => {
      try {
        // Intentar enumerar dispositivos para ver si ya tenemos permisos
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Si algún dispositivo tiene label, significa que tenemos permisos
        const hasLabels = devices.some((d) => d.label !== '');

        if (hasLabels) {
          setHasPermissions(true);
          await enumerateDevices();
        }
      } catch (err) {
        console.error('Error verificando permisos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialPermissions();
  }, [enumerateDevices]);

  return {
    audioInputs,
    audioOutputs,
    videoInputs,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    setSelectedVideoInput,
    isLoading,
    error,
    hasPermissions,
    requestPermissions,
    refreshDevices,
  };
}
