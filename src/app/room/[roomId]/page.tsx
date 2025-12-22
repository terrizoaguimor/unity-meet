'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JitsiMeetingRoom } from '@/components/room/JitsiMeetingRoom';

interface PreJoinState {
  userName: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Página principal de la sala de videoconferencia con Jitsi Self-Hosted
 */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  // Estados
  const [hasJoined, setHasJoined] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [jitsiDomain, setJitsiDomain] = useState<string | null>(null);
  const [preJoin, setPreJoin] = useState<PreJoinState>({
    userName: '',
    isLoading: false,
    error: null,
  });

  // Manejar unirse a la sala
  const handleJoin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!preJoin.userName.trim()) {
      setPreJoin(prev => ({ ...prev, error: 'Por favor ingresa tu nombre' }));
      return;
    }

    setPreJoin(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Obtener JWT token del servidor (Jitsi self-hosted)
      const response = await fetch('/api/jitsi/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          userName: preJoin.userName,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get token');
      }

      setJwt(data.token);
      setJitsiDomain(data.jitsiDomain);
      setHasJoined(true);
    } catch (err) {
      console.error('[RoomPage] Failed to join:', err);
      setPreJoin(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error al unirse a la sala',
      }));
    }
  }, [preJoin.userName, roomId]);

  // Manejar salir de la sala
  const handleLeave = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // Pantalla de pre-join
  if (!hasJoined || !jwt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Unity Meet</h1>
            <p className="text-white/50">Videoconferencias Seguras</p>
          </div>

          {/* Card */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/5">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Unirse a la reunión
            </h2>
            <p className="text-white/50 mb-6">
              Sala: <span className="text-purple-400 font-mono bg-purple-500/10 px-2 py-1 rounded">{roomId}</span>
            </p>

            <form onSubmit={handleJoin} className="space-y-6">
              {/* Name input */}
              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-white/70 mb-2"
                >
                  Tu nombre
                </label>
                <input
                  type="text"
                  id="userName"
                  value={preJoin.userName}
                  onChange={(e) =>
                    setPreJoin(prev => ({ ...prev, userName: e.target.value }))
                  }
                  placeholder="Ingresa tu nombre"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  disabled={preJoin.isLoading}
                  autoFocus
                />
              </div>

              {/* Error message */}
              {preJoin.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{preJoin.error}</p>
                </div>
              )}

              {/* Join button */}
              <button
                type="submit"
                disabled={preJoin.isLoading || !preJoin.userName.trim()}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                {preJoin.isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Unirse a la reunión
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-white/40 hover:text-white text-sm transition-colors"
              >
                ← Volver al dashboard
              </button>
            </div>
          </div>

          {/* Features info */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-800/30 backdrop-blur rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/50 text-xs">Video HD</p>
            </div>
            <div className="p-4 bg-slate-800/30 backdrop-blur rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-white/50 text-xs">Grabación</p>
            </div>
            <div className="p-4 bg-slate-800/30 backdrop-blur rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/50 text-xs">Compartir</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Meeting room
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900">
      <JitsiMeetingRoom
        roomName={roomId}
        userName={preJoin.userName}
        jwt={jwt}
        domain={jitsiDomain || undefined}
        onReadyToClose={handleLeave}
        onRecordingStatusChanged={(isRecording) => {
          console.log('[RoomPage] Recording status:', isRecording);
        }}
      />
    </div>
  );
}
