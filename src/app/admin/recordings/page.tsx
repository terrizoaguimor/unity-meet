'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';

interface Recording {
  id: string;
  key: string;
  filename: string;
  streamUrl: string;
  size: string;
  createdAt: string;
  roomId: string;
}

export default function RecordingsManagement() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVideo, setPlayingVideo] = useState<Recording | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (playingVideo && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [playingVideo]);

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

  async function downloadRecording(recording: Recording) {
    if (downloading) return;

    setDownloading(recording.id);
    try {
      const response = await fetch(`/api/admin/recordings/${encodeURIComponent(recording.key)}`);
      if (response.ok) {
        const data = await response.json();
        // Open download URL in new tab
        window.open(data.downloadUrl, '_blank');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al descargar');
      }
    } catch (error) {
      console.error('Error downloading recording:', error);
      alert('Error al descargar la grabación');
    } finally {
      setDownloading(null);
    }
  }

  async function deleteRecording(recording: Recording) {
    if (!confirm('¿Estás seguro de eliminar esta grabación? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/admin/recordings/${encodeURIComponent(recording.key)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRecordings(recordings.filter(r => r.id !== recording.id));
        if (playingVideo?.id === recording.id) {
          setPlayingVideo(null);
        }
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  }

  function formatFileSize(bytes: string): string {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredRecordings = recordings.filter(recording =>
    recording.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.roomId.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Video Player Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-5xl mx-4 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-medium">{playingVideo.filename}</h3>
                <p className="text-white/50 text-sm">Sala: {playingVideo.roomId}</p>
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black">
              <video
                src={playingVideo.streamUrl}
                controls
                autoPlay
                className="w-full h-full"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              >
                Tu navegador no soporta el elemento de video.
              </video>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span>{formatFileSize(playingVideo.size)}</span>
                <span>{formatDate(playingVideo.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadRecording(playingVideo)}
                  disabled={downloading === playingVideo.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors"
                >
                  {downloading === playingVideo.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Descargar
                </button>
                <button
                  onClick={() => deleteRecording(playingVideo)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div ref={headerRef} className="opacity-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Grabaciones</h1>
            <p className="text-white/50 mt-2">Grabaciones almacenadas en DigitalOcean Spaces</p>
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
              <div
                className="relative bg-gradient-to-br from-slate-900 to-slate-800 aspect-video flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => setPlayingVideo(recording)}
              >
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

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Title */}
                <h3 className="text-white font-medium truncate" title={recording.filename}>
                  {recording.filename}
                </h3>
                <p className="text-white/40 text-sm mt-1 truncate">
                  Sala: {recording.roomId}
                </p>

                {/* Size */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-white/50 text-sm">{formatFileSize(recording.size)}</span>
                  <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium">
                    Disponible
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <span className="text-white/40 text-xs">
                    {formatDate(recording.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPlayingVideo(recording)}
                      className="p-2 text-white/40 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all"
                      title="Reproducir"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => downloadRecording(recording)}
                      disabled={downloading === recording.id}
                      className="p-2 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50"
                      title="Descargar"
                    >
                      {downloading === recording.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white/60 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteRecording(recording)}
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
            <p className="text-white/30 text-sm mt-2">Las grabaciones de Jibri aparecerán aquí automáticamente</p>
          </div>
        </div>
      )}
    </div>
  );
}
