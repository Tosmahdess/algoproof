import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: { template: '%s | AlgoProof', default: 'AlgoProof' },
  description: 'Algo trading bots — every trade verified, every loss shown. No fake screenshots.',
  metadataBase: new URL('https://algoproof.fr'),
  openGraph: {
    siteName: 'AlgoProof',
    type: 'website',
    locale: 'fr_FR',
    url: 'https://algoproof.fr',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@algoproof',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-bg text-white">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
