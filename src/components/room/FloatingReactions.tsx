'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

// Emojis disponibles para reacciones
export const REACTION_EMOJIS = [
  { emoji: '👍', label: 'Me gusta' },
  { emoji: '👎', label: 'No me gusta' },
  { emoji: '❤️', label: 'Me encanta' },
  { emoji: '😂', label: 'Jaja' },
  { emoji: '👏', label: 'Aplauso' },
  { emoji: '🎉', label: 'Celebración' },
  { emoji: '🔥', label: 'Fuego' },
  { emoji: '✋', label: 'Mano levantada' },
] as const;

export type ReactionEmoji = typeof REACTION_EMOJIS[number]['emoji'];

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  startTime: number;
}

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
  onReactionComplete?: (id: string) => void;
  className?: string;
}

/**
 * Componente que muestra reacciones flotando hacia arriba (estilo Zoom)
 */
export function FloatingReactions({
  reactions,
  onReactionComplete,
  className,
}: FloatingReactionsProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none overflow-hidden z-20',
        className
      )}
    >
      {reactions.map((reaction) => (
        <FloatingEmoji
          key={reaction.id}
          emoji={reaction.emoji}
          x={reaction.x}
          onComplete={() => onReactionComplete?.(reaction.id)}
        />
      ))}
    </div>
  );
}

/**
 * Un solo emoji flotante que se anima hacia arriba y desaparece
 */
function FloatingEmoji({
  emoji,
  x,
  onComplete,
}: {
  emoji: string;
  x: number;
  onComplete?: () => void;
}) {
  const [style, setStyle] = useState({
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  });

  useEffect(() => {
    // Trigger animation after mount
    const animationTimeout = setTimeout(() => {
      setStyle({
        opacity: 0,
        transform: 'translateY(-200px) scale(1.5)',
      });
    }, 50);

    // Cleanup after animation
    const completionTimeout = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(animationTimeout);
      clearTimeout(completionTimeout);
    };
  }, [onComplete]);

  return (
    <div
      className="absolute bottom-10 text-4xl transition-all duration-[3000ms] ease-out"
      style={{
        left: `${x}%`,
        ...style,
      }}
    >
      {emoji}
    </div>
  );
}

/**
 * Hook para gestionar reacciones flotantes en un participante
 */
export function useFloatingReactions() {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const idCounterRef = useRef(0);

  const addReaction = useCallback((emoji: string) => {
    const id = `reaction-${Date.now()}-${idCounterRef.current++}`;
    const x = 20 + Math.random() * 60; // Random position 20-80%

    setReactions((prev) => [
      ...prev,
      { id, emoji, x, startTime: Date.now() },
    ]);

    // Auto-remove after animation
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3500);
  }, []);

  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    reactions,
    addReaction,
    removeReaction,
  };
}

/**
 * Barra de selección de reacciones
 */
interface ReactionBarProps {
  onReact: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ReactionBar({
  onReact,
  isOpen,
  onClose,
  className,
}: ReactionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={barRef}
      className={cn(
        'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
        'flex items-center gap-1 p-2 rounded-2xl',
        'bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700',
        'animate-[scale-in_0.2s_ease-out]',
        className
      )}
      style={{
        transformOrigin: 'bottom center',
      }}
    >
      {REACTION_EMOJIS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className={cn(
            'p-2 text-2xl rounded-xl transition-all duration-200',
            'hover:bg-neutral-100 dark:hover:bg-neutral-700',
            'hover:scale-125 active:scale-110'
          )}
          title={label}
          aria-label={label}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/**
 * Botón que abre la barra de reacciones
 */
interface ReactionButtonProps {
  onReact: (emoji: string) => void;
  className?: string;
}

export function ReactionButton({ onReact, className }: ReactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <ReactionBar
        onReact={onReact}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'control-button',
          isOpen ? 'bg-unity-purple text-white' : 'enabled'
        )}
        title="Reacciones"
        aria-label="Abrir reacciones"
        aria-expanded={isOpen}
      >
        <span className="text-xl">😀</span>
      </button>
    </div>
  );
}
