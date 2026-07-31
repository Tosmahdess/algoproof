import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { STRATEGY_FICHES, getStrategyFiche } from '@/lib/strategy-library'
import { familyLabel } from '@/lib/families'
import { getAllBotsWithStats, getBotSlugs } from '@/lib/queries'
import { incarnationsOf } from '@/lib/incarnations'
import { excludeArchived } from '@/lib/cohort'
import { resolveStrategyRoute } from '@/lib/strategy-routing'
import StatusBadge from '@/components/StatusBadge'

export const revalidate = 300
export const dynamicParams = true // NOT false: unknown slugs must reach this handler

export function generateStaticParams() {
  return STRATEGY_FICHES.map(f => ({ concept: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ concept: string }> }) {
  const { concept } = await params
  const f = getStrategyFiche(concept)
  if (!f) return {}
  return {
    title: `${f.title} : la stratégie expliquée, et testée chez moi`,
    description: f.oneLiner,
    alternates: { canonical: `https://algoproof.fr/strategies/${f.slug}` },
    openGraph: { url: `https://algoproof.fr/strategies/${f.slug}`, type: 'article' },
  }
}

export default async function ConceptPage({ params }: { params: Promise<{ concept: string }> }) {
  const { concept } = await params
  const ficheSlugs = STRATEGY_FICHES.map(f => f.slug)

  // resolveStrategyRoute (src/lib/strategy-routing.ts) is the tested decision:
  // fiche wins on a slug collision (real one in the tree today: fvg-multi is
  // both a fiche and a bot slug), a bot-only slug 308s to /strategies/bot/,
  // anything else 404s. getBotSlugs() is only fetched when needed — a known
  // fiche never touches Supabase to render.
  let botSlugs: string[] = []
  if (!ficheSlugs.includes(concept)) {
    // Fix round 1: a Supabase blip here used to 500 the page. Those old bot
    // URLs were indexed at sitemap priority 1.0, so a 308 is the goal, but a
    // 404 is a far better failure mode than a 500 — sitemap.ts's own
    // getBotSlugs() call degrades the same way.
    try { botSlugs = await getBotSlugs() } catch { /* degrade to notFound below */ }
  }

  const route = resolveStrategyRoute(concept, ficheSlugs, botSlugs)
  if (route.kind === 'redirect') permanentRedirect(route.to)
  if (route.kind === 'notFound') notFound()

  const fiche = getStrategyFiche(concept)!
  // FIX (final whole-branch review, I4): archived bots are dropped BEFORE the
  // join. `incarnationsOf` matches on the strategy string alone and has no
  // opinion about status, so a retired bot was listed verbatim under the
  // heading « Ce qui tourne chez moi » — which is a false statement, not a
  // presentation choice. excludeArchived() is the existing helper for exactly
  // this (src/lib/cohort.ts) and is applied at the two call sites rather than
  // inside incarnationsOf, which stays a pure name-matching function.
  const bots = excludeArchived(await getAllBotsWithStats())
  const incarnations = incarnationsOf(fiche, bots)

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <nav className="text-xs text-muted mb-6">
        <Link href="/strategies" className="hover:text-white">Les stratégies</Link>
        {' / '}{familyLabel(fiche.family)}
      </nav>

      <h1 className="text-2xl mb-2">{fiche.title}</h1>
      <p className="text-sm text-muted mb-8">{fiche.oneLiner}</p>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-muted mb-3">Comment ça marche</h2>
        {fiche.logic.map((p, i) => <p key={i} className="text-sm mb-3">{p}</p>)}
      </section>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted mb-3">Quand ça marche</h2>
          <ul className="text-sm space-y-2">
            {fiche.worksWhen.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </section>
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted mb-3">Quand ça meurt</h2>
          <ul className="text-sm space-y-2">
            {fiche.diesWhen.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </section>
      </div>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-muted mb-3">Les réglages qui comptent</h2>
        <ul className="space-y-3">
          {fiche.params.map(p => (
            <li key={p.name} className="text-sm">
              <span className="font-mono text-accent">{p.name}</span> : {p.role}
              {p.pitfall && <span className="block text-xs text-muted mt-1">{p.pitfall}</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* The inverse join. A concept asks the fleet what runs it, so promoting a
          bot never requires editing this page. */}
      <section data-testid="concept-incarnations" className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-muted mb-3">
          Ce qui tourne chez moi
        </h2>
        {incarnations.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun bot ne fait tourner cette stratégie en ce moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {incarnations.map(bot => (
              <li key={bot.slug}>
                <Link
                  href={`/strategies/bot/${bot.slug}`}
                  className="flex items-center justify-between gap-4 bg-card border border-border rounded-lg p-3 hover:border-accent transition-colors"
                >
                  <span className="text-sm">{bot.name}</span>
                  <span className="flex items-center gap-3 text-xs text-muted font-mono">
                    <span>{bot.timeframe}</span>
                    <span>{bot.stats.total_trades} trades</span>
                    <StatusBadge status={bot.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a
        href={fiche.labHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-accent text-bg px-4 py-2 rounded text-sm"
      >
        Tester cette stratégie dans le labo
      </a>
      {fiche.presetHref && (
        <a
          href={fiche.presetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block ml-3 text-sm text-accent underline"
        >
          Reproduire ma config réelle
        </a>
      )}
    </main>
  )
}
