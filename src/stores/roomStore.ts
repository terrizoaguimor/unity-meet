import { create } from 'zustand';
import type {
  RoomState,
  Room,
  Participant,
  ChatMessage,
  ConnectionState,
  VideoLayout,
} from '@/types';

/**
 * Store global para el estado de la sala de videoconferencia
 * Utiliza Zustand para manejo de estado reactivo
 */
export const useRoomStore = create<RoomState>((set, get) => ({
  // Estado inicial
  room: null,
  connectionState: 'disconnected',
  participants: new Map(),
  localParticipant: null,
  layout: 'grid',
  pinnedParticipantId: null,
  isChatOpen: false,
  isParticipantsListOpen: false,
  isSettingsOpen: false,
  messages: [],
  unreadMessages: 0,

  // Acciones para la sala
  setRoom: (room: Room | null) => set({ room }),

  setConnectionState: (state: ConnectionState) =>
    set({ connectionState: state }),

  // Acciones para participantes
  addParticipant: (participant: Participant) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.set(participant.id, participant);
      return { participants: newParticipants };
    }),

  removeParticipant: (participantId: string) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(participantId);

      // Si el participante eliminado estaba fijado, quitar el pin
      const pinnedId =
        state.pinnedParticipantId === participantId
          ? null
          : state.pinnedParticipantId;

      return {
        participants: newParticipants,
        pinnedParticipantId: pinnedId,
      };
    }),

  updateParticipant: (participantId: string, updates: Partial<Participant>) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      const existing = newParticipants.get(participantId);

      if (existing) {
        newParticipants.set(participantId, { ...existing, ...updates });
      }

      return { participants: newParticipants };
    }),

  setLocalParticipant: (participant: Participant | null) =>
    set({ localParticipant: participant }),

  // Acciones de UI
  setLayout: (layout: VideoLayout) => set({ layout }),

  setPinnedParticipant: (participantId: string | null) =>
    set({ pinnedParticipantId: participantId }),

  toggleChat: () =>
    set((state) => ({
      isChatOpen: !state.isChatOpen,
      // Marcar mensajes como leídos al abrir
      unreadMessages: state.isChatOpen ? state.unreadMessages : 0,
    })),

  toggleParticipantsList: () =>
    set((state) => ({
      isParticipantsListOpen: !state.isParticipantsListOpen,
    })),

  toggleSettings: () =>
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  // Acciones de chat
  addMessage: (message: ChatMessage) =>
    set((state) => ({
      messages: [...state.messages, message],
      // Solo incrementar contador si el chat está cerrado
      unreadMessages: state.isChatOpen
        ? state.unreadMessages
        : state.unreadMessages + 1,
    })),

  markMessagesAsRead: () => set({ unreadMessages: 0 }),

  // Reset completo del estado
  reset: () =>
    set({
      room: null,
      connectionState: 'disconnected',
      participants: new Map(),
      localParticipant: null,
      layout: 'grid',
      pinnedParticipantId: null,
      isChatOpen: false,
      isParticipantsListOpen: false,
      isSettingsOpen: false,
      messages: [],
      unreadMessages: 0,
    }),
}));

/**
 * Selectores útiles para componentes
 */
export const useParticipantsList = () =>
  useRoomStore((state) => Array.from(state.participants.values()));

export const useParticipantCount = () =>
  useRoomStore((state) => state.participants.size);

export const usePinnedParticipant = () =>
  useRoomStore((state) => {
    if (!state.pinnedParticipantId) return null;
    return state.participants.get(state.pinnedParticipantId) || null;
  });

export const useIsConnected = () =>
  useRoomStore((state) => state.connectionState === 'connected');

export const useUnreadMessageCount = () =>
  useRoomStore((state) => state.unreadMessages);
