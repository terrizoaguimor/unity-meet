'use client';

import { useState, useEffect, useRef } from 'react';
import type { MediaDevice } from '@/types';

interface UseMediaDevicesReturn {
  audioInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  videoInputs: MediaDevice[];
  selectedAudioInput: string | undefined;
  selectedAudioOutput: string | undefined;
  selectedVideoInput: string | undefined;
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;
  isLoading: boolean;
  error: string | null;
  hasPermissions: boolean;
  requestPermissions: () => Promise<boolean>;
  refreshDevices: () => Promise<void>;
}

/**
 * Hook para gestionar dispositivos de medios (cámara, micrófono, altavoces)
 * Diseñado para evitar loops infinitos
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

  // Refs to prevent re-initialization and track state without causing re-renders
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const permissionsGrantedRef = useRef(false);

  // Stable function refs that don't change
  const enumerateDevicesRef = useRef<() => Promise<void>>();
  const requestPermissionsRef = useRef<() => Promise<boolean>>();

  // Initialize stable functions once
  if (!enumerateDevicesRef.current) {
    enumerateDevicesRef.current = async () => {
      if (!mountedRef.current) return;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!mountedRef.current) return;

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

        // Set defaults only if not already set
        setSelectedAudioInput((prev) => prev || audioIn[0]?.deviceId);
        setSelectedAudioOutput((prev) => prev || audioOut[0]?.deviceId);
        setSelectedVideoInput((prev) => prev || videoIn[0]?.deviceId);
      } catch (err) {
        console.error('Error enumerating devices:', err);
        if (mountedRef.current) {
          setError('No se pudieron obtener los dispositivos');
        }
      }
    };
  }

  if (!requestPermissionsRef.current) {
    requestPermissionsRef.current = async (): Promise<boolean> => {
      if (!mountedRef.current) return false;
      if (permissionsGrantedRef.current) return true;

      try {
        setIsLoading(true);
        setError(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        stream.getTracks().forEach((track) => track.stop());

        if (!mountedRef.current) return false;

        permissionsGrantedRef.current = true;
        setHasPermissions(true);
        await enumerateDevicesRef.current?.();

        return true;
      } catch (err) {
        console.error('Error requesting permissions:', err);

        if (!mountedRef.current) return false;

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
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };
  }

  // Initialize on mount - only once
  useEffect(() => {
    mountedRef.current = true;

    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devices.some((d) => d.label !== '');

        if (hasLabels && mountedRef.current) {
          permissionsGrantedRef.current = true;
          setHasPermissions(true);
          await enumerateDevicesRef.current?.();
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    init();

    // Device change listener
    const handleDeviceChange = () => {
      if (permissionsGrantedRef.current) {
        enumerateDevicesRef.current?.();
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      mountedRef.current = false;
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []); // Empty deps - only run once

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
    requestPermissions: requestPermissionsRef.current,
    refreshDevices: enumerateDevicesRef.current,
  };
}
