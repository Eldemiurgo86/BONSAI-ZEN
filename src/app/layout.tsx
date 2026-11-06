import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Bonsái Zen',
  description: 'Combina, poda y haz crecer tu bonsái en este juego match-3 de cultivo japonés.',
  applicationName: 'Bonsái Zen',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#3cc38a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-dvh">
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
