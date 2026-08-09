/**
 * The weekly fleet-impact replay, read for publication on /intelligence.
 *
 * EVERY figure here is derived, including the observation window: nothing about this
 * measurement is typed into copy, because it moves on its own (weekly cron) and a
 * number written by hand becomes false without anyone touching it.
 *
 * And so is the PROSE. Each sentence below whose truth depends on a value is built
 * from that value. A block reading « n'a rien bloqué » beside a counter showing 3 is
 * the same defect as a stale number, only more visible: the reader sees both at once.
 * That is why gatePhrase / regimePhrase / verdictPhrase are functions and not constants,
 * and why each of their branches is tested.
 *
 * Copy rules (redaction-algoproof): French, first person singular, reader is « tu »,
 * no em/en dashes, no machine identifier. Enforced in the test file's `voice` block.
 */
import { supabaseServer } from '@/lib/supabase-server'

export interface FleetImpact {
  windowDays: number
  nPresets: number
  nTrades: number
  nSmallSample: number
  blockedRed: number
  ddBaseline: number // fractions, negative. Formatted once, by pct().
  ddBoth: number
  ddConstant: number
  pnlBoth: number
  pnlConstant: number
}

const DAY = 86_400_000

type Row = {
  window_start: string
  window_end: string
  n_presets: number
  n_trades: number
  n_small_sample: number
  blocked_red: number
  dd_baseline: number | string
  dd_both: number | string
  dd_constant: number | string
  pnl_both: number | string
  pnl_constant: number | string
}

export async function getFleetImpact(): Promise<FleetImpact | null> {
  try {
    const { data, error } = await supabaseServer
      .from('mi_fleet_impact')
      .select(
        'window_start, window_end, n_presets, n_trades, n_small_sample, blocked_red, dd_baseline, dd_both, dd_constant, pnl_both, pnl_constant'
      )
      .order('run_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    const row = data as unknown as Row
    return {
      windowDays: Math.floor((Date.parse(row.window_end) - Date.parse(row.window_start)) / DAY),
      nPresets: row.n_presets,
      nTrades: row.n_trades,
      nSmallSample: row.n_small_sample,
      blockedRed: row.blocked_red,
      ddBaseline: Number(row.dd_baseline),
      ddBoth: Number(row.dd_both),
      ddConstant: Number(row.dd_constant),
      pnlBoth: Number(row.pnl_both),
      pnlConstant: Number(row.pnl_constant),
    }
  } catch {
    // Degrade to nothing, never to a stale or invented claim: the section does not
    // render at all rather than render a figure it cannot source.
    return null
  }
}

/** Fraction to French percent, one decimal, real minus sign (U+2212). */
export function pct(fraction: number): string {
  return `${(fraction * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`.replace(/^-/, '−')
}

/**
 * What the red-regime block did over the window. Reads as a verb phrase, so the
 * renderer can put the subject in front of it.
 */
export function gatePhrase(i: FleetImpact): string {
  if (i.blockedRed === 0) {
    return `n’a rien bloqué du tout : zéro signal refusé sur les ${i.nTrades} trades que j’ai rejoués`
  }
  const noun = i.blockedRed === 1 ? 'signal' : 'signaux'
  return `a bloqué ${i.blockedRed} ${noun} sur les ${i.nTrades} trades que j’ai rejoués`
}

/**
 * The reason there was nothing to block, and it is not a compliment to the gate.
 * Empty as soon as a block occurs, because then the explanation is simply false.
 */
export function regimePhrase(i: FleetImpact): string {
  return i.blockedRed === 0
    ? `, et le rouge n’a pas été traversé une seule fois en ${i.windowDays} jours`
    : ''
}

/**
 * The conclusion, which flips with the measurement. The flat cut has to win on BOTH
 * axes (shallower drawdown AND better P&L) before I concede: a split result proves
 * nothing either way, and I am not going to publish a concession I cannot defend.
 */
export function verdictPhrase(i: FleetImpact): string {
  const controlWins = i.ddConstant > i.ddBoth && i.pnlConstant > i.pnlBoth
  return controlWins
    ? `Sur ces ${i.windowDays} jours, ma météo se comporte comme un frein, et un frein constant aurait mieux fait. Je ne sais donc pas te prouver que le timing sert à quelque chose.`
    : `Sur ces ${i.windowDays} jours, ma météo fait mieux qu’une coupe d’exposition à plat. Un point pour elle. Avec ${i.nTrades} trades, je n’appelle pas encore ça une preuve.`
}
