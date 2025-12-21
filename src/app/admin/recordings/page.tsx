'use client';

import { useEffect, useState } from 'react';

interface Recording {
  id: string;
  filename: string;
  url: string;
  duration: number;
  size: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  meeting: {
    id: string;
    title: string;
    roomId: string;
  };
}

export default function RecordingsManagement() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecordings();
  }, []);

  async function fetchRecordings() {
    try {
      const response = await fetch('/api/admin/recordings');
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecording(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta grabación?')) return;

    try {
      const response = await fetch(`/api/admin/recordings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRecordings(recordings.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  function formatFileSize(bytes: string): string {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  const filteredRecordings = recordings.filter(recording =>
    recording.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-white">Grabaciones</h1>
          <p className="text-gray-400 mt-2">Todas las grabaciones del sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar grabación..."
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

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecordings.map((recording) => (
          <div
            key={recording.id}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-colors"
          >
            {/* Thumbnail placeholder */}
            <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(recording.duration)}
              </span>
            </div>

            <div className="p-4">
              <h3 className="text-white font-medium truncate" title={recording.filename}>
                {recording.filename}
              </h3>
              <p className="text-gray-400 text-sm mt-1 truncate">
                {recording.meeting.title}
              </p>

              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs">
                    {recording.user.name.charAt(0)}
                  </div>
                  <span className="text-gray-400 truncate max-w-[100px]">{recording.user.name}</span>
                </div>
                <span className="text-gray-500">{formatFileSize(recording.size)}</span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <span className="text-gray-500 text-xs">
                  {new Date(recording.createdAt).toLocaleDateString('es-MX')}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={recording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecordings.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <p className="text-gray-400">No se encontraron grabaciones</p>
        </div>
      )}
    </div>
  );
}
