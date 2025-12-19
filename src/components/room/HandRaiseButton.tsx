'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Tooltip } from '@/components/ui/Tooltip';

interface HandRaiseButtonProps {
  isRaised: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Botón para levantar/bajar la mano en una reunión
 */
export function HandRaiseButton({
  isRaised,
  onToggle,
  className,
}: HandRaiseButtonProps) {
  return (
    <Tooltip
      content={isRaised ? 'Bajar la mano' : 'Levantar la mano'}
      position="top"
    >
      <button
        onClick={onToggle}
        className={cn(
          'control-button relative transition-all duration-300',
          isRaised
            ? 'bg-unity-orange text-white ring-2 ring-unity-orange/50'
            : 'enabled',
          className
        )}
        aria-pressed={isRaised}
        aria-label={isRaised ? 'Bajar la mano' : 'Levantar la mano'}
      >
        <span className={cn('text-xl transition-transform duration-300', isRaised && 'animate-bounce')}>
          ✋
        </span>
        {isRaised && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
      </button>
    </Tooltip>
  );
}

/**
 * Hook para gestionar el estado de mano levantada
 */
export function useHandRaise() {
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedAt, setRaisedAt] = useState<Date | null>(null);

  const toggleHand = useCallback(() => {
    setIsHandRaised((prev) => {
      if (!prev) {
        setRaisedAt(new Date());
      } else {
        setRaisedAt(null);
      }
      return !prev;
    });
  }, []);

  const lowerHand = useCallback(() => {
    setIsHandRaised(false);
    setRaisedAt(null);
  }, []);

  return {
    isHandRaised,
    raisedAt,
    toggleHand,
    lowerHand,
  };
}

/**
 * Indicador de mano levantada para mostrar en VideoTile
 */
export function HandRaisedIndicator({
  name,
  raisedAt,
  className,
}: {
  name: string;
  raisedAt?: Date;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-lg',
        'bg-unity-orange text-white text-xs font-medium',
        'animate-bounce shadow-lg',
        className
      )}
    >
      <span className="text-sm">✋</span>
      <span className="truncate max-w-[100px]">{name}</span>
    </div>
  );
}

/**
 * Lista de participantes con mano levantada (para el host)
 */
export function RaisedHandsList({
  participants,
  onLowerHand,
}: {
  participants: Array<{ id: string; name: string; raisedAt: Date }>;
  onLowerHand?: (participantId: string) => void;
}) {
  if (participants.length === 0) return null;

  // Sort by raised time (oldest first)
  const sorted = [...participants].sort(
    (a, b) => a.raisedAt.getTime() - b.raisedAt.getTime()
  );

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        Manos levantadas ({participants.length})
      </h4>
      <div className="space-y-1">
        {sorted.map((participant, index) => (
          <div
            key={participant.id}
            className={cn(
              'flex items-center justify-between gap-2 p-2 rounded-lg',
              'bg-unity-orange/10 dark:bg-unity-orange/20'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✋</span>
              <div>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {participant.name}
                </span>
                <span className="text-xs text-neutral-500 ml-2">
                  #{index + 1}
                </span>
              </div>
            </div>
            {onLowerHand && (
              <button
                onClick={() => onLowerHand(participant.id)}
                className="p-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                title="Bajar mano"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
