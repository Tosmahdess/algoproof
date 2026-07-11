import { BotStats } from '@/lib/types'
import { fmtPfDisplay, fmtWinRateDisplay } from '@/lib/display'
import { isLowSample } from '@/lib/display'

interface Metric { label: string; value: string; positive?: boolean }

function MetricCell({ label, value, positive }: Metric) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className={`font-mono font-semibold text-base ${positive === undefined ? 'text-white' : positive ? 'text-positive' : 'text-negative'}`}>
        {value}
      </span>
    </div>
  )
}

export default function MetricsRow({ stats, family }: { stats: BotStats; family?: string | null }) {
  const pfText = fmtPfDisplay(family, stats.total_trades, stats.profit_factor)
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-card rounded-lg border border-border">
        <MetricCell label="Taux de gain"      value={fmtWinRateDisplay(family, stats.total_trades, stats.win_rate)} />
        <MetricCell label="Facteur de profit" value={pfText} positive={pfText !== '—' && stats.profit_factor > 1} />
        <MetricCell label="Drawdown max"      value={`${(stats.max_drawdown * 100).toFixed(1)}%`} positive={false} />
        <MetricCell label="Trades"            value={String(stats.total_trades)} />
      </div>
      {isLowSample(stats.total_trades) && (
        <p className="text-xs text-yellow-400/90 mt-2">
          ⚠ Échantillon faible ({stats.total_trades} trades, &lt;20) — taux de gain et facteur de profit encore peu fiables.
        </p>
      )}
    </div>
  )
}
