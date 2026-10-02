import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Analytics } from '@vercel/analytics/react'
import PageHit from '@/components/PageHit'
import JsonLd from '@/components/JsonLd'
import { organizationJsonLd } from '@/lib/jsonld'

// One grotesque for the whole site, figures included (refonte « Le registre des
// décisions », lot 1, owner's choice of 2026-10-02). A variable font: the range
// covers the four weights used, regular for prose, medium for labels, semibold
// for headings, bold for the wordmark. Figures are set in this face with
// `tabular-nums`; JetBrains Mono is kept for technical identifiers only.
//
// Self-hosted rather than through next/font/google: the Google file swaps the
// comma for a figure-wide glyph under `tnum` (26,5 px against 63,5 px at 100 px),
// so every amount read « 272 , 73 € ». scripts/fonts/build_schibsted.py builds
// this copy, the same font with the comma taken out of `tnum` (SIL OFL 1.1).
const sans = localFont({
  src: './fonts/SchibstedGrotesk-wght.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

// Pairs, tickers, code: identifiers, never a figure.
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
    <html lang="fr" className={`bg-bg ${sans.variable} ${jetbrainsMono.variable}`}>
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
