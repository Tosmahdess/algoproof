import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBotsWithStats } from '@/lib/queries'
import { computeFleetProof, type FleetProof } from '@/lib/fleet-proof'
import ProofStrip from '@/components/ProofStrip'
import ProofComparison from '@/components/ProofComparison'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'La preuve : trading algo vérifié, pas de promesse | AlgoProof',
  description:
    "90 % des bots IA et prop firms te font perdre. Ici, chaque trade et chaque perte sont publics et vérifiables. Track record live, paper d'abord, sans paywall.",
  openGraph: { url: 'https://algoproof.fr/preuve' },
}

const EMPTY: FleetProof = { nBots: 0, nWithData: 0, totalTrades: 0, losingTrades: 0, fleetPnl: 0, fleetPF: 0 }

const HOW = [
  ['Dashboard live', "Les chiffres sont régénérés toutes les heures depuis les données réelles des bots sur le VPS — pas de capture d'écran retouchée."],
  ['Cartes embeddables', "Chaque bot a une carte publique intégrable ailleurs : n'importe qui peut afficher et vérifier les résultats hors de mon site."],
  ['Bientôt on-chain', 'Avec la migration vers Hyperliquid, les exécutions deviendront vérifiables directement sur la blockchain.'],
]

export default async function PreuvePage() {
  let proof = EMPTY
  try {
    proof = computeFleetProof(await getAllBotsWithStats())
  } catch {
    /* build-time Supabase error — keep the page, show zeros */
  }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'La preuve — AlgoProof', description: metadata.description,
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hook */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          90 % des bots IA te font perdre.<br />
          <span className="text-positive">Moi, je te montre les pertes.</span>
        </h1>
        <p className="mt-4 text-muted leading-relaxed max-w-2xl mx-auto">
          Pas de promesse de gains, pas de faux screenshots. Un labo de recherche en trading algo,
          en paper d&apos;abord, où chaque trade — gagnant comme perdant — est public et vérifiable.
        </p>
      </div>

      {/* Proof strip */}
      <ProofStrip proof={proof} />

      {/* Comparison */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-center">AlgoProof vs un bot-shop classique</h2>
        <ProofComparison />
      </section>

      {/* Overfit autopsy */}
      <section>
        <Link href="/blog/2026-05-22-orb-fvg-walkforward"
          className="block rounded-2xl border border-border bg-card p-6 hover:border-accent/40 transition-colors">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Je rejette mes propres résultats</p>
          <p className="text-lg font-bold text-text">PF 1.40 en backtest, 0/5 en walk-forward — j&apos;ai jeté la stratégie.</p>
          <p className="mt-2 text-sm text-muted">L&apos;autopsie complète d&apos;une stratégie qui semblait gagnante et que j&apos;ai publiquement abandonnée. La transparence, c&apos;est aussi montrer ce qu&apos;on refuse de vendre. Lire l&apos;article →</p>
        </Link>
      </section>

      {/* How I prove it */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Comment je prouve</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-text mb-1">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/overview" className="rounded-lg bg-positive px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90">Voir tous les bots →</Link>
        <Link href="/performance" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-positive hover:text-positive">Les chiffres bruts →</Link>
        <Link href="/start" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-positive hover:text-positive">Commencer en règle →</Link>
      </div>
    </main>
  )
}
