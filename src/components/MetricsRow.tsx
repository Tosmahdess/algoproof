import { BotStats } from '@/lib/types'

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

export default function MetricsRow({ stats }: { stats: BotStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-card rounded-lg border border-border">
      <MetricCell label="Win Rate"      value={`${(stats.win_rate * 100).toFixed(1)}%`} />
      <MetricCell label="Profit Factor" value={stats.profit_factor.toFixed(2)} positive={stats.profit_factor > 1} />
      <MetricCell label="Max Drawdown"  value={`${(stats.max_drawdown * 100).toFixed(1)}%`} positive={false} />
      <MetricCell label="Trades"        value={String(stats.total_trades)} />
    </div>
  )
}
