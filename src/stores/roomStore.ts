import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  RoomState,
  Room,
  Participant,
  ChatMessage,
  ConnectionState,
  VideoLayout,
  Reaction,
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
  reactions: [],

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

  updateLocalParticipant: (updates: Partial<Participant>) =>
    set((state) => {
      if (!state.localParticipant) return state;
      return {
        localParticipant: { ...state.localParticipant, ...updates },
      };
    }),

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

  // Acciones de reacciones
  addReaction: (reaction: Reaction) =>
    set((state) => ({
      reactions: [...state.reactions, reaction],
    })),

  removeReaction: (reactionId: string) =>
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== reactionId),
    })),

  // Acción de mano levantada
  toggleHandRaise: () =>
    set((state) => {
      if (!state.localParticipant) return state;

      const isCurrentlyRaised = state.localParticipant.isHandRaised;
      const updatedLocal: Participant = {
        ...state.localParticipant,
        isHandRaised: !isCurrentlyRaised,
        handRaisedAt: isCurrentlyRaised ? undefined : new Date(),
      };

      return { localParticipant: updatedLocal };
    }),

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
      reactions: [],
    }),
}));

/**
 * Selectores útiles para componentes
 * Usar useShallow para evitar re-renders cuando arrays/objects son iguales
 */
export const useParticipantsList = () =>
  useRoomStore(
    useShallow((state) => Array.from(state.participants.values()))
  );

export const useParticipantCount = () =>
  useRoomStore((state) => state.participants.size);

export const usePinnedParticipant = () =>
  useRoomStore(
    useShallow((state) => {
      if (!state.pinnedParticipantId) return null;
      return state.participants.get(state.pinnedParticipantId) || null;
    })
  );

export const useIsConnected = () =>
  useRoomStore((state) => state.connectionState === 'connected');

export const useUnreadMessageCount = () =>
  useRoomStore((state) => state.unreadMessages);

/**
 * Obtener acciones del store de forma estable (sin causar re-renders)
 */
export const getStoreActions = () => {
  const state = useRoomStore.getState();
  return {
    setRoom: state.setRoom,
    setConnectionState: state.setConnectionState,
    addParticipant: state.addParticipant,
    removeParticipant: state.removeParticipant,
    updateParticipant: state.updateParticipant,
    setLocalParticipant: state.setLocalParticipant,
    updateLocalParticipant: state.updateLocalParticipant,
    setLayout: state.setLayout,
    setPinnedParticipant: state.setPinnedParticipant,
    toggleChat: state.toggleChat,
    toggleParticipantsList: state.toggleParticipantsList,
    toggleSettings: state.toggleSettings,
    addMessage: state.addMessage,
    markMessagesAsRead: state.markMessagesAsRead,
    addReaction: state.addReaction,
    removeReaction: state.removeReaction,
    toggleHandRaise: state.toggleHandRaise,
    reset: state.reset,
  };
};
