'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface ScreenShareProps {
  stream: MediaStream | null;
  participantName?: string;
  isLocal?: boolean;
  onStopSharing?: () => void;
  className?: string;
}

/**
 * Componente para mostrar pantalla compartida
 */
export function ScreenShare({
  stream,
  participantName,
  isLocal = false,
  onStopSharing,
  className,
}: ScreenShareProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-black',
        'aspect-video max-h-full',
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Overlay con información */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Icono de pantalla */}
            <span className="p-1.5 rounded-lg bg-unity-purple/80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                />
              </svg>
            </span>

            <span className="text-white text-sm font-medium">
              {isLocal
                ? 'Estás compartiendo tu pantalla'
                : `${participantName} está compartiendo pantalla`}
            </span>
          </div>

          {/* Botón para dejar de compartir (solo local) */}
          {isLocal && onStopSharing && (
            <button
              onClick={onStopSharing}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              Dejar de compartir
            </button>
          )}
        </div>
      </div>

      {/* Indicador de que es compartir pantalla */}
      <div className="absolute bottom-3 right-3">
        <span className="px-2 py-1 text-xs font-medium text-white bg-unity-purple rounded-full">
          Pantalla
        </span>
      </div>
    </div>
  );
}
