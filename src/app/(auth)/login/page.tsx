'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Página de inicio de sesión
 */
export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-unity-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-unity-purple/10 to-unity-orange/10 dark:from-unity-darker dark:to-unity-dark-gray flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-unity-gradient rounded-xl flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-white"
            >
              <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-unity-dark-gray dark:text-white">
            Unity<span className="text-unity-purple">Meet</span>
          </span>
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-unity-dark-gray rounded-2xl shadow-xl p-8 border border-unity-light-gray dark:border-unity-darker">
          <h1 className="text-2xl font-bold text-unity-dark-gray dark:text-white text-center mb-2">
            Bienvenido de vuelta
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            Inicia sesión para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@unityfinancialnetwork.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              Iniciar sesión
            </Button>
          </form>
        </div>

        {/* Link a registro */}
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          ¿No tienes cuenta?{' '}
          <Link
            href="/register"
            className="text-unity-purple hover:text-unity-purple-light font-medium transition-colors"
          >
            Regístrate
          </Link>
        </p>

        {/* Link a inicio */}
        <p className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-unity-purple transition-colors"
          >
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
