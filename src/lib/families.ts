// src/lib/families.ts
// Single source of truth for the bot family taxonomy, mirroring the `families`
// table (migration 017). Both algoproof.fr and lab.algoproof.fr key on these
// nine slugs. Adding one is a migration, not an edit here alone.

export type Family =
  | 'trend'
  | 'momentum'
  | 'breakout'
  | 'mean-reversion'
  | 'price-action'
  | 'carry'
  | 'market-neutral'
  | 'stat-arb'
  | 'event'

export const FAMILY_ORDER = [
  'trend',
  'momentum',
  'breakout',
  'mean-reversion',
  'price-action',
  'carry',
  'market-neutral',
  'stat-arb',
  'event',
] as const satisfies readonly Family[]

const LABELS: Record<Family, string> = {
  trend: 'Suivi de tendance',
  momentum: 'Momentum',
  breakout: 'Cassure',
  'mean-reversion': 'Retour à la moyenne',
  'price-action': 'Zones et price action',
  carry: 'Portage',
  'market-neutral': 'Neutre au marché',
  'stat-arb': 'Arbitrage statistique',
  event: 'Événementiel',
}

// The accent colour each family is drawn in. Lives here rather than in a page
// for the same reason LABELS does: /strategies and the home page both colour a
// family badge, and two local maps drift (both held five entries and fell back
// to a grey `#888` for the other four, which is how a momentum bot ended up
// painted as "unknown family" on the home page).
// Nine entries, nine DISTINCT colours (enforced by tests/lib/families.test.ts
// "gives every family a distinct colour" — the whole reason this map exists,
// see the FIX comment there).
//
// No family borrows a SIGNAL colour (2026-09-11 review, user decision). Trend
// was drawn in `severe`, breakout in `positive` (gain green), carry in
// `warning` (alert amber): a badge read as a verdict on the bot.
//
// The nine below are the palette of the 2026-09-11 reading pass (user
// decision, applied 2026-09-12). All nine are literal hexes now:
// `price-action` used to map to `var(--accent)`, so that one badge changed
// meaning whenever the accent token moved, and it read as the site's own
// call-to-action colour rather than as a category.
//
// Contrast measured on the two backgrounds the site paints behind a badge,
// #0a0a0a and #111111: trend 7.48 / 7.13, momentum 9.24 / 8.81, breakout
// 8.05 / 7.67, mean-reversion 7.72 / 7.36, price-action 13.27 / 12.66, carry
// 7.27 / 6.94, market-neutral 10.64 / 10.14, stat-arb 5.38 / 5.13, event
// 14.32 / 13.66. tests/lib/families.test.ts RECOMPUTES those ratios and fails
// below 4.5:1, so the figures above cannot drift away from the values.
const COLORS: Record<Family, string> = {
  trend: '#f472b6',
  momentum: '#38bdf8',
  breakout: '#e879f9',
  'mean-reversion': '#94a3b8',
  'price-action': '#c7d2fe',
  carry: '#a78bfa',
  'market-neutral': '#2dd4bf',
  'stat-arb': '#3b82f6',
  event: '#fbcfe8',
}

export function isFamily(value: unknown): value is Family {
  return typeof value === 'string' && (FAMILY_ORDER as readonly string[]).includes(value)
}

// FIX (final whole-branch review, I5): these two used to return `LABELS[f]` /
// `COLORS[f]` bare. `Family` is a compile-time type, and the values reaching
// these functions come from the `bots.family` column — so a family the DB
// carries but this file does not know yielded `undefined`, which React renders
// as an empty badge with no colour, silently, on the home page (src/app/page.tsx
// :174 and :218). Every other bad-data path on this branch fails loudly; this
// one degraded, which is the failure mode that hides.
//
// It cannot be verified from this repo which families are live:
// supabase/migrations/007 still pins three, migration 017 introduces the nine
// below, and this worktree has no credentials to query the table. Throwing is
// what makes that gap visible the first time it matters instead of shipping a
// blank badge to a visitor.
function unmapped(kind: string, f: unknown): never {
  throw new Error(
    `families.ts: no ${kind} for family "${String(f)}". ` +
    'Adding a family is a migration plus an entry in FAMILY_ORDER, LABELS, COLORS and DESCRIPTIONS.',
  )
}

export function familyLabel(f: Family): string {
  return LABELS[f] ?? unmapped('label', f)
}

export function familyColor(f: Family): string {
  return COLORS[f] ?? unmapped('colour', f)
}

// Restored from the deleted StrategiesClient.tsx (see git show 65818d1) after
// Plan 3 Task 4's rewrite of /strategies silently dropped it — nine
// hand-written paragraphs with no other copy anywhere in src/ or content/.
// `Record<Family, …>` for the same reason LABELS/COLORS use it: the compiler
// fails on a missing entry the day a tenth family lands, an array literal
// never would. Em dashes in the original text (three occurrences) were
// replaced with a comma or parentheses to match this repo's no-em-dash rule
// for French copy — the wording is otherwise unchanged.
const DESCRIPTIONS: Record<Family, string> = {
  trend: "Les stratégies de suivi de tendance exploitent les mouvements directionnels du marché. Le bot entre quand la tendance est confirmée et sort quand elle s'affaiblit. Peu de trades, mais un excellent ratio gain/risque quand ils se déclenchent.",
  momentum: "Le momentum mesure la vitesse d'un mouvement plutôt que sa direction de fond. Le bot entre quand l'accélération est nette et ressort dès qu'elle retombe, sans attendre qu'une tendance longue soit installée.",
  breakout: "Détecte quand le prix franchit un niveau clé ou sort d'une zone de consolidation. Ces bots capturent l'élan naissant au début d'un nouveau mouvement.",
  'mean-reversion': "Ces stratégies exploitent les excès de marché : le prix s'est écarté de sa valeur d'équilibre et tend à y revenir. Entrée en contre-tendance, sortie rapide dès la normalisation.",
  'price-action': "Ici le bot lit le graphique lui-même : zones de déséquilibre laissées par un mouvement trop rapide, niveaux retravaillés plusieurs fois, réaction du prix à une zone déjà connue. Aucun indicateur calculé, seulement la structure des bougies.",
  carry: "Les stratégies de portage capturent un rendement récurrent sans pari directionnel. Elles encaissent des taux de financement (delta-neutre) ou exploitent la volatilité dans un range fixe (grille). Le rendement est indépendant de la hausse ou baisse du marché.",
  'market-neutral': "Stratégies neutres au marché : autant de positions longues que courtes, pour ne pas dépendre de la hausse ou de la baisse générale. Le rendement vient de l'écart entre les actifs sélectionnés (les forts contre les faibles) et non de la direction du marché.",
  'stat-arb': "L'arbitrage statistique parie sur le retour d'un écart entre deux actifs qui bougent habituellement ensemble. Le bot achète le retardataire, vend l'autre, et gagne quand l'écart se referme, quel que soit le sens du marché.",
  event: "L'événementiel se déclenche sur un fait daté et connu à l'avance : déblocage de tokens, publication macro, annonce d'un exchange. La position est prise autour de l'événement et refermée une fois son effet absorbé.",
}

export function familyDescription(f: Family): string {
  return DESCRIPTIONS[f]
}

export type Venue =
  | 'binance-spot'
  | 'binance-futures'
  | 'kraken'
  | 'hyperliquid'
  | 'bybit'
  | 'okx'
  | 'oanda'
  | 'cross-venue'

export type BotOrigin = 'engine' | 'manual'
export type RejudgeStatus = 'not_needed' | 'queued' | 'done'
