import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investir long terme — ma watchlist et mes points d\'entrée',
  description: 'Ma liste d\'actions et cryptos suivies sur le long terme, avec les prix auxquels je renforce. DCA, drawdown 180 jours, plus hauts historiques.',
  openGraph: { url: 'https://algoproof.fr/wealth' },
}

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
