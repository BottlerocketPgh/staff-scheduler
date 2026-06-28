import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlightDeck — Bottlerocket',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-forest-dark text-cream min-h-screen">{children}</body>
    </html>
  )
}
