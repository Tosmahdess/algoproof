// « Mes bots en argent réel », the home's register in full width (refonte « Le
// registre des décisions », lot 2). One row per real-money bot, from the best
// result to the least good (owner, 02/10/2026): bot and market, then the state of
// its published rule and my decision, then its result since the start. The state
// comes before the figure, so a crossed rule is read before a sum.
//
// No sparkline (audit 2026-10, n° 8: the 30-day line took the colour of a result
// it did not show), no aggregate: R1 forbids a figure that fuses bots.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import { fmtEur, fmtPct, pnlEur, pnlPct } from '@/lib/display'
import { registerState, sinceLabel, sortByResult, splitMarket } from '@/lib/home-register'
import type { BotWithStats } from '@/lib/types'

const COLUMNS = 'md:grid-cols-[1.2fr_1.1fr_0.65fr] md:gap-6'
const SECONDARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card-2'

function Row({ bot }: { bot: BotWithStats }) {
  const href = `/strategies/bot/${bot.slug}`
  const { title, market } = splitMarket(bot.name, bot.exchange)
  const state = registerState(bot)
  const trades = bot.stats.total_trades
  const hasResult = trades > 0
  const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
  const pct = pnlPct(bot.stats.latest_capital, bot.start_capital)
  const loss = hasResult && eur < 0
  const stateTone = state.kind === 'crossed' ? 'text-negative' : state.kind === 'insufficient' ? 'text-warning' : 'text-foreground'

  return (
    <li data-testid="home-real-row" className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-t border-border py-5 md:items-center md:first:border-t-0 ${COLUMNS}`}>
      <div className="col-span-2 min-w-0 md:col-span-1">
        {/* Two EMA bots share a title; the venue in the link's name tells them apart
            for a screen reader, and the line under it does the same on screen. */}
        <Link href={href} className={linkClass('record', 'font-semibold')}>
          {title}
          {title !== bot.name && <span className="sr-only">{` ${market}`}</span>}
        </Link>
        <span className="mt-1 block text-xs text-muted tabular-nums">
          {market}{' · '}{trades}{' '}{trades === 1 ? 'trade publié' : 'trades publiés'}
        </span>
      </div>
      <div data-testid="home-real-state" data-kind={state.kind} className={`min-w-0 text-sm font-semibold sm:text-base ${stateTone}`}>
        {state.label}
        <span className="mt-1 block text-xs font-normal text-muted">
          {state.note}
          {state.kind === 'crossed' && (
            <>{' · '}<Link href={href} className={linkClass('inline')}>lire ma décision</Link></>
          )}
        </span>
      </div>
      <div data-testid="home-real-result" className="text-right tabular-nums">
        {hasResult ? (
          <span className={`block whitespace-nowrap text-xl font-medium md:text-[22px] ${loss ? 'text-negative' : 'text-foreground'}`}>{fmtEur(eur)}</span>
        ) : (
          <span className="block text-xl font-medium text-muted md:text-[22px]">—</span>
        )}
        <span className="mt-1 block text-xs text-muted">
          {hasResult ? <>{fmtPct(pct)}{' · '}{sinceLabel(bot.live_since)}</> : 'aucun trade clos'}
        </span>
      </div>
    </li>
  )
}

export default function RealMoneyRegister({ bots, fleetSize, reading }: {
  bots: BotWithStats[]
  /** Every bot in service, real and simulated: the same count as the lead's. */
  fleetSize: number
  /** « 2 octobre 2026 », the day of the freshest sync. */
  reading: string | null
}) {
  const rows = sortByResult(bots)
  return (
    <section data-testid="home-real" aria-labelledby="home-real-title" className="border-b border-border py-8 sm:py-9">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div>
          <h2 id="home-real-title" className="text-2xl font-semibold tracking-tight">Mes bots en argent réel</h2>
          <p className="mt-2 text-sm text-muted">Du meilleur résultat au moins bon.</p>
        </div>
        <Link href="/overview" className={linkClass('inline', 'inline-flex min-h-11 items-center self-start text-sm sm:self-auto')}>Toute la flotte →</Link>
      </div>
      {/* The column heads are for the eye: each cell already says what it is
          (the market, the rule, « depuis le … »), so a screen reader skips them. */}
      <div aria-hidden="true" className={`hidden border-b border-border pb-2.5 text-xs text-muted md:grid ${COLUMNS}`}>
        <span>Bot et marché</span>
        <span>État et décision</span>
        <span className="text-right">Résultat depuis le départ</span>
      </div>
      <ol data-testid="home-real-list">
        {rows.map(b => <Row key={b.slug} bot={b} />)}
      </ol>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <Link href="/overview" className={SECONDARY_BUTTON}>
          Voir toute la flotte · {fleetSize}{' '}bots, réels et simulés →
        </Link>
        {reading && <p className="text-xs text-muted">Relevé du {reading}.</p>}
      </div>
    </section>
  )
}
