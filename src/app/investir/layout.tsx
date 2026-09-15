import type { Metadata } from 'next'
import { investirMeta } from '@/lib/investir-meta'

// Le nombre était écrit en dur ici, et il avait déjà dérivé : le corps de la
// page annonçait 741 sociétés pendant que l'onglet du navigateur et les
// résultats de recherche en annonçaient 599. Deuxième fois dans la journée
// qu'un compte recopié à la main dérive — il se lit maintenant, comme partout
// ailleurs, dans le fichier de métadonnées produit par la mesure.
export const metadata: Metadata = {
  title: `Investir : je lis le dernier rapport annuel de ${investirMeta.contexte.societes_notees} sociétés, et tu peux le refaire`,
  description:
    'Sept contrôles indépendants sur les comptes de chaque société, lus dans un seul rapport annuel déposé à la SEC. Chaque alerte est nommée par le fait qui la déclenche, et je dis ce que je n’ai pas pu lire. Aucun cours de bourse, aucun conseil en investissement.',
  openGraph: { url: 'https://algoproof.fr/investir' },
}

export default function InvestirLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
