'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JaaSMeetingRoom } from '@/components/room/JaaSMeetingRoom';

interface PreJoinState {
  userName: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Página principal de la sala de videoconferencia con JaaS
 */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  // Estados
  const [hasJoined, setHasJoined] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
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
      // Obtener JWT token del servidor
      const response = await fetch('/api/jaas/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          userName: preJoin.userName,
          moderator: true, // First person is moderator
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get token');
      }

      setJwt(data.token);
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
    router.push('/');
  }, [router]);

  // Pantalla de pre-join
  if (!hasJoined || !jwt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Unity Meet</h1>
            <p className="text-gray-400">Powered by JaaS</p>
          </div>

          {/* Card */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700/50">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Unirse a la reunión
            </h2>
            <p className="text-gray-400 mb-6">
              Sala: <span className="text-blue-400 font-mono">{roomId}</span>
            </p>

            <form onSubmit={handleJoin} className="space-y-6">
              {/* Name input */}
              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-gray-300 mb-2"
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
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={preJoin.isLoading}
                  autoFocus
                />
              </div>

              {/* Error message */}
              {preJoin.error && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{preJoin.error}</p>
                </div>
              )}

              {/* Join button */}
              <button
                type="submit"
                disabled={preJoin.isLoading || !preJoin.userName.trim()}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
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
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Volver al inicio
              </button>
            </div>
          </div>

          {/* Features info */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-800/30 rounded-xl">
              <div className="text-2xl mb-2">🎥</div>
              <p className="text-gray-400 text-xs">Video HD</p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-xl">
              <div className="text-2xl mb-2">🔴</div>
              <p className="text-gray-400 text-xs">Grabación</p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-xl">
              <div className="text-2xl mb-2">🖥️</div>
              <p className="text-gray-400 text-xs">Compartir pantalla</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Meeting room
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900">
      <JaaSMeetingRoom
        roomName={roomId}
        userName={preJoin.userName}
        jwt={jwt}
        onReadyToClose={handleLeave}
        onRecordingStatusChanged={(isRecording) => {
          console.log('[RoomPage] Recording status:', isRecording);
        }}
      />
    </div>
  );
}
