import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flight Deck — Bottlerocket',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-forest-dark min-h-screen">{children}</body>
    </html>
  )
}
