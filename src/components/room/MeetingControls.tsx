'use client';

import { useCallback } from 'react';
import { VideoControls } from '@/components/video/VideoControls';
import { useRoomStore } from '@/stores/roomStore';
import { copyToClipboard } from '@/lib/utils/formatters';
import type { Reaction } from '@/types';

interface MeetingControlsProps {
  // Estados de medios
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Recording
  isRecording?: boolean;
  recordingDuration?: number;
  onToggleRecording?: () => void;

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
  isRecording,
  recordingDuration,
  onToggleRecording,
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
  const localParticipant = useRoomStore((state) => state.localParticipant);
  const isHandRaised = localParticipant?.isHandRaised ?? false;

  // Acciones del store
  const toggleChat = useRoomStore((state) => state.toggleChat);
  const toggleParticipants = useRoomStore((state) => state.toggleParticipantsList);
  const toggleSettings = useRoomStore((state) => state.toggleSettings);
  const toggleHandRaise = useRoomStore((state) => state.toggleHandRaise);
  const addReaction = useRoomStore((state) => state.addReaction);

  // Handler para reacciones
  const handleReaction = useCallback((emoji: string) => {
    if (!localParticipant) return;

    const reaction: Reaction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      participantId: localParticipant.id,
      emoji,
      timestamp: new Date(),
    };
    addReaction(reaction);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      useRoomStore.getState().removeReaction(reaction.id);
    }, 3000);
  }, [localParticipant, addReaction]);

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
      isHandRaised={isHandRaised}
      isRecording={isRecording}
      recordingDuration={recordingDuration}
      participantCount={participantCount}
      unreadMessages={unreadMessages}
      onToggleAudio={onToggleAudio}
      onToggleVideo={onToggleVideo}
      onToggleScreenShare={onToggleScreenShare}
      onToggleHandRaise={toggleHandRaise}
      onToggleRecording={onToggleRecording}
      onReaction={handleReaction}
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
