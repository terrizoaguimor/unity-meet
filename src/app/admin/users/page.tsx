'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'AGENT';
  createdAt: string;
  _count?: {
    hostedMeetings: number;
  };
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  const headerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
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

      if (tableRef.current) {
        tl.fromTo(tableRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
          '-=0.3'
        );
      }
    }
  }, [loading]);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, role: role as User['role'] } : u
        ));
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ADMIN: { label: 'Admin', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    STAFF: { label: 'Staff', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    AGENT: { label: 'Agente', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando usuarios...</p>
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
            <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
            <p className="text-white/50 mt-2">Administra los usuarios y sus permisos</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
              <svg className="w-5 h-5 text-white/40 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Stats badge */}
            <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              {users.length} usuarios
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div ref={tableRef} className="opacity-0">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Usuario</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Email</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Rol</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Reuniones</th>
                  <th className="text-left py-4 px-6 text-white/50 font-medium text-sm">Registro</th>
                  <th className="text-right py-4 px-6 text-white/50 font-medium text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const config = roleConfig[user.role] || roleConfig.AGENT;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                            user.role === 'ADMIN' ? 'from-purple-500 to-pink-500' :
                            user.role === 'STAFF' ? 'from-blue-500 to-cyan-500' :
                            'from-emerald-500 to-teal-500'
                          } flex items-center justify-center text-white font-semibold shadow-lg`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white/70">{user.email}</td>
                      <td className="py-4 px-6">
                        {editingUser?.id === user.id ? (
                          <select
                            value={newRole || user.role}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="bg-slate-700/50 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="STAFF">Staff</option>
                            <option value="AGENT">Agente</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}>
                            {config.label}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-white/70">{user._count?.hostedMeetings || 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white/50 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          {editingUser?.id === user.id ? (
                            <>
                              <button
                                onClick={() => updateUserRole(user.id, newRole || user.role)}
                                className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => { setEditingUser(null); setNewRole(''); }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingUser(user); setNewRole(user.role); }}
                                className="p-2 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Editar rol"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-white/40">No se encontraron usuarios</p>
              <p className="text-white/30 text-sm mt-1">Intenta con otro término de búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
