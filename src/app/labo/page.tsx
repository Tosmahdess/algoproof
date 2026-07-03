import type { Metadata } from 'next'
import EmailCapture from '@/components/EmailCapture'

export const metadata: Metadata = {
  title: 'Le labo — teste tes stratégies de trading',
  description: 'Backtest multi-combo, walk-forward, comparaisons sauvegardées : le laboratoire de recherche d\'AlgoProof pour tester tes propres stratégies, en français.',
}

const LAB_URL = 'https://lab.algoproof.fr'

const FEATURES = [
  { title: 'Backtest multi-combo', desc: 'Teste une stratégie sur plusieurs actifs, timeframes et réglages en un clic, et compare les résultats.' },
  { title: 'Walk-forward', desc: 'Vérifie qu\'une stratégie tient sur des données jamais vues — le vrai test anti-overfit.' },
  { title: 'Comparaisons sauvegardées', desc: 'Garde tes configs et confronte-les côte à côte. Ce que ni TradingView ni les autres ne font.' },
  { title: 'Réalisme des coûts', desc: 'Frais, slippage et spread par venue (Binance, Hyperliquid, forex, actions) — pas de backtest hors-sol.' },
]

export default function LaboPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Le labo — teste tes propres stratégies</h1>
        <p className="text-muted leading-relaxed">
          AlgoProof n&apos;est pas qu&apos;une vitrine : c&apos;est un vrai laboratoire de recherche. Le labo te laisse
          backtester, mesurer et challenger des stratégies sur des données réelles — exactement avec les mêmes outils
          que j&apos;utilise pour mes bots.
        </p>
        <a href={LAB_URL} className="inline-block mt-6 px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
          Ouvrir le labo →
        </a>
        <p className="text-xs text-muted mt-2">Explorable sans compte. Un compte servira plus tard pour sauvegarder ton travail.</p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-4">Ce que tu peux faire</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border rounded-xl p-6 text-center bg-card/40">
        <h2 className="text-lg font-bold mb-2">Prêt à tester ?</h2>
        <p className="text-muted text-sm mb-4 max-w-xl mx-auto">
          Le labo tourne sur un sous-domaine dédié. Tout est gratuit pour explorer.
        </p>
        <a href={LAB_URL} className="inline-block px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
          Ouvrir le labo →
        </a>
      </section>

      <EmailCapture
        source="labo"
        title="Être prévenu des évolutions du labo"
        description="Nouvelles stratégies, nouveaux diagnostics, ouverture de l’abonnement : je préviens par email. Pas de spam, désinscription sur simple réponse."
      />
    </main>
  )
}
