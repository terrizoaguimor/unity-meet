'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetchStats();
  }, []);

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Usuarios',
      value: stats?.totalUsers || 0,
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Total Reuniones',
      value: stats?.totalMeetings || 0,
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'Grabaciones',
      value: stats?.totalRecordings || 0,
      icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Reuniones Activas',
      value: stats?.activeMeetings || 0,
      icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Panel de Administracion</h1>
        <p className="text-gray-400 mt-2">Bienvenido al panel de control de Unity Meet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Users by Role */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Usuarios por Rol</h2>
          <div className="space-y-4">
            {stats?.usersByRole?.map((item) => (
              <div key={item.role} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    item.role === 'ADMIN' ? 'bg-purple-500' :
                    item.role === 'STAFF' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></span>
                  <span className="text-gray-300">{item.role}</span>
                </div>
                <span className="text-white font-semibold">{item.count}</span>
              </div>
            )) || (
              <p className="text-gray-400">No hay datos disponibles</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {stats?.recentActivity?.length ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                  <div>
                    <p className="text-gray-300 text-sm">{activity.description}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(activity.createdAt).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No hay actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
