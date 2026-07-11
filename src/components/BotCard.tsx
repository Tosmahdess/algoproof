import Link from 'next/link'
import { BotWithStats, BotStats } from '@/lib/types'
import { fmtPfDisplay, fmtWinRateDisplay } from '@/lib/display'
import StatusBadge from './StatusBadge'
import AlsoLiveBadge from './AlsoLiveBadge'
import SyncBadge from './SyncBadge'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample } from '@/lib/display'

export default function BotCard({ bot, statsOverride }: { bot: BotWithStats; statsOverride?: BotStats }) {
  const stats   = statsOverride ?? bot.stats
  const pct     = pnlPct(stats.latest_capital, bot.start_capital)
  const eur     = pnlEur(stats.latest_capital, bot.start_capital)
  const hasData = stats.total_trades > 0

  return (
    <Link href={`/strategies/${bot.slug}`} className="block group">
      <div className="bg-card border border-border rounded-xl p-5 hover:border-muted/50 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white group-hover:text-positive transition-colors">{bot.name}</h3>
            <p className="text-xs text-muted mt-0.5">{bot.strategy}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={bot.status} />
            <AlsoLiveBadge slug={bot.slug} status={bot.status} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'T. gain',   value: hasData ? fmtWinRateDisplay(bot.family, stats.total_trades, stats.win_rate) : '—' },
            { label: 'F. profit', value: hasData ? fmtPfDisplay(bot.family, stats.total_trades, stats.profit_factor) : '—' },
            { label: 'Drawdown',  value: hasData ? `${(stats.max_drawdown * 100).toFixed(1)}%` : '—' },
            { label: 'Trades',    value: hasData ? String(stats.total_trades) : '—' },
          ].map(m => (
            <div key={m.label} className="bg-bg rounded-lg p-2 text-center">
              <div className="text-xs text-muted">{m.label}</div>
              <div className="font-mono font-semibold text-sm mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        {hasData && isLowSample(stats.total_trades) && (
          <p className="text-xs text-yellow-400/90 mb-3 -mt-1">
            ⚠ Échantillon faible (&lt;20 trades) — métriques peu fiables
          </p>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{bot.exchange} · {bot.timeframe}</span>
          {hasData ? (
            <div className="text-right">
              <span className={`font-mono font-bold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                {fmtEur(eur)}
              </span>
              <span className={`font-mono text-xs ml-1 ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                ({fmtPct(pct)})
              </span>
            </div>
          ) : (
            <span className="text-muted text-xs">Pas encore de trades</span>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border/40">
          <SyncBadge lastSyncAt={bot.last_sync_at} />
        </div>
      </div>
    </Link>
  )
}
