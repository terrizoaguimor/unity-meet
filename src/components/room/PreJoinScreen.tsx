'use client';

import { useState, useRef, useEffect } from 'react';
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
 * Basado en el patrón de telnyx-meet - sin useCallback problemáticos
 */
export function PreJoinScreen({
  roomName,
  onJoin,
  isLoading = false,
  error,
}: PreJoinScreenProps) {
  // Estado básico
  const [userName, setUserName] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Tracks locales (como en telnyx-meet)
  const [localTracks, setLocalTracks] = useState<{
    audio: MediaStreamTrack | undefined;
    video: MediaStreamTrack | undefined;
  }>({
    audio: undefined,
    video: undefined,
  });

  // Dispositivos
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Efecto para mostrar video cuando hay track
  useEffect(() => {
    if (!videoRef.current) return;

    if (localTracks.video) {
      videoRef.current.srcObject = new MediaStream([localTracks.video]);
    } else {
      videoRef.current.srcObject = null;
    }
  }, [localTracks.video]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (localTracks.audio) {
        localTracks.audio.stop();
      }
      if (localTracks.video) {
        localTracks.video.stop();
      }
    };
  }, []); // Solo cleanup al desmontar

  // Cargar dispositivos al montar
  useEffect(() => {
    loadDevices();
  }, []);

  // Función simple para cargar dispositivos
  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioDevices: DeviceInfo[] = [];
      const videoDevices: DeviceInfo[] = [];

      devices.forEach(device => {
        if (device.kind === 'audioinput' && device.deviceId) {
          audioDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Micrófono ${audioDevices.length + 1}`,
          });
        } else if (device.kind === 'videoinput' && device.deviceId) {
          videoDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Cámara ${videoDevices.length + 1}`,
          });
        }
      });

      setAudioInputs(audioDevices);
      setVideoInputs(videoDevices);

      if (audioDevices.length > 0 && !selectedAudioId) {
        setSelectedAudioId(audioDevices[0].deviceId);
      }
      if (videoDevices.length > 0 && !selectedVideoId) {
        setSelectedVideoId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  };

  // Obtener track de audio
  const getAudioTrack = async (deviceId?: string): Promise<MediaStreamTrack | undefined> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      return stream.getAudioTracks()[0];
    } catch (err) {
      console.error('Error getting audio:', err);
      return undefined;
    }
  };

  // Obtener track de video
  const getVideoTrack = async (deviceId?: string): Promise<MediaStreamTrack | undefined> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      // Recargar dispositivos después de obtener permisos
      loadDevices();
      return stream.getVideoTracks()[0];
    } catch (err) {
      console.error('Error getting video:', err);
      return undefined;
    }
  };

  // Handler para toggle de audio
  const handleAudioToggle = async () => {
    setPermissionError(null);

    if (localTracks.audio) {
      // Apagar audio
      localTracks.audio.stop();
      setLocalTracks(prev => ({ ...prev, audio: undefined }));
      setIsAudioEnabled(false);
    } else {
      // Encender audio
      const track = await getAudioTrack(selectedAudioId);
      if (track) {
        setLocalTracks(prev => ({ ...prev, audio: track }));
        setIsAudioEnabled(true);
      } else {
        setPermissionError('No se pudo acceder al micrófono');
      }
    }
  };

  // Handler para toggle de video
  const handleVideoToggle = async () => {
    setPermissionError(null);

    if (localTracks.video) {
      // Apagar video
      localTracks.video.stop();
      setLocalTracks(prev => ({ ...prev, video: undefined }));
      setIsVideoEnabled(false);
    } else {
      // Encender video
      const track = await getVideoTrack(selectedVideoId);
      if (track) {
        setLocalTracks(prev => ({ ...prev, video: track }));
        setIsVideoEnabled(true);
      } else {
        setPermissionError('No se pudo acceder a la cámara');
      }
    }
  };

  // Handler para cambio de dispositivo de audio
  const handleAudioDeviceChange = async (deviceId: string) => {
    setSelectedAudioId(deviceId);

    if (localTracks.audio) {
      localTracks.audio.stop();
      const track = await getAudioTrack(deviceId);
      setLocalTracks(prev => ({ ...prev, audio: track }));
    }
  };

  // Handler para cambio de dispositivo de video
  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoId(deviceId);

    if (localTracks.video) {
      localTracks.video.stop();
      const track = await getVideoTrack(deviceId);
      setLocalTracks(prev => ({ ...prev, video: track }));
    }
  };

  // Handler para unirse
  const handleJoin = () => {
    if (!userName.trim()) return;

    onJoin(userName.trim(), {
      audioEnabled: isAudioEnabled,
      videoEnabled: isVideoEnabled,
      audioDeviceId: selectedAudioId,
      videoDeviceId: selectedVideoId,
    });
  };

  const hasMediaAccess = isAudioEnabled || isVideoEnabled;

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
              {isVideoEnabled && localTracks.video ? (
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
                    <p className="mt-4 text-sm text-neutral-400">
                      {!hasMediaAccess
                        ? 'Activa tu cámara o micrófono para comenzar'
                        : 'Cámara desactivada'}
                    </p>
                  </div>
                </div>
              )}

              {userName && isVideoEnabled && (
                <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                  <span className="text-sm font-medium text-white">{userName}</span>
                </div>
              )}

              {/* Controles de preview */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  onClick={handleAudioToggle}
                  className={cn(
                    'p-3 rounded-full transition-all shadow-lg',
                    isAudioEnabled
                      ? 'bg-neutral-800/80 hover:bg-neutral-700/80 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isAudioEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19L5 5m14 0v5a7 7 0 01-7 7m0 0a7 7 0 01-7-7V5" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={handleVideoToggle}
                  className={cn(
                    'p-3 rounded-full transition-all shadow-lg',
                    isVideoEnabled
                      ? 'bg-neutral-800/80 hover:bg-neutral-700/80 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isVideoEnabled ? (
                      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
                    )}
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
                    <Button onClick={() => setPermissionError(null)} variant="primary" size="sm">
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <span className={cn('w-2.5 h-2.5 rounded-full', isAudioEnabled ? 'bg-green-500' : 'bg-red-500')} />
                {isAudioEnabled ? 'Micrófono activo' : 'Micrófono apagado'}
              </span>
              <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <span className={cn('w-2.5 h-2.5 rounded-full', isVideoEnabled ? 'bg-green-500' : 'bg-red-500')} />
                {isVideoEnabled ? 'Cámara activa' : 'Cámara apagada'}
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

                {/* Device selectors */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                    Micrófono
                  </label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => handleAudioDeviceChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    {audioInputs.length === 0 && (
                      <option value="">No hay micrófonos disponibles</option>
                    )}
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
                    value={selectedVideoId}
                    onChange={(e) => handleVideoDeviceChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    {videoInputs.length === 0 && (
                      <option value="">No hay cámaras disponibles</option>
                    )}
                    {videoInputs.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Join button */}
                <Button
                  onClick={handleJoin}
                  disabled={!userName.trim() || isLoading}
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
