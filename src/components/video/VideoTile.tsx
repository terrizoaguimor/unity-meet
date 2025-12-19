'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { NetworkBadge } from '@/components/ui/NetworkIndicator';
import { FloatingReactions, useFloatingReactions } from '@/components/room/FloatingReactions';
import type { Participant } from '@/types';
import type { NetworkQualityInfo } from '@/lib/telnyx/qualityPresets';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  showControls?: boolean;
  isMini?: boolean;
  onClick?: () => void;
  onPin?: () => void;
  onReaction?: (emoji: string) => void;
  networkQuality?: NetworkQualityInfo;
  isHandRaised?: boolean;
  className?: string;
}

/**
 * Tile mejorado para mostrar el video de un participante
 * Incluye indicadores de red, reacciones flotantes, mano levantada, etc.
 */
export function VideoTile({
  participant,
  isLocal = false,
  isPinned = false,
  showControls = true,
  isMini = false,
  onClick,
  onPin,
  onReaction,
  networkQuality,
  isHandRaised = false,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { reactions, addReaction, removeReaction } = useFloatingReactions();

  // Handle incoming reactions
  useEffect(() => {
    if (onReaction) {
      // This could be connected to a WebSocket or other real-time source
    }
  }, [onReaction]);

  // Asignar el video track al elemento cuando cambie
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoElement.srcObject = stream;
      setIsLoading(true);

      const handlePlaying = () => setIsLoading(false);
      videoElement.addEventListener('playing', handlePlaying);

      return () => {
        videoElement.removeEventListener('playing', handlePlaying);
        videoElement.srcObject = null;
      };
    } else {
      setIsLoading(false);
    }
  }, [participant.videoTrack]);

  const showVideo = !participant.isVideoOff && participant.videoTrack;

  // Determine role badge
  const getRoleBadge = () => {
    if (participant.isHost) return { text: 'Host', color: 'bg-unity-orange' };
    if ((participant as Participant & { isCoHost?: boolean }).isCoHost) return { text: 'Co-host', color: 'bg-unity-purple' };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <div
      className={cn(
        'video-container relative bg-unity-darker rounded-2xl overflow-hidden',
        'transition-all duration-300 group',
        // Speaking glow effect
        participant.isSpeaking && 'ring-2 ring-unity-orange shadow-[0_0_20px_rgba(241,137,24,0.4)]',
        isPinned && 'ring-2 ring-unity-purple shadow-[0_0_15px_rgba(81,39,131,0.3)]',
        onClick && 'cursor-pointer',
        isMini ? 'aspect-video' : 'aspect-video',
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Floating Reactions */}
      <FloatingReactions reactions={reactions} onReactionComplete={removeReaction} />

      {/* Video */}
      {showVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLocal && 'transform -scale-x-100',
              isLoading && 'opacity-0'
            )}
          />
          {/* Loading skeleton */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-unity-darker">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-neutral-700 animate-pulse" />
                <div className="w-24 h-3 rounded bg-neutral-700 animate-pulse" />
              </div>
            </div>
          )}
        </>
      ) : (
        // Avatar cuando no hay video
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
          <div className="relative">
            <Avatar
              name={participant.name}
              size={isMini ? 'md' : 'xl'}
              isSpeaking={participant.isSpeaking}
            />
            {participant.isSpeaking && (
              <div className="absolute -inset-2 rounded-full border-2 border-unity-orange animate-ping opacity-50" />
            )}
          </div>
        </div>
      )}

      {/* Speaking indicator wave */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 rounded-2xl border-2 border-unity-orange/50 animate-pulse" />
        </div>
      )}

      {/* Top-left badges */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        {/* Role badge */}
        {roleBadge && (
          <span className={cn(
            'px-2 py-0.5 text-xs font-semibold text-white rounded-full shadow-lg',
            roleBadge.color
          )}>
            {roleBadge.text}
          </span>
        )}

        {/* Hand raised indicator */}
        {isHandRaised && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-unity-orange text-white rounded-full shadow-lg animate-bounce">
            <span>✋</span>
            {!isMini && <span>Mano</span>}
          </span>
        )}
      </div>

      {/* Top-right network indicator */}
      {networkQuality && !isMini && (
        <div className="absolute top-2 right-2">
          <NetworkBadge quality={networkQuality} />
        </div>
      )}

      {/* Overlay inferior con nombre y controles */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 p-3 transition-all duration-300',
        'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
        isMini && 'p-2'
      )}>
        <div className="flex items-center justify-between gap-2">
          {/* Nombre del participante y estado */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={cn(
              'text-white font-medium truncate',
              isMini ? 'text-xs' : 'text-sm'
            )}>
              {participant.name}
              {isLocal && <span className="text-white/60 ml-1">(Tú)</span>}
            </span>

            {/* Indicadores de estado */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {participant.isMuted && (
                <Tooltip content="Micrófono desactivado">
                  <span className="p-1 rounded-md bg-red-500/90 shadow-sm">
                    <MicOffIcon className={cn('text-white', isMini ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
                  </span>
                </Tooltip>
              )}

              {participant.isVideoOff && (
                <Tooltip content="Cámara desactivada">
                  <span className="p-1 rounded-md bg-red-500/90 shadow-sm">
                    <VideoOffIcon className={cn('text-white', isMini ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
                  </span>
                </Tooltip>
              )}

              {participant.isScreenSharing && (
                <Tooltip content="Compartiendo pantalla">
                  <span className="p-1 rounded-md bg-unity-purple/90 shadow-sm">
                    <ScreenShareIcon className={cn('text-white', isMini ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Hover controls */}
          {showControls && !isMini && (
            <div className={cn(
              'flex items-center gap-1 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              {/* Pin button */}
              {onPin && (
                <Tooltip content={isPinned ? 'Desfijar' : 'Fijar participante'}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin();
                    }}
                    className={cn(
                      'p-1.5 rounded-lg transition-all duration-200',
                      isPinned
                        ? 'bg-unity-purple text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    )}
                  >
                    <PinIcon className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}

              {/* Reaction button (for testing) */}
              {!isLocal && (
                <Tooltip content="Reaccionar">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addReaction('👏');
                    }}
                    className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all duration-200"
                  >
                    <span className="text-sm">👏</span>
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions on hover (for non-mini tiles) */}
      {showControls && !isMini && isLocal && isHovered && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-black/60 backdrop-blur-sm">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addReaction('👍');
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Reacción rápida"
            >
              <span className="text-2xl">👍</span>
            </button>
          </div>
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
