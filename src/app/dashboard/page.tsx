'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import gsap from 'gsap';

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

  // Refs for GSAP animations
  const headerRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // GSAP Animations
  useEffect(() => {
    if (status === 'authenticated' && !isLoading) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Animate header
      if (headerRef.current) {
        tl.fromTo(headerRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 }
        );
      }

      // Animate stats cards
      if (statsRef.current) {
        const cards = statsRef.current.querySelectorAll('.stat-card');
        tl.fromTo(cards,
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1 },
          '-=0.3'
        );
      }

      // Animate action cards
      if (actionsRef.current) {
        const actions = actionsRef.current.querySelectorAll('.action-card');
        tl.fromTo(actions,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.1 },
          '-=0.2'
        );
      }

      // Animate main content
      if (mainContentRef.current) {
        const sections = mainContentRef.current.querySelectorAll('.content-section');
        tl.fromTo(sections,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.15 },
          '-=0.2'
        );
      }
    }
  }, [status, isLoading]);

  useEffect(() => {
    async function fetchData() {
      try {
        const meetingsRes = await fetch('/api/meetings');
        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          setMeetings(data.meetings || []);
        }

        const recordingsRes = await fetch('/api/recordings');
        if (recordingsRes.ok) {
          const data = await recordingsRes.json();
          setRecordings(data.recordings?.slice(0, 5) || []);
        }

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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando dashboard...</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header ref={headerRef} className="relative bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">
                Unity<span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">Meet</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-orange-500/20 text-white rounded-xl hover:from-purple-500/30 hover:to-orange-500/30 transition-all border border-white/10"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Panel Admin</span>
                </Link>
              )}
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                  {session.user.name?.charAt(0)}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{session.user.name}</p>
                  <p className="text-xs text-white/50">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenido, <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">{session.user.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-white/50">
            {isAdmin ? 'Panel de administración - Vista general del sistema' : 'Gestiona tus reuniones y conecta con tu equipo'}
          </p>
        </div>

        {/* Admin Stats Cards */}
        {isAdmin && adminStats && (
          <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Users Card */}
            <div className="stat-card group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all hover:shadow-lg hover:shadow-blue-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-blue-300/80 font-medium">Usuarios totales</p>
                  <p className="text-4xl font-bold text-white mt-2">{adminStats.totalUsers}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {adminStats.usersByRole.map((r) => (
                      <span key={r.role} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        {r.role}: {r.count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Meetings Card */}
            <div className="stat-card group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all hover:shadow-lg hover:shadow-purple-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-colors" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-purple-300/80 font-medium">Reuniones totales</p>
                  <p className="text-4xl font-bold text-white mt-2">{adminStats.totalMeetings}</p>
                  <Link href="/admin/meetings" className="mt-3 text-sm text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 transition-colors">
                    Ver todas
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Recordings Card */}
            <div className="stat-card group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-600/5 border border-orange-500/20 p-6 hover:border-orange-500/40 transition-all hover:shadow-lg hover:shadow-orange-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/20 transition-colors" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-orange-300/80 font-medium">Grabaciones</p>
                  <p className="text-4xl font-bold text-white mt-2">{adminStats.totalRecordings}</p>
                  <Link href="/admin/recordings" className="mt-3 text-sm text-orange-400 hover:text-orange-300 inline-flex items-center gap-1 transition-colors">
                    Ver grabaciones
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Live Meetings Card */}
            <div className="stat-card group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-emerald-300/80 font-medium">En vivo ahora</p>
                  <p className="text-4xl font-bold text-emerald-400 mt-2">{adminStats.activeMeetings}</p>
                  {adminStats.activeMeetings > 0 ? (
                    <p className="mt-3 text-sm text-emerald-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Reuniones activas
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-white/40">Sin reuniones activas</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 relative">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                  {adminStats.activeMeetings > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div ref={actionsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/room/create?type=instant" className="action-card group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-orange-500 p-6 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">Nueva reunión</h3>
                  <p className="text-white/70 text-sm">Iniciar ahora</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/room/create?type=scheduled" className="action-card group">
            <div className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-white/10 p-6 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">Programar</h3>
                  <p className="text-white/50 text-sm">Para después</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/room/create?type=webinar" className="action-card group">
            <div className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-white/10 p-6 hover:border-orange-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center border border-orange-500/20">
                  <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">Webinar</h3>
                  <p className="text-white/50 text-sm">Presentaciones</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Live Meetings Alert */}
        {liveMeetings.length > 0 && (
          <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <h3 className="font-bold text-emerald-300">Reuniones en vivo ({liveMeetings.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveMeetings.map((meeting) => (
                  <div key={meeting.id} className="bg-slate-800/50 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-white/5">
                    <div>
                      <p className="font-medium text-white">{meeting.title}</p>
                      <p className="text-sm text-white/50">{meeting.host?.name || 'Host'}</p>
                    </div>
                    <Link href={`/room/${meeting.roomId}`}>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">Unirse</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div ref={mainContentRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Meetings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Meetings */}
            <div className="content-section relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
              <div className="relative px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-bold text-white">Próximas reuniones</h2>
                <Link href="/room/create?type=scheduled" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  + Nueva
                </Link>
              </div>
              <div className="relative p-6">
                {upcomingMeetings.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-white/40 mb-4">No tienes reuniones programadas</p>
                    <Link href="/room/create?type=scheduled">
                      <Button variant="outline" size="sm">
                        Programar reunión
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{meeting.title}</h3>
                            <p className="text-sm text-white/50">
                              {meeting.scheduledStart && new Date(meeting.scheduledStart).toLocaleString('es-MX')}
                            </p>
                          </div>
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
            <div className="content-section relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <div className="relative px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-bold text-white">Reuniones recientes</h2>
                {isAdmin && (
                  <Link href="/admin/meetings" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Ver todas
                  </Link>
                )}
              </div>
              <div className="relative p-6">
                {recentMeetings.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-white/40">No hay reuniones recientes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            meeting.type === 'WEBINAR' ? 'bg-orange-500/20' : 'bg-purple-500/20'
                          }`}>
                            <svg className={`w-5 h-5 ${meeting.type === 'WEBINAR' ? 'text-orange-400' : 'text-purple-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{meeting.title}</h3>
                            <p className="text-sm text-white/50">
                              {new Date(meeting.createdAt).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          meeting.type === 'WEBINAR'
                            ? 'bg-orange-500/20 text-orange-400'
                            : meeting.type === 'SCHEDULED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
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
          <div className="space-y-6">
            {/* Recent Recordings */}
            <div className="content-section relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
              <div className="relative px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Grabaciones
                </h2>
                {isAdmin && (
                  <Link href="/admin/recordings" className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    Ver todas
                  </Link>
                )}
              </div>
              <div className="relative p-4">
                {recordings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-sm text-white/40">No hay grabaciones</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recordings.map((recording) => (
                      <a
                        key={recording.id}
                        href={recording.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-white/5 hover:border-red-500/30 hover:bg-slate-700/50 transition-all group"
                      >
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/30 transition-colors">
                          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {recording.meeting.title}
                          </p>
                          <p className="text-xs text-white/40">
                            {formatDuration(recording.duration)} • {new Date(recording.createdAt).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-white/30 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="content-section relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur border border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                <div className="relative px-6 py-4 border-b border-white/5">
                  <h2 className="font-bold text-white">Actividad reciente</h2>
                </div>
                <div className="relative p-4">
                  <div className="space-y-3">
                    {adminStats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80">{activity.description}</p>
                          <p className="text-xs text-white/40">
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
              <div className="content-section relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur border border-white/5">
                <div className="relative px-6 py-4 border-b border-white/5">
                  <h2 className="font-bold text-white">Acciones rápidas</h2>
                </div>
                <div className="relative p-4 space-y-2">
                  <Link href="/admin/users" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-slate-700/50 transition-all group">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Gestionar usuarios</p>
                      <p className="text-xs text-white/40">Roles y permisos</p>
                    </div>
                  </Link>
                  <Link href="/admin/meetings" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-white/5 hover:border-purple-500/30 hover:bg-slate-700/50 transition-all group">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Todas las reuniones</p>
                      <p className="text-xs text-white/40">Historial completo</p>
                    </div>
                  </Link>
                  <Link href="/admin/recordings" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-white/5 hover:border-orange-500/30 hover:bg-slate-700/50 transition-all group">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Grabaciones</p>
                      <p className="text-xs text-white/40">Ver y descargar</p>
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
