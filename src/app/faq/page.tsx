import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'
import FaqAccordion from '@/components/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ : questions fréquentes sur AlgoProof',
  description: 'Est-ce payant ? Quel est le risque ? Puis-je utiliser les bots ? Mes données ? Paper vs live ? Les réponses, en clair.',
}

const FAQ = [
  { question: 'Est-ce payant ?', answer: 'Tout est gratuit sur le site, y compris un compte labo (lien magique, sans mot de passe) déjà disponible pour sauvegarder ton travail. Seule l\'adhésion payante n\'est pas encore ouverte.' },
  { question: 'Quel est le risque ?', answer: 'Le trading comporte un risque de perte. C\'est exactement pourquoi je montre aussi mes pertes et mes drawdowns. Rien ici n\'est un conseil financier : c\'est ma recherche, partagée en transparence.' },
  { question: 'Les bots sont-ils en argent réel ?', answer: 'La plupart tournent en paper trading (simulation fidèle sur de vraies données, sans argent réel). Les bots en argent réel sont marqués « live ». Le statut est toujours affiché.' },
  { question: 'Touches-tu à mon argent ?', answer: 'Jamais. Le site ne demande ni dépôt, ni clé d\'exchange, ni accès à un compte de trading : il n\'y a rien à connecter, rien à confier. Tout est en lecture seule. Si un jour une offre demande davantage, elle sera annoncée ici noir sur blanc, jamais par surprise.' },
  { question: 'Qu\'est-ce qui deviendra payant un jour ?', answer: 'Rien aujourd\'hui : tout le site et tout le labo sont gratuits. Quand une offre payante arrivera, elle portera sur la configuration exacte des bots et sur leur dossier de validation, jamais sur leurs résultats. Voir un bot trader ne permet de rien reproduire : il faut les paramètres exacts, les filtres, et le dossier qui montre comment cette configuration a été retenue contre les milliers de voisines qui sont mortes. Les trades, les pertes et les courbes resteront publics et gratuits, et une stratégie complète sera ouverte en entier pour que tu voies à quoi ressemble un dossier avant de payer quoi que ce soit.' },
  { question: 'Puis-je utiliser ou copier les bots ?', answer: 'Le code des bots n\'est pas public. Tu peux suivre tous leurs trades en transparence, et tester tes propres stratégies dans le labo.' },
  { question: 'Mes données sont-elles en sécurité ?', answer: 'Le site n\'exige aucune donnée personnelle pour être consulté. Le labo propose un compte gratuit par simple lien magique (email), sans mot de passe à gérer, pour sauvegarder ton travail.' },
  { question: 'Est-ce un conseil financier ?', answer: 'Non. AlgoProof est un laboratoire de recherche personnel partagé en public. Rien de ce qui est publié ne constitue un conseil en investissement.' },
  { question: 'Comment suivre les nouveautés ?', answer: 'Le blog publie mon suivi régulier, et je partage aussi sur X (@algoproof).' },
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
