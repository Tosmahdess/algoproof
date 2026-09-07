import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investir : je note les comptes de 599 sociétés, et tu peux le refaire',
  description:
    'Une note sur les comptes de chaque société, lue dans un seul rapport annuel déposé à la SEC : chiffre d’affaires, résultat net, nombre d’actions sur trois exercices. Aucun cours de bourse, aucun conseil en investissement.',
  openGraph: { url: 'https://algoproof.fr/investir' },
}

export default function InvestirLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
