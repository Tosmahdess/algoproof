// src/components/BotTable.tsx
// The fleet table, shared by /overview and the strategy pages. Lot 4 of the
// design audit (2026-09-25, conception §5.2 and §6.3): a 30-day sparkline per row
// when the row brings one (`spark30`, windowed server-side), no rank (« #1 » was
// a ranking on the page whose thesis is that a ranking proves nothing), and on a
// phone a row is name · status · % · three metrics, never a compressed table.
import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import Sparkline from '@/components/Sparkline'
import { familyLabel } from '@/lib/families'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample, isCarryFamily, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss, CARRY_METRIC_TOOLTIP } from '@/lib/display'
import type { FleetBot } from '@/lib/types'

interface BotTableProps {
  // FleetBot, not BotWithStats: this table reads `stats`, `start_capital`,
  // `family`, `slug`, `name`, `status`, `timeframe` and `spark30` and nothing
  // else, and a BotWithStats satisfies it structurally.
  bots: FleetBot[]
  showTf: boolean
}

export default function BotTable({ bots, showTf }: BotTableProps) {
  const withSpark = bots.some(b => (b.spark30?.length ?? 0) >= 2)
  return (
    <>
      {/* Phone: one row per bot, the regime word before the figure (audit 2026-09-09). */}
      <div className="md:hidden rounded-lg border border-border overflow-hidden divide-y divide-border mb-6">
        {bots.map(bot => {
          const hasData = bot.stats.total_trades > 0
          const pct     = pnlPct(bot.stats.latest_capital, bot.start_capital)
          return (
            <Link key={bot.id} href={`/strategies/bot/${bot.slug}`} className={linkClass('record', 'flex flex-col gap-1 px-4 py-3 min-h-10')}>
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm leading-snug line-clamp-2">{bot.name}</span>
                <StatusBadge status={bot.status} />
                {hasData
                  ? <span className={`shrink-0 font-mono text-sm font-medium ${pct < 0 ? 'text-negative' : 'text-positive'}`}>{fmtPct(pct)}</span>
                  : <span className="shrink-0 text-xs text-muted">—</span>}
              </span>
              <span className="text-xs text-muted font-mono">
                {familyLabel(bot.family)}{showTf && ` · ${bot.timeframe}`}
                {hasData ? (
                  <>
                    {` · ${bot.stats.total_trades} trades · PF ${fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)} · `}
                    <span className={drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : undefined}>DD {fmtDrawdown(bot.stats.max_drawdown)}</span>
                  </>
                ) : ' · pas encore de trade'}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Desktop: the full table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden mb-6">
        <table className="w-full text-xs">
          <thead className="bg-card">
            <tr className="text-xs font-semibold uppercase tracking-wider text-muted border-b border-border">
              <th className="px-4 py-3 text-left">Stratégie</th>
              <th className="px-4 py-3 text-left">Famille</th>
              {showTf && <th className="px-4 py-3 text-left">TF</th>}
              <th className="px-4 py-3 text-right">Trades</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">WR</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">PF</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">DD</th>
              <th className="px-4 py-3 text-right font-bold">P&amp;L (€)</th>
              <th className="px-4 py-3 text-center">Statut</th>
              {withSpark && <th className="px-4 py-3 text-left hidden lg:table-cell">30 j</th>}
            </tr>
          </thead>
          <tbody>
            {bots.map(bot => {
              const hasData = bot.stats.total_trades > 0
              const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
              return (
                <tr key={bot.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record')}>{bot.name}</Link>
                    <p className="text-muted text-xs mt-0.5">{bot.exchange}{!showTf && ` · ${bot.timeframe}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted">
                      {familyLabel(bot.family)}
                    </span>
                  </td>
                  {showTf && (
                    <td className="px-4 py-3 font-mono">{bot.timeframe}</td>
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
                  <td className={`px-4 py-3 text-right font-mono hidden lg:table-cell ${hasData && drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : ''}`}>
                    {hasData ? fmtDrawdown(bot.stats.max_drawdown) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasData ? (
                      <div>
                        <span className={`font-mono font-bold ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(eur)}</span>
                        <span className={`block text-xs font-mono ${pnlPct(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pnlPct(bot.stats.latest_capital, bot.start_capital))}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={bot.status} />
                  </td>
                  {withSpark && (
                    // The line inherits the colour of the gain (currentColor): decoration
                    // for scanning, the figures on the row carry the facts.
                    <td data-testid="bot-spark" className={`px-4 py-2 hidden lg:table-cell ${eur < 0 ? 'text-negative' : 'text-positive'}`}>
                      {bot.spark30 && bot.spark30.length >= 2 && <Sparkline values={bot.spark30} width={88} height={20} />}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
