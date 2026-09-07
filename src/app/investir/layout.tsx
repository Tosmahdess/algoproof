import type { Metadata } from 'next'
import { investirMeta } from '@/lib/investir-meta'

// Le nombre était écrit en dur ici, et il avait déjà dérivé : le corps de la
// page annonçait 741 sociétés pendant que l'onglet du navigateur et les
// résultats de recherche en annonçaient 599. Deuxième fois dans la journée
// qu'un compte recopié à la main dérive — il se lit maintenant, comme partout
// ailleurs, dans le fichier de métadonnées produit par la mesure.
export const metadata: Metadata = {
  title: `Investir : je note les comptes de ${investirMeta.contexte.societes_notees} sociétés, et tu peux le refaire`,
  description:
    'Une note sur les comptes de chaque société, lue dans un seul rapport annuel déposé à la SEC : chiffre d’affaires, résultat net, nombre d’actions sur trois exercices. Aucun cours de bourse, aucun conseil en investissement.',
  openGraph: { url: 'https://algoproof.fr/investir' },
}

export default function InvestirLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
