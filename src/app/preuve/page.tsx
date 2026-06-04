import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBotsWithStats } from '@/lib/queries'
import { computeFleetProof, type FleetProof } from '@/lib/fleet-proof'
import ProofStrip from '@/components/ProofStrip'
import ProofComparison from '@/components/ProofComparison'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Le labo ouvert : je teste, je partage tout | AlgoProof',
  description:
    "Un labo de trading algo ouvert. Je teste des stratégies en public et je partage tout, gains comme pertes, sans rien vendre. Track record public, paper d'abord, sans paywall.",
  openGraph: { url: 'https://algoproof.fr/preuve' },
}

const EMPTY: FleetProof = { nBots: 0, nWithData: 0, totalTrades: 0, losingTrades: 0, fleetPnl: 0, fleetPF: 0 }

const HOW = [
  ['Dashboard live', "Les chiffres sont régénérés toutes les heures depuis les données réelles des bots sur le VPS. Pas de capture d'écran retouchée."],
  ['Cartes embeddables', "Chaque bot a une carte publique intégrable ailleurs. N'importe qui peut afficher et vérifier les résultats hors de mon site."],
  ['Bientôt on-chain', 'Avec la migration vers Hyperliquid, les exécutions deviendront vérifiables directement sur la blockchain.'],
]

export default async function PreuvePage() {
  let proof = EMPTY
  try {
    proof = computeFleetProof(await getAllBotsWithStats())
  } catch {
    /* build-time Supabase error: keep the page, show zeros */
  }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Le labo ouvert | AlgoProof', description: metadata.description,
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hook */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Un labo de trading algo, ouvert.<br />
          <span className="text-positive">Je teste, je partage tout.</span>
        </h1>
        <p className="mt-4 text-muted leading-relaxed max-w-2xl mx-auto">
          Pas de promesse, pas de faux screenshots, rien à vendre. Je teste des stratégies en public,
          en paper d&apos;abord, et je montre chaque trade : ce qui marche comme ce qui rate. Tu peux tout vérifier.
        </p>
      </div>

      {/* Transparency strip */}
      <ProofStrip proof={proof} />

      {/* Comparison */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-center">Un labo ouvert vs un shop à signaux</h2>
        <ProofComparison />
      </section>

      {/* Overfit autopsy */}
      <section>
        <Link href="/blog/2026-05-22-orb-fvg-walkforward"
          className="block rounded-2xl border border-border bg-card p-6 hover:border-accent/40 transition-colors">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Je partage aussi mes échecs</p>
          <p className="text-lg font-bold text-text">Une stratégie qui semblait gagnante, et que j&apos;ai publiquement jetée.</p>
          <p className="mt-2 text-sm text-muted">L&apos;autopsie complète d&apos;un setup que j&apos;ai abandonné après l&apos;avoir testé. Partager, c&apos;est aussi montrer ce qu&apos;on refuse de garder. Lire l&apos;article.</p>
        </Link>
      </section>

      {/* Why you can verify */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Pourquoi tu peux tout vérifier</h2>
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
        <Link href="/overview" className="rounded-lg bg-positive px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90">Voir le labo en direct</Link>
        <Link href="/blog" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-positive hover:text-positive">Lire le journal de bord</Link>
        <Link href="/start" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-positive hover:text-positive">Commencer en règle</Link>
      </div>
    </main>
  )
}
