'use client';

import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Participant } from '@/types';

interface ParticipantsListProps {
  participants: Participant[];
  localParticipant: Participant | null;
  isOpen: boolean;
  onClose: () => void;
  onPinParticipant?: (participantId: string) => void;
  className?: string;
}

/**
 * Lista de participantes de la reunión
 */
export function ParticipantsList({
  participants,
  localParticipant,
  isOpen,
  onClose,
  onPinParticipant,
  className,
}: ParticipantsListProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Animar entrada/salida del panel
  useEffect(() => {
    if (!panelRef.current) return;

    if (isOpen) {
      gsap.fromTo(
        panelRef.current,
        { x: '100%', opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      gsap.to(panelRef.current, {
        x: '100%',
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
      });
    }
  }, [isOpen]);

  // Combinar local + remotos - memoizado para evitar recreación
  const allParticipants = useMemo(
    () => (localParticipant ? [localParticipant, ...participants] : participants),
    [localParticipant, participants]
  );

  const totalCount = allParticipants.length;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed top-0 right-0 bottom-0 w-80 z-40',
        'glass-panel',
        'flex flex-col shadow-2xl',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold text-white">
          Participantes ({totalCount})
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Cerrar lista"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Lista de participantes */}
      <div className="flex-1 overflow-y-auto">
        {/* Sección: En esta reunión */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
            En esta reunión
          </h4>

          <div className="space-y-2">
            {allParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isLocal={participant.id === 'local'}
                onPin={
                  onPinParticipant
                    ? () => onPinParticipant(participant.id)
                    : undefined
                }
              />
            ))}
          </div>

          {totalCount === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              No hay participantes
            </p>
          )}
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => {
            // Copiar link de invitación
            const url = window.location.href;
            navigator.clipboard.writeText(url);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-unity-purple-light hover:bg-unity-purple/20 rounded-lg transition-colors"
        >
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
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
            />
          </svg>
          Invitar a personas
        </button>
      </div>
    </div>
  );
}

// Componente para un participante individual
function ParticipantItem({
  participant,
  isLocal,
  onPin,
}: {
  participant: Participant;
  isLocal: boolean;
  onPin?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        'hover:bg-white/5',
        'transition-colors group'
      )}
    >
      {/* Avatar */}
      <Avatar
        name={participant.name}
        size="md"
        isSpeaking={participant.isSpeaking}
        showStatus
        status={participant.isVideoOff ? 'busy' : 'online'}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {participant.name}
            {isLocal && (
              <span className="text-neutral-500"> (Tú)</span>
            )}
          </span>
          {participant.isHost && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-unity-orange/20 text-unity-orange rounded">
              Host
            </span>
          )}
        </div>

        {/* Indicadores de estado */}
        <div className="flex items-center gap-2 mt-0.5">
          {participant.isMuted && (
            <span className="text-xs text-neutral-500 flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 19L5 5m14 0v5a7 7 0 01-7 7m0 0a7 7 0 01-7-7V5"
                />
              </svg>
              Silenciado
            </span>
          )}
          {participant.isScreenSharing && (
            <span className="text-xs text-unity-purple-light flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25"
                />
              </svg>
              Compartiendo
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      {onPin && !isLocal && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Fijar participante">
            <button
              onClick={onPin}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-unity-purple-light hover:bg-unity-purple/20 transition-colors"
            >
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
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
