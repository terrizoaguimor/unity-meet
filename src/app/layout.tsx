import type { Metadata, Viewport } from 'next';
import { GSAPProvider } from '@/components/animations/GSAPProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unity Meet - Videoconferencias Profesionales',
  description:
    'Plataforma de videoconferencias profesional, simple y segura. Conecta con tu equipo desde cualquier lugar con calidad HD.',
  keywords: [
    'videoconferencia',
    'reuniones virtuales',
    'video llamadas',
    'meetings',
    'colaboración',
  ],
  authors: [{ name: 'Unity Meet Team' }],
  openGraph: {
    title: 'Unity Meet - Videoconferencias Profesionales',
    description:
      'Plataforma de videoconferencias profesional, simple y segura.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Unity Meet',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unity Meet - Videoconferencias Profesionales',
    description:
      'Plataforma de videoconferencias profesional, simple y segura.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#403c43' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <GSAPProvider>{children}</GSAPProvider>
      </body>
    </html>
  );
}
