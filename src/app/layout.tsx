import type { Metadata, Viewport } from 'next';
import { GSAPProvider } from '@/components/animations/GSAPProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unity Meet - Videoconferencias para Unity Financial Network',
  description:
    'Plataforma de videoconferencias exclusiva para agentes y staff de Unity Financial Network. Conecta con tu equipo, presenta a prospectos y crece tu negocio.',
  keywords: [
    'videoconferencia',
    'Unity Financial Network',
    'reuniones virtuales',
    'agentes',
    'webinar',
    'presentaciones',
  ],
  authors: [{ name: 'Unity Financial Network' }],
  icons: {
    icon: '/favicon.svg',
    apple: '/images/logo.svg',
  },
  openGraph: {
    title: 'Unity Meet - Videoconferencias para Unity Financial Network',
    description:
      'Plataforma de videoconferencias exclusiva para agentes y staff de Unity Financial Network.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Unity Meet',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unity Meet - Videoconferencias para Unity Financial Network',
    description:
      'Plataforma de videoconferencias exclusiva para agentes y staff de Unity Financial Network.',
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/logo.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <GSAPProvider>{children}</GSAPProvider>
      </body>
    </html>
  );
}
