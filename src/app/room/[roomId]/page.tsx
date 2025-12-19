'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoGrid } from '@/components/video/VideoGrid';
import { ScreenShare } from '@/components/video/ScreenShare';
import { RoomHeader } from '@/components/room/RoomHeader';
import { MeetingControls } from '@/components/room/MeetingControls';
import { ChatPanel } from '@/components/room/ChatPanel';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { PreJoinScreen } from '@/components/room/PreJoinScreen';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTelnyxRoom } from '@/hooks/useTelnyxRoom';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useChat } from '@/hooks/useChat';
import { useRoomStore } from '@/stores/roomStore';
import type { VideoLayout } from '@/types';

/**
 * Página principal de la sala de videoconferencia
 */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  // Estados locales
  const [hasJoined, setHasJoined] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);

  // Store
  const {
    room,
    isChatOpen,
    isParticipantsListOpen,
    toggleChat,
    toggleParticipantsList,
    messages,
    participants,
    localParticipant,
    layout,
    setLayout,
  } = useRoomStore();

  // Hook principal de Telnyx
  const {
    connectionState,
    isConnecting,
    isConnected,
    error: connectionError,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    client,
  } = useTelnyxRoom({
    roomId,
    userName,
    autoConnect: false,
  });

  // Screen share
  const {
    isScreenSharing,
    screenStream,
    toggleScreenShare,
    stopScreenShare,
  } = useScreenShare({ client });

  // Chat
  const { sendMessage } = useChat({
    participantId: 'local',
    participantName: userName,
  });

  // Cargar información de la sala
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setIsLoadingRoom(true);
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (data.success) {
          setRoomName(data.room.unique_name);
        } else {
          setJoinError('Sala no encontrada');
        }
      } catch {
        setJoinError('Error al cargar la sala');
      } finally {
        setIsLoadingRoom(false);
      }
    };

    if (roomId) {
      fetchRoom();
    }
  }, [roomId]);

  // Manejar unirse a la sala
  const handleJoin = useCallback(
    async (name: string) => {
      setUserName(name);
      setJoinError(null);

      try {
        await connect();
        setHasJoined(true);
        setStartTime(new Date());
      } catch (err) {
        setJoinError(
          err instanceof Error ? err.message : 'Error al unirse a la sala'
        );
      }
    },
    [connect]
  );

  // Manejar salir de la sala
  const handleLeave = useCallback(() => {
    stopScreenShare();
    disconnect();
    router.push('/');
  }, [disconnect, stopScreenShare, router]);

  // Confirmar salida
  const confirmLeave = () => {
    setIsLeaveModalOpen(true);
  };

  // Cambiar layout
  const handleToggleLayout = () => {
    const layouts: VideoLayout[] = ['grid', 'speaker', 'sidebar'];
    const currentIndex = layouts.indexOf(layout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    setLayout(layouts[nextIndex]);
  };

  // Lista de participantes para el componente
  const participantsList = Array.from(participants.values());

  // Si no ha entrado aún, mostrar pantalla de pre-join
  if (!hasJoined) {
    return (
      <PreJoinScreen
        roomName={isLoadingRoom ? 'Cargando...' : roomName}
        onJoin={handleJoin}
        isLoading={isConnecting || isLoadingRoom}
        error={joinError || connectionError}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-unity-dark-gray">
      {/* Header */}
      <RoomHeader
        roomName={roomName || `Sala ${roomId}`}
        roomId={roomId}
        participantCount={participantsList.length + 1}
        startTime={startTime || undefined}
        isRecording={room?.isRecording}
        onToggleLayout={handleToggleLayout}
        layout={layout}
      />

      {/* Área principal de video */}
      <main className="flex-1 relative overflow-hidden">
        {/* Screen share (si está activo) */}
        {(isScreenSharing || participantsList.some((p) => p.isScreenSharing)) && (
          <div className="absolute inset-0 z-10 p-4 bg-black/90">
            <ScreenShare
              stream={
                isScreenSharing
                  ? screenStream
                  : participantsList.find((p) => p.isScreenSharing)?.screenTrack
                    ? new MediaStream([
                        participantsList.find((p) => p.isScreenSharing)!
                          .screenTrack!,
                      ])
                    : null
              }
              participantName={
                isScreenSharing
                  ? userName
                  : participantsList.find((p) => p.isScreenSharing)?.name
              }
              isLocal={isScreenSharing}
              onStopSharing={isScreenSharing ? stopScreenShare : undefined}
              className="h-full"
            />
          </div>
        )}

        {/* Video Grid */}
        <VideoGrid
          localStream={localStream}
          className={
            isScreenSharing || participantsList.some((p) => p.isScreenSharing)
              ? 'hidden'
              : ''
          }
        />

        {/* Indicador de estado de conexión */}
        {connectionState === 'reconnecting' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Reconectando...
          </div>
        )}

        {connectionState === 'failed' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg">
            Error de conexión. Intenta recargar la página.
          </div>
        )}
      </main>

      {/* Controles de reunión */}
      <footer className="flex justify-center py-4 px-4">
        <MeetingControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onLeave={confirmLeave}
          roomId={roomId}
        />
      </footer>

      {/* Panel de Chat */}
      <ChatPanel
        messages={messages}
        onSendMessage={sendMessage}
        currentUserId="local"
        isOpen={isChatOpen}
        onClose={toggleChat}
      />

      {/* Lista de Participantes */}
      <ParticipantsList
        participants={participantsList}
        localParticipant={localParticipant}
        isOpen={isParticipantsListOpen}
        onClose={toggleParticipantsList}
      />

      {/* Modal de confirmación para salir */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="¿Salir de la reunión?"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Estás a punto de abandonar esta reunión. ¿Estás seguro?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setIsLeaveModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleLeave}>
            Salir de la reunión
          </Button>
        </div>
      </Modal>
    </div>
  );
}
