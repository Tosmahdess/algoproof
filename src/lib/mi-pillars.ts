// The four pillars of the market weather (/intelligence), in ONE list.
//
// Refonte « Le registre des décisions », page Météo (2026-10-03; audit 2026-10, n° 9 and
// n° 46). The pillars were declared three times (badge, chart, page), under two names for
// the same notion (« News » on the chart, « Actualités » elsewhere), each with a colour
// taken from the status tokens: sentiment wore `severe`, news wore `positive`, so a
// positive sentiment read red and a negative news score read green. A pillar carries no
// colour here: it is a name, a weight and what it follows. On the chart it is drawn in
// the link blue, one at a time beside the ink of the global score, never with a gain or
// loss token, and its sign is always written.
//
// The substance of the weather is frozen (arbitration of 2026-09-17): the weights and
// the method sentences are the ones the page already published, reworded in French
// without the service's own names (MI, APEX, « news », « open interest »).
import type { MiSnapshot } from '@/lib/types'
import { frNumber, MINUS } from '@/lib/display'

export type PillarKey = 'sentiment_score' | 'derivatives_score' | 'news_score' | 'macro_score'

export interface MiPillar {
  id: string
  key: PillarKey & keyof MiSnapshot
  /** One French word per notion, the same on every surface of the page. */
  label: string
  /** Share of the global score, in percent. */
  weight: number
  /** What the pillar follows, in one short phrase for the register. */
  follows: string
  functional: string
  technical: string
}

// The 'institutional' pillar (DVOL/ETF flows) had its scoring retired server-side on
// 2026-06-26: institutional_score is always null since, and it is not listed.
export const MI_PILLARS: readonly MiPillar[] = [
  {
    id: 'sentiment',
    key: 'sentiment_score',
    label: 'Sentiment',
    weight: 30,
    follows: 'La peur ou l’avidité des acheteurs de crypto.',
    functional:
      'Suit la peur et l’avidité du marché en temps réel. Quand les traders sont dans la peur extrême, c’est souvent un signal d’alarme. Quand ils sont euphoriques, le risque augmente. Ce pilier mesure l’état émotionnel de la foule.',
    technical:
      'Indice Fear & Greed (0 à 100), ramené sur une échelle de −100 à +100. Actualisé toutes les 30 min. Il donne l’état du sentiment : peur extrême, peur, neutre, avidité, avidité extrême.',
  },
  {
    id: 'derivatives',
    key: 'derivatives_score',
    label: 'Dérivés',
    weight: 40,
    follows: 'Le levier pris sur les contrats à terme crypto.',
    functional:
      'Surveille le marché des contrats à terme crypto en temps réel. Les taux de financement, les positions ouvertes et les liquidations révèlent quand l’effet de levier est dangereusement élevé, précurseur classique des corrections violentes.',
    technical:
      'Binance Futures : taux de financement (8 h) × 40 % + rapport entre acheteurs et vendeurs, lu à contre-courant, × 35 % + variation des positions ouvertes × 25 %. Flux des liquidations (60 s) : ajustement de ±20 points au-delà de 10 M$ par heure. Paires : BTC, ETH, SOL.',
  },
  {
    id: 'news',
    key: 'news_score',
    label: 'Actualités',
    weight: 5,
    follows: 'Les titres de la presse crypto et internationale.',
    functional:
      'Analyse les titres financiers en continu. Un événement négatif majeur (piratage d’une plateforme, répression réglementaire, choc macro) peut bouger les marchés plus vite que n’importe quel indicateur. Je surveille les actualités pour que les bots n’entrent pas dans la tempête.',
    technical:
      'Flux RSS : 3 sources crypto (CoinDesk, Decrypt, Cointelegraph) et 4 sources internationales (Reuters, BBC, NYT, Al Jazeera). Chaque titre vaut jusqu’à ±15 points selon ses mots-clés, puis s’efface en quelques heures (décroissance exponentielle, constante de 2 h). Plus de 20 000 titres archivés.',
  },
  {
    id: 'macro',
    key: 'macro_score',
    label: 'Macro',
    weight: 25,
    follows: 'La volatilité des actions, le dollar et le crédit.',
    functional:
      'Surveille les conditions macroéconomiques : volatilité des marchés actions (VIX), force du dollar américain (DXY), et événements à venir comme les décisions de la Fed ou l’inflation américaine. La crypto n’existe pas en vase clos.',
    technical:
      'Base : VIX et DXY sur 5 jours. Ajustements : structure par terme du VIX, écarts de crédit (HYG contre IEI), rapport puts sur calls du SPY, achats des dirigeants déclarés à la SEC, résultats d’entreprises au-dessus des attentes, révisions des analystes, ventes à découvert, flux d’options sur SPY et QQQ. Calendrier d’événements suivi à titre informatif : les fenêtres de blocage avant les annonces ont été retirées le 23/07/2026 (contre-productives sur un rejeu de 2 ans).',
  },
]

/** The scale of every score on the page. */
export const SCORE_MIN = -100
export const SCORE_MAX = 100

/** The bots enter while the global score stays above this floor (and the VIX at or under VIX_CEILING). */
export const ENTRY_FLOOR = -30
export const VIX_CEILING = 30

/** A score with its sign in the text: « +48,0 », « −6,1 », « 0,0 », « — » when absent. */
export function scoreText(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const body = frNumber(n, 1)
  if (Number(Math.abs(n).toFixed(1)) === 0) return body
  return `${n < 0 ? MINUS : '+'}${body}`
}

/** A signed integer for the axis and the thresholds: « −30 », « +30 », « 0 ». */
export function signedInt(n: number): string {
  if (n === 0) return '0'
  return `${n < 0 ? MINUS : '+'}${frNumber(n, 0)}`
}

/** « sur une échelle de −100 à +100 »: the scale is written beside every score. */
export function scaleText(): string {
  return `sur une échelle de ${signedInt(SCORE_MIN)} à ${signedInt(SCORE_MAX)}`
}

/** The sides a bot may take today, in words; null when the snapshot does not say. */
export function allowedSides(long: boolean | null | undefined, short: boolean | null | undefined): string | null {
  if (long == null || short == null) return null
  if (long && short) return 'à la hausse et à la baisse'
  if (long) return 'à la hausse seulement'
  if (short) return 'à la baisse seulement'
  return 'aucun'
}
