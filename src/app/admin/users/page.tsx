'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'STAFF': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion de Usuarios</h1>
          <p className="text-gray-400 mt-2">Administra los usuarios y sus permisos</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Usuario</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Email</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Rol</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Reuniones</th>
              <th className="text-left py-4 px-6 text-gray-400 font-medium">Registro</th>
              <th className="text-right py-4 px-6 text-gray-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-300">{user.email}</td>
                <td className="py-4 px-6">
                  {editingUser?.id === user.id ? (
                    <select
                      value={newRole || user.role}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="STAFF">STAFF</option>
                      <option value="AGENT">AGENT</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-gray-300">{user._count?.hostedMeetings || 0}</td>
                <td className="py-4 px-6 text-gray-400 text-sm">
                  {new Date(user.createdAt).toLocaleDateString('es-MX')}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    {editingUser?.id === user.id ? (
                      <>
                        <button
                          onClick={() => updateUserRole(user.id, newRole || user.role)}
                          className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
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
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Editar rol"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
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
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron usuarios
          </div>
        )}
      </div>
    </div>
  );
}
