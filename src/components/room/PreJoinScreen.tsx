'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';

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

interface DeviceInfo {
  deviceId: string;
  label: string;
}

/**
 * Pantalla de pre-unirse a la reunión
 * Versión simplificada sin efectos automáticos para evitar loops
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
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Solicitar permisos manualmente (no en useEffect)
  const requestMediaAccess = useCallback(async () => {
    if (isRequestingPermissions) return;

    setIsRequestingPermissions(true);
    setPermissionError(null);

    try {
      // Detener stream anterior si existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Solicitar acceso a cámara y micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
        video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput } } : true,
      });

      streamRef.current = stream;
      setLocalStream(stream);
      setHasPermissions(true);

      // Actualizar video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Obtener lista de dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioDevices: DeviceInfo[] = [];
      const videoDevices: DeviceInfo[] = [];

      devices.forEach(device => {
        if (device.kind === 'audioinput') {
          audioDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Micrófono ${audioDevices.length + 1}`,
          });
        } else if (device.kind === 'videoinput') {
          videoDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Cámara ${videoDevices.length + 1}`,
          });
        }
      });

      setAudioInputs(audioDevices);
      setVideoInputs(videoDevices);

      // Seleccionar dispositivos por defecto
      if (!selectedAudioInput && audioDevices.length > 0) {
        setSelectedAudioInput(audioDevices[0].deviceId);
      }
      if (!selectedVideoInput && videoDevices.length > 0) {
        setSelectedVideoInput(videoDevices[0].deviceId);
      }

    } catch (err) {
      console.error('Error accessing media:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setPermissionError('Permisos de cámara/micrófono denegados');
        } else if (err.name === 'NotFoundError') {
          setPermissionError('No se encontró cámara o micrófono');
        } else {
          setPermissionError('Error al acceder a dispositivos');
        }
      }
      setHasPermissions(false);
    } finally {
      setIsRequestingPermissions(false);
    }
  }, [selectedAudioInput, selectedVideoInput, isRequestingPermissions]);

  // Cambiar dispositivo de audio
  const handleAudioDeviceChange = useCallback(async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    if (hasPermissions) {
      // Re-solicitar con nuevo dispositivo
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput } } : true,
        });
        streamRef.current = stream;
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error changing audio device:', err);
      }
    }
  }, [hasPermissions, selectedVideoInput]);

  // Cambiar dispositivo de video
  const handleVideoDeviceChange = useCallback(async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    if (hasPermissions) {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
          video: { deviceId: { exact: deviceId } },
        });
        streamRef.current = stream;
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error changing video device:', err);
      }
    }
  }, [hasPermissions, selectedAudioInput]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(prev => !prev);
  }, [localStream, audioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(prev => !prev);
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
          {/* Video Preview */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-neutral-200 dark:ring-neutral-800">
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
                    {!hasPermissions && (
                      <p className="mt-4 text-sm text-neutral-400">
                        Haz clic en el botón para activar tu cámara
                      </p>
                    )}
                  </div>
                </div>
              )}

              {userName && localStream && (
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
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
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
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </button>
              </div>

              {/* Error overlay */}
              {permissionError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-white mb-4">{permissionError}</p>
                    <Button onClick={requestMediaAccess} variant="primary" size="sm">
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicators */}
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

          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-700 h-full">
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    Antes de unirte
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {hasPermissions
                      ? 'Ingresa tu nombre y configura tus dispositivos'
                      : 'Primero activa tu cámara y micrófono'}
                  </p>
                </div>

                {/* Botón para activar cámara/micrófono */}
                {!hasPermissions && (
                  <Button
                    onClick={requestMediaAccess}
                    isLoading={isRequestingPermissions}
                    className="w-full"
                    variant="secondary"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Activar cámara y micrófono
                  </Button>
                )}

                {/* Nombre */}
                <Input
                  label="Tu nombre"
                  placeholder="¿Cómo te llamamos?"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && hasPermissions && handleJoin()}
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                {/* Device selectors - solo si tiene permisos */}
                {hasPermissions && (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Micrófono
                      </label>
                      <select
                        value={selectedAudioInput}
                        onChange={(e) => handleAudioDeviceChange(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        {audioInputs.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        Cámara
                      </label>
                      <select
                        value={selectedVideoInput}
                        onChange={(e) => handleVideoDeviceChange(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        {videoInputs.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Join button */}
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

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Asegúrate de tener buena iluminación
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
