import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import OrientationLock from '@/components/ui/orientation-lock'
import SafeAreaSimulator from '@/components/ui/safe-area-simulator'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

/** Modo “app” al abrir desde Inicio en iOS/Android: sin UI del navegador (no quita la barra de estado del sistema). */
export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'LoBoost',
  description: 'Plataforma profesional para coaches de fitness',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'LoBoost',
    /** Opaca la barra de estado; el contenido empieza debajo + padding safe-area en layouts. */
    statusBarStyle: 'black',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-bg-base text-text-primary antialiased`}>
        <OrientationLock />
        <SafeAreaSimulator />
        {children}
      </body>
    </html>
  )
}
