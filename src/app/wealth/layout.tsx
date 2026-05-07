import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wealth — Portefeuille DCA',
  description: "Suivi en temps réel du portefeuille DCA APEX Wealth. Allocations ETFs, crypto et or. Transparence totale — chaque appel d'investissement publié.",
  openGraph: { url: 'https://algoproof.fr/wealth' },
}

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
