import Link from 'next/link'
import { notFound } from 'next/navigation'
import VariantTable, { type VariantRow } from '@/components/library/VariantTable'
import PrincipleSketch from '@/components/library/PrincipleSketch'
import {
  SIM_MIN_TRADES, filterLabel, getIdeaVariants, getLibraryIdeas, ideaKeyFromSlug, ideaSlug, simSplit,
  variantState, waitReasonLabel, type LibraryVariant,
} from '@/lib/library'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import { familyDescription, familyLabel, type Family } from '@/lib/families'
import { FICHE_BY_ENGINE_BASE } from '@/lib/strategy-keys'
import { getStrategyFiche } from '@/lib/strategy-library'
import { LAB_ORIGIN, labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'

// One idea of the library (lot 2, D079/D083): what it is, how many variants and in
// which state, the selection-period PF spread (flattering by construction, said so),
// and every variant in a register.
export const revalidate = 1800
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    return (await getLibraryIdeas()).map(i => ({ idee: ideaSlug(i.idea_key) }))
  } catch {
    return []
  }
}

const TF_WORD: Record<string, string> = { D1: '1 jour', H4: '4 heures', H1: '1 heure', M30: '30 minutes' }
const fr = (x: number) => x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function load(slug: string) {
  const ideas = await getLibraryIdeas()
  const key = ideaKeyFromSlug(slug, ideas.map(i => i.idea_key))
  if (!key) return null
  const idea = ideas.find(i => i.idea_key === key)!
  return { idea, variants: await getIdeaVariants(key) }
}

export async function generateMetadata({ params }: { params: Promise<{ idee: string }> }) {
  const { idee } = await params
  const data = await load(idee).catch(() => null)
  if (!data) return { title: 'Idée introuvable' }
  const label = `${engineBaseLabel(data.idea.base)} ${data.idea.tf}`
  return {
    title: `${label} : ${data.idea.n_variants} variantes dans la bibliothèque`,
    description: `Les variantes de ${label} qui ont passé mes épreuves de backtest, celles qui tournent en simulation et celles qui attendent.`,
    alternates: { canonical: `https://algoproof.fr/bibliotheque/${idee}` },
  }
}

function toRow(v: LibraryVariant): VariantRow {
  const running = v.status === 'paper' || v.status === 'live' || v.status === 'archived'
  const sign = !running ? null : v.sim_trades < SIM_MIN_TRADES ? 'young' : v.sim_pnl > 0 ? 'up' : 'down'
  return {
    slug: v.slug,
    rank: v.idea_rank,
    name: v.name,
    state: variantState(v),
    stateTone: v.status === 'archived' ? 'stop' : running ? 'run' : 'wait',
    waitLabel: v.status === 'backtest' ? waitReasonLabel(v.wait_reason) : '',
    filters: (v.filter_keys ?? []).map(filterLabel),
    mtfCaveat: v.mtf_caveat,
    nAssets: (v.assets ?? []).length,
    pfBacktest: v.pf_backtest == null ? null : fr(v.pf_backtest),
    tradesBacktest: v.n_trades_backtest,
    simTrades: v.sim_trades,
    simSign: sign,
    // A running bot has its fiche; a never-launched one opens the lab's preset (a
    // 'backtest' fiche is a 404 by design, guarded by tests/app/bot-slug-routes).
    href: running ? `/strategies/bot/${v.slug}`
      : v.survivor_id ? labUrl(`${LAB_ORIGIN}/lab?survivor=${encodeURIComponent(v.survivor_id)}`, 'bibliotheque')
      : null,
    external: !running && !!v.survivor_id,
  }
}

export default async function IdeaPage({ params }: { params: Promise<{ idee: string }> }) {
  const { idee } = await params
  const data = await load(idee)
  if (!data) notFound()
  const { idea, variants } = data
  const label = engineBaseLabel(idea.base)
  const fiche = FICHE_BY_ENGINE_BASE[idea.base] ? getStrategyFiche(FICHE_BY_ENGINE_BASE[idea.base]) : null
  const s = simSplit(idea)
  const rows = variants.map(toRow)

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
      <Link href="/bibliotheque" className={`${linkClass('inline')} text-sm`}>← La bibliothèque</Link>
      <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">{label} {idea.tf}</h1>
      <p className="mt-1 text-sm text-muted">
        {familyLabel(idea.family as Family)} · {TF_WORD[idea.tf] ?? idea.tf} · Binance Futures
      </p>

      <section className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted">L&apos;idée</h2>
        <PrincipleSketch family={idea.family} />
        <p className="text-sm text-foreground">
          {fiche ? fiche.oneLiner : familyDescription(idea.family as Family)}
        </p>
        {fiche && (
          <Link href={`/strategies/${fiche.slug}`} className={`${linkClass('inline')} text-sm`}>
            Comment marche {fiche.title}, quand elle marche et quand elle meurt
          </Link>
        )}
        <p className="text-xs text-muted">
          Toutes les variantes ci-dessous partagent cette logique. Seuls les réglages changent :
          les filtres sont nommés, leurs valeurs restent dans le labo.
        </p>
      </section>

      <section className="mt-4 grid gap-2 rounded-lg border border-border bg-card p-4 text-sm">
        <h2 className="text-sm font-medium text-muted">Où en sont les variantes</h2>
        <p className="text-foreground">
          {`${idea.n_variants} variantes : ` + [
            idea.n_live > 0 ? `${idea.n_live} avec mon argent` : null,
            `${idea.n_paper} en simulation`,
            `${idea.n_backtest} en backtest seul`,
            idea.n_stopped > 0 ? `${idea.n_stopped} arrêtées` : null,
          ].filter(Boolean).join(', ') + '.'}
        </p>
        {idea.n_backtest > 0 && (
          <p className="text-muted">
            Parmi celles en backtest seul, {idea.n_awaiting} attendent que je les lance
            {idea.n_trailing > 0 && ` et ${idea.n_trailing} utilisent un stop suiveur que mes bots ne gèrent pas encore`}
            {idea.n_not_surviving > 0 && `, ${idea.n_not_surviving} ne survivent plus à la dernière génération`}.
          </p>
        )}
        <p className="text-muted">
          {s.total === 0
            ? "Aucune n'est en simulation pour l'instant."
            : `En simulation, depuis leur lancement : ${s.up} au-dessus de zéro, ${s.down} à zéro ou en dessous, ${s.young} trop jeunes pour dire quoi que ce soit. La fiche de chaque bot ajoute le rejeu du backtest, ses chiffres peuvent donc différer.`}
        </p>
      </section>

      {idea.pf_median != null && (
        <section className="mt-4 grid gap-2 rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="text-sm font-medium text-muted">Backtest de sélection</h2>
          <p className="text-foreground">
            PF médian <span className="font-mono">{fr(idea.pf_median)}</span>
            {idea.n_pf > 3 && idea.pf_q1 != null && idea.pf_q3 != null && (
              <>, la moitié des variantes entre <span className="font-mono">{fr(idea.pf_q1)}</span> et{' '}
                <span className="font-mono">{fr(idea.pf_q3)}</span></>
            )}
            {' '}(sur {idea.n_pf} variantes).
          </p>
          <p className="text-muted">
            C&apos;est la période qui a servi à choisir ces variantes, donc des chiffres flatteurs
            par construction. Le vrai test, c&apos;est la simulation après leur lancement.
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Les {idea.n_variants} variantes</h2>
        <VariantTable rows={rows} />
      </section>
    </main>
  )
}
