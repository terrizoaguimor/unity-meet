'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils/cn';
import { VideoTile } from './VideoTile';
import { useParticipants, getGridDataCount } from '@/hooks/useParticipants';
import type { Participant, VideoLayout } from '@/types';

interface VideoGridProps {
  localStream?: MediaStream | null;
  className?: string;
}

/**
 * Grid adaptativo para mostrar los videos de los participantes
 */
export function VideoGrid({ className }: VideoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const {
    sortedParticipants,
    participantCount,
    pinnedParticipant,
    isPinned,
    pinParticipant,
    layout,
  } = useParticipants();

  // Debug logging
  useEffect(() => {
    console.log('[VideoGrid] Rendering with:', {
      participantCount,
      sortedParticipantsCount: sortedParticipants.length,
      participants: sortedParticipants.map(p => ({
        id: p.id,
        name: p.name,
        hasVideoTrack: !!p.videoTrack,
        hasAudioTrack: !!p.audioTrack,
        isVideoOff: p.isVideoOff,
      })),
      layout,
      dataCount: getGridDataCount(participantCount),
    });
  }, [sortedParticipants, participantCount, layout]);

  // Animar entrada de nuevos participantes
  useEffect(() => {
    if (!gridRef.current) return;

    const tiles = gridRef.current.querySelectorAll('.video-tile');
    tiles.forEach((tile, index) => {
      if (!(tile as HTMLElement).dataset.animated) {
        gsap.from(tile, {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          delay: index * 0.1,
          ease: 'back.out(1.7)',
        });
        (tile as HTMLElement).dataset.animated = 'true';
      }
    });
  }, [participantCount]);

  // Layout: Speaker view
  if (layout === 'speaker' && pinnedParticipant) {
    return (
      <div className={cn('flex flex-col h-full gap-2 p-2', className)}>
        {/* Video principal (fijado) */}
        <div className="flex-1 min-h-0">
          <VideoTile
            participant={pinnedParticipant}
            isLocal={pinnedParticipant.id === 'local'}
            isPinned={true}
            onPin={() => pinParticipant(null)}
            className="w-full h-full"
          />
        </div>

        {/* Strip de otros participantes */}
        {sortedParticipants.length > 1 && (
          <div className="flex gap-2 h-32 overflow-x-auto pb-2">
            {sortedParticipants
              .filter((p) => p.id !== pinnedParticipant.id)
              .map((participant) => (
                <VideoTile
                  key={participant.id}
                  participant={participant}
                  isLocal={participant.id === 'local'}
                  isMini
                  onClick={() => pinParticipant(participant.id)}
                  className="flex-shrink-0 w-48 video-tile"
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  // Layout: Sidebar
  if (layout === 'sidebar') {
    const mainParticipant = pinnedParticipant || sortedParticipants[0];
    const sideParticipants = sortedParticipants.filter(
      (p) => p.id !== mainParticipant?.id
    );

    return (
      <div className={cn('flex h-full gap-2 p-2', className)}>
        {/* Video principal */}
        <div className="flex-1 min-w-0">
          {mainParticipant && (
            <VideoTile
              participant={mainParticipant}
              isLocal={mainParticipant.id === 'local'}
              isPinned={isPinned(mainParticipant.id)}
              onPin={() =>
                pinParticipant(isPinned(mainParticipant.id) ? null : mainParticipant.id)
              }
              className="w-full h-full"
            />
          )}
        </div>

        {/* Sidebar de participantes */}
        {sideParticipants.length > 0 && (
          <div className="w-64 flex flex-col gap-2 overflow-y-auto">
            {sideParticipants.map((participant) => (
              <VideoTile
                key={participant.id}
                participant={participant}
                isLocal={participant.id === 'local'}
                isMini
                onClick={() => pinParticipant(participant.id)}
                className="video-tile"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Layout: Grid (por defecto)
  return (
    <div
      ref={gridRef}
      className={cn('participants-grid h-full', className)}
      data-count={getGridDataCount(participantCount)}
    >
      {sortedParticipants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          isLocal={participant.id === 'local'}
          isPinned={isPinned(participant.id)}
          onPin={() =>
            pinParticipant(isPinned(participant.id) ? null : participant.id)
          }
          className="video-tile"
        />
      ))}

      {/* Mensaje cuando no hay participantes */}
      {participantCount === 0 && (
        <div className="flex items-center justify-center col-span-full text-gray-400">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-16 h-16 mx-auto mb-4 opacity-50"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <p className="text-lg">Esperando participantes...</p>
            <p className="text-sm mt-1">
              Comparte el enlace de la reunión para que otros puedan unirse
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { type VideoGridProps };
