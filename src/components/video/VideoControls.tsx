'use client';

import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';

interface VideoControlsProps {
  // Estados de medios
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Contadores
  participantCount: number;
  unreadMessages: number;

  // Callbacks
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleSettings: () => void;
  onLeave: () => void;
  onCopyLink: () => void;

  // UI
  isChatOpen?: boolean;
  isParticipantsOpen?: boolean;
  className?: string;
}

/**
 * Barra de controles de la reunión
 */
export function VideoControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  participantCount,
  unreadMessages,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleSettings,
  onLeave,
  onCopyLink,
  isChatOpen,
  isParticipantsOpen,
  className,
}: VideoControlsProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Animación de entrada
  useEffect(() => {
    if (controlsRef.current) {
      gsap.from(controlsRef.current, {
        y: 100,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={controlsRef}
      className={cn(
        'flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4',
        'bg-white/90 dark:bg-unity-dark-gray/90 backdrop-blur-md',
        'rounded-2xl shadow-lg border border-unity-light-gray dark:border-unity-darker',
        className
      )}
    >
      {/* Toggle Audio */}
      <Tooltip content={isAudioEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}>
        <button
          onClick={onToggleAudio}
          className={cn(
            'control-button',
            isAudioEnabled ? 'enabled' : 'disabled'
          )}
          aria-label={isAudioEnabled ? 'Silenciar' : 'Activar micrófono'}
        >
          {isAudioEnabled ? (
            <MicIcon className="w-5 h-5" />
          ) : (
            <MicOffIcon className="w-5 h-5" />
          )}
        </button>
      </Tooltip>

      {/* Toggle Video */}
      <Tooltip content={isVideoEnabled ? 'Apagar cámara' : 'Encender cámara'}>
        <button
          onClick={onToggleVideo}
          className={cn(
            'control-button',
            isVideoEnabled ? 'enabled' : 'disabled'
          )}
          aria-label={isVideoEnabled ? 'Apagar cámara' : 'Encender cámara'}
        >
          {isVideoEnabled ? (
            <VideoIcon className="w-5 h-5" />
          ) : (
            <VideoOffIcon className="w-5 h-5" />
          )}
        </button>
      </Tooltip>

      {/* Screen Share */}
      <Tooltip
        content={isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
      >
        <button
          onClick={onToggleScreenShare}
          className={cn(
            'control-button hidden sm:flex',
            isScreenSharing
              ? 'bg-unity-purple text-white'
              : 'enabled'
          )}
          aria-label={isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
        >
          <ScreenShareIcon className="w-5 h-5" />
        </button>
      </Tooltip>

      {/* Separador */}
      <div className="w-px h-8 bg-unity-light-gray dark:bg-unity-darker mx-1" />

      {/* Chat */}
      <Tooltip content="Chat">
        <button
          onClick={onToggleChat}
          className={cn(
            'control-button relative',
            isChatOpen
              ? 'bg-unity-purple text-white'
              : 'enabled'
          )}
          aria-label="Abrir chat"
        >
          <ChatIcon className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-unity-orange rounded-full">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Participantes */}
      <Tooltip content="Participantes">
        <button
          onClick={onToggleParticipants}
          className={cn(
            'control-button relative hidden sm:flex',
            isParticipantsOpen
              ? 'bg-unity-purple text-white'
              : 'enabled'
          )}
          aria-label="Ver participantes"
        >
          <UsersIcon className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-unity-purple rounded-full">
            {participantCount}
          </span>
        </button>
      </Tooltip>

      {/* Copiar Link */}
      <Tooltip content="Copiar enlace de invitación">
        <button
          onClick={onCopyLink}
          className="control-button enabled hidden md:flex"
          aria-label="Copiar enlace"
        >
          <LinkIcon className="w-5 h-5" />
        </button>
      </Tooltip>

      {/* Más opciones */}
      <div className="relative" ref={moreMenuRef}>
        <Tooltip content="Más opciones">
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="control-button enabled"
            aria-label="Más opciones"
          >
            <MoreIcon className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Menú desplegable */}
        {isMoreMenuOpen && (
          <div className="absolute bottom-full mb-2 right-0 w-48 py-2 bg-white dark:bg-unity-dark-gray rounded-xl shadow-xl border border-unity-light-gray dark:border-unity-darker animate-[scale-in_0.2s_ease-out] origin-bottom-right">
            <button
              onClick={() => {
                onToggleSettings();
                setIsMoreMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-unity-light-gray/50 dark:hover:bg-unity-darker/50 flex items-center gap-2"
            >
              <SettingsIcon className="w-4 h-4" />
              Configuración
            </button>

            <button
              onClick={() => {
                onCopyLink();
                setIsMoreMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-unity-light-gray/50 dark:hover:bg-unity-darker/50 flex items-center gap-2 sm:hidden"
            >
              <LinkIcon className="w-4 h-4" />
              Copiar enlace
            </button>

            <button
              onClick={() => {
                onToggleScreenShare();
                setIsMoreMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-unity-light-gray/50 dark:hover:bg-unity-darker/50 flex items-center gap-2 sm:hidden"
            >
              <ScreenShareIcon className="w-4 h-4" />
              {isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
            </button>

            <div className="my-2 border-t border-unity-light-gray dark:border-unity-darker" />

            <button
              onClick={() => {
                onLeave();
                setIsMoreMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <LeaveIcon className="w-4 h-4" />
              Salir de la reunión
            </button>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="w-px h-8 bg-unity-light-gray dark:bg-unity-darker mx-1" />

      {/* Salir */}
      <Tooltip content="Salir de la reunión">
        <button
          onClick={onLeave}
          className="control-button danger"
          aria-label="Salir"
        >
          <LeaveIcon className="w-5 h-5" />
        </button>
      </Tooltip>
    </div>
  );
}

// Iconos
function MicIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25zM3 3l18 18" />
    </svg>
  );
}

function ScreenShareIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}
