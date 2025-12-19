'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Participant } from '@/types';

interface FloatingLocalVideoProps {
  participant: Participant | null;
  className?: string;
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Floating local video component - shows a small draggable video
 * in a corner of the screen (like Zoom/Google Meet)
 */
export function FloatingLocalVideo({ participant, className }: FloatingLocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Attach video track
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !participant?.videoTrack) {
      return;
    }

    const stream = new MediaStream([participant.videoTrack]);
    videoElement.srcObject = stream;
    videoElement.play().catch(console.error);

    return () => {
      videoElement.srcObject = null;
    };
  }, [participant?.videoTrack]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  // Handle drag end - snap to nearest corner
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = e.clientX;
    const y = e.clientY;

    // Determine which corner is closest
    const isLeft = x < viewportWidth / 2;
    const isTop = y < viewportHeight / 2;

    if (isTop && isLeft) setCorner('top-left');
    else if (isTop && !isLeft) setCorner('top-right');
    else if (!isTop && isLeft) setCorner('bottom-left');
    else setCorner('bottom-right');

    setIsDragging(false);
  }, [isDragging]);

  // Add global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, handleMouseUp]);

  // Corner positions
  const cornerStyles: Record<Corner, string> = {
    'top-left': 'top-20 left-4',
    'top-right': 'top-20 right-4',
    'bottom-left': 'bottom-24 left-4',
    'bottom-right': 'bottom-24 right-4',
  };

  if (!participant) return null;

  const showVideo = !participant.isVideoOff && participant.videoTrack;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 w-48 h-36 rounded-xl overflow-hidden shadow-2xl',
        'border-2 border-white/20 bg-unity-darker',
        'transition-all duration-300 ease-out',
        'cursor-grab active:cursor-grabbing',
        'hover:border-unity-orange/50 hover:shadow-unity-orange/20',
        isDragging ? 'scale-105 opacity-90' : '',
        cornerStyles[corner],
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
          <div className="w-16 h-16 rounded-full bg-unity-purple flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Overlay with name */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white font-medium truncate">
            {participant.name} (Tú)
          </span>
          <div className="flex items-center gap-1">
            {participant.isMuted && (
              <span className="p-0.5 rounded bg-red-500/90">
                <MicOffIcon className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-white/70">Arrastra para mover</span>
      </div>

      {/* Speaking indicator */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-xl border-2 border-unity-orange animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

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

export default FloatingLocalVideo;
