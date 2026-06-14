import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QR Order System',
  description: 'Sistem pemesanan digital untuk cafe dan restoran',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
