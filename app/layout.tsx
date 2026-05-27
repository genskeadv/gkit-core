import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GKLI Suite',
  description: 'Login central e modulos do ecossistema GKLI',
  icons: {
    icon: [{ url: '/GKLI_Ico.png', type: 'image/png' }],
    apple: [{ url: '/GKLI_Ico.png', type: 'image/png' }],
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
