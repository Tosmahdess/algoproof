// French labels for the raw machine-readable enums the Market Intelligence
// service returns (regime, sentiment_regime, market_bias, trend_regime, and
// trade exit reasons). Never render one of these fields raw in the UI:
// always go through the matching *Fr() helper below so a reader sees French
// words instead of an API enum. Unmapped values fall back to '—'.

export const REGIME_LABEL_FR: Record<string, string> = {
  GREEN:  'calme',
  YELLOW: 'tendu',
  ORANGE: 'alerte',
  RED:    'sous tension',
}

export const SENTIMENT_LABEL_FR: Record<string, string> = {
  EXTREME_FEAR:  'peur extrême',
  FEAR:          'peur',
  NEUTRAL:       'neutre',
  GREED:         'avidité',
  EXTREME_GREED: 'avidité extrême',
}

export const BIAS_LABEL_FR: Record<string, string> = {
  LONG_ONLY:  'longs uniquement',
  SHORT_ONLY: 'shorts uniquement',
  BOTH:       'les deux sens',
  BLOCKED:    'entrées bloquées',
}

// trend_regime (MiSnapshot) is BULL | TRANSITION | BEAR. The daily macro
// report reuses BULL / BEAR with NEUTRAL instead of TRANSITION, so both are
// covered here rather than duplicating a near-identical map.
export const TREND_LABEL_FR: Record<string, string> = {
  BULL:       'haussière',
  TRANSITION: 'transition',
  BEAR:       'baissière',
  NEUTRAL:    'neutre',
}

// Trade exit reasons that don't already have a short badge label elsewhere
// (see TradesTable's REASON_MAP for the badge variants of the same codes).
export const REASON_LABEL_FR: Record<string, string> = {
  time_exit:          'sortie temporelle',
  take_profit_1:      'TP1',
  take_profit_2:      'TP2',
  trailing_stop:      'trailing stop',
  breakeven_stop:     'stop à breakeven',
  stop_loss_initial:  'stop loss initial',
  stop_loss:          'stop loss',
  sar_reversal:       'retournement SAR',
  signal_reversal:    'retournement de signal',
  kill_switch:        'coupe-circuit',
  manual:             'manuel',
}

const FALLBACK = '—'

export function regimeFr(v: string | null | undefined): string {
  return (v && REGIME_LABEL_FR[v]) || FALLBACK
}

export function sentimentFr(v: string | null | undefined): string {
  return (v && SENTIMENT_LABEL_FR[v]) || FALLBACK
}

export function biasFr(v: string | null | undefined): string {
  return (v && BIAS_LABEL_FR[v]) || FALLBACK
}

export function trendFr(v: string | null | undefined): string {
  return (v && TREND_LABEL_FR[v]) || FALLBACK
}

// Generic snake_case reason -> readable French. Falls back to turning
// underscores into spaces rather than printing the raw machine code.
export function reasonFr(v: string | null | undefined): string {
  if (!v) return FALLBACK
  return REASON_LABEL_FR[v] ?? v.replace(/_/g, ' ')
}
