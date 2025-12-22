'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import Link from 'next/link';

interface Meeting {
  id: string;
  title: string;
  roomId: string;
  type: 'INSTANT' | 'SCHEDULED' | 'WEBINAR';
  status: 'PENDING' | 'LIVE' | 'ENDED' | 'CANCELLED';
  isPublic: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  host: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    participants: number;
    recordings: number;
  };
}

export default function MeetingsManagement() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const headerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (!loading) {
      const tl = gsap.timeline();

      if (headerRef.current) {
        tl.fromTo(headerRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
        );
      }

      if (filtersRef.current) {
        tl.fromTo(filtersRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
          '-=0.3'
        );
      }

      if (tableRef.current) {
        tl.fromTo(tableRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
          '-=0.2'
        );
      }
    }
  }, [loading]);

  async function fetchMeetings() {
    try {
      const response = await fetch('/api/admin/meetings');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMeeting(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta reunión?')) return;

    try {
      const response = await fetch(`/api/admin/meetings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMeetings(meetings.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  }

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.roomId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.host.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    const matchesType = typeFilter === 'all' || meeting.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; dot?: string }> = {
    LIVE: { label: 'En Vivo', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
    PENDING: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    ENDED: { label: 'Finalizada', color: 'text-white/50', bg: 'bg-white/10', border: 'border-white/20' },
    CANCELLED: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  };

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    WEBINAR: { label: 'Webinar', color: 'text-purple-400', bg: 'bg-purple-500/20' },
    SCHEDULED: { label: 'Programada', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    INSTANT: { label: 'Instantánea', color: 'text-white/60', bg: 'bg-white/10' },
  };

  // Stats
  const liveMeetings = meetings.filter(m => m.status === 'LIVE').length;
  const totalParticipants = meetings.reduce((acc, m) => acc + m._count.participants, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando reuniones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div ref={headerRef} className="opacity-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Reuniones</h1>
            <p className="text-white/50 mt-2">Historial completo de reuniones del sistema</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live badge */}
            {liveMeetings > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-sm font-medium">{liveMeetings} en vivo</span>
              </div>
            )}
            {/* Stats badge */}
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              {meetings.length} reuniones
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div ref={filtersRef} className="opacity-0">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Buscar reunión, room ID o host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
            <svg className="w-5 h-5 text-white/40 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="LIVE">En vivo</option>
            <option value="PENDING">Pendientes</option>
            <option value="ENDED">Finalizadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          >
            <option value="all">Todos los tipos</option>
            <option value="INSTANT">Instantáneas</option>
            <option value="SCHEDULED">Programadas</option>
            <option value="WEBINAR">Webinars</option>
          </select>
        </div>
      </div>

      {/* Meetings Table */}
      <div ref={tableRef} className="opacity-0">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Reunión</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Organizador</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Tipo</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Estado</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Participantes</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Fecha</th>
                  <th className="text-right py-4 px-6 text-white/50 font-medium text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.map((meeting) => {
                  const status = statusConfig[meeting.status] || statusConfig.ENDED;
                  const type = typeConfig[meeting.type] || typeConfig.INSTANT;

                  return (
                    <tr key={meeting.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-white font-medium">{meeting.title}</p>
                          <p className="text-white/40 text-sm font-mono">{meeting.roomId}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                            {meeting.host.name.charAt(0)}
                          </div>
                          <span className="text-white/70">{meeting.host.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${type.bg} ${type.color}`}>
                          {type.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${status.bg} ${status.color} ${status.border}`}>
                          {status.dot && (
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                          )}
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span className="text-white/70">{meeting._count.participants}</span>
                          </div>
                          {meeting._count.recordings > 0 && (
                            <div className="flex items-center gap-1.5 text-orange-400">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                              </svg>
                              <span className="text-sm">{meeting._count.recordings}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white/50 text-sm">
                        {meeting.scheduledAt
                          ? new Date(meeting.scheduledAt).toLocaleString('es-MX', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : new Date(meeting.createdAt).toLocaleString('es-MX', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          {meeting.status === 'LIVE' && (
                            <Link
                              href={`/room/${meeting.roomId}`}
                              className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                              title="Unirse"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </Link>
                          )}
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredMeetings.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/40">No se encontraron reuniones</p>
              <p className="text-white/30 text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
