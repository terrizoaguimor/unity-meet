'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalMeetings: number;
  totalRecordings: number;
  activeMeetings: number;
  usersByRole: { role: string; count: number }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!loading && stats) {
      const tl = gsap.timeline();

      if (headerRef.current) {
        tl.fromTo(headerRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
        );
      }

      if (statsRef.current) {
        tl.fromTo(statsRef.current.children,
          { y: 40, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' },
          '-=0.3'
        );
      }

      if (cardsRef.current) {
        tl.fromTo(cardsRef.current.children,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.15, ease: 'power3.out' },
          '-=0.2'
        );
      }

      if (actionsRef.current) {
        tl.fromTo(actionsRef.current.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power3.out' },
          '-=0.2'
        );
      }
    }
  }, [loading, stats]);

  async function fetchStats() {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Usuarios',
      value: stats?.totalUsers || 0,
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/25',
      href: '/admin/users'
    },
    {
      label: 'Total Reuniones',
      value: stats?.totalMeetings || 0,
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'shadow-emerald-500/25',
      href: '/admin/meetings'
    },
    {
      label: 'Grabaciones',
      value: stats?.totalRecordings || 0,
      icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
      gradient: 'from-orange-500 to-amber-500',
      glow: 'shadow-orange-500/25',
      href: '/admin/recordings'
    },
    {
      label: 'Reuniones En Vivo',
      value: stats?.activeMeetings || 0,
      icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z',
      gradient: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/25',
      href: '/admin/meetings',
      live: true
    },
  ];

  const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
    ADMIN: { label: 'Administradores', color: 'text-purple-400', bg: 'bg-purple-500/20' },
    STAFF: { label: 'Personal', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    AGENT: { label: 'Agentes', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  };

  const quickActions = [
    { label: 'Gestionar Usuarios', href: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'blue' },
    { label: 'Ver Reuniones', href: '/admin/meetings', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'emerald' },
    { label: 'Grabaciones', href: '/admin/recordings', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z', color: 'orange' },
    { label: 'Crear Reunión', href: '/room/create', icon: 'M12 4v16m8-8H4', color: 'purple' },
  ];

  const getActionColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400',
      emerald: 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400',
      orange: 'hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-400',
      purple: 'hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400',
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div ref={headerRef} className="opacity-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Panel de Administración
            </h1>
            <p className="text-white/50 mt-2">
              Resumen general del sistema Unity Meet
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-xl ${card.glow} hover:-translate-y-1`}
          >
            {/* Gradient glow effect */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm font-medium">{card.label}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-4xl font-bold text-white">{card.value}</p>
                  {card.live && card.value > 0 && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      En vivo
                    </span>
                  )}
                </div>
              </div>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.glow} group-hover:scale-110 transition-transform`}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
            </div>

            {/* View link */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
              <span className="text-white/40 group-hover:text-white/60 transition-colors">Ver detalles</span>
              <svg className="w-4 h-4 text-white/40 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users by Role */}
        <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Distribución de Usuarios</h2>
            <Link href="/admin/users" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
              Ver todos
            </Link>
          </div>

          <div className="space-y-4">
            {stats?.usersByRole?.length ? (
              stats.usersByRole.map((item) => {
                const config = roleConfig[item.role] || { label: item.role, color: 'text-gray-400', bg: 'bg-gray-500/20' };
                const total = stats.usersByRole.reduce((acc, r) => acc + r.count, 0);
                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;

                return (
                  <div key={item.role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{item.count}</span>
                        <span className="text-white/40 text-sm">({percentage}%)</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.role === 'ADMIN' ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
                          item.role === 'STAFF' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                          'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Actividad Reciente</h2>
            <span className="text-white/40 text-sm">Últimas 24 horas</span>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            {stats?.recentActivity?.length ? (
              stats.recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activity.type === 'meeting' ? 'bg-emerald-500/20' :
                      activity.type === 'user' ? 'bg-blue-500/20' :
                      activity.type === 'recording' ? 'bg-orange-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        activity.type === 'meeting' ? 'text-emerald-400' :
                        activity.type === 'user' ? 'text-blue-400' :
                        activity.type === 'recording' ? 'text-orange-400' :
                        'text-purple-400'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          activity.type === 'meeting' ? 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' :
                          activity.type === 'user' ? 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' :
                          activity.type === 'recording' ? 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4' :
                          'M13 10V3L4 14h7v7l9-11h-7z'
                        } />
                      </svg>
                    </div>
                    {index < (stats.recentActivity?.length || 0) - 1 && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm">{activity.description}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(activity.createdAt).toLocaleString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white/40">No hay actividad reciente</p>
                <p className="text-white/30 text-sm mt-1">Las actividades aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div ref={actionsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`flex items-center gap-3 p-4 rounded-xl bg-slate-800/30 border border-white/5 text-white/60 transition-all duration-200 ${getActionColor(action.color)}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
            </svg>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Sistema Operativo</h3>
              <p className="text-white/50 text-sm">Todos los servicios funcionando correctamente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
