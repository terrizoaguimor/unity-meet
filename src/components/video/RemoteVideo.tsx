'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import type { Participant } from '@/types';

interface RemoteVideoProps {
  participant: Participant;
  className?: string;
}

/**
 * Componente para mostrar el video de un participante remoto
 */
export function RemoteVideo({ participant, className }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Manejar video track
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

  // Manejar audio track (separado para mejor control)
  useEffect(() => {
    if (audioRef.current && participant.audioTrack) {
      const stream = new MediaStream([participant.audioTrack]);
      audioRef.current.srcObject = stream;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [participant.audioTrack]);

  const showVideo = !participant.isVideoOff && participant.videoTrack;

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-unity-darker aspect-video',
        participant.isSpeaking && 'ring-2 ring-unity-orange',
        className
      )}
    >
      {/* Video */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar
            name={participant.name}
            size="xl"
            isSpeaking={participant.isSpeaking}
          />
        </div>
      )}

      {/* Audio (hidden) */}
      <audio ref={audioRef} autoPlay />

      {/* Indicador de hablando */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 rounded-xl border-2 border-unity-orange pointer-events-none animate-pulse" />
      )}

      {/* Nombre y estado */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
          </span>

          <div className="flex items-center gap-1">
            {participant.isMuted && (
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
          </div>
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
