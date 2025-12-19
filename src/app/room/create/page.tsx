'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Página para crear una nueva sala de reunión
 */
export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crear sala
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/room/${data.room.id}`);
      } else {
        setError(data.error || 'Error al crear la sala');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsCreating(false);
    }
  };

  // Unirse con código
  const [joinCode, setJoinCode] = useState('');

  const handleJoinRoom = () => {
    if (joinCode.trim()) {
      // Extraer ID de la sala del código o URL
      let roomId = joinCode.trim();

      // Si es una URL, extraer el ID
      if (roomId.includes('/room/')) {
        const parts = roomId.split('/room/');
        roomId = parts[parts.length - 1].split('?')[0];
      }

      router.push(`/room/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-unity-purple/5 to-unity-orange/5 dark:from-unity-darker dark:to-unity-dark-gray">
      <Navbar showAuthButtons={false} />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-unity-dark-gray dark:text-white mb-4">
              Iniciar o unirse a una reunión
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Crea una nueva sala o únete a una existente
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Crear nueva reunión */}
            <div className="bg-white dark:bg-unity-dark-gray rounded-2xl p-8 shadow-lg border border-unity-light-gray dark:border-unity-darker">
              <div className="w-16 h-16 rounded-2xl bg-unity-purple/10 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-unity-purple"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-unity-dark-gray dark:text-white mb-2">
                Nueva reunión
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Crea una sala y comparte el enlace con los participantes
              </p>

              <div className="space-y-4">
                <Input
                  label="Nombre de la sala (opcional)"
                  placeholder="Mi reunión"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <Button
                  onClick={handleCreateRoom}
                  isLoading={isCreating}
                  className="w-full"
                  size="lg"
                >
                  Crear reunión
                </Button>
              </div>
            </div>

            {/* Unirse a reunión existente */}
            <div className="bg-white dark:bg-unity-dark-gray rounded-2xl p-8 shadow-lg border border-unity-light-gray dark:border-unity-darker">
              <div className="w-16 h-16 rounded-2xl bg-unity-orange/10 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-unity-orange"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-unity-dark-gray dark:text-white mb-2">
                Unirse a reunión
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Ingresa el código o enlace de la reunión
              </p>

              <div className="space-y-4">
                <Input
                  label="Código o enlace"
                  placeholder="abc-def-ghi o URL de la reunión"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />

                <Button
                  onClick={handleJoinRoom}
                  disabled={!joinCode.trim()}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  Unirse
                </Button>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <Feature
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              }
              title="Seguro"
              description="Cifrado end-to-end"
            />
            <Feature
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              }
              title="Rápido"
              description="Baja latencia"
            />
            <Feature
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              }
              title="50 usuarios"
              description="Por sala"
            />
            <Feature
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                  />
                </svg>
              }
              title="Compartir"
              description="Tu pantalla"
            />
          </div>

          {/* Link a inicio */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="text-unity-purple hover:text-unity-purple-light transition-colors"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente de característica
function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-unity-purple/10 flex items-center justify-center text-unity-purple mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-unity-dark-gray dark:text-white text-sm">
        {title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
