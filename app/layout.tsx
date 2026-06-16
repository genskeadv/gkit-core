import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GKIT Suite',
  description: 'Login central e modulos do ecossistema GKIT',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/GKIT_ico.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
