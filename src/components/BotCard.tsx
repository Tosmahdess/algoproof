import Link from 'next/link'
import { BotWithStats } from '@/lib/types'
import StatusBadge from './StatusBadge'

export default function BotCard({ bot }: { bot: BotWithStats }) {
  const { stats } = bot
  const pnlPct = ((stats.latest_capital - 1000) / 1000) * 100

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

        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: 'T. gain',   value: `${(stats.win_rate * 100).toFixed(1)}%` },
            { label: 'F. profit', value: stats.profit_factor.toFixed(2) },
            { label: 'Drawdown',  value: `${(stats.max_drawdown * 100).toFixed(1)}%` },
          ].map(m => (
            <div key={m.label} className="bg-bg rounded-lg p-2 text-center">
              <div className="text-xs text-muted">{m.label}</div>
              <div className="font-mono font-semibold text-sm mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{bot.exchange} · {bot.timeframe}</span>
          <span className={`font-mono font-semibold ${pnlPct >= 0 ? 'text-positive' : 'text-negative'}`}>
            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  )
}
