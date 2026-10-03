// The real-money card (lot 3, conception §5.1, C1): one bot that runs with my
// money, with its real figures and the state of its published rule. It opened the
// home until the refonte « Le registre des décisions » (lot 2, 02/10/2026), which
// gave the home a full-width register (RealMoneyRegister.tsx) and retired the
// desktop panel and the phone strip; /overview still renders this card.
// No aggregate, no average: R1 forbids a hero figure that fuses bots.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import StatusBadge from '@/components/StatusBadge'
import HomeSpark from '@/components/home/HomeSpark'
import type { BotWithStats } from '@/lib/types'
import { pnlEur, pnlPct, fmtEur, fmtPct, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss } from '@/lib/display'
import { getBotExpectations } from '@/lib/bot-expectations'
import { assessConformity } from '@/lib/conformity'
import { last30Capital } from '@/lib/home-data'

export interface RuleState {
  kind: 'crossed' | 'inside' | 'none'
  text: string
}

/** What the card says under the figures about the bot's published rule. */
export function ruleState(bot: BotWithStats): RuleState {
  const exp = getBotExpectations(bot.slug)
  if (!exp) return { kind: 'none', text: 'pas de limites fixées à l’avance' }
  const result = assessConformity(exp, bot.stats)
  if (result.status !== 'breach') return { kind: 'inside', text: 'dans les limites attendues' }
  const decision = exp.decisions?.at(-1)
  const said = decision?.status === 'kept' ? 'je le garde' : decision?.status === 'frozen' ? 'je le gèle' : 'décision en suspens'
  return { kind: 'crossed', text: `règle d’arrêt franchie · ${said}` }
}

/** One real-money bot, with its 30-day line and the state of its published rule.
 *  Shared with /overview since lot 4 (same card, `testId` tells the two apart). */
export function RealMoneyCard({ bot, testId = 'home-bot-card' }: { bot: BotWithStats; testId?: string }) {
  const pct = pnlPct(bot.stats.latest_capital, bot.start_capital)
  const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
  const sign: 1 | -1 = pct < 0 ? -1 : 1
  const tone = pct < 0 ? 'text-negative' : 'text-foreground'
  const spark = last30Capital(bot.perf_daily)
  const delta30 = spark.length >= 2 ? spark[spark.length - 1] - spark[0] : null
  const rule = ruleState(bot)
  return (
    <div data-testid={testId} className="bg-card border border-border rounded-lg p-4 min-w-0 w-full flex flex-col gap-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record', 'text-sm leading-snug')}>{bot.name}</Link>
        </div>
        <StatusBadge status={bot.status} />
      </div>
      <p className="text-xs text-muted whitespace-normal">{bot.strategy}</p>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className={`tabular-nums text-2xl font-medium leading-none ${tone}`}>{fmtPct(pct)}</span>
        <span className="text-xs text-muted tabular-nums">{fmtEur(eur)}{' '}depuis le départ</span>
      </div>
      <HomeSpark values={spark} sign={sign} startCapital={bot.start_capital} />
      <div className="flex justify-between text-xs text-muted">
        <span>30 derniers jours</span>
        {delta30 !== null && <span className={`tabular-nums ${delta30 < 0 ? 'text-negative' : 'text-foreground'}`}>{fmtEur(delta30)}</span>}
      </div>
      <p className="tabular-nums text-xs text-muted flex flex-wrap gap-x-3">
        <span><b className="text-foreground font-medium">{bot.stats.total_trades}</b>{' '}trades</span>
        <span>PF <b className="text-foreground font-medium">{fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)}</b></span>
        <span>WR <b className="text-foreground font-medium">{fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate)}</b></span>
        <span>DD <b className={`font-medium ${drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : 'text-foreground'}`}>{fmtDrawdown(bot.stats.max_drawdown)}</b></span>
      </p>
      <p data-testid="home-bot-rule" className={`text-xs ${rule.kind === 'crossed' ? 'text-severe' : 'text-muted'}`}>
        {rule.kind === 'crossed' ? '✕ ' : rule.kind === 'inside' ? '✓ ' : ''}{rule.text}
        {rule.kind === 'crossed' && <>{' '}<Link href={`/strategies/bot/${bot.slug}`} className={linkClass('inline')}>la décision</Link></>}
      </p>
    </div>
  )
}
