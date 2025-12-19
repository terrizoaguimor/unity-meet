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
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const response = await fetch('/api/meetings');
        if (response.ok) {
          const data = await response.json();
          setMeetings(data.meetings || []);
        }
      } catch (error) {
        console.error('Error fetching meetings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchMeetings();
    }
  }, [status]);

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
  const recentMeetings = meetings.filter(m => m.status === 'ENDED').slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-unity-darker">
      {/* Header */}
      <header className="bg-white dark:bg-unity-dark-gray border-b border-gray-200 dark:border-unity-darker">
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
            Gestiona tus reuniones y conecta con tu equipo
          </p>
        </div>

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

        {/* Meetings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Meetings */}
          <div className="bg-white dark:bg-unity-dark-gray rounded-xl border border-gray-200 dark:border-unity-darker overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker">
              <h2 className="font-semibold text-gray-900 dark:text-white">Próximas reuniones</h2>
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
                          {meeting.scheduledStart && new Date(meeting.scheduledStart).toLocaleString('es-ES')}
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
            <div className="px-6 py-4 border-b border-gray-200 dark:border-unity-darker">
              <h2 className="font-semibold text-gray-900 dark:text-white">Reuniones recientes</h2>
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
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{meeting.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(meeting.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        meeting.type === 'WEBINAR'
                          ? 'bg-unity-orange/10 text-unity-orange'
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
      </main>
    </div>
  );
}
