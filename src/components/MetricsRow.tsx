// The four figures of a bot sheet as tiles (lot 5 of the design audit,
// 2026-09-25, conception §5.6): label muted, figure in mono, on the card-2
// surface. Green and red stay data only: PF above 1, a drawdown that is a loss.
import { BotStats } from '@/lib/types'
import { drawdownIsLoss, fmtDrawdown, fmtPfDisplay, fmtWinRateDisplay } from '@/lib/display'
import { isLowSample } from '@/lib/display'

interface Metric { label: string; value: string; positive?: boolean }

function StatTile({ label, value, positive }: Metric) {
  return (
    <div data-testid="stat-tile" className="bg-card-2 rounded-md px-3 py-2.5">
      <span className="block text-xs text-muted">{label}</span>
      <span className={`block font-mono font-medium text-lg leading-tight mt-0.5 ${positive === undefined ? 'text-foreground' : positive ? 'text-positive' : 'text-negative'}`}>
        {value}
      </span>
    </div>
  )
}

export default function MetricsRow({ stats, family }: { stats: BotStats; family?: string | null }) {
  const pfText = fmtPfDisplay(family, stats.total_trades, stats.profit_factor)
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-card rounded-lg border border-border">
        <StatTile label="WR" value={fmtWinRateDisplay(family, stats.total_trades, stats.win_rate)} />
        <StatTile label="PF" value={pfText} positive={pfText !== '—' && stats.profit_factor > 1} />
        {/* Red only when there is a drawdown to show; « 0,0 % » is neutral (display.ts). */}
        <StatTile label="DD" value={fmtDrawdown(stats.max_drawdown)} positive={drawdownIsLoss(stats.max_drawdown) ? false : undefined} />
        <StatTile label="Trades" value={String(stats.total_trades)} />
      </div>
      {isLowSample(stats.total_trades) && (
        <p className="text-xs text-warning/90 mt-2">
          Échantillon faible ({stats.total_trades} trades, moins de 20) : taux de gain et facteur de profit encore peu fiables.
        </p>
      )}
    </div>
  )
}
