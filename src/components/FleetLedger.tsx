// The register of « La flotte » as a ledger (refonte « registre », lot 4,
// 2026-10-02). The mock-up has no fleet page; this takes the grammar of its
// home ledger: rows between rules, three columns, « Bot et marché », « État et
// décision », « Résultat depuis le départ ». One markup for both widths: on a
// phone the row becomes a grid (name across, state left, result right), the
// register is no longer written twice in the HTML (audit 2026-10, n° 43).
//
// What a row never does:
//  - colour a curve by a result it does not show: the 30-day line is drawn in
//    the note colour, and not at all for a bot without a trade (n° 6 and n° 8);
//  - colour anything for a bot without a trade: « — », no figure;
//  - colour a gain: a gain is ink, a loss keeps its colour and its sign (lot 1).
//
// The star and the bell sit NEXT to the row's link, never inside it.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import StatusBadge from '@/components/StatusBadge'
import Sparkline from '@/components/Sparkline'
import { FavoriteStar } from '@/components/FavoritesProvider'
import { FollowBell } from '@/components/FollowsProvider'
import { familyLabel } from '@/lib/families'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample, fmtPfDisplay, fmtDrawdown, frNumber } from '@/lib/display'
import type { LedgerBot } from '@/lib/fleet-ledger'

export const plural = (n: number, one: string, many: string) => `${frNumber(n, 0)} ${n > 1 ? many : one}`

function Row({ bot }: { bot: LedgerBot }) {
  const hasData = bot.stats.total_trades > 0
  const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
  const pct = pnlPct(bot.stats.latest_capital, bot.start_capital)
  const rodage = hasData && isLowSample(bot.stats.total_trades)
  const state = bot.ledger ?? null
  // A bot without a horizon (the grid) carries « — » there: left out, not printed.
  const market = [bot.exchange, familyLabel(bot.family), bot.timeframe].filter(v => v && v !== '—').join(' · ')
  return (
    <tr data-testid="fleet-row" className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-3 border-b border-border py-5 md:py-0">
      <td className="max-md:col-span-2 max-md:block md:py-5 md:pr-6 align-top">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record', 'text-base font-semibold leading-snug')}>{bot.name}</Link>
            <p className="mt-1 text-xs text-muted">
              {market}{' · '}
              <span className="tabular-nums">{hasData ? plural(bot.stats.total_trades, 'trade', 'trades') : 'aucun trade'}</span>
            </p>
          </div>
          <span className="-my-2 flex shrink-0">
            <FollowBell slug={bot.slug} name={bot.name} />
            <FavoriteStar kind="bot" slug={bot.slug} name={bot.name} />
          </span>
        </div>
      </td>
      <td className="max-md:block md:py-5 md:pr-6 align-top">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={bot.status} />
          {rodage && (
            <span data-testid="fleet-rodage-tag" className="text-xs text-warning" title="Échantillon faible : trop tôt pour conclure">
              rodage
            </span>
          )}
        </div>
        {state && (
          <p data-testid="fleet-row-state" className={`mt-2 text-sm font-semibold leading-snug ${state.kind === 'crossed' ? 'text-negative' : state.kind === 'untraded' ? 'font-normal text-muted' : ''}`}>
            {state.label}
            {state.note && <span className="mt-0.5 block text-xs font-normal text-muted">{state.note}</span>}
          </p>
        )}
      </td>
      <td className="max-md:block md:py-5 text-right align-top">
        {hasData ? (
          <>
            <p className={`text-lg md:text-xl font-medium leading-tight tabular-nums whitespace-nowrap ${eur < 0 ? 'text-negative' : ''}`}>{fmtEur(eur)}</p>
            <p className="mt-1 text-xs text-muted tabular-nums whitespace-nowrap">{fmtPct(pct)}</p>
            <p className="text-xs text-muted tabular-nums whitespace-nowrap">
              PF {fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)}{' · '}DD {fmtDrawdown(bot.stats.max_drawdown)}
            </p>
          </>
        ) : (
          <p className="text-lg md:text-xl leading-tight text-muted"><span aria-hidden="true">—</span><span className="sr-only">Pas de résultat</span></p>
        )}
      </td>
      <td data-testid="bot-spark" className="hidden lg:table-cell py-5 pl-6 align-top text-muted">
        {hasData && bot.spark30 && bot.spark30.length >= 2 && <Sparkline values={bot.spark30} width={96} height={24} />}
      </td>
    </tr>
  )
}

export default function FleetLedger({ bots, caption }: { bots: LedgerBot[]; caption: string }) {
  return (
    <table data-testid="fleet-ledger" className="w-full max-md:block border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-md:sr-only">
        <tr className="border-b border-border text-xs text-muted">
          <th scope="col" className="pb-2.5 pr-6 font-normal md:w-[42%]">Bot et marché</th>
          <th scope="col" className="pb-2.5 pr-6 font-normal md:w-[33%]">État et décision</th>
          <th scope="col" className="pb-2.5 font-normal text-right whitespace-nowrap">Résultat depuis le départ</th>
          <th scope="col" className="hidden lg:table-cell pb-2.5 pl-6 font-normal w-[8.5rem]">30 derniers jours</th>
        </tr>
      </thead>
      <tbody className="max-md:block">
        {bots.map(bot => <Row key={bot.id} bot={bot} />)}
      </tbody>
    </table>
  )
}
