import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Le titre disait « Investir long terme » tant que cette page ÉTAIT l'entrée
  // Investir du menu. Depuis le 2026-09-07 c'est /investir, et deux pages qui se
  // disputent le même terme se cannibalisent en recherche. Celle-ci a un objet
  // distinct et plus honnête : l'allocation, et mes analyses écrites à la main
  // sur un univers que j'ai choisi — y compris les sociétés européennes que la
  // règle publiée ne peut pas noter.
  title: 'Mon allocation long terme et mes analyses par société',
  description: 'Mon allocation cible (crypto, ETF monde, or, poche tactique) et mes analyses écrites par société, sur un univers que je choisis. Pour les sociétés notées par une règle publiée et vérifiable, voir Investir. Aucun conseil en investissement.',
  openGraph: { url: 'https://algoproof.fr/wealth' },
}

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
