'use client';

import { useMemo, useRef } from 'react';
import { useRoomStore, useParticipantsList, usePinnedParticipant } from '@/stores/roomStore';
import type { Participant, VideoLayout } from '@/types';

interface UseParticipantsReturn {
  // Lista de participantes
  participants: Participant[];
  participantCount: number;

  // Participante local
  localParticipant: Participant | null;

  // Participante fijado
  pinnedParticipant: Participant | null;
  isPinned: (participantId: string) => boolean;
  pinParticipant: (participantId: string | null) => void;

  // Participante hablando
  speakingParticipant: Participant | null;

  // Layout
  layout: VideoLayout;
  setLayout: (layout: VideoLayout) => void;

  // Ordenamiento para grid
  sortedParticipants: Participant[];
}

/**
 * Hook para gestionar los participantes de la sala
 */
export function useParticipants(): UseParticipantsReturn {
  const participants = useParticipantsList();
  const localParticipant = useRoomStore((state) => state.localParticipant);
  const pinnedParticipant = usePinnedParticipant();
  const pinnedParticipantId = useRoomStore((state) => state.pinnedParticipantId);
  const layout = useRoomStore((state) => state.layout);

  // Usar refs para acciones - evita re-renders cuando el store cambia
  const actionsRef = useRef({
    setLayout: useRoomStore.getState().setLayout,
    setPinnedParticipant: useRoomStore.getState().setPinnedParticipant,
  });
  const setLayout = actionsRef.current.setLayout;
  const setPinnedParticipant = actionsRef.current.setPinnedParticipant;

  // Contar participantes (incluyendo local)
  const participantCount = useMemo(() => {
    return participants.length + (localParticipant ? 1 : 0);
  }, [participants, localParticipant]);

  // Encontrar participante hablando
  const speakingParticipant = useMemo(() => {
    // Primero buscar en remotos
    const speaking = participants.find((p) => p.isSpeaking);
    if (speaking) return speaking;

    // Luego verificar local
    if (localParticipant?.isSpeaking) return localParticipant;

    return null;
  }, [participants, localParticipant]);

  // Verificar si un participante está fijado
  const isPinned = (participantId: string): boolean => {
    return pinnedParticipantId === participantId;
  };

  // Fijar un participante
  const pinParticipant = (participantId: string | null) => {
    setPinnedParticipant(participantId);
  };

  // Ordenar participantes para el grid
  // Prioridad: 1. Fijado, 2. Hablando, 3. Video activo, 4. Orden de llegada
  const sortedParticipants = useMemo(() => {
    const allParticipants = localParticipant
      ? [localParticipant, ...participants]
      : [...participants];

    return allParticipants.sort((a, b) => {
      // Fijado siempre primero
      if (a.id === pinnedParticipantId) return -1;
      if (b.id === pinnedParticipantId) return 1;

      // Local segundo si no está fijado nadie más
      if (a.id === 'local') return -1;
      if (b.id === 'local') return 1;

      // Hablando tiene prioridad
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (b.isSpeaking && !a.isSpeaking) return 1;

      // Video activo tiene prioridad
      if (!a.isVideoOff && b.isVideoOff) return -1;
      if (!b.isVideoOff && a.isVideoOff) return 1;

      // Por defecto, orden de llegada
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
  }, [participants, localParticipant, pinnedParticipantId]);

  return {
    participants,
    participantCount,
    localParticipant,
    pinnedParticipant,
    isPinned,
    pinParticipant,
    speakingParticipant,
    layout,
    setLayout,
    sortedParticipants,
  };
}

/**
 * Determinar el número de columnas del grid según la cantidad de participantes
 */
export function getGridColumns(count: number): number {
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  if (count <= 9) return 3;
  return 4;
}

/**
 * Determinar el atributo data-count para el CSS del grid
 */
export function getGridDataCount(count: number): string {
  if (count <= 6) return count.toString();
  return 'many';
}
