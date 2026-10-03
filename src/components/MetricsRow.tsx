// The four figures of a bot sheet (lot 5 of the design audit, 2026-09-25, conception
// §5.6), label muted, figure in tabular figures.
//
// Refonte « Le registre des décisions », lot 3 (2026-10-02): the figures are a register
// row with rules between them, no tile on a card (nested cards are out), and the labels
// are words. Two rules from the audit of 2026-10:
// - constat 30: on the fiche the drawdown is coloured by its published limit, through
//   `drawdownTone`, or not at all; the old default (red as soon as it is not 0,0 %) is
//   kept for any caller that does not pass one;
// - constat 6: without a trade, every ratio is « — » and nothing is coloured.
import { BotStats } from '@/lib/types'
import { drawdownIsLoss, fmtDrawdown, fmtPfDisplay, fmtWinRateDisplay } from '@/lib/display'
import { isLowSample } from '@/lib/display'

/** How the fiche wants its drawdown painted: by its threshold (breach, watch), or
 *  neutral (held, or no threshold published). */
export type DrawdownTone = 'breach' | 'watch' | 'neutral'

interface Metric { label: string; value: string; tone?: 'loss' | 'warn' | 'gain' }

const TONE = { loss: 'text-negative', warn: 'text-warning', gain: 'text-foreground' } as const

function Figure({ label, value, tone }: Metric) {
  return (
    <div data-testid="stat-tile" className="py-3 pr-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular-nums text-xl leading-tight mt-1 ${tone ? TONE[tone] : 'text-foreground'}`}>
        {value}
      </dd>
    </div>
  )
}

export default function MetricsRow({ stats, family, drawdownTone }: {
  stats: BotStats
  family?: string | null
  drawdownTone?: DrawdownTone
}) {
  const traded = stats.total_trades > 0
  const pfText = traded ? fmtPfDisplay(family, stats.total_trades, stats.profit_factor) : '—'
  const ddTone: Metric['tone'] = !traded ? undefined
    : drawdownTone === undefined ? (drawdownIsLoss(stats.max_drawdown) ? 'loss' : undefined)
    : drawdownTone === 'breach' ? 'loss' : drawdownTone === 'watch' ? 'warn' : undefined
  return (
    <div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 border-y border-border">
        <Figure label="Taux de gain" value={traded ? fmtWinRateDisplay(family, stats.total_trades, stats.win_rate) : '—'} />
        <Figure label="Facteur de profit" value={pfText} tone={pfText !== '—' && stats.profit_factor > 1 ? 'gain' : pfText !== '—' ? 'loss' : undefined} />
        <Figure label="Pire baisse" value={traded ? fmtDrawdown(stats.max_drawdown) : '—'} tone={ddTone} />
        <Figure label="Trades" value={String(stats.total_trades)} />
      </dl>
      {isLowSample(stats.total_trades) && (
        <p className="text-xs text-warning mt-2">
          {`Échantillon faible (${stats.total_trades} trades, moins de 20) : taux de gain et facteur de profit encore peu fiables.`}
        </p>
      )}
    </div>
  )
}
