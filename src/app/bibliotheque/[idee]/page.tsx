// One idea of the library (lot 2, D079/D083): what it is, how many variants and in
// which state, and every variant in a register.
//
// Refonte « registre » (2026-10-03): the way back, the title, then the explanation
// beside the sketch of its principle (moved here from the index, audit n° 41), the
// counts between two rules, and ONE register whose order is said above it (n° 42).
// The idea has one name, the French one: the link to its fiche no longer says the
// fiche's English title (« Canal ATR » and « ATR Channel » on one page, n° 42). The
// three framed boxes are gone: one rule per section, as everywhere else.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import VariantTable, { type VariantRow } from '@/components/library/VariantTable'
import PrincipleSketch from '@/components/library/PrincipleSketch'
import { LibraryFigure as Figure, LibraryFigures } from '@/components/library/LibraryFigures'
import {
  SIM_MIN_TRADES, filterLabel, getIdeaVariants, getLibraryIdeas, ideaKeyFromSlug, ideaSlug, simLine,
  variantNumber, variantState, waitReasonLabel, type LibraryVariant,
} from '@/lib/library'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import { familyDescription, familyLabel, type Family } from '@/lib/families'
import { FICHE_BY_ENGINE_BASE } from '@/lib/strategy-keys'
import { getStrategyFiche } from '@/lib/strategy-library'
import { LAB_ORIGIN, labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'

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
const pf = (x: number) => x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n = (x: number) => x.toLocaleString('fr-FR')
const plural = (x: number, one: string, many: string) => `${n(x)} ${x > 1 ? many : one}`

// The settings of every bot are the lab's, for subscribers, except EMA cross, open in
// full so a visitor can see what a complete dossier looks like (gauntlet-explainer).
const OPEN_SETTINGS = new Set(['EMAcross'])

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
    title: `${label} : ${plural(data.idea.n_variants, 'variante', 'variantes')} dans la bibliothèque`,
    description: `Les variantes de ${label} qui ont passé mes épreuves de backtest, celles qui tournent en simulation et celles qui attendent.`,
    alternates: { canonical: `https://algoproof.fr/bibliotheque/${idee}` },
  }
}

function toRow(v: LibraryVariant): VariantRow {
  const running = v.status === 'paper' || v.status === 'live' || v.status === 'archived'
  const sign = !running ? null : v.sim_trades < SIM_MIN_TRADES ? 'young' : v.sim_pnl > 0 ? 'up' : 'down'
  return {
    slug: v.slug,
    number: variantNumber(v),
    name: v.name,
    status: (['live', 'paper', 'archived'].includes(v.status) ? v.status : 'backtest') as VariantRow['status'],
    state: variantState(v),
    waitLabel: v.status === 'backtest' ? waitReasonLabel(v.wait_reason) : '',
    filters: (v.filter_keys ?? []).map(filterLabel),
    mtfCaveat: v.mtf_caveat,
    nAssets: (v.assets ?? []).length,
    pfBacktest: v.pf_backtest == null ? null : pf(v.pf_backtest),
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

/** « argent réel, simulation et backtest seul »: the states this idea has, in the
 *  register's order. */
function statesInOrder(i: { n_live: number; n_paper: number; n_stopped: number; n_backtest: number }): string {
  const s = [
    i.n_live > 0 ? 'argent réel' : null,
    i.n_paper > 0 ? 'simulation' : null,
    i.n_stopped > 0 ? 'arrêtées' : null,
    i.n_backtest > 0 ? 'backtest seul' : null,
  ].filter((x): x is string => x !== null)
  return s.length > 1 ? `${s.slice(0, -1).join(', ')}, puis ${s[s.length - 1]}` : (s[0] ?? '')
}

export default async function IdeaPage({ params }: { params: Promise<{ idee: string }> }) {
  const { idee } = await params
  const data = await load(idee)
  if (!data) notFound()
  const { idea, variants } = data
  const name = `${engineBaseLabel(idea.base)} ${idea.tf}`
  const fiche = FICHE_BY_ENGINE_BASE[idea.base] ? getStrategyFiche(FICHE_BY_ENGINE_BASE[idea.base]) : null
  const rows = variants.map(toRow)
  const sim = simLine(idea)
  const figures = 3 + (idea.n_live > 0 ? 1 : 0) + (idea.n_stopped > 0 ? 1 : 0)
  const waiting = [
    idea.n_awaiting > 0 ? plural(idea.n_awaiting, 'attend que je la lance', 'attendent que je les lance') : null,
    idea.n_trailing > 0 ? `${plural(idea.n_trailing, 'utilise', 'utilisent')} un stop suiveur que mes bots ne gèrent pas encore` : null,
    idea.n_not_surviving > 0 ? `${plural(idea.n_not_surviving, 'ne survit', 'ne survivent')} plus à la dernière génération de mon moteur` : null,
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
      <nav aria-label="Fil d’Ariane" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li><Link href="/" className={linkClass('nav', 'inline-flex min-h-11 items-center')}>Accueil</Link></li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li><Link href="/bibliotheque" className={linkClass('nav', 'inline-flex min-h-11 items-center')}>La bibliothèque</Link></li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li aria-current="page" className="text-foreground">{name}</li>
        </ol>
      </nav>

      <header className="pt-2">
        <p className="text-sm text-muted">{`${familyLabel(idea.family as Family)} · ${TF_WORD[idea.tf] ?? idea.tf} · Binance Futures`}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-10">
          <div className="max-w-[64ch]">
            <p className="text-base sm:text-lg">{fiche ? fiche.oneLiner : familyDescription(idea.family as Family)}</p>
            <p className="mt-3 text-sm text-muted">
              Toutes les variantes de cette page partagent cette logique. Seuls les réglages et les filtres changent.
            </p>
            {fiche && (
              <p className="mt-2 text-sm">
                <Link href={`/strategies/${fiche.slug}`} className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
                  Comment marche cette idée, quand elle marche et quand elle meurt →
                </Link>
              </p>
            )}
          </div>
          <PrincipleSketch family={idea.family} />
        </div>
      </header>

      <LibraryFigures count={figures} className="mt-8">
        <Figure value={idea.n_variants} label={idea.n_variants > 1 ? 'variantes' : 'variante'} phrase="Passées par mes épreuves de backtest." />
        {idea.n_live > 0 && <Figure value={idea.n_live} label="en argent réel" phrase="Lancées avec mon argent." />}
        <Figure value={idea.n_paper} label="en simulation" phrase="Lancées, sans argent." />
        {idea.n_stopped > 0 && <Figure value={idea.n_stopped} label={idea.n_stopped > 1 ? 'arrêtées' : 'arrêtée'} phrase="Lancées, puis arrêtées." />}
        <Figure value={idea.n_backtest} label="en backtest seul" phrase="Pas encore lancées." />
      </LibraryFigures>
      <div className="mt-3 max-w-[72ch] space-y-1 text-sm text-muted">
        {waiting.length > 0 && <p>{`En backtest seul : ${waiting.join(', ')}.`}</p>}
        {sim && (
          <p>
            {`En simulation depuis leur lancement : ${sim}. La fiche de chaque bot ajoute le rejeu du backtest, ses chiffres peuvent donc différer.`}
          </p>
        )}
      </div>

      <section aria-labelledby="variants-title" className="mt-10 border-t border-border pt-9">
        <h2 id="variants-title" className="text-2xl font-semibold tracking-tight">
          {`Les ${plural(idea.n_variants, 'variante', 'variantes')}`}
        </h2>
        <div className="mt-3 mb-6 max-w-[72ch] space-y-2 text-sm text-muted">
          <p data-testid="variants-order">
            {`Je les classe par état (${statesInOrder(idea)}), puis par numéro. Le numéro termine le nom de la variante : je le donne quand je la publie et il ne change plus. Ce n’est pas un classement, il ne dit rien de son résultat.`}
          </p>
          {idea.pf_median != null && (
            <p>
              {`Sur la période de backtest qui a servi à les choisir, le PF médian est de ${pf(idea.pf_median)}`}
              {idea.n_pf > 3 && idea.pf_q1 != null && idea.pf_q3 != null
                ? `, la moitié des variantes entre ${pf(idea.pf_q1)} et ${pf(idea.pf_q3)}`
                : ''}
              {` (sur ${plural(idea.n_pf, 'variante', 'variantes')}). Des chiffres flatteurs par construction : le vrai test, c’est la simulation après le lancement.`}
            </p>
          )}
          <p>
            {OPEN_SETTINGS.has(idea.base)
              ? 'Chaque variante est publique, avec le nom de ses filtres. Les valeurs de ses réglages sont dans le labo, ouvertes à tous pour cette idée.'
              : 'Chaque variante est publique, avec le nom de ses filtres. Les valeurs de ses réglages sont dans le labo, réservées aux abonnés : chaque lien « Réglages » y mène.'}
          </p>
        </div>
        <VariantTable rows={rows} caption={`Les variantes de ${name}, par état puis par numéro`} />
      </section>
    </div>
  )
}
