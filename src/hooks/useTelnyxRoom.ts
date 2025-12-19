'use client';

/**
 * Telnyx Room Hook - Based on official telnyx-meet implementation
 * https://github.com/team-telnyx/telnyx-meet
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Room, State, Participant, Stream } from '@telnyx/video';
import { useRoomStore } from '@/stores/roomStore';
import type { ConnectionState, Participant as AppParticipant } from '@/types';

interface UseTelnyxRoomOptions {
  roomId: string;
  userName: string;
  autoConnect?: boolean;
  onStatusChange?: (status: string) => void;
}

interface LocalTracks {
  audio: MediaStreamTrack | undefined;
  video: MediaStreamTrack | undefined;
}

interface PresentationTracks {
  audio: MediaStreamTrack | undefined;
  video: MediaStreamTrack | undefined;
}

export interface TelnyxRoomState {
  // Connection
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  // Media
  localStream: MediaStream | null;
  localTracks: LocalTracks;
  presentationTracks: PresentationTracks;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Room data
  dominantSpeakerId: string | undefined;
  participantsByActivity: Set<string>;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;

  // Stream management (from Room SDK)
  addStream: Room['addStream'] | null;
  removeStream: Room['removeStream'] | null;
  updateStream: Room['updateStream'] | null;
  getLocalParticipant: (() => Participant) | null;
  getParticipantStream: Room['getParticipantStream'] | null;

  // Direct room access
  room: Room | null;
}

/**
 * Get user media with proper constraints
 */
async function getUserMedia(
  kind: 'audio' | 'video',
  deviceId?: string,
  options?: { isSimulcastEnabled?: boolean }
): Promise<MediaStreamTrack | undefined> {
  const constraints: MediaStreamConstraints = {};

  if (kind === 'audio') {
    constraints.audio = deviceId
      ? { deviceId, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true };
  }

  if (kind === 'video') {
    const videoConstraints: MediaTrackConstraints = {
      width: options?.isSimulcastEnabled ? { ideal: 1280 } : { ideal: 1920, min: 1280 },
      height: options?.isSimulcastEnabled ? { ideal: 720 } : { ideal: 1080, min: 720 },
      frameRate: { ideal: 30 },
    };

    if (deviceId) {
      videoConstraints.deviceId = deviceId;
    }

    constraints.video = videoConstraints;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
  } catch (error) {
    console.error(`[useTelnyxRoom] Error getting ${kind}:`, error);

    // Fallback for video
    if (kind === 'video') {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        return fallbackStream.getVideoTracks()[0];
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}

/**
 * Extract display name from participant context
 */
function getParticipantName(context?: string, fallbackId?: string): string {
  if (context) {
    try {
      const parsed = JSON.parse(context);
      if (parsed.displayName) return parsed.displayName;
      if (parsed.username) return parsed.username;
    } catch {
      // Not valid JSON
    }
  }
  return `Participante ${(fallbackId || 'Anon').slice(0, 6)}`;
}

/**
 * Main Telnyx Room Hook
 * Following the official telnyx-meet pattern
 */
export function useTelnyxRoom({
  roomId,
  userName,
  autoConnect = false,
  onStatusChange,
}: UseTelnyxRoomOptions): TelnyxRoomState {
  // Room reference
  const roomRef = useRef<Room | null>(null);

  // State
  const [state, setState] = useState<State | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Track states
  const [localTracks, setLocalTracks] = useState<LocalTracks>({
    audio: undefined,
    video: undefined,
  });
  const [presentationTracks, setPresentationTracks] = useState<PresentationTracks>({
    audio: undefined,
    video: undefined,
  });

  // UI states
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Activity tracking (like telnyx-meet)
  const [dominantSpeakerId, setDominantSpeakerId] = useState<string | undefined>();
  const [participantsByActivity, setParticipantsByActivity] = useState<Set<string>>(new Set());

  // Refs for stable callbacks
  const userNameRef = useRef(userName);
  const roomIdRef = useRef(roomId);
  const onStatusChangeRef = useRef(onStatusChange);

  userNameRef.current = userName;
  roomIdRef.current = roomId;
  onStatusChangeRef.current = onStatusChange;

  // Status update helper
  const updateStatus = useCallback((status: string) => {
    console.log(`[useTelnyxRoom] ${status}`);
    onStatusChangeRef.current?.(status);
  }, []);

  /**
   * Get client token from API
   */
  const getToken = useCallback(async (): Promise<string> => {
    const response = await fetch(`/api/rooms/${roomIdRef.current}/token`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener el token de acceso');
    }

    const data = await response.json();

    if (!data.success || !data.token) {
      throw new Error(data.error || 'Token inválido');
    }

    return data.token;
  }, []);

  /**
   * Connect to room and set up all event listeners
   * Following telnyx-meet connectAndJoinRoom pattern
   */
  const connect = useCallback(async () => {
    updateStatus('Iniciando conexión...');

    if (roomRef.current) {
      updateStatus('Ya existe una conexión');
      return;
    }

    try {
      setConnectionState('connecting');
      useRoomStore.getState().setConnectionState('connecting');
      setError(null);

      // 1. Get token
      updateStatus('Obteniendo token...');
      const token = await getToken();

      // 2. Initialize room (dynamic import for client-side)
      updateStatus('Inicializando SDK...');
      const { initialize } = await import('@telnyx/video');

      const context = JSON.stringify({
        displayName: userNameRef.current,
        username: userNameRef.current,
        timestamp: Date.now(),
      });

      roomRef.current = await initialize({
        roomId: roomIdRef.current,
        clientToken: token,
        context,
        logLevel: 'DEBUG',
        enableMessages: true,
      });

      // Get initial state
      setState(roomRef.current.getState());

      // 3. Set up all event listeners (telnyx-meet pattern)

      // State changed
      roomRef.current.on('state_changed', (newState) => {
        console.log('[useTelnyxRoom] state_changed:', newState.status);
        setState(newState);
      });

      // Connected
      roomRef.current.on('connected', (connectedState) => {
        console.log('[useTelnyxRoom] connected event');

        // Initialize participants by activity
        const localId = roomRef.current!.getLocalParticipant().id;
        setParticipantsByActivity(new Set([
          localId,
          ...Array.from(connectedState.participants.keys()),
        ]));

        // Subscribe to existing streams
        connectedState.streams.forEach((stream) => {
          if (stream.participantId === localId) return;

          console.log(`[useTelnyxRoom] Subscribing to existing stream: ${stream.participantId}/${stream.key}`);
          roomRef.current!.addSubscription(stream.participantId, stream.key, {
            audio: true,
            video: true,
          });

          // Handle presentation streams
          if (stream.key === 'presentation') {
            const presenter = connectedState.participants.get(stream.participantId);
            console.log('[useTelnyxRoom] Found presenter:', presenter);
          }
        });

        setConnectionState('connected');
        useRoomStore.getState().setConnectionState('connected');
      });

      // Disconnected
      roomRef.current.on('disconnected', (reason) => {
        console.log('[useTelnyxRoom] disconnected:', reason);
        setConnectionState('disconnected');
        setParticipantsByActivity(new Set());
        useRoomStore.getState().setConnectionState('disconnected');
      });

      // Participant joined
      roomRef.current.on('participant_joined', (participantId, joinedState) => {
        console.log('[useTelnyxRoom] participant_joined:', participantId);

        const participantData = joinedState.participants.get(participantId);
        if (!participantData) return;

        // Add to activity set
        setParticipantsByActivity((prev) => {
          const localId = roomRef.current?.getLocalParticipant().id;
          return new Set([localId || '', ...Array.from(prev), participantId]);
        });

        // Add to store
        const participant: AppParticipant = {
          id: participantId,
          name: getParticipantName(participantData.context, participantId),
          isHost: false,
          isMuted: false,
          isVideoOff: false,
          isSpeaking: false,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: new Date(),
        };

        useRoomStore.getState().addParticipant(participant);
      });

      // Participant left
      roomRef.current.on('participant_left', (participantId) => {
        console.log('[useTelnyxRoom] participant_left:', participantId);

        setParticipantsByActivity((prev) => {
          const newSet = new Set(prev);
          newSet.delete(participantId);
          const localId = roomRef.current?.getLocalParticipant().id;
          return new Set([localId || '', ...Array.from(newSet)]);
        });

        if (dominantSpeakerId === participantId) {
          setDominantSpeakerId(undefined);
        }

        useRoomStore.getState().removeParticipant(participantId);
      });

      // Stream published - subscribe to it
      roomRef.current.on('stream_published', (participantId, key, publishedState) => {
        console.log('[useTelnyxRoom] stream_published:', participantId, key);

        const localId = roomRef.current?.getLocalParticipant().id;
        if (participantId === localId) return;

        // Subscribe to the stream
        roomRef.current!.addSubscription(participantId, key, {
          audio: true,
          video: true,
        });

        // Track screen sharing
        if (key === 'presentation') {
          useRoomStore.getState().updateParticipant(participantId, {
            isScreenSharing: true,
          });
        }
      });

      // Stream unpublished
      roomRef.current.on('stream_unpublished', (participantId, key) => {
        console.log('[useTelnyxRoom] stream_unpublished:', participantId, key);

        if (key === 'presentation') {
          useRoomStore.getState().updateParticipant(participantId, {
            isScreenSharing: false,
          });
        }

        if (key === 'self' && dominantSpeakerId === participantId) {
          setDominantSpeakerId(undefined);
        }
      });

      // Subscription started - get the actual media stream
      roomRef.current.on('subscription_started', (participantId, key) => {
        console.log('[useTelnyxRoom] subscription_started:', participantId, key);

        const stream = roomRef.current?.getParticipantStream(participantId, key);
        if (stream) {
          console.log('[useTelnyxRoom] Got stream tracks:', {
            audio: !!stream.audioTrack,
            video: !!stream.videoTrack,
          });

          useRoomStore.getState().updateParticipant(participantId, {
            audioTrack: stream.audioTrack,
            videoTrack: stream.videoTrack,
          });
        }
      });

      // Audio activity - track who's speaking
      roomRef.current.on('audio_activity', (participantId, key) => {
        const localId = roomRef.current?.getLocalParticipant().id;

        if ((!key || key === 'self') && participantId !== localId) {
          console.log(`[useTelnyxRoom] ${participantId} is speaking`);
          setDominantSpeakerId(participantId);

          setParticipantsByActivity((prev) => {
            return new Set([localId || '', participantId, ...Array.from(prev)]);
          });

          useRoomStore.getState().updateParticipant(participantId, {
            isSpeaking: true,
          });

          // Reset speaking state after a short delay
          setTimeout(() => {
            useRoomStore.getState().updateParticipant(participantId, {
              isSpeaking: false,
            });
          }, 2000);
        }
      });

      // Track enabled/disabled
      roomRef.current.on('track_enabled', (participantId, key, kind) => {
        console.log('[useTelnyxRoom] track_enabled:', participantId, key, kind);
        if (kind === 'video') {
          useRoomStore.getState().updateParticipant(participantId, {
            isVideoOff: false,
          });
        }
        if (kind === 'audio') {
          useRoomStore.getState().updateParticipant(participantId, {
            isMuted: false,
          });
        }
      });

      roomRef.current.on('track_disabled', (participantId, key, kind) => {
        console.log('[useTelnyxRoom] track_disabled:', participantId, key, kind);
        if (kind === 'video') {
          useRoomStore.getState().updateParticipant(participantId, {
            isVideoOff: true,
          });
        }
        if (kind === 'audio') {
          useRoomStore.getState().updateParticipant(participantId, {
            isMuted: true,
          });
        }
      });

      // 4. Connect to room
      updateStatus('Conectando a la sala...');
      await roomRef.current.connect();
      updateStatus('Conexión WebRTC establecida');

      // 5. Get local media tracks
      updateStatus('Obteniendo cámara y micrófono...');
      const audioTrack = await getUserMedia('audio');
      const videoTrack = await getUserMedia('video', undefined, { isSimulcastEnabled: true });

      setLocalTracks({ audio: audioTrack, video: videoTrack });
      setIsAudioEnabled(!!audioTrack);
      setIsVideoEnabled(!!videoTrack);

      // Create MediaStream for local preview
      const tracks = [audioTrack, videoTrack].filter(Boolean) as MediaStreamTrack[];
      if (tracks.length > 0) {
        const stream = new MediaStream(tracks);
        setLocalStream(stream);
      }

      // 6. Publish local stream (following telnyx-meet pattern)
      updateStatus('Publicando stream local...');
      await roomRef.current.addStream('self', {
        audio: audioTrack,
        video: videoTrack
          ? { track: videoTrack, options: { enableSimulcast: true } }
          : undefined,
      });

      // 7. Set up local participant in store
      const localParticipant: AppParticipant = {
        id: 'local',
        name: userNameRef.current,
        isHost: false,
        isMuted: !audioTrack,
        isVideoOff: !videoTrack,
        isSpeaking: false,
        isScreenSharing: false,
        isHandRaised: false,
        joinedAt: new Date(),
        audioTrack,
        videoTrack,
      };

      useRoomStore.getState().setLocalParticipant(localParticipant);
      useRoomStore.getState().setRoom({
        id: roomIdRef.current,
        name: `Sala ${roomIdRef.current}`,
        createdAt: new Date(),
        maxParticipants: 50,
        isRecording: false,
      });

      updateStatus('Conexión completada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      console.error('[useTelnyxRoom] Connection error:', err);
      setError(message);
      setConnectionState('failed');
      useRoomStore.getState().setConnectionState('failed');

      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch {
          // Ignore
        }
        roomRef.current = null;
      }
    }
  }, [getToken, updateStatus, dominantSpeakerId]);

  /**
   * Disconnect from room
   */
  const disconnect = useCallback(() => {
    // Stop local tracks
    localTracks.audio?.stop();
    localTracks.video?.stop();
    presentationTracks.audio?.stop();
    presentationTracks.video?.stop();

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setLocalStream(null);
    setLocalTracks({ audio: undefined, video: undefined });
    setPresentationTracks({ audio: undefined, video: undefined });
    setConnectionState('disconnected');
    setState(null);

    useRoomStore.getState().setConnectionState('disconnected');
    useRoomStore.getState().reset();
  }, [localTracks, presentationTracks]);

  /**
   * Toggle audio (mute/unmute)
   */
  const toggleAudio = useCallback(() => {
    if (localTracks.audio) {
      // Disable audio
      localTracks.audio.stop();
      setLocalTracks((prev) => ({ ...prev, audio: undefined }));
      setIsAudioEnabled(false);

      // Update stream if room is connected
      if (roomRef.current && state?.status === 'connected') {
        roomRef.current.updateStream('self', { audio: undefined, video: localTracks.video });
      }

      useRoomStore.getState().updateLocalParticipant({ isMuted: true });
    } else {
      // Enable audio
      getUserMedia('audio').then((track) => {
        if (track) {
          setLocalTracks((prev) => ({ ...prev, audio: track }));
          setIsAudioEnabled(true);

          if (roomRef.current && state?.status === 'connected') {
            roomRef.current.updateStream('self', { audio: track, video: localTracks.video });
          }

          useRoomStore.getState().updateLocalParticipant({ isMuted: false, audioTrack: track });
        }
      });
    }
  }, [localTracks, state?.status]);

  /**
   * Toggle video (camera on/off)
   */
  const toggleVideo = useCallback(() => {
    if (localTracks.video) {
      // Disable video
      localTracks.video.stop();
      setLocalTracks((prev) => ({ ...prev, video: undefined }));
      setIsVideoEnabled(false);

      if (roomRef.current && state?.status === 'connected') {
        roomRef.current.updateStream('self', { audio: localTracks.audio, video: undefined });
      }

      useRoomStore.getState().updateLocalParticipant({ isVideoOff: true });
    } else {
      // Enable video
      getUserMedia('video', undefined, { isSimulcastEnabled: true }).then((track) => {
        if (track) {
          setLocalTracks((prev) => ({ ...prev, video: track }));
          setIsVideoEnabled(true);

          if (roomRef.current && state?.status === 'connected') {
            roomRef.current.updateStream('self', {
              audio: localTracks.audio,
              video: { track, options: { enableSimulcast: true } },
            });
          }

          useRoomStore.getState().updateLocalParticipant({ isVideoOff: false, videoTrack: track });

          // Update local stream
          setLocalStream((prev) => {
            if (prev) {
              // Remove old video tracks
              prev.getVideoTracks().forEach((t) => prev.removeTrack(t));
              prev.addTrack(track);
              return prev;
            }
            return new MediaStream([track]);
          });
        }
      });
    }
  }, [localTracks, state?.status]);

  /**
   * Toggle screen sharing (presentation)
   */
  const toggleScreenShare = useCallback(() => {
    if (presentationTracks.video) {
      // Stop screen sharing
      presentationTracks.audio?.stop();
      presentationTracks.video.stop();

      if (roomRef.current) {
        roomRef.current.removeStream('presentation');
      }

      setPresentationTracks({ audio: undefined, video: undefined });
      useRoomStore.getState().updateLocalParticipant({ isScreenSharing: false });
    } else {
      // Start screen sharing
      navigator.mediaDevices
        .getDisplayMedia({ audio: true, video: true })
        .then((stream) => {
          const audioTrack = stream.getAudioTracks()[0];
          const videoTrack = stream.getVideoTracks()[0];

          setPresentationTracks({
            audio: audioTrack,
            video: videoTrack,
          });

          // Add presentation stream
          if (roomRef.current) {
            roomRef.current.addStream('presentation', {
              audio: audioTrack,
              video: videoTrack
                ? { track: videoTrack, options: { enableSimulcast: true } }
                : undefined,
            });
          }

          useRoomStore.getState().updateLocalParticipant({ isScreenSharing: true });

          // Handle when user stops sharing via browser UI
          videoTrack.onended = () => {
            if (roomRef.current) {
              roomRef.current.removeStream('presentation');
            }
            setPresentationTracks({ audio: undefined, video: undefined });
            useRoomStore.getState().updateLocalParticipant({ isScreenSharing: false });
          };
        })
        .catch((err) => {
          console.error('[useTelnyxRoom] Screen share error:', err);
        });
    }
  }, [presentationTracks]);

  // Reset dominant speaker after timeout (telnyx-meet pattern)
  useEffect(() => {
    if (!dominantSpeakerId) return;

    const timerId = setTimeout(() => {
      setDominantSpeakerId(undefined);
    }, 5000);

    return () => clearTimeout(timerId);
  }, [dominantSpeakerId]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Calculate screen sharing state
  const isScreenSharing = !!presentationTracks.video;

  return {
    // Connection
    connectionState,
    isConnecting: connectionState === 'connecting',
    isConnected: connectionState === 'connected',
    error,

    // Media
    localStream,
    localTracks,
    presentationTracks,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,

    // Activity
    dominantSpeakerId,
    participantsByActivity,

    // Actions
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,

    // Stream management (expose SDK methods)
    addStream: roomRef.current?.addStream ?? null,
    removeStream: roomRef.current?.removeStream ?? null,
    updateStream: roomRef.current?.updateStream ?? null,
    getLocalParticipant: roomRef.current?.getLocalParticipant ?? null,
    getParticipantStream: roomRef.current?.getParticipantStream ?? null,

    // Direct room access
    room: roomRef.current,
  };
}
