import type { Metadata } from 'next'

export const metadata: Metadata = {
  // "mes points d'entrée" reads as a signal to act on, which is the one thing
  // this project never sells. It left the home card on 2026-09-03 and this is
  // the same sentence, in the browser tab and in every search result.
  title: 'Investir long terme : ma watchlist et mes analyses par société',
  description: 'Ma liste d\'actions et cryptos suivies sur le long terme, et comment je lis leurs replis. DCA, drawdown 180 jours, plus hauts historiques. Aucun conseil en investissement.',
  openGraph: { url: 'https://algoproof.fr/wealth' },
}

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
