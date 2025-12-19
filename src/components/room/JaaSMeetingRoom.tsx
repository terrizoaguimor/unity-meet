'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { JaaSMeeting } from '@jitsi/react-sdk';
import type { IJitsiMeetExternalApi } from '@jitsi/react-sdk/lib/types';

interface JaaSMeetingRoomProps {
  roomName: string;
  userName: string;
  jwt: string;
  onReadyToClose?: () => void;
  onParticipantJoined?: (participant: { id: string; displayName: string }) => void;
  onParticipantLeft?: (participant: { id: string }) => void;
  onRecordingStatusChanged?: (isRecording: boolean) => void;
}

/**
 * JaaS Meeting Room Component
 * Wrapper around the JaaSMeeting component with custom configuration
 */
export function JaaSMeetingRoom({
  roomName,
  userName,
  jwt,
  onReadyToClose,
  onParticipantJoined,
  onParticipantLeft,
  onRecordingStatusChanged,
}: JaaSMeetingRoomProps) {
  const apiRef = useRef<IJitsiMeetExternalApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleApiReady = useCallback((api: IJitsiMeetExternalApi) => {
    apiRef.current = api;
    setIsLoading(false);

    // Cast api to access addEventListener with proper event types
    const jitsiApi = api as unknown as {
      addEventListener: (event: string, handler: (data: unknown) => void) => void;
    };

    // Listen for events
    jitsiApi.addEventListener('participantJoined', (data) => {
      const participant = data as { id: string; displayName: string };
      console.log('[JaaS] Participant joined:', participant);
      onParticipantJoined?.(participant);
    });

    jitsiApi.addEventListener('participantLeft', (data) => {
      const participant = data as { id: string };
      console.log('[JaaS] Participant left:', participant);
      onParticipantLeft?.(participant);
    });

    jitsiApi.addEventListener('recordingStatusChanged', (data) => {
      const status = data as { on: boolean };
      console.log('[JaaS] Recording status:', status);
      onRecordingStatusChanged?.(status.on);
    });

    jitsiApi.addEventListener('videoConferenceJoined', (data) => {
      const conference = data as { roomName: string; id: string; displayName: string };
      console.log('[JaaS] Joined conference:', conference);
    });

    jitsiApi.addEventListener('videoConferenceLeft', () => {
      console.log('[JaaS] Left conference');
    });

    jitsiApi.addEventListener('readyToClose', () => {
      console.log('[JaaS] Ready to close');
      onReadyToClose?.();
    });
  }, [onParticipantJoined, onParticipantLeft, onRecordingStatusChanged, onReadyToClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, []);

  const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;

  if (!appId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>Error: JaaS App ID not configured</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg">Conectando a la reunión...</p>
          </div>
        </div>
      )}

      <JaaSMeeting
        appId={appId}
        roomName={roomName}
        jwt={jwt}
        configOverwrite={{
          // General settings
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,

          // Branding
          defaultLogoUrl: '',
          hiddenPremeetingButtons: [],

          // Features
          enableClosePage: false,
          enableWelcomePage: false,
          enableInsecureRoomNameWarning: false,

          // Recording
          fileRecordingsEnabled: true,
          localRecording: {
            enabled: true,
            format: 'webm',
          },

          // Quality
          resolution: 720,
          constraints: {
            video: {
              height: { ideal: 720, max: 1080, min: 240 },
              width: { ideal: 1280, max: 1920, min: 320 },
            },
          },

          // Toolbox
          toolbarButtons: [
            'camera',
            'chat',
            'closedcaptions',
            'desktop',
            'download',
            'embedmeeting',
            'etherpad',
            'feedback',
            'filmstrip',
            'fullscreen',
            'hangup',
            'help',
            'highlight',
            'invite',
            'linktosalesforce',
            'livestreaming',
            'microphone',
            'noisesuppression',
            'participants-pane',
            'profile',
            'raisehand',
            'recording',
            'security',
            'select-background',
            'settings',
            'shareaudio',
            'sharedvideo',
            'shortcuts',
            'stats',
            'tileview',
            'toggle-camera',
            'videoquality',
            'whiteboard',
          ],

          // Disable watermark
          disableInviteFunctions: false,
        }}
        interfaceConfigOverwrite={{
          // UI Customization
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',

          // Toolbar
          TOOLBAR_ALWAYS_VISIBLE: true,
          TOOLBAR_TIMEOUT: 4000,

          // Filmstrip
          FILM_STRIP_MAX_HEIGHT: 120,
          VERTICAL_FILMSTRIP: true,

          // Tile view
          TILE_VIEW_MAX_COLUMNS: 5,

          // Disable promo
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,

          // Mobile
          MOBILE_APP_PROMO: false,

          // Settings
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar', 'sounds', 'more'],

          // Video
          DEFAULT_BACKGROUND: '#1a1a2e',
          DEFAULT_LOCAL_DISPLAY_NAME: userName,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Participante',

          // Lang
          DEFAULT_LANGUAGE: 'es',
        }}
        userInfo={{
          displayName: userName,
          email: `${userName.toLowerCase().replace(/\s+/g, '.')}@unity.meet`,
        }}
        onApiReady={handleApiReady}
        onReadyToClose={onReadyToClose}
        getIFrameRef={(iframeRef) => {
          if (iframeRef) {
            iframeRef.style.width = '100%';
            iframeRef.style.height = '100%';
            iframeRef.style.border = 'none';
          }
        }}
      />
    </div>
  );
}
