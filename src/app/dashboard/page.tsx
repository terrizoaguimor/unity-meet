'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Meeting {
  id: string;
  roomId: string;
  title: string;
  type: string;
  status: string;
  scheduledStart: string | null;
  isPublic: boolean;
  createdAt: string;
  host?: {
    name: string;
  };
  _count?: {
    participants: number;
  };
}

interface Recording {
  id: string;
  filename: string;
  url: string;
  duration: number;
  createdAt: string;
  meeting: {
    title: string;
  };
}

interface AdminStats {
  totalUsers: number;
  totalMeetings: number;
  totalRecordings: number;
  activeMeetings: number;
  usersByRole: { role: string; count: number }[];
  recentActivity: { id: string; type: string; description: string; createdAt: string }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const meetingsRes = await fetch('/api/meetings');
        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          setMeetings(data.meetings || []);
        }

        // Fetch recordings
        const recordingsRes = await fetch('/api/recordings');
        if (recordingsRes.ok) {
          const data = await recordingsRes.json();
          setRecordings(data.recordings?.slice(0, 5) || []);
        }

        // Fetch admin stats if admin
        if (session?.user?.role === 'ADMIN') {
          const statsRes = await fetch('/api/admin/stats');
          if (statsRes.ok) {
            const data = await statsRes.json();
            setAdminStats(data);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session?.user?.role]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-unity-darker">
        <div className="w-12 h-12 border-4 border-unity-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const upcomingMeetings = meetings.filter(m => m.status === 'PENDING' && m.scheduledStart);
  const liveMeetings = meetings.filter(m => m.status === 'LIVE');
  const recentMeetings = meetings.filter(m => m.status === 'ENDED').slice(0, 5);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-unity-darker">
      {/* Header */}
      <header className="bg-white dark:bg-unity-dark-gray border-b border-gray-200 dark:border-unity-darker sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-unity-gradient rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Unity<span className="text-unity-purple">Meet</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Panel Admin</span>
                </Link>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{session.user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bienvenido, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin ? 'Panel de administración - Vista general del sistema' : 'Gestiona tus reuniones y conecta con tu equipo'}
          </p>
        </div>

        {/* Admin Stats Cards */}
        {isAdmin && adminStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios totales</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{adminStats.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {adminStats.usersByRole.map((r) => (
                  <span key={r.role} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {r.role}: {r.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reuniones totales</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{adminStats.totalMeetings}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <Link href="/admin/meetings" className="mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1">
                Ver todas
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Grabaciones</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{adminStats.totalRecordings}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
              <Link href="/admin/recordings" className="mt-4 text-sm text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1">
                Ver grabaciones
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reuniones en vivo</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{adminStats.activeMeetings}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <div className="relative">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                    {adminStats.activeMeetings > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>
              {adminStats.activeMeetings > 0 && (
                <p className="mt-4 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Activas ahora
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/room/create?type=instant">
            <div className="bg-unity-gradient p-6 rounded-xl text-white hover:opacity-90 transition-opacity cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Nueva reunión</h3>
                  <p className="text-white/80 text-sm">Iniciar ahora</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/room/create?type=scheduled">
            <div className="bg-white dark:bg-unity-dark-gray p-6 rounded-xl border border-gray-200 dark:border-unity-darker hover:border-unity-purple dark:hover:border-unity-purple transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-unity-purple/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-unity-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Programar</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Para después</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/room/create?type=webinar">
            <div className="bg-white dark:bg-unity-dark-gray p-6 rounded-xl border border-gray-200 dark:border-unity-darker hover:border-unity-orange dark:hover:border-unity-orange transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-unity-orange/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-unity-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Webinar</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Presentaciones</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Live Meetings Alert */}
        {liveMeetings.length > 0 && (
          <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-green-800 dark:text-green-300">Reuniones en vivo ({liveMeetings.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveMeetings.map((meeting) => (
                <div key={meeting.id} className="bg-white dark:bg-unity-dark-gray rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{meeting.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{meeting.host?.name || 'Host'}</p>
                  </div>
                  <Link href={`/room/${meeting.roomId}`}>
                    <Button size="sm" variant="primary">Unirse</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Meetings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Meetings */}
            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Próximas reuniones</h2>
                <Link href="/room/create?type=scheduled" className="text-sm text-unity-purple hover:underline">
                  + Nueva
                </Link>
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-unity-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : upcomingMeetings.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No tienes reuniones programadas</p>
                    <Link href="/room/create?type=scheduled">
                      <Button variant="outline" size="sm" className="mt-4">
                        Programar reunión
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-unity-darker rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{meeting.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {meeting.scheduledStart && new Date(meeting.scheduledStart).toLocaleString('es-MX')}
                          </p>
                        </div>
                        <Link href={`/room/${meeting.roomId}`}>
                          <Button size="sm">Unirse</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Meetings */}
            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Reuniones recientes</h2>
                {isAdmin && (
                  <Link href="/admin/meetings" className="text-sm text-unity-purple hover:underline">
                    Ver todas
                  </Link>
                )}
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-unity-purple border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : recentMeetings.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No hay reuniones recientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-unity-darker rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            meeting.type === 'WEBINAR' ? 'bg-unity-orange/10' : 'bg-unity-purple/10'
                          }`}>
                            <svg className={`w-5 h-5 ${meeting.type === 'WEBINAR' ? 'text-unity-orange' : 'text-unity-purple'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{meeting.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(meeting.createdAt).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          meeting.type === 'WEBINAR'
                            ? 'bg-unity-orange/10 text-unity-orange'
                            : meeting.type === 'SCHEDULED'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-unity-purple/10 text-unity-purple'
                        }`}>
                          {meeting.type === 'WEBINAR' ? 'Webinar' : meeting.type === 'SCHEDULED' ? 'Programada' : 'Instantánea'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Recordings & Activity */}
          <div className="space-y-8">
            {/* Recent Recordings */}
            <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Grabaciones
                </h2>
                {isAdmin && (
                  <Link href="/admin/recordings" className="text-sm text-unity-purple hover:underline">
                    Ver todas
                  </Link>
                )}
              </div>
              <div className="p-4">
                {recordings.length === 0 ? (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay grabaciones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recordings.map((recording) => (
                      <a
                        key={recording.id}
                        href={recording.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-unity-darker rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {recording.meeting.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDuration(recording.duration)} • {new Date(recording.createdAt).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity (Admin only) */}
            {isAdmin && adminStats && adminStats.recentActivity.length > 0 && (
              <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Actividad reciente</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {adminStats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.createdAt).toLocaleString('es-MX')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Admin Actions */}
            {isAdmin && (
              <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Acciones rápidas</h2>
                </div>
                <div className="p-4 space-y-2">
                  <Link href="/admin/users" className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-unity-darker rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Gestionar usuarios</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Roles y permisos</p>
                    </div>
                  </Link>
                  <Link href="/admin/meetings" className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-unity-darker rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Todas las reuniones</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Historial completo</p>
                    </div>
                  </Link>
                  <Link href="/admin/recordings" className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-unity-darker rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Grabaciones</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ver y descargar</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
