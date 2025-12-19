'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';

interface LocalVideoProps {
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  userName: string;
  isMini?: boolean;
  className?: string;
}

/**
 * Componente para mostrar el video local del usuario
 */
export function LocalVideo({
  stream,
  isVideoEnabled,
  isAudioEnabled,
  userName,
  isMini = false,
  className,
}: LocalVideoProps) {
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

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-unity-darker',
        isMini ? 'aspect-video' : 'aspect-video',
        className
      )}
    >
      {isVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // Siempre muted para evitar echo
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-unity-darker">
          <Avatar name={userName} size={isMini ? 'md' : 'lg'} />
        </div>
      )}

      {/* Indicadores de estado */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <span className="text-white text-xs font-medium bg-black/50 px-2 py-0.5 rounded">
          {userName} (Tú)
        </span>
      </div>

      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {!isAudioEnabled && (
          <span className="p-1 rounded bg-red-500/80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3 h-3 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 19L5 5m14 0v5a7 7 0 01-7 7m0 0a7 7 0 01-7-7V5a7 7 0 017-7m0 14v3m-4 0h8"
              />
            </svg>
          </span>
        )}

        {!isVideoEnabled && (
          <span className="p-1 rounded bg-red-500/80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3 h-3 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
