import Link from 'next/link'
import { BotWithStats } from '@/lib/types'
import StatusBadge from './StatusBadge'
import SyncBadge from './SyncBadge'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'

export default function BotCard({ bot }: { bot: BotWithStats }) {
  const { stats } = bot
  const pct     = pnlPct(stats.latest_capital)
  const eur     = pnlEur(stats.latest_capital)
  const hasData = stats.total_trades > 0

  return (
    <Link href={`/strategies/${bot.slug}`} className="block group">
      <div className="bg-card border border-border rounded-xl p-5 hover:border-muted/50 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white group-hover:text-positive transition-colors">{bot.name}</h3>
            <p className="text-xs text-muted mt-0.5">{bot.strategy}</p>
          </div>
          <StatusBadge status={bot.status} />
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'T. gain',   value: hasData ? `${(stats.win_rate * 100).toFixed(1)}%` : '—' },
            { label: 'F. profit', value: hasData ? stats.profit_factor.toFixed(2) : '—' },
            { label: 'Drawdown',  value: hasData ? `${(stats.max_drawdown * 100).toFixed(1)}%` : '—' },
            { label: 'Trades',    value: hasData ? String(stats.total_trades) : '—' },
          ].map(m => (
            <div key={m.label} className="bg-bg rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted">{m.label}</div>
              <div className="font-mono font-semibold text-sm mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{bot.exchange} · {bot.timeframe}</span>
          {hasData ? (
            <div className="text-right">
              <span className={`font-mono font-bold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                {fmtEur(eur)}
              </span>
              <span className={`font-mono text-[10px] ml-1 ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                ({fmtPct(pct)})
              </span>
            </div>
          ) : (
            <span className="text-muted text-[10px]">Pas encore de trades</span>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border/40">
          <SyncBadge lastSyncAt={bot.last_sync_at} />
        </div>
      </div>
    </Link>
  )
}
