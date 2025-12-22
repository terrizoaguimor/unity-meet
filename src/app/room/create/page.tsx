'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type MeetingType = 'instant' | 'scheduled' | 'webinar';

interface WebinarSettings {
  enableQA: boolean;
  enablePolls: boolean;
  enableChat: boolean;
  enableHandRaise: boolean;
  registrationRequired: boolean;
}

// Main page wrapper with Suspense
export default function CreateRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-unity-darker">
        <div className="w-12 h-12 border-4 border-unity-purple border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateRoomContent />
    </Suspense>
  );
}

function CreateRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Meeting options
  const [meetingType, setMeetingType] = useState<MeetingType>('instant');
  const [enableRecording, setEnableRecording] = useState(false);
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(true); // Enabled by default for security
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [isPublic, setIsPublic] = useState(true);
  const [hostPassword, setHostPassword] = useState('');
  const [participantPassword, setParticipantPassword] = useState('');

  // Scheduled meeting options
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60); // minutes

  // Webinar settings
  const [webinarSettings, setWebinarSettings] = useState<WebinarSettings>({
    enableQA: true,
    enablePolls: true,
    enableChat: true,
    enableHandRaise: true,
    registrationRequired: false,
  });

  // Invitees for scheduled meetings
  const [invitees, setInvitees] = useState<string>('');
  const [inviteMessage, setInviteMessage] = useState<string>('');

  // Set initial meeting type from URL params
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['instant', 'scheduled', 'webinar'].includes(typeParam)) {
      setMeetingType(typeParam as MeetingType);
    }
  }, [searchParams]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/room/create');
    }
  }, [status, router]);

  // Set default date/time for scheduled meetings
  useEffect(() => {
    if (meetingType === 'scheduled' || meetingType === 'webinar') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setScheduledTime('10:00');
    }
  }, [meetingType]);

  const handleCreateRoom = async () => {
    if (!session?.user) {
      setError('Debes iniciar sesión para crear una reunión');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Calculate scheduled times
      let scheduledStart: Date | undefined;
      let scheduledEnd: Date | undefined;

      if (meetingType !== 'instant' && scheduledDate && scheduledTime) {
        scheduledStart = new Date(`${scheduledDate}T${scheduledTime}`);
        scheduledEnd = new Date(scheduledStart.getTime() + duration * 60 * 1000);
      }

      // Parse invitees (comma or newline separated emails)
      const inviteeEmails = invitees
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: roomName || (meetingType === 'webinar' ? 'Webinar de Unity Meet' : 'Reunión de Unity Meet'),
          type: meetingType.toUpperCase(),
          description,
          scheduledStart: scheduledStart?.toISOString(),
          scheduledEnd: scheduledEnd?.toISOString(),
          maxParticipants: meetingType === 'webinar' ? 500 : maxParticipants,
          enableWaitingRoom,
          enableRecording,
          isPublic,
          hostPassword: hostPassword || undefined,
          participantPassword: participantPassword || undefined,
          webinarSettings: meetingType === 'webinar' ? webinarSettings : undefined,
          invitees: inviteeEmails,
          inviteMessage: inviteMessage || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la reunión');
      }

      // Redirect based on meeting type
      if (meetingType === 'instant') {
        router.push(`/room/${data.meeting.roomId}`);
      } else {
        // For scheduled meetings and webinars, go to dashboard with success message
        router.push(`/dashboard?created=${data.meeting.roomId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la reunión');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (joinCode.trim()) {
      let roomId = joinCode.trim();
      if (roomId.includes('/room/')) {
        const parts = roomId.split('/room/');
        roomId = parts[parts.length - 1].split('?')[0];
      }
      router.push(`/room/${roomId}`);
    }
  };

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-unity-darker">
        <div className="w-12 h-12 border-4 border-unity-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <Navbar showAuthButtons={false} />

      <main className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white mb-4 shadow-lg shadow-primary-500/25">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
              Centro de Reuniones
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Crea una nueva reunión o únete a una existente
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Nueva reunión
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'join'
                    ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Unirse a reunión
              </button>
            </div>
          </div>

          {/* Create Tab */}
          {activeTab === 'create' && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="p-8">
                {/* Meeting Type Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Tipo de reunión
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <MeetingTypeCard
                      icon={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      }
                      title="Reunión Instantánea"
                      description="Inicia ahora mismo"
                      selected={meetingType === 'instant'}
                      onClick={() => setMeetingType('instant')}
                    />
                    <MeetingTypeCard
                      icon={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                      title="Reunión Programada"
                      description="Agenda para después"
                      selected={meetingType === 'scheduled'}
                      onClick={() => setMeetingType('scheduled')}
                    />
                    <MeetingTypeCard
                      icon={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      }
                      title="Webinar"
                      description="Hasta 500 asistentes"
                      selected={meetingType === 'webinar'}
                      onClick={() => setMeetingType('webinar')}
                    />
                  </div>
                </div>

                {/* Room Name */}
                <div className="mb-6">
                  <Input
                    label={meetingType === 'webinar' ? 'Título del webinar' : 'Nombre de la reunión'}
                    placeholder={meetingType === 'webinar' ? 'Ej: Presentación de resultados Q4' : 'Ej: Reunión de equipo semanal'}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    }
                  />
                </div>

                {/* Description for scheduled/webinar */}
                {(meetingType === 'scheduled' || meetingType === 'webinar') && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe el tema de la reunión..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}

                {/* Schedule Date/Time for scheduled meetings and webinars */}
                {(meetingType === 'scheduled' || meetingType === 'webinar') && (
                  <div className="mb-6 grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Duración
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={90}>1.5 horas</option>
                        <option value={120}>2 horas</option>
                        <option value={180}>3 horas</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Invitees for scheduled meetings and webinars */}
                {(meetingType === 'scheduled' || meetingType === 'webinar') && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Invitar participantes (opcional)
                    </label>
                    <textarea
                      value={invitees}
                      onChange={(e) => setInvitees(e.target.value)}
                      placeholder="Ingresa los correos de los invitados separados por coma o en líneas separadas&#10;ejemplo@correo.com, otro@correo.com"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                    />
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Los invitados recibirán un correo con el enlace y archivo .ics para agregar al calendario
                    </p>

                    {/* Optional message */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Mensaje personalizado (opcional)
                      </label>
                      <input
                        type="text"
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="Ej: ¡Los espero puntuales!"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Webinar Settings */}
                {meetingType === 'webinar' && (
                  <div className="mb-8 p-4 bg-secondary-50 dark:bg-secondary-900/20 rounded-xl border border-secondary-200 dark:border-secondary-800">
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración del Webinar
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <WebinarToggle
                        label="Preguntas y Respuestas"
                        description="Permitir Q&A"
                        checked={webinarSettings.enableQA}
                        onChange={(checked) => setWebinarSettings(prev => ({ ...prev, enableQA: checked }))}
                      />
                      <WebinarToggle
                        label="Encuestas"
                        description="Crear polls en vivo"
                        checked={webinarSettings.enablePolls}
                        onChange={(checked) => setWebinarSettings(prev => ({ ...prev, enablePolls: checked }))}
                      />
                      <WebinarToggle
                        label="Chat"
                        description="Chat para asistentes"
                        checked={webinarSettings.enableChat}
                        onChange={(checked) => setWebinarSettings(prev => ({ ...prev, enableChat: checked }))}
                      />
                      <WebinarToggle
                        label="Levantar mano"
                        description="Solicitar participar"
                        checked={webinarSettings.enableHandRaise}
                        onChange={(checked) => setWebinarSettings(prev => ({ ...prev, enableHandRaise: checked }))}
                      />
                    </div>
                  </div>
                )}

                {/* Options */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Opciones de la reunión
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Max Participants (not for webinar) */}
                    {meetingType !== 'webinar' && (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900 dark:text-white">Participantes</p>
                              <p className="text-xs text-neutral-500">Máximo permitido</p>
                            </div>
                          </div>
                          <select
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(Number(e.target.value))}
                            className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Recording */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Grabación</p>
                            <p className="text-xs text-neutral-500">Guardar en la nube</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={enableRecording} onChange={setEnableRecording} />
                      </div>
                    </div>

                    {/* Waiting Room */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 dark:text-secondary-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Sala de espera</p>
                            <p className="text-xs text-neutral-500">Aprobar entrada</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={enableWaitingRoom} onChange={setEnableWaitingRoom} />
                      </div>
                    </div>

                    {/* Public/Private */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isPublic
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isPublic ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                              {isPublic ? 'Reunión pública' : 'Reunión privada'}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {isPublic ? 'Cualquiera con el link' : 'Solo invitados'}
                            </p>
                          </div>
                        </div>
                        <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
                      </div>
                    </div>
                  </div>

                  {/* Dual Password Section */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Protección con contraseñas (opcional)
                      </span>
                    </div>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mb-4">
                      Configura contraseñas para controlar el acceso. Recibirás las credenciales por correo.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Contraseña de Organizador
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ej: host123"
                            value={hostPassword}
                            onChange={(e) => setHostPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-green-300 dark:border-green-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">
                            Moderador
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-neutral-500">
                          Acceso con permisos completos
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Contraseña de Participantes
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ej: invitado456"
                            value={participantPassword}
                            onChange={(e) => setParticipantPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-blue-300 dark:border-blue-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium">
                            Invitado
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-neutral-500">
                          Comparte esta con los invitados
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Create Button */}
                <Button
                  onClick={handleCreateRoom}
                  isLoading={isCreating}
                  className="w-full"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {meetingType === 'instant'
                    ? 'Crear reunión ahora'
                    : meetingType === 'scheduled'
                    ? 'Programar reunión'
                    : 'Crear webinar'
                  }
                </Button>
              </div>

              {/* Features Strip */}
              <div className="px-8 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-center gap-6 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Video HD
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Compartir pantalla
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Chat en vivo
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    IA integrada
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Join Tab */}
          {activeTab === 'join' && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="p-8">
                <div className="max-w-md mx-auto">
                  {/* Illustration */}
                  <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                      <svg className="w-12 h-12 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="text-xl font-semibold text-center text-neutral-900 dark:text-white mb-2">
                    Únete a una reunión
                  </h2>
                  <p className="text-sm text-center text-neutral-500 mb-8">
                    Ingresa el código o enlace que te compartieron
                  </p>

                  <Input
                    label="Código de reunión o enlace"
                    placeholder="Ej: abc-123-xyz o https://meet.byunity.net/room/..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    }
                  />

                  <Button
                    onClick={handleJoinRoom}
                    disabled={!joinCode.trim()}
                    variant="secondary"
                    className="w-full mt-6"
                    size="lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Unirse a la reunión
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/dashboard">
              <QuickAction
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
                label="Dashboard"
                sublabel="Ver panel"
              />
            </Link>
            <QuickAction
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              label="Programadas"
              sublabel="Ver calendario"
              disabled
            />
            <QuickAction
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              }
              label="Grabaciones"
              sublabel="Ver todas"
              disabled
            />
            <QuickAction
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              label="Configuración"
              sublabel="Ajustes"
              disabled
            />
          </div>

          {/* Back Link */}
          <div className="text-center mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  );
}

// Webinar Toggle Component
function WebinarToggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

// Meeting Type Card Component
function MeetingTypeCard({
  icon,
  title,
  description,
  selected,
  onClick,
  badge,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : disabled
          ? 'border-neutral-200 dark:border-neutral-700 opacity-50 cursor-not-allowed'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
      }`}
    >
      {badge && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-secondary-500 text-white">
          {badge}
        </span>
      )}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
          selected
            ? 'bg-primary-500 text-white'
            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
        }`}
      >
        {icon}
      </div>
      <h3 className={`text-sm font-medium ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'}`}>
        {title}
      </h3>
      <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
    </button>
  );
}

// Quick Action Component
function QuickAction({
  icon,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-left transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-2">
        {icon}
      </div>
      <p className="text-sm font-medium text-neutral-900 dark:text-white">{label}</p>
      <p className="text-xs text-neutral-500">{sublabel}</p>
    </button>
  );
}
