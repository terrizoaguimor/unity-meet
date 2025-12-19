'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Página mejorada para crear una nueva sala de reunión
 */
export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Opciones de tipo de reunión
  const [meetingType, setMeetingType] = useState<'instant' | 'scheduled' | 'webinar'>('instant');
  const [enableRecording, setEnableRecording] = useState(false);
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(50);

  // Crear sala
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName || undefined,
          maxParticipants,
          enableRecording,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/room/${data.room.id}`);
      } else {
        setError(data.error || 'Error al crear la sala');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsCreating(false);
    }
  };

  // Unirse con código
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
                      badge="Próximamente"
                      disabled
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
                      badge="Próximamente"
                      disabled
                    />
                  </div>
                </div>

                {/* Room Name */}
                <div className="mb-6">
                  <Input
                    label="Nombre de la reunión (opcional)"
                    placeholder="Ej: Reunión de equipo semanal"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    }
                  />
                </div>

                {/* Options */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Opciones de la reunión
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Max Participants */}
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
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableRecording}
                            onChange={(e) => setEnableRecording(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
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
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableWaitingRoom}
                            onChange={(e) => setEnableWaitingRoom(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Public Link */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Link público</p>
                            <p className="text-xs text-neutral-500">Para prospectos</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                          Incluido
                        </span>
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
                  Crear reunión ahora
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
            <QuickAction
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              label="Reuniones recientes"
              sublabel="Ver historial"
              disabled
            />
            <QuickAction
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              label="Programadas"
              sublabel="Próximamente"
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
              href="/"
              className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
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
