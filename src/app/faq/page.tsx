import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'
import FaqAccordion from '@/components/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ : questions fréquentes sur AlgoProof',
  description: 'Est-ce payant ? Quel est le risque ? Puis-je utiliser les bots ? Mes données ? Paper vs live ? Les réponses, en clair.',
}

const FAQ = [
  { question: 'Est-ce payant ?', answer: 'Regarder est gratuit et le restera : trades, pertes, historique, verdicts, stratégies recalées. Le compte labo (lien magique, sans mot de passe) est gratuit lui aussi et permet de lancer des backtests, avec des quotas. L\'adhésion à 29 € par mois ou 290 € par an lève ces quotas et ouvre le reste de mon labo : la recette exacte des bots sortis du moteur, le raisonnement complet de mes analyses par société, et les fonctions de calcul du labo (grilles, walk-forward, import de tes propres données). Pas de période d\'essai : le premier paiement est prélevé à la souscription, et je le rembourse intégralement sur simple demande dans les 14 jours.' },
  { question: 'Quel est le risque ?', answer: 'Le trading comporte un risque de perte. C\'est exactement pourquoi je montre aussi mes pertes et mes drawdowns. Rien ici n\'est un conseil financier : c\'est ma recherche, partagée en transparence.' },
  { question: 'Les bots sont-ils en argent réel ?', answer: 'La plupart tournent en paper trading (simulation fidèle sur de vraies données, sans argent réel). Les bots en argent réel sont marqués « live ». Le statut est toujours affiché.' },
  { question: 'Touches-tu à mon argent ?', answer: 'Jamais. Le site ne demande ni dépôt, ni clé d\'exchange, ni accès à un compte de trading : il n\'y a rien à connecter, rien à confier. Tout est en lecture seule. Si un jour une offre demande davantage, elle sera annoncée ici noir sur blanc, jamais par surprise.' },
  { question: 'Qu\'est-ce qui est payant ?', answer: 'La règle tient en une ligne : ce que je fais reste gratuit, comment je l\'ai fait se paie. Voir un bot trader ne permet de rien reproduire ; il faut les paramètres exacts, les filtres, et le dossier qui montre comment cette configuration a été retenue contre les milliers de voisines qui sont mortes. Sur les sociétés, c\'est pareil : le verdict et sa raison courte sont ouverts, les quatre parties qui expliquent d\'où il sort sont réservées aux membres. S\'ajoute l\'outil lui-même, le labo, avec ses grilles et ses tests de robustesse. Les trades, les pertes et les courbes restent publics et gratuits, et un dossier complet, celui de l\'EMA cross, est ouvert en entier pour que tu voies à quoi ça ressemble avant de payer quoi que ce soit.' },
  { question: 'Puis-je utiliser ou copier les bots ?', answer: 'Le code des bots n\'est pas public. Tu peux suivre tous leurs trades en transparence, et tester tes propres stratégies dans le labo.' },
  { question: 'Mes données sont-elles en sécurité ?', answer: 'Le site n\'exige aucune donnée personnelle pour être consulté. Le labo propose un compte gratuit par simple lien magique (email), sans mot de passe à gérer, pour sauvegarder ton travail.' },
  { question: 'Est-ce un conseil financier ?', answer: 'Non. AlgoProof est un laboratoire de recherche personnel partagé en public. Rien de ce qui est publié ne constitue un conseil en investissement.' },
  { question: 'Comment suivre les nouveautés ?', answer: 'Le blog publie mon suivi régulier, et je partage aussi sur X (@algoproof).' },
]

export default function FaqPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <JsonLd data={faqJsonLd(FAQ)} />
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Questions fréquentes</h1>
      <p className="text-sm text-muted mb-8 max-w-2xl">Tout ce qu&apos;on me demande le plus souvent, en clair.</p>
      <FaqAccordion items={FAQ} />
    </main>
  )
}
