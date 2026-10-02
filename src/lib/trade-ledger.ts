// The trade register of a bot fiche (refonte « Le registre des décisions », lot 3).
// The site's promise is that a reader can redo the addition: every row carries the
// trade's result and the cumul after it, and the cumul is the WHOLE history's, from the
// starting capital, never rebuilt from the rows a filter left on screen (Astra, 02/10).
import { reasonFr } from './regime-labels'

type Ledgered = { id: string; closed_at: string; pnl: number }

/** Cumul after each trade: the starting capital plus every result, in the order the
 *  trades closed. Computed on the complete history from the exact amounts, each cumul
 *  rounded to the cent only when it is read: rounding every result first drifted by a
 *  few cents over 42 trades (1 272,76 € under a published 1 272,73 €). Trades closing at
 *  the same instant keep their order from the newest-first list (the older one first). */
export function cumulativeAfterEach(trades: Ledgered[], startCapital: number): Map<string, number> {
  const chronological = [...trades].reverse()
    .sort((a, b) => Date.parse(a.closed_at) - Date.parse(b.closed_at))
  const out = new Map<string, number>()
  let running = startCapital
  for (const t of chronological) {
    running += t.pnl
    out.set(t.id, Math.round(running * 100) / 100)
  }
  return out
}

/** Sum of the results, from the exact amounts, rounded to the cent. */
export function sumOfResults(trades: { pnl: number }[]): number {
  return Math.round(trades.reduce((s, t) => s + t.pnl, 0) * 100) / 100
}

// Exit codes as the bots write them (stop_loss, SL, sl_hit… for the same thing), in
// words a reader does not have to decode (audit 2026-10, section 10).
const REASON_WORDS: Record<string, string> = {
  stop_loss: 'Stop',
  stop_loss_initial: 'Stop',
  sl: 'Stop',
  sl_hit: 'Stop',
  stop_loss_downtime: 'Stop, après une interruption',
  trailing_stop: 'Stop suiveur',
  breakeven_stop: 'Stop au prix d’entrée',
  take_profit: 'Objectif',
  tp: 'Objectif',
  tp_hit: 'Objectif',
  take_profit_1: 'Objectif 1',
  tp1: 'Objectif 1',
  take_profit_2: 'Objectif 2',
  tp2: 'Objectif 2',
  take_profit_3: 'Objectif 3',
  tp3: 'Objectif 3',
  sar_reversal: 'Retournement du SAR',
  signal_reversal: 'Signal inverse',
  time_exit: 'Durée maximale atteinte',
  kill_switch: 'Coupe-circuit',
  manual: 'Clôture manuelle',
}

/** An exit reason in words: « Stop », « Objectif 2 », « Stop suiveur ». An unknown code
 *  keeps the generic fallback (underscores read as spaces), an absent one is « — ». */
export function exitReasonWords(reason: string | null | undefined): string {
  if (!reason) return '—'
  const known = REASON_WORDS[reason.trim().toLowerCase()]
  if (known) return known
  const plain = reasonFr(reason)
  return plain.charAt(0).toUpperCase() + plain.slice(1)
}

/** The bot's name in the breadcrumb: the name without the venue, then the venue's first
 *  word. « Croisement EMA H4 Kraken Spot » on Kraken Spot reads « Croisement EMA H4 ·
 *  Kraken ». A name that does not carry its venue is kept whole. */
export function breadcrumbName(name: string, exchange: string): string {
  const venue = exchange.trim()
  if (!venue || !name.includes(venue)) return name
  const rest = name.replace(venue, '').replace(/\s{2,}/g, ' ').trim()
  return rest ? `${rest} · ${venue.split(/\s+/)[0]}` : name
}
