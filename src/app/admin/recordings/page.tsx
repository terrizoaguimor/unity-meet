'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

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

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecordings();
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

      if (gridRef.current) {
        tl.fromTo(gridRef.current.children,
          { y: 40, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' },
          '-=0.3'
        );
      }
    }
  }, [loading]);

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

  // Calculate total size
  const totalSize = recordings.reduce((acc, r) => acc + parseInt(r.size || '0'), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Cargando grabaciones...</p>
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
            <h1 className="text-3xl font-bold text-white">Grabaciones</h1>
            <p className="text-white/50 mt-2">Todas las grabaciones del sistema</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar grabación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              />
              <svg className="w-5 h-5 text-white/40 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                {recordings.length} grabaciones
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">
                {formatFileSize(totalSize.toString())} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recordings Grid */}
      {filteredRecordings.length > 0 ? (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map((recording) => (
            <div
              key={recording.id}
              className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300"
            >
              {/* Thumbnail / Preview */}
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 aspect-video flex items-center justify-center overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-purple-500/5" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />

                {/* Icon */}
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Duration badge */}
                <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-medium">
                  {formatDuration(recording.duration)}
                </span>

                {/* Play overlay */}
                <a
                  href={recording.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </a>
              </div>

              <div className="p-5">
                {/* Title */}
                <h3 className="text-white font-medium truncate" title={recording.filename}>
                  {recording.filename}
                </h3>
                <p className="text-white/40 text-sm mt-1 truncate">
                  {recording.meeting.title}
                </p>

                {/* User & Size */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                      {recording.user.name.charAt(0)}
                    </div>
                    <span className="text-white/50 text-sm truncate max-w-[100px]">{recording.user.name}</span>
                  </div>
                  <span className="text-white/40 text-sm">{formatFileSize(recording.size)}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <span className="text-white/40 text-xs">
                    {new Date(recording.createdAt).toLocaleDateString('es-MX', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <a
                      href={recording.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Descargar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/5 py-16">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <p className="text-white/40 text-lg">No se encontraron grabaciones</p>
            <p className="text-white/30 text-sm mt-2">Las grabaciones aparecerán aquí cuando se creen</p>
          </div>
        </div>
      )}
    </div>
  );
}
