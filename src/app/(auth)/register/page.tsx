'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Página de registro
 */
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);

    // Simular registro (en producción conectar con backend real)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Por ahora, redirigir directamente
      router.push('/room/create');
    } catch {
      setError('Error al registrarse. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Crear cuenta
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            Regístrate para acceder a todas las funciones
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nombre completo"
              type="text"
              placeholder="Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              Crear cuenta
            </Button>
          </form>

          {/* Términos */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
            Al registrarte, aceptas nuestros{' '}
            <Link href="#" className="text-unity-purple hover:underline">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="#" className="text-unity-purple hover:underline">
              Política de Privacidad
            </Link>
          </p>
        </div>

        {/* Link a login */}
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="text-unity-purple hover:text-unity-purple-light font-medium transition-colors"
          >
            Inicia sesión
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
