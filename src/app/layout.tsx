import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Analytics } from '@vercel/analytics/react'
import PageHit from '@/components/PageHit'
import JsonLd from '@/components/JsonLd'
import { organizationJsonLd } from '@/lib/jsonld'

// One grotesque for the body (lot 1 of the design audit, §3.2). Three weights,
// no more: regular for prose, medium for labels, semibold for headings.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { template: '%s | AlgoProof', default: 'AlgoProof' },
  description: 'Bots de trading et comptes de sociétés cotées, en public et en français. J\'expose chaque trade, gains comme pertes, et je passe chaque rapport annuel que je lis à travers sept contrôles.',
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
    <html lang="fr" className={`bg-bg ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <JsonLd data={organizationJsonLd()} />
        {/* First focusable element on every page. Invisible until focused (see
            .skip-link in globals.css), so a keyboard user reaches the content
            without tabbing through the whole nav on each navigation. */}
        <a href="#contenu" className="skip-link">Aller au contenu</a>
        <Nav />
        <main id="contenu" className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        {/* Lot 8: the first-party page counter (page_hits); Vercel Web Analytics
            was never enabled on this project. */}
        <PageHit site="algoproof" />
      </body>
    </html>
  )
}
