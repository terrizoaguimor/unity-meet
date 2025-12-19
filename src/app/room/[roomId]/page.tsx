'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoGrid } from '@/components/video/VideoGrid';
import { ScreenShare } from '@/components/video/ScreenShare';
import { FloatingLocalVideo } from '@/components/video/FloatingLocalVideo';
import { RoomAudio } from '@/components/room/RoomAudio';
import { RoomHeader } from '@/components/room/RoomHeader';
import { MeetingControls } from '@/components/room/MeetingControls';
import { ChatPanel } from '@/components/room/ChatPanel';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { PreJoinScreen } from '@/components/room/PreJoinScreen';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTelnyxRoom } from '@/hooks/useTelnyxRoom';
import { useChat } from '@/hooks/useChat';
import { useRecording } from '@/hooks/useRecording';
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
  const [debugStatus, setDebugStatus] = useState<string>('');

  // Store - usar selectores individuales para evitar re-renders innecesarios
  const room = useRoomStore(state => state.room);
  const isChatOpen = useRoomStore(state => state.isChatOpen);
  const isParticipantsListOpen = useRoomStore(state => state.isParticipantsListOpen);
  const messages = useRoomStore(state => state.messages);
  const participants = useRoomStore(state => state.participants);
  const localParticipant = useRoomStore(state => state.localParticipant);
  const layout = useRoomStore(state => state.layout);

  // Acciones del store - obtener una sola vez con ref
  const storeActionsRef = useRef(useRoomStore.getState());
  const toggleChat = storeActionsRef.current.toggleChat;
  const toggleParticipantsList = storeActionsRef.current.toggleParticipantsList;
  const setLayout = storeActionsRef.current.setLayout;

  // Hook principal de Telnyx - memoizar opciones
  const telnyxOptions = useMemo(() => ({
    roomId,
    userName,
    autoConnect: false,
    onStatusChange: setDebugStatus,
  }), [roomId, userName]);

  const {
    connectionState,
    isConnecting,
    isConnected,
    error: connectionError,
    localStream,
    presentationTracks,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  } = useTelnyxRoom(telnyxOptions);

  // Chat - memoizar opciones para evitar recreación del hook
  const chatOptions = useMemo(() => ({
    participantId: 'local' as const,
    participantName: userName,
  }), [userName]);
  const { sendMessage } = useChat(chatOptions);

  // Recording - pasar localStream para grabar directamente sin pedir pantalla
  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
  } = useRecording({ roomId, localStream });

  // Toggle recording
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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
    async (name: string, _settings?: { audioEnabled: boolean; videoEnabled: boolean; audioDeviceId?: string; videoDeviceId?: string }) => {
      console.log('[RoomPage] handleJoin called with name:', name);
      setDebugStatus('Iniciando...');
      setUserName(name);
      setJoinError(null);

      try {
        setDebugStatus('Llamando a connect()...');
        console.log('[RoomPage] Calling connect()...');
        await connect();
        console.log('[RoomPage] connect() completed successfully');
        setDebugStatus('Conectado!');
        setHasJoined(true);
        setStartTime(new Date());
      } catch (err) {
        console.error('[RoomPage] connect() failed:', err);
        setDebugStatus(`Error: ${err instanceof Error ? err.message : 'desconocido'}`);
        setJoinError(
          err instanceof Error ? err.message : 'Error al unirse a la sala'
        );
      }
    },
    [connect]
  );

  // Manejar salir de la sala
  const handleLeave = useCallback(async () => {
    disconnect();

    // Intentar eliminar la sala (limpieza)
    // La sala también se eliminará via webhook cuando la sesión termine
    try {
      await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    } catch (err) {
      // Ignorar errores de eliminación - el webhook lo manejará
      console.log('Room cleanup delegated to webhook');
    }

    router.push('/');
  }, [disconnect, router, roomId]);

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

  // Lista de participantes para el componente - memoizada
  const participantsList = useMemo(
    () => Array.from(participants.values()),
    [participants]
  );

  // Si no ha entrado aún, mostrar pantalla de pre-join
  if (!hasJoined) {
    return (
      <PreJoinScreen
        roomName={isLoadingRoom ? 'Cargando...' : roomName}
        onJoin={handleJoin}
        isLoading={isConnecting || isLoadingRoom}
        error={joinError || connectionError}
        debugStatus={debugStatus}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen video-room-bg">
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
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Screen share layout (si está activo) */}
        {(isScreenSharing || participantsList.some((p) => p.isScreenSharing)) ? (
          <>
            {/* Screen share a pantalla completa */}
            <div className="flex-1 p-2">
              <ScreenShare
                stream={
                  isScreenSharing && presentationTracks.video
                    ? new MediaStream([presentationTracks.video])
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
                onStopSharing={isScreenSharing ? toggleScreenShare : undefined}
                className="h-full"
              />
            </div>

            {/* Video local flotante estilo Zoom */}
            <FloatingLocalVideo participant={localParticipant} />
          </>
        ) : (
          /* Video Grid normal (sin screen share) */
          <VideoGrid localStream={localStream} />
        )}

        {/* Audio for remote participants */}
        <RoomAudio />

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
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onToggleRecording={handleToggleRecording}
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
