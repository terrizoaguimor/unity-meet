/**
 * Tipos globales de Unity Meet
 */

// Estado de la sala
export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  hostId?: string;
  maxParticipants: number;
  isRecording: boolean;
}

// Participante en la sala
export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  handRaisedAt?: Date;
  joinedAt: Date;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  screenTrack?: MediaStreamTrack;
}

// Reacción flotante
export interface Reaction {
  id: string;
  participantId: string;
  emoji: string;
  timestamp: Date;
}

// Mensaje de chat
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'system';
}

// Dispositivo de medios
export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

// Configuración de medios del usuario
export interface MediaSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  selectedAudioInput?: string;
  selectedAudioOutput?: string;
  selectedVideoInput?: string;
}

// Estado de conexión
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

// Eventos de la sala
export type RoomEvent =
  | 'participant_joined'
  | 'participant_left'
  | 'participant_updated'
  | 'chat_message'
  | 'connection_state_changed'
  | 'error';

// Layout de video
export type VideoLayout = 'grid' | 'speaker' | 'sidebar';

// Notificación toast
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Respuesta de API para crear sala
export interface CreateRoomResponse {
  success: boolean;
  room?: {
    id: string;
    unique_name: string;
    max_participants: number;
    created_at: string;
  };
  error?: string;
}

// Respuesta de API para token de cliente
export interface ClientTokenResponse {
  success: boolean;
  token?: string;
  refresh_token?: string;
  error?: string;
}

// Props comunes para componentes de video
export interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  showControls?: boolean;
  onClick?: () => void;
  className?: string;
}

// Estado del store de la sala
export interface RoomState {
  // Información de la sala
  room: Room | null;
  connectionState: ConnectionState;

  // Participantes
  participants: Map<string, Participant>;
  localParticipant: Participant | null;

  // UI
  layout: VideoLayout;
  pinnedParticipantId: string | null;
  isChatOpen: boolean;
  isParticipantsListOpen: boolean;
  isSettingsOpen: boolean;

  // Chat
  messages: ChatMessage[];
  unreadMessages: number;

  // Reactions
  reactions: Reaction[];

  // Acciones
  setRoom: (room: Room | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setLocalParticipant: (participant: Participant | null) => void;
  updateLocalParticipant: (updates: Partial<Participant>) => void;
  setLayout: (layout: VideoLayout) => void;
  setPinnedParticipant: (participantId: string | null) => void;
  toggleChat: () => void;
  toggleParticipantsList: () => void;
  toggleSettings: () => void;
  addMessage: (message: ChatMessage) => void;
  markMessagesAsRead: () => void;
  addReaction: (reaction: Reaction) => void;
  removeReaction: (reactionId: string) => void;
  toggleHandRaise: () => void;
  reset: () => void;
}
