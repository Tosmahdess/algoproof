import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'
import FaqAccordion from '@/components/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ — questions fréquentes sur AlgoProof',
  description: 'Est-ce payant ? Quel est le risque ? Puis-je utiliser les bots ? Mes données ? Paper vs live ? Les réponses, en clair.',
}

const FAQ = [
  { question: 'Est-ce payant ?', answer: 'Tout ce qui est sur le site est gratuit. Le labo est explorable sans compte ; un compte servira plus tard pour sauvegarder ton travail. Aucune offre payante n\'est active aujourd\'hui.' },
  { question: 'Quel est le risque ?', answer: 'Le trading comporte un risque de perte. C\'est exactement pourquoi je montre aussi mes pertes et mes drawdowns. Rien ici n\'est un conseil financier : c\'est ma recherche, partagée en transparence.' },
  { question: 'Les bots sont-ils en argent réel ?', answer: 'La plupart tournent en paper trading (simulation fidèle sur de vraies données, sans argent réel). Les bots en argent réel sont marqués « live ». Le statut est toujours affiché.' },
  { question: 'Touchez-vous à mon argent ?', answer: 'Jamais. Le site ne demande ni dépôt, ni clé d\'exchange, ni accès à un compte de trading : il n\'y a rien à connecter, rien à confier. Tout est en lecture seule. Si un jour une offre demande davantage, elle sera annoncée ici noir sur blanc, jamais par surprise.' },
  { question: 'Puis-je utiliser ou copier les bots ?', answer: 'Le code des bots n\'est pas public. Tu peux suivre tous leurs trades en transparence, et tester tes propres stratégies dans le labo.' },
  { question: 'Mes données sont-elles en sécurité ?', answer: 'Le site n\'exige aucune donnée personnelle pour être consulté. Quand le labo demandera un compte, ce sera par simple lien magique (email), sans mot de passe à gérer.' },
  { question: 'Est-ce un conseil financier ?', answer: 'Non. AlgoProof est un laboratoire de recherche personnel partagé en public. Rien de ce qui est publié ne constitue un conseil en investissement.' },
  { question: 'Comment suivre les nouveautés ?', answer: 'Le journal recense tous les changements, et le blog publie mon suivi régulier. Je partage aussi sur X (@algoproof).' },
]

export default function FaqPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={faqJsonLd(FAQ)} />
      <h1 className="text-3xl font-bold tracking-tight mb-2">Questions fréquentes</h1>
      <p className="text-sm text-muted mb-8 max-w-2xl">Tout ce qu&apos;on me demande le plus souvent, en clair.</p>
      <FaqAccordion items={FAQ} />
    </main>
  )
}
