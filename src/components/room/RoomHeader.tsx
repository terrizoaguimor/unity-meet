'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDuration } from '@/lib/utils/formatters';
import { copyToClipboard } from '@/lib/utils/formatters';

interface RoomHeaderProps {
  roomName: string;
  roomId: string;
  participantCount: number;
  startTime?: Date;
  isRecording?: boolean;
  onToggleLayout?: () => void;
  layout?: 'grid' | 'speaker' | 'sidebar';
  className?: string;
}

/**
 * Header de la sala con información y controles
 */
export function RoomHeader({
  roomName,
  roomId,
  participantCount,
  startTime,
  isRecording = false,
  onToggleLayout,
  layout = 'grid',
  className,
}: RoomHeaderProps) {
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  // Actualizar duración cada segundo
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setDuration(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Copiar link de invitación
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    const success = await copyToClipboard(url);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Iconos de layout
  const layoutIcons = {
    grid: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
    speaker: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75"
        />
      </svg>
    ),
    sidebar: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18V6z"
        />
      </svg>
    ),
  };

  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 py-3',
        'glass-panel',
        className
      )}
    >
      {/* Info de la reunión */}
      <div className="flex items-center gap-4">
        {/* Nombre de la sala */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-white truncate max-w-[200px]">
            {roomName}
          </h1>

          {/* Indicador de grabación */}
          {isRecording && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-400 bg-red-500/20 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              REC
            </span>
          )}
        </div>

        {/* Separador */}
        <div className="w-px h-6 bg-white/10 hidden sm:block" />

        {/* Duración */}
        {startTime && (
          <span className="text-sm text-neutral-400 hidden sm:block font-medium tabular-nums">
            {formatDuration(duration)}
          </span>
        )}

        {/* Participantes */}
        <Tooltip content={`${participantCount} participantes en la reunión`}>
          <span className="flex items-center gap-1.5 text-sm text-neutral-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            {participantCount}
          </span>
        </Tooltip>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2">
        {/* Copiar link */}
        <Tooltip content={copied ? '¡Copiado!' : 'Copiar enlace de invitación'}>
          <button
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-unity-purple/20 text-unity-purple-light hover:bg-unity-purple/30'
            )}
          >
            {copied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
            )}
            <span className="hidden sm:inline">
              {copied ? 'Copiado' : 'Copiar enlace'}
            </span>
          </button>
        </Tooltip>

        {/* Toggle layout */}
        {onToggleLayout && (
          <Tooltip content={`Layout: ${layout}`}>
            <button
              onClick={onToggleLayout}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {layoutIcons[layout]}
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
