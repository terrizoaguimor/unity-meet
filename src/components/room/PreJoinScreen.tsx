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
  const [isInitialized, setIsInitialized] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Get media stream - updates ref synchronously to avoid race conditions
  const getMediaStream = useCallback(async (audioId?: string, videoId?: string) => {
    try {
      // Stop previous stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        audio: audioId ? { deviceId: { exact: audioId } } : true,
        video: videoId ? { deviceId: { exact: videoId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Update ref first (synchronous), then state
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPermissionError(null);
      return stream;
    } catch (err) {
      console.error('Error obteniendo media:', err);
      setPermissionError('No se pudo acceder a la cámara/micrófono');
      return null;
    }
  }, []);

  // Initial setup - only runs once
  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      const granted = await requestPermissions();
      if (!mounted) return;

      if (!granted) {
        setPermissionError('Se requieren permisos de cámara y micrófono');
        return;
      }

      await getMediaStream();
      if (mounted) {
        setIsInitialized(true);
      }
    };

    initMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle device selection change - only after initialization
  const handleAudioDeviceChange = useCallback(async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    if (isInitialized && hasPermissions) {
      await getMediaStream(deviceId, selectedVideoInput);
    }
  }, [isInitialized, hasPermissions, selectedVideoInput, setSelectedAudioInput, getMediaStream]);

  const handleVideoDeviceChange = useCallback(async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    if (isInitialized && hasPermissions) {
      await getMediaStream(selectedAudioInput, deviceId);
    }
  }, [isInitialized, hasPermissions, selectedAudioInput, setSelectedVideoInput, getMediaStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled((prev) => !prev);
  }, [localStream, audioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled((prev) => !prev);
  }, [localStream, videoEnabled]);

  // Handle join
  const handleJoin = useCallback(() => {
    if (!userName.trim()) return;

    onJoin(userName.trim(), {
      audioEnabled,
      videoEnabled,
      audioDeviceId: selectedAudioInput,
      videoDeviceId: selectedVideoInput,
    });
  }, [userName, audioEnabled, videoEnabled, selectedAudioInput, selectedVideoInput, onJoin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white mb-4 shadow-lg shadow-primary-500/25">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            {roomName || 'Unirse a la reunión'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Configura tu cámara y micrófono antes de unirte
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Video Preview - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-neutral-200 dark:ring-neutral-800">
              {/* Video o Avatar */}
              {videoEnabled && localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                  <div className="text-center">
                    <Avatar name={userName || 'Usuario'} size="xl" />
                    {!videoEnabled && (
                      <p className="mt-3 text-sm text-neutral-400">Cámara apagada</p>
                    )}
                  </div>
                </div>
              )}

              {/* Nombre del usuario */}
              {userName && (
                <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                  <span className="text-sm font-medium text-white">{userName}</span>
                </div>
              )}

              {/* Controles de preview */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  onClick={toggleAudio}
                  className={cn(
                    'p-3 rounded-full transition-all shadow-lg',
                    audioEnabled
                      ? 'bg-neutral-800/80 hover:bg-neutral-700/80 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  )}
                  disabled={!hasPermissions}
                  title={audioEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
                >
                  {audioEnabled ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3.27 3.27l17.46 17.46" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className={cn(
                    'p-3 rounded-full transition-all shadow-lg',
                    videoEnabled
                      ? 'bg-neutral-800/80 hover:bg-neutral-700/80 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  )}
                  disabled={!hasPermissions}
                  title={videoEnabled ? 'Apagar cámara' : 'Encender cámara'}
                >
                  {videoEnabled ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25zM3.27 3.27l17.46 17.46" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Error de permisos */}
              {permissionError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                  <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Permisos requeridos</h3>
                    <p className="text-neutral-400 text-sm mb-4">{permissionError}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setPermissionError(null);
                        requestPermissions().then((granted) => {
                          if (granted) getMediaStream();
                        });
                      }}
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicators below video */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <span className={cn('w-2.5 h-2.5 rounded-full', audioEnabled ? 'bg-green-500' : 'bg-red-500')} />
                {audioEnabled ? 'Micrófono activo' : 'Micrófono apagado'}
              </span>
              <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <span className={cn('w-2.5 h-2.5 rounded-full', videoEnabled ? 'bg-green-500' : 'bg-red-500')} />
                {videoEnabled ? 'Cámara activa' : 'Cámara apagada'}
              </span>
            </div>
          </div>

          {/* Configuration Panel - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-700 h-full">
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    Antes de unirte
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Ingresa tu nombre y configura tus dispositivos
                  </p>
                </div>

                {/* Nombre */}
                <Input
                  label="Tu nombre"
                  placeholder="¿Cómo te llamamos?"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                {/* Selección de micrófono */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                    Micrófono
                  </label>
                  <select
                    value={selectedAudioInput || ''}
                    onChange={(e) => handleAudioDeviceChange(e.target.value)}
                    disabled={isLoadingDevices || !hasPermissions}
                    className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  >
                    {audioInputs.length === 0 && (
                      <option value="">Cargando dispositivos...</option>
                    )}
                    {audioInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selección de cámara */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Cámara
                  </label>
                  <select
                    value={selectedVideoInput || ''}
                    onChange={(e) => handleVideoDeviceChange(e.target.value)}
                    disabled={isLoadingDevices || !hasPermissions}
                    className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  >
                    {videoInputs.length === 0 && (
                      <option value="">Cargando dispositivos...</option>
                    )}
                    {videoInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Botón de unirse */}
                <Button
                  onClick={handleJoin}
                  disabled={!userName.trim() || isLoading || !hasPermissions}
                  isLoading={isLoading}
                  className="w-full mt-2"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Unirse ahora
                </Button>

                {/* Tips */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Asegúrate de tener buena iluminación y un lugar silencioso
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
