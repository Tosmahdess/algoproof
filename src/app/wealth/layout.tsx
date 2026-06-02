import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wealth · Portefeuille DCA',
  description: 'Mon portefeuille long terme exposé en temps réel : DCA sur ETFs et crypto, alertes dips GROWTH, suivi de mes achats.',
  openGraph: { url: 'https://algoproof.fr/wealth' },
}

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
