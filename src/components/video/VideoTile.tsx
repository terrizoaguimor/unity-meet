'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Participant } from '@/types';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  showControls?: boolean;
  isMini?: boolean;
  onClick?: () => void;
  onPin?: () => void;
  className?: string;
}

/**
 * Tile individual para mostrar el video de un participante
 */
export function VideoTile({
  participant,
  isLocal = false,
  isPinned = false,
  showControls = true,
  isMini = false,
  onClick,
  onPin,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Asignar el video track al elemento cuando cambie
  useEffect(() => {
    if (videoRef.current && participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [participant.videoTrack]);

  const showVideo = !participant.isVideoOff && participant.videoTrack;

  return (
    <div
      className={cn(
        'video-container relative bg-unity-darker rounded-xl overflow-hidden',
        'transition-all duration-300',
        participant.isSpeaking && 'ring-2 ring-unity-orange',
        isPinned && 'ring-2 ring-unity-purple',
        onClick && 'cursor-pointer hover:ring-2 hover:ring-unity-purple/50',
        isMini ? 'aspect-video' : 'aspect-video',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Video */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local para evitar echo
          className={cn(
            'w-full h-full object-cover',
            isLocal && 'transform -scale-x-100' // Espejo para video local
          )}
        />
      ) : (
        // Avatar cuando no hay video
        <div className="absolute inset-0 flex items-center justify-center bg-unity-darker">
          <Avatar
            name={participant.name}
            size={isMini ? 'md' : 'xl'}
            isSpeaking={participant.isSpeaking}
          />
        </div>
      )}

      {/* Indicador de hablando */}
      {participant.isSpeaking && (
        <div className="speaking-indicator absolute inset-0 rounded-xl pointer-events-none" />
      )}

      {/* Overlay inferior con nombre y controles */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          {/* Nombre del participante */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-sm font-medium truncate">
              {participant.name}
              {isLocal && ' (Tú)'}
            </span>

            {/* Indicadores de estado */}
            <div className="flex items-center gap-1">
              {participant.isMuted && (
                <Tooltip content="Micrófono desactivado">
                  <span className="p-1 rounded bg-red-500/80">
                    <MicOffIcon className="w-3 h-3 text-white" />
                  </span>
                </Tooltip>
              )}

              {participant.isVideoOff && (
                <Tooltip content="Cámara desactivada">
                  <span className="p-1 rounded bg-red-500/80">
                    <VideoOffIcon className="w-3 h-3 text-white" />
                  </span>
                </Tooltip>
              )}

              {participant.isScreenSharing && (
                <Tooltip content="Compartiendo pantalla">
                  <span className="p-1 rounded bg-unity-purple/80">
                    <ScreenShareIcon className="w-3 h-3 text-white" />
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Botón de pin */}
          {showControls && !isMini && onPin && (
            <Tooltip content={isPinned ? 'Desfijar' : 'Fijar'}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                }}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isPinned
                    ? 'bg-unity-purple text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <PinIcon className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Badge de host */}
      {participant.isHost && (
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 text-xs font-medium bg-unity-orange text-white rounded-full">
            Host
          </span>
        </div>
      )}
    </div>
  );
}

// Iconos inline para el componente
function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 19L5 5m14 0v5a7 7 0 01-7 7m0 0a7 7 0 01-7-7V5a7 7 0 017-7m0 14v3m-4 0h8"
      />
    </svg>
  );
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function ScreenShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

export { type VideoTileProps };
