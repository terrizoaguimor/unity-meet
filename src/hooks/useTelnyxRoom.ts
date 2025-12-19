'use client';

/**
 * Telnyx Room Hook - Based on official telnyx-meet implementation
 * https://github.com/team-telnyx/telnyx-meet
 *
 * Key pattern from official implementation:
 * 1. Initialize room and connect
 * 2. Add 'self' stream once
 * 3. Update stream when tracks change
 * 4. Subscribe to remote streams
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
  connectionState: ConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  localStream: MediaStream | null;
  localTracks: LocalTracks;
  presentationTracks: PresentationTracks;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  dominantSpeakerId: string | undefined;
  participantsByActivity: Set<string>;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  addStream: Room['addStream'] | null;
  removeStream: Room['removeStream'] | null;
  updateStream: Room['updateStream'] | null;
  getLocalParticipant: (() => Participant) | null;
  getParticipantStream: Room['getParticipantStream'] | null;
  room: Room | null;
}

/**
 * Get user media with HD constraints
 */
async function getUserMedia(
  kind: 'audio' | 'video',
  deviceId?: string
): Promise<MediaStreamTrack | undefined> {
  const constraints: MediaStreamConstraints = {};

  if (kind === 'audio') {
    constraints.audio = deviceId
      ? { deviceId, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  }

  if (kind === 'video') {
    constraints.video = {
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, max: 30 },
      ...(deviceId ? { deviceId } : {}),
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
    console.log(`[useTelnyxRoom] Got ${kind} track:`, track?.label, track?.getSettings());
    return track;
  } catch (error) {
    console.error(`[useTelnyxRoom] Error getting ${kind}:`, error);
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
 * Following official telnyx-meet pattern exactly
 */
export function useTelnyxRoom({
  roomId,
  userName,
  autoConnect = false,
  onStatusChange,
}: UseTelnyxRoomOptions): TelnyxRoomState {
  // Room reference
  const roomRef = useRef<Room | null>(null);

  // Track if we've added the self stream
  const selfStreamAddedRef = useRef(false);

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

  // Activity tracking
  const [dominantSpeakerId, setDominantSpeakerId] = useState<string | undefined>();
  const [participantsByActivity, setParticipantsByActivity] = useState<Set<string>>(new Set());

  // Refs for stable callbacks
  const userNameRef = useRef(userName);
  const roomIdRef = useRef(roomId);
  const onStatusChangeRef = useRef(onStatusChange);
  const localTracksRef = useRef(localTracks);

  userNameRef.current = userName;
  roomIdRef.current = roomId;
  onStatusChangeRef.current = onStatusChange;
  localTracksRef.current = localTracks;

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
   * Add or update self stream - following telnyx-meet pattern
   */
  const publishLocalStream = useCallback(async (audio?: MediaStreamTrack, video?: MediaStreamTrack) => {
    if (!roomRef.current) {
      console.error('[useTelnyxRoom] Cannot publish - no room');
      return;
    }

    const currentState = roomRef.current.getState();
    const localParticipant = roomRef.current.getLocalParticipant();
    const selfStream = currentState.streams.get(`${localParticipant.id}:self`);

    console.log('[useTelnyxRoom] publishLocalStream called:', {
      hasAudio: !!audio,
      hasVideo: !!video,
      selfStreamExists: !!selfStream,
      selfStreamAddedRef: selfStreamAddedRef.current,
    });

    const streamConfig = {
      audio: audio,
      video: video ? {
        track: video,
        options: { enableSimulcast: true }
      } : undefined,
    };

    try {
      if (!selfStreamAddedRef.current) {
        // Add stream for the first time
        console.log('[useTelnyxRoom] Adding self stream...');
        await roomRef.current.addStream('self', streamConfig);
        selfStreamAddedRef.current = true;
        console.log('[useTelnyxRoom] Self stream added successfully');
      } else {
        // Update existing stream
        console.log('[useTelnyxRoom] Updating self stream...');
        await roomRef.current.updateStream('self', {
          audio: audio,
          video: video ? { track: video, options: { enableSimulcast: true } } : undefined,
        });
        console.log('[useTelnyxRoom] Self stream updated successfully');
      }
    } catch (err) {
      console.error('[useTelnyxRoom] Error publishing stream:', err);
      throw err;
    }
  }, []);

  /**
   * Subscribe to a remote stream
   */
  const subscribeToStream = useCallback((participantId: string, key: string) => {
    if (!roomRef.current) return;

    const localId = roomRef.current.getLocalParticipant().id;
    if (participantId === localId) {
      console.log('[useTelnyxRoom] Skipping subscription to own stream');
      return;
    }

    console.log(`[useTelnyxRoom] Subscribing to ${participantId}/${key}`);

    try {
      roomRef.current.addSubscription(participantId, key, {
        audio: true,
        video: true,
      });
    } catch (err) {
      console.error(`[useTelnyxRoom] Error subscribing to ${participantId}/${key}:`, err);
    }
  }, []);

  /**
   * Connect to room
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
      selfStreamAddedRef.current = false;

      // 1. Get token
      updateStatus('Obteniendo token...');
      const token = await getToken();

      // 2. Get local media FIRST (before connecting)
      updateStatus('Obteniendo cámara y micrófono...');
      const [audioTrack, videoTrack] = await Promise.all([
        getUserMedia('audio'),
        getUserMedia('video'),
      ]);

      setLocalTracks({ audio: audioTrack, video: videoTrack });
      setIsAudioEnabled(!!audioTrack);
      setIsVideoEnabled(!!videoTrack);

      // Create local stream for preview
      const tracks = [audioTrack, videoTrack].filter(Boolean) as MediaStreamTrack[];
      if (tracks.length > 0) {
        setLocalStream(new MediaStream(tracks));
      }

      // 3. Initialize room
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

      setState(roomRef.current.getState());

      // 4. Set up event listeners BEFORE connecting

      // State changed
      roomRef.current.on('state_changed', (newState) => {
        console.log('[useTelnyxRoom] state_changed:', newState.status);
        setState(newState);
      });

      // Connected - subscribe to existing streams
      roomRef.current.on('connected', (connectedState) => {
        console.log('[useTelnyxRoom] connected event, streams:', connectedState.streams.size);

        const localId = roomRef.current!.getLocalParticipant().id;
        console.log('[useTelnyxRoom] Local participant ID:', localId);

        // Initialize activity tracking
        setParticipantsByActivity(new Set([
          localId,
          ...Array.from(connectedState.participants.keys()),
        ]));

        // Subscribe to ALL existing streams
        connectedState.streams.forEach((stream, streamKey) => {
          console.log(`[useTelnyxRoom] Found existing stream: ${streamKey}`);
          subscribeToStream(stream.participantId, stream.key);

          // Track screen sharing
          if (stream.key === 'presentation') {
            useRoomStore.getState().updateParticipant(stream.participantId, {
              isScreenSharing: true,
            });
          }
        });

        // Add existing participants to store
        connectedState.participants.forEach((participant, participantId) => {
          if (participantId === localId) return;

          const appParticipant: AppParticipant = {
            id: participantId,
            name: getParticipantName(participant.context, participantId),
            isHost: false,
            isMuted: false,
            isVideoOff: false,
            isSpeaking: false,
            isScreenSharing: false,
            isHandRaised: false,
            joinedAt: new Date(),
          };
          useRoomStore.getState().addParticipant(appParticipant);
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

      // Stream published - subscribe immediately
      roomRef.current.on('stream_published', (participantId, key) => {
        console.log('[useTelnyxRoom] stream_published:', participantId, key);
        subscribeToStream(participantId, key);

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
      });

      // Subscription started - get tracks
      roomRef.current.on('subscription_started', (participantId, key) => {
        console.log('[useTelnyxRoom] subscription_started:', participantId, key);

        const stream = roomRef.current?.getParticipantStream(participantId, key);
        if (stream) {
          console.log('[useTelnyxRoom] Got stream tracks:', {
            participantId,
            key,
            audioTrack: stream.audioTrack?.label,
            videoTrack: stream.videoTrack?.label,
          });

          // Ensure participant exists in store first
          const state = useRoomStore.getState();
          if (!state.participants.has(participantId)) {
            const roomState = roomRef.current?.getState();
            const participantData = roomState?.participants.get(participantId);
            if (participantData) {
              state.addParticipant({
                id: participantId,
                name: getParticipantName(participantData.context, participantId),
                isHost: false,
                isMuted: false,
                isVideoOff: false,
                isSpeaking: false,
                isScreenSharing: key === 'presentation',
                isHandRaised: false,
                joinedAt: new Date(),
              });
            }
          }

          useRoomStore.getState().updateParticipant(participantId, {
            audioTrack: stream.audioTrack,
            videoTrack: stream.videoTrack,
            isScreenSharing: key === 'presentation',
          });
        }
      });

      // Audio activity
      roomRef.current.on('audio_activity', (participantId, key) => {
        const localId = roomRef.current?.getLocalParticipant().id;

        if ((!key || key === 'self') && participantId !== localId) {
          setDominantSpeakerId(participantId);
          setParticipantsByActivity((prev) => {
            return new Set([localId || '', participantId, ...Array.from(prev)]);
          });

          useRoomStore.getState().updateParticipant(participantId, {
            isSpeaking: true,
          });

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
          useRoomStore.getState().updateParticipant(participantId, { isVideoOff: false });
        }
        if (kind === 'audio') {
          useRoomStore.getState().updateParticipant(participantId, { isMuted: false });
        }
      });

      roomRef.current.on('track_disabled', (participantId, key, kind) => {
        console.log('[useTelnyxRoom] track_disabled:', participantId, key, kind);
        if (kind === 'video') {
          useRoomStore.getState().updateParticipant(participantId, { isVideoOff: true });
        }
        if (kind === 'audio') {
          useRoomStore.getState().updateParticipant(participantId, { isMuted: true });
        }
      });

      // 5. Connect to room
      updateStatus('Conectando a la sala...');
      await roomRef.current.connect();
      updateStatus('Conexión WebRTC establecida');

      // 6. Publish local stream AFTER connection is established
      updateStatus('Publicando video y audio...');
      await publishLocalStream(audioTrack, videoTrack);
      updateStatus('Stream publicado');

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

      updateStatus('¡Conectado!');
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
  }, [getToken, updateStatus, publishLocalStream, subscribeToStream, dominantSpeakerId]);

  /**
   * Disconnect from room
   */
  const disconnect = useCallback(() => {
    localTracks.audio?.stop();
    localTracks.video?.stop();
    presentationTracks.audio?.stop();
    presentationTracks.video?.stop();

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    selfStreamAddedRef.current = false;
    setLocalStream(null);
    setLocalTracks({ audio: undefined, video: undefined });
    setPresentationTracks({ audio: undefined, video: undefined });
    setConnectionState('disconnected');
    setState(null);

    useRoomStore.getState().setConnectionState('disconnected');
    useRoomStore.getState().reset();
  }, [localTracks, presentationTracks]);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(async () => {
    if (localTracks.audio) {
      // Disable audio
      localTracks.audio.stop();
      setLocalTracks((prev) => ({ ...prev, audio: undefined }));
      setIsAudioEnabled(false);

      if (roomRef.current && selfStreamAddedRef.current) {
        await roomRef.current.updateStream('self', {
          audio: undefined,
          video: localTracks.video ? { track: localTracks.video, options: { enableSimulcast: true } } : undefined,
        });
      }

      useRoomStore.getState().updateLocalParticipant({ isMuted: true, audioTrack: undefined });
    } else {
      // Enable audio
      const track = await getUserMedia('audio');
      if (track) {
        setLocalTracks((prev) => ({ ...prev, audio: track }));
        setIsAudioEnabled(true);

        if (roomRef.current && selfStreamAddedRef.current) {
          await roomRef.current.updateStream('self', {
            audio: track,
            video: localTracksRef.current.video ? { track: localTracksRef.current.video, options: { enableSimulcast: true } } : undefined,
          });
        }

        useRoomStore.getState().updateLocalParticipant({ isMuted: false, audioTrack: track });
      }
    }
  }, [localTracks]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async () => {
    if (localTracks.video) {
      // Disable video
      localTracks.video.stop();
      setLocalTracks((prev) => ({ ...prev, video: undefined }));
      setIsVideoEnabled(false);

      if (roomRef.current && selfStreamAddedRef.current) {
        await roomRef.current.updateStream('self', {
          audio: localTracks.audio,
          video: undefined,
        });
      }

      useRoomStore.getState().updateLocalParticipant({ isVideoOff: true, videoTrack: undefined });
    } else {
      // Enable video
      const track = await getUserMedia('video');
      if (track) {
        setLocalTracks((prev) => ({ ...prev, video: track }));
        setIsVideoEnabled(true);

        if (roomRef.current && selfStreamAddedRef.current) {
          await roomRef.current.updateStream('self', {
            audio: localTracksRef.current.audio,
            video: { track, options: { enableSimulcast: true } },
          });
        }

        useRoomStore.getState().updateLocalParticipant({ isVideoOff: false, videoTrack: track });

        // Update local stream
        setLocalStream((prev) => {
          if (prev) {
            prev.getVideoTracks().forEach((t) => prev.removeTrack(t));
            prev.addTrack(track);
            return prev;
          }
          return new MediaStream([track]);
        });
      }
    }
  }, [localTracks]);

  /**
   * Toggle screen sharing
   */
  const toggleScreenShare = useCallback(async () => {
    if (presentationTracks.video) {
      // Stop screen sharing
      presentationTracks.audio?.stop();
      presentationTracks.video.stop();

      if (roomRef.current) {
        await roomRef.current.removeStream('presentation');
      }

      setPresentationTracks({ audio: undefined, video: undefined });
      useRoomStore.getState().updateLocalParticipant({ isScreenSharing: false });
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        });

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        setPresentationTracks({ audio: audioTrack, video: videoTrack });

        if (roomRef.current) {
          await roomRef.current.addStream('presentation', {
            audio: audioTrack,
            video: videoTrack ? { track: videoTrack, options: { enableSimulcast: true } } : undefined,
          });
        }

        useRoomStore.getState().updateLocalParticipant({ isScreenSharing: true });

        // Handle browser stop
        videoTrack.onended = async () => {
          if (roomRef.current) {
            await roomRef.current.removeStream('presentation');
          }
          setPresentationTracks({ audio: undefined, video: undefined });
          useRoomStore.getState().updateLocalParticipant({ isScreenSharing: false });
        };
      } catch (err) {
        console.error('[useTelnyxRoom] Screen share error:', err);
      }
    }
  }, [presentationTracks]);

  // Reset dominant speaker after timeout
  useEffect(() => {
    if (!dominantSpeakerId) return;
    const timerId = setTimeout(() => setDominantSpeakerId(undefined), 5000);
    return () => clearTimeout(timerId);
  }, [dominantSpeakerId]);

  // Auto-connect
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

  const isScreenSharing = !!presentationTracks.video;

  return {
    connectionState,
    isConnecting: connectionState === 'connecting',
    isConnected: connectionState === 'connected',
    error,
    localStream,
    localTracks,
    presentationTracks,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    dominantSpeakerId,
    participantsByActivity,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    addStream: roomRef.current?.addStream ?? null,
    removeStream: roomRef.current?.removeStream ?? null,
    updateStream: roomRef.current?.updateStream ?? null,
    getLocalParticipant: roomRef.current?.getLocalParticipant ?? null,
    getParticipantStream: roomRef.current?.getParticipantStream ?? null,
    room: roomRef.current,
  };
}
