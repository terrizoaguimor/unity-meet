'use client';

import { VideoControls } from '@/components/video/VideoControls';
import { useRoomStore } from '@/stores/roomStore';
import { copyToClipboard } from '@/lib/utils/formatters';

interface MeetingControlsProps {
  // Estados de medios
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Callbacks
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;

  // ID de la sala para copiar link
  roomId: string;

  className?: string;
}

/**
 * Wrapper de controles de reunión que conecta con el store
 */
export function MeetingControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  roomId,
  className,
}: MeetingControlsProps) {
  // Obtener estado del store
  const participantCount = useRoomStore((state) => state.participants.size + 1);
  const unreadMessages = useRoomStore((state) => state.unreadMessages);
  const isChatOpen = useRoomStore((state) => state.isChatOpen);
  const isParticipantsOpen = useRoomStore((state) => state.isParticipantsListOpen);

  // Acciones del store
  const toggleChat = useRoomStore((state) => state.toggleChat);
  const toggleParticipants = useRoomStore((state) => state.toggleParticipantsList);
  const toggleSettings = useRoomStore((state) => state.toggleSettings);

  // Copiar link
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    const success = await copyToClipboard(url);

    if (success) {
      // Mostrar feedback visual (podría usar un toast)
      console.log('Link copiado al portapapeles');
    }
  };

  return (
    <VideoControls
      isAudioEnabled={isAudioEnabled}
      isVideoEnabled={isVideoEnabled}
      isScreenSharing={isScreenSharing}
      participantCount={participantCount}
      unreadMessages={unreadMessages}
      onToggleAudio={onToggleAudio}
      onToggleVideo={onToggleVideo}
      onToggleScreenShare={onToggleScreenShare}
      onToggleChat={toggleChat}
      onToggleParticipants={toggleParticipants}
      onToggleSettings={toggleSettings}
      onLeave={onLeave}
      onCopyLink={handleCopyLink}
      isChatOpen={isChatOpen}
      isParticipantsOpen={isParticipantsOpen}
      className={className}
    />
  );
}
