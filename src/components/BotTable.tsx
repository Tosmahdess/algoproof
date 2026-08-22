// src/components/BotTable.tsx
// Reusable fleet table, transposed verbatim from the home page's desktop table +
// mobile list (src/app/page.tsx ~170-260). Same classes, same helpers — the home stays
// on its own inline markup (controller decision: zero visible-change regression risk),
// this is for the other surfaces that need the same table.
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { familyColor, familyLabel } from '@/lib/families'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample, isCarryFamily, fmtPfDisplay, fmtWinRateDisplay, CARRY_METRIC_TOOLTIP } from '@/lib/display'
import type { BotWithStats } from '@/lib/types'

interface BotTableProps {
  bots: BotWithStats[]
  showTf: boolean
}

export default function BotTable({ bots, showTf }: BotTableProps) {
  return (
    <>
      {/* Mobile : liste classement rapide */}
      <div className="md:hidden rounded border border-border overflow-hidden divide-y divide-border mb-6">
        {bots.map((bot, i) => {
          const hasData = bot.stats.total_trades > 0
          const eur     = pnlEur(bot.stats.latest_capital, bot.start_capital)
          const pct     = pnlPct(bot.stats.latest_capital, bot.start_capital)
          return (
            <Link key={bot.id} href={`/strategies/bot/${bot.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card/40 transition-colors">
              <span className="text-xs text-muted font-mono w-6 flex-shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{bot.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: familyColor(bot.family) }}>
                    {familyLabel(bot.family)}
                  </span>
                  {showTf && <span className="text-[10px] text-muted">{bot.timeframe}</span>}
                  {hasData && <span className="text-[10px] text-muted">{bot.stats.total_trades} trades</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {hasData ? (
                  <>
                    <p className={`text-sm font-bold font-mono ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(eur)}</p>
                    <p className={`text-[10px] font-mono ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pct)}</p>
                  </>
                ) : <span className="text-xs text-muted">—</span>}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop : table complète */}
      <div className="hidden md:block rounded border border-border overflow-hidden mb-6">
        <table className="w-full text-xs">
          <thead className="bg-card">
            <tr className="text-muted text-[10px] uppercase tracking-widest border-b border-border">
              <th className="px-4 py-3 text-left">Stratégie</th>
              <th className="px-4 py-3 text-left">Famille</th>
              {showTf && <th className="px-4 py-3 text-left">TF</th>}
              <th className="px-4 py-3 text-right">Trades</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">T. gain</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">F. profit</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Drawdown</th>
              <th className="px-4 py-3 text-right font-bold">P&amp;L (€)</th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {bots.map(bot => {
              const hasData = bot.stats.total_trades > 0
              return (
                <tr key={bot.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/strategies/bot/${bot.slug}`} className="font-medium hover:text-positive transition-colors">{bot.name}</Link>
                    <p className="text-muted text-[10px] mt-0.5">{bot.exchange} · {bot.timeframe}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: familyColor(bot.family) }}>
                      {familyLabel(bot.family)}
                    </span>
                  </td>
                  {showTf && (
                    <td className="px-4 py-3">{bot.timeframe}</td>
                  )}
                  <td className="px-4 py-3 text-right font-mono">
                    {hasData ? (
                      <span className={isLowSample(bot.stats.total_trades) ? 'text-warning/90' : ''}
                        title={isLowSample(bot.stats.total_trades) ? 'Échantillon faible (<20 trades) : métriques peu fiables' : undefined}>
                        {bot.stats.total_trades}{isLowSample(bot.stats.total_trades) && ' ⚠'}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono hidden lg:table-cell"
                    title={hasData && isCarryFamily(bot.family) ? CARRY_METRIC_TOOLTIP : undefined}
                  >
                    {hasData ? fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate) : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono hidden lg:table-cell ${hasData && !isCarryFamily(bot.family) ? (bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative') : ''}`}
                    title={hasData && isCarryFamily(bot.family) ? CARRY_METRIC_TOOLTIP : undefined}
                  >
                    {hasData ? fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-negative hidden lg:table-cell">
                    {hasData ? `${(bot.stats.max_drawdown * 100).toFixed(1)}%` : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasData ? (
                      <div>
                        <span className={`font-mono font-bold ${pnlEur(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(pnlEur(bot.stats.latest_capital, bot.start_capital))}</span>
                        <span className={`block text-[10px] font-mono ${pnlPct(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pnlPct(bot.stats.latest_capital, bot.start_capital))}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={bot.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
