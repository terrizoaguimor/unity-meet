'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetchMeetings();
  }, []);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'ENDED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'WEBINAR':
        return 'bg-purple-500/20 text-purple-400';
      case 'SCHEDULED':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reuniones</h1>
        <p className="text-gray-400 mt-2">Historial completo de reuniones</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar reunión..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">Todos los estados</option>
          <option value="LIVE">En vivo</option>
          <option value="PENDING">Pendientes</option>
          <option value="ENDED">Finalizadas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">Todos los tipos</option>
          <option value="INSTANT">Instantáneas</option>
          <option value="SCHEDULED">Programadas</option>
          <option value="WEBINAR">Webinars</option>
        </select>
      </div>

      {/* Meetings Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Reunión</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Organizador</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Tipo</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Estado</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Participantes</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Fecha</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.map((meeting) => (
                <tr key={meeting.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-white font-medium">{meeting.title}</p>
                      <p className="text-gray-500 text-sm">{meeting.roomId}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">
                        {meeting.host.name.charAt(0)}
                      </div>
                      <span className="text-gray-300">{meeting.host.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadge(meeting.type)}`}>
                      {meeting.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-300">
                    {meeting._count.participants}
                    {meeting._count.recordings > 0 && (
                      <span className="ml-2 text-purple-400" title="Tiene grabaciones">
                        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-400 text-sm">
                    {meeting.scheduledAt
                      ? new Date(meeting.scheduledAt).toLocaleString('es-MX')
                      : new Date(meeting.createdAt).toLocaleString('es-MX')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => deleteMeeting(meeting.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron reuniones
          </div>
        )}
      </div>
    </div>
  );
}
