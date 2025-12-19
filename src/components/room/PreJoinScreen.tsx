'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useMediaDevices } from '@/hooks/useMediaDevices';

interface PreJoinScreenProps {
  roomName?: string;
  onJoin: (userName: string, settings: MediaSettings) => void;
  isLoading?: boolean;
  error?: string | null;
}

interface MediaSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

/**
 * Pantalla de pre-unirse a la reunión
 * Permite configurar nombre, cámara y micrófono antes de entrar
 */
export function PreJoinScreen({
  roomName,
  onJoin,
  isLoading = false,
  error,
}: PreJoinScreenProps) {
  const [userName, setUserName] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hasInitializedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  const {
    audioInputs,
    videoInputs,
    selectedAudioInput,
    selectedVideoInput,
    setSelectedAudioInput,
    setSelectedVideoInput,
    requestPermissions,
    hasPermissions,
    isLoading: isLoadingDevices,
  } = useMediaDevices();

  // Keep ref in sync with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Get media stream with specified devices
  const getMediaStream = useCallback(async (audioId?: string, videoId?: string) => {
    try {
      // Stop previous stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioId ? { deviceId: { exact: audioId } } : true,
        video: videoId ? { deviceId: { exact: videoId } } : true,
      });
      setLocalStream(stream);
      setPermissionError(null);
      return true;
    } catch (err) {
      console.error('Error obteniendo media:', err);
      setPermissionError('No se pudo acceder a la cámara/micrófono');
      return false;
    }
  }, []);

  // Initial permission request - only runs once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initMedia = async () => {
      const granted = await requestPermissions();
      if (!granted) {
        setPermissionError('Se requieren permisos de cámara y micrófono');
        return;
      }
      // Initial stream with default devices
      await getMediaStream();
    };

    initMedia();

    // Cleanup on unmount
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [requestPermissions, getMediaStream]);

  // Update stream when device selection changes (after initial setup)
  useEffect(() => {
    // Skip if not initialized or no permissions yet
    if (!hasPermissions || !hasInitializedRef.current) return;
    // Skip the very first render after initialization
    if (!localStreamRef.current) return;

    getMediaStream(selectedAudioInput, selectedVideoInput);
  }, [selectedAudioInput, selectedVideoInput, hasPermissions, getMediaStream]);

  // Actualizar video preview
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(!videoEnabled);
  };

  // Handle join
  const handleJoin = () => {
    if (!userName.trim()) return;

    onJoin(userName.trim(), {
      audioEnabled,
      videoEnabled,
      audioDeviceId: selectedAudioInput,
      videoDeviceId: selectedVideoInput,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-unity-purple/10 to-unity-orange/10 dark:from-unity-darker dark:to-unity-dark-gray flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-unity-dark-gray dark:text-white mb-2">
            {roomName || 'Unirse a la reunión'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configura tu cámara y micrófono antes de unirte
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Video Preview */}
          <div className="space-y-4">
            <div className="relative aspect-video bg-unity-darker rounded-2xl overflow-hidden">
              {videoEnabled && localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar name={userName || 'Usuario'} size="xl" />
                </div>
              )}

              {/* Controles de preview */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button
                  onClick={toggleAudio}
                  className={cn(
                    'p-3 rounded-full transition-colors',
                    audioEnabled
                      ? 'bg-unity-purple/20 text-unity-purple'
                      : 'bg-red-500/20 text-red-500'
                  )}
                  disabled={!hasPermissions}
                >
                  {audioEnabled ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className={cn(
                    'p-3 rounded-full transition-colors',
                    videoEnabled
                      ? 'bg-unity-purple/20 text-unity-purple'
                      : 'bg-red-500/20 text-red-500'
                  )}
                  disabled={!hasPermissions}
                >
                  {videoEnabled ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25zM3 3l18 18"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Error de permisos */}
              {permissionError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 mx-auto text-red-500 mb-2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <p className="text-white text-sm">{permissionError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={requestPermissions}
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuración */}
          <div className="bg-white dark:bg-unity-dark-gray rounded-2xl p-6 shadow-lg">
            <div className="space-y-6">
              {/* Nombre */}
              <Input
                label="Tu nombre"
                placeholder="Ingresa tu nombre"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />

              {/* Selección de micrófono */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-unity-dark-gray dark:text-unity-light-gray">
                  Micrófono
                </label>
                <select
                  value={selectedAudioInput}
                  onChange={(e) => setSelectedAudioInput(e.target.value)}
                  disabled={isLoadingDevices || !hasPermissions}
                  className="w-full h-10 px-3 rounded-lg border border-unity-light-gray dark:border-gray-600 bg-white dark:bg-unity-darker text-unity-dark-gray dark:text-unity-light-gray focus:outline-none focus:ring-2 focus:ring-unity-purple"
                >
                  {audioInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de cámara */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-unity-dark-gray dark:text-unity-light-gray">
                  Cámara
                </label>
                <select
                  value={selectedVideoInput}
                  onChange={(e) => setSelectedVideoInput(e.target.value)}
                  disabled={isLoadingDevices || !hasPermissions}
                  className="w-full h-10 px-3 rounded-lg border border-unity-light-gray dark:border-gray-600 bg-white dark:bg-unity-darker text-unity-dark-gray dark:text-unity-light-gray focus:outline-none focus:ring-2 focus:ring-unity-purple"
                >
                  {videoInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Botón de unirse */}
              <Button
                onClick={handleJoin}
                disabled={!userName.trim() || isLoading || !hasPermissions}
                isLoading={isLoading}
                className="w-full"
                size="lg"
              >
                Unirse ahora
              </Button>

              {/* Indicadores de estado */}
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      audioEnabled ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  {audioEnabled ? 'Micrófono activo' : 'Micrófono apagado'}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      videoEnabled ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  {videoEnabled ? 'Cámara activa' : 'Cámara apagada'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
