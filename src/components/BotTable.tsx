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
import { FavoriteStar } from '@/components/FavoritesProvider'
import { FollowBell } from '@/components/FollowsProvider'
import { familyLabel } from '@/lib/families'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample, isCarryFamily, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss, CARRY_METRIC_TOOLTIP } from '@/lib/display'
import type { FleetBot } from '@/lib/types'

interface BotTableProps {
  // FleetBot, not BotWithStats: this table reads `stats`, `start_capital`,
  // `family`, `slug`, `name`, `status`, `timeframe` and `spark30` and nothing
  // else, and a BotWithStats satisfies it structurally.
  bots: FleetBot[]
  showTf: boolean
  /** The fleet register, under the fleet total: say what that total counts. */
  fleetTotalAbove?: boolean
}

// A bot under LOW_SAMPLE_TRADES shares the table with the proven ones since
// 2026-09-30; this word is what keeps its PF from reading as a result.
function RodageTag() {
  return (
    <span className="text-xs text-warning/90" title="Échantillon faible : trop tôt pour conclure">
      rodage
    </span>
  )
}

export default function BotTable({ bots, showTf, fleetTotalAbove = false }: BotTableProps) {
  // D073: an engine bot's row is its simulation since the freeze on a 1 000 EUR base,
  // while its fiche shows it on the curve's level. Said once, only where it applies.
  const hasEngineBot = bots.some(b => b.slug.startsWith('arm-'))
  const withSpark = bots.some(b => (b.spark30?.length ?? 0) >= 2)
  return (
    <div className="bot-table min-w-0">
      {/* Phone: one row per bot, the regime word before the figure (audit 2026-09-09). */}
      <div className="bot-table-mobile rounded-lg border border-border overflow-hidden divide-y divide-border mb-6">
        {bots.map(bot => {
          const hasData = bot.stats.total_trades > 0
          const pct     = pnlPct(bot.stats.latest_capital, bot.start_capital)
          return (
            // The star and the bell sit NEXT to the row's link, never inside it:
            // a button in an anchor is two controls in one. Each renders only
            // under its provider (espace-direct lots C and H).
            <div key={bot.id} className="relative">
            <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record', 'flex flex-col gap-1 px-4 py-3 pr-24 min-h-10')}>
              <span className="text-sm leading-snug">{bot.name}</span>
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <StatusBadge status={bot.status} />
                  {hasData && isLowSample(bot.stats.total_trades) && <RodageTag />}
                </span>
                {hasData
                  ? <span className={`shrink-0 tabular-nums text-sm font-medium ${pct < 0 ? 'text-negative' : 'text-positive'}`}>{fmtPct(pct)}</span>
                  : <span className="shrink-0 text-xs text-muted">—</span>}
              </span>
              <span className="text-xs text-muted tabular-nums">
                {familyLabel(bot.family)}{showTf && ` · ${bot.timeframe}`}
                {hasData ? (
                  <>
                    {` · ${bot.stats.total_trades} ${bot.stats.total_trades > 1 ? 'trades' : 'trade'} · PF ${fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)} · `}
                    <span className={drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : undefined}>DD {fmtDrawdown(bot.stats.max_drawdown)}</span>
                  </>
                ) : ' · pas encore de trade'}
              </span>
            </Link>
            <span className="absolute right-2 top-1.5 flex">
              <FollowBell slug={bot.slug} name={bot.name} />
              <FavoriteStar kind="bot" slug={bot.slug} name={bot.name} />
            </span>
            </div>
          )
        })}
      </div>

      {/* Desktop: the full table */}
      <div className="bot-table-desktop rounded-lg border border-border overflow-x-auto mb-6">
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
                    <span className="inline-flex items-center gap-1">
                      <FavoriteStar kind="bot" slug={bot.slug} name={bot.name} />
                      <FollowBell slug={bot.slug} name={bot.name} />
                      <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record')}>{bot.name}</Link>
                    </span>
                    <p className="text-muted text-xs mt-0.5">
                      {bot.exchange}{!showTf && ` · ${bot.timeframe}`}
                      {hasData && isLowSample(bot.stats.total_trades) && <>{' · '}<RodageTag /></>}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted">
                      {familyLabel(bot.family)}
                    </span>
                  </td>
                  {showTf && (
                    <td className="px-4 py-3 tabular-nums">{bot.timeframe}</td>
                  )}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {hasData ? (
                      <span className={isLowSample(bot.stats.total_trades) ? 'text-warning/90' : ''}
                        title={isLowSample(bot.stats.total_trades) ? 'Échantillon faible (<20 trades) : métriques peu fiables' : undefined}>
                        {bot.stats.total_trades}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums hidden lg:table-cell"
                    title={hasData && isCarryFamily(bot.family) ? CARRY_METRIC_TOOLTIP : undefined}
                  >
                    {hasData ? fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate) : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums hidden lg:table-cell ${hasData && !isCarryFamily(bot.family) ? (bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative') : ''}`}
                    title={hasData && isCarryFamily(bot.family) ? CARRY_METRIC_TOOLTIP : undefined}
                  >
                    {hasData ? fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor) : <span className="text-muted">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums hidden lg:table-cell ${hasData && drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : ''}`}>
                    {hasData ? fmtDrawdown(bot.stats.max_drawdown) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasData ? (
                      <div>
                        <span className={`tabular-nums font-bold ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(eur)}</span>
                        <span className={`block text-xs tabular-nums ${pnlPct(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pnlPct(bot.stats.latest_capital, bot.start_capital))}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={bot.status} />
                  </td>
                  {withSpark && (
                    // The line is drawn in the note colour (refonte « registre », lot 4):
                    // coloured by the result since the start, it painted a 30-day rise
                    // red (audit 2026-10, n° 6 and 8). No line at all without a trade.
                    <td data-testid="bot-spark" className="px-4 py-2 hidden lg:table-cell text-muted">
                      {hasData && bot.spark30 && bot.spark30.length >= 2 && <Sparkline values={bot.spark30} width={88} height={20} />}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasEngineBot && (
        <p className="text-xs text-muted mt-2">
          Bots moteur : chiffres de leur simulation depuis la fin des données qui ont servi à
          les sélectionner, trades rejoués compris, en euros pour 1 000 € de départ. Leur fiche
          montre la même simulation sur le capital atteint par sa courbe, d&apos;où des euros un
          peu différents.
          {fleetTotalAbove && ' Le total « Simulation » en haut de page ne compte, lui, que les trades enregistrés depuis le lancement de chaque bot.'}
        </p>
      )}
    </div>
  )
}
