'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useParticipants } from '@/hooks/useParticipants';

/**
 * AudioTrack component - renders a single audio track
 * Based on Telnyx Meet reference implementation
 */
function AudioTrack({
  id,
  audioTrack,
}: {
  id: string;
  audioTrack: MediaStreamTrack;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !audioTrack) return;

    // Create audio element
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.id = `audio-${id}`;

    // Create MediaStream from track and attach to audio element
    const stream = new MediaStream([audioTrack]);
    audioElement.srcObject = stream;

    container.appendChild(audioElement);

    console.log(`[AudioTrack] Playing audio for ${id}`, {
      trackState: audioTrack.readyState,
      trackEnabled: audioTrack.enabled,
    });

    // Play the audio
    audioElement.play().catch((err) => {
      console.error(`[AudioTrack] Play failed for ${id}:`, err);
    });

    return () => {
      audioElement.srcObject = null;
      if (container.contains(audioElement)) {
        container.removeChild(audioElement);
      }
    };
  }, [audioTrack, id]);

  return <div ref={containerRef} className="hidden" />;
}

/**
 * RoomAudio component - handles audio for all remote participants
 * Following Telnyx Meet reference implementation pattern
 */
export function RoomAudio() {
  const { sortedParticipants } = useParticipants();

  // Get all audio tracks from remote participants
  const audioTracks = useMemo(() => {
    const tracks: Array<{ id: string; track: MediaStreamTrack }> = [];

    sortedParticipants.forEach((participant) => {
      // Skip local participant - we don't want to hear ourselves
      if (participant.id === 'local') return;

      // Check if participant has an audio track
      if (participant.audioTrack && participant.audioTrack.readyState === 'live') {
        tracks.push({
          id: participant.id,
          track: participant.audioTrack,
        });

        console.log(`[RoomAudio] Found audio track for ${participant.name}`, {
          trackId: participant.audioTrack.id,
          enabled: participant.audioTrack.enabled,
          readyState: participant.audioTrack.readyState,
        });
      }
    });

    return tracks;
  }, [sortedParticipants]);

  console.log(`[RoomAudio] Rendering ${audioTracks.length} audio tracks`);

  return (
    <div id="room-audio" className="hidden">
      {audioTracks.map(({ id, track }) => (
        <AudioTrack key={id} id={id} audioTrack={track} />
      ))}
    </div>
  );
}

export default RoomAudio;
