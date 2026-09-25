// The proof in the first screen (lot 3, conception §5.1, C1): the bots that run
// with my money, the longest history first, so the losing one leads when it is the
// oldest, with its real figures and the state of its published rule. On desktop, a
// panel beside the title; on a phone, a compact strip ABOVE the two entries
// (variant A, chosen by the user on 2026-09-25 against the button's position).
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
  if (!exp) return { kind: 'none', text: 'pas d’enveloppe pré-enregistrée' }
  const result = assessConformity(exp, bot.stats)
  if (result.status !== 'breach') return { kind: 'inside', text: 'dans l’enveloppe attendue' }
  const decision = exp.decisions?.at(-1)
  const said = decision?.status === 'kept' ? 'je le garde' : decision?.status === 'frozen' ? 'je le gèle' : 'décision en suspens'
  return { kind: 'crossed', text: `règle d’arrêt franchie · ${said}` }
}

const fresh = (minutes: number | null) => (minutes === null ? null : minutes < 2 ? 'à l’instant' : `il y a ${minutes} min`)

/** One real-money bot, with its 30-day line and the state of its published rule.
 *  Shared with /overview since lot 4 (same card, `testId` tells the two apart). */
export function RealMoneyCard({ bot, testId = 'home-bot-card' }: { bot: BotWithStats; testId?: string }) {
  const pct = pnlPct(bot.stats.latest_capital, bot.start_capital)
  const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
  const sign: 1 | -1 = pct < 0 ? -1 : 1
  const tone = pct < 0 ? 'text-negative' : 'text-positive'
  const spark = last30Capital(bot.perf_daily)
  const delta30 = spark.length >= 2 ? spark[spark.length - 1] - spark[0] : null
  const rule = ruleState(bot)
  return (
    <div data-testid={testId} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record', 'text-sm leading-snug')}>{bot.name}</Link>
          <p className="text-xs text-muted mt-0.5 truncate">{bot.strategy}</p>
        </div>
        <StatusBadge status={bot.status} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-mono text-2xl font-medium leading-none ${tone}`}>{fmtPct(pct)}</span>
        <span className="text-xs text-muted font-mono">{fmtEur(eur)} depuis le départ</span>
      </div>
      <HomeSpark values={spark} sign={sign} startCapital={bot.start_capital} />
      <div className="flex justify-between text-xs text-muted">
        <span>30 derniers jours</span>
        {delta30 !== null && <span className={`font-mono ${delta30 < 0 ? 'text-negative' : 'text-positive'}`}>{fmtEur(delta30)}</span>}
      </div>
      <p className="font-mono text-xs text-muted flex flex-wrap gap-x-3">
        <span><b className="text-foreground font-medium">{bot.stats.total_trades}</b> trades</span>
        <span>PF <b className="text-foreground font-medium">{fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)}</b></span>
        <span>WR <b className="text-foreground font-medium">{fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate)}</b></span>
        <span>DD <b className={`font-medium ${drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : 'text-foreground'}`}>{fmtDrawdown(bot.stats.max_drawdown)}</b></span>
      </p>
      <p data-testid="home-bot-rule" className={`text-xs ${rule.kind === 'crossed' ? 'text-severe' : 'text-muted'}`}>
        {rule.kind === 'crossed' ? '✕ ' : rule.kind === 'inside' ? '✓ ' : ''}{rule.text}
        {rule.kind === 'crossed' && <> <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('inline')}>la décision</Link></>}
      </p>
    </div>
  )
}

export function RealMoneyPanel({ bots, minutes }: { bots: BotWithStats[]; minutes: number | null }) {
  const f = fresh(minutes)
  return (
    <aside data-testid="home-real" aria-label="Argent réel" className="hidden lg:block lg:col-span-5">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-xs font-medium text-muted">Argent réel</span>
        {f && <span className="text-xs text-muted">{f}</span>}
      </div>
      <div className="grid gap-3">
        {bots.map(b => <RealMoneyCard key={b.slug} bot={b} />)}
      </div>
      <p className="mt-3 text-sm"><Link href="/overview" className={linkClass('inline')}>Toute la flotte, simulation comprise →</Link></p>
    </aside>
  )
}

export function RealMoneyStrip({ bots, minutes }: { bots: BotWithStats[]; minutes: number | null }) {
  const f = fresh(minutes)
  return (
    <div data-testid="home-real-strip" className="lg:hidden border border-border rounded-lg overflow-hidden mb-4 text-left">
      <div className="flex items-center justify-between px-3 py-2 bg-card text-xs text-muted">
        <span>Argent réel{f ? ` · ${f}` : ''}</span>
        <Link href="/overview" className={linkClass('inline')}>toute la flotte →</Link>
      </div>
      {bots.map(b => {
        const pct = pnlPct(b.stats.latest_capital, b.start_capital)
        const rule = ruleState(b)
        return (
          <Link key={b.slug} href={`/strategies/bot/${b.slug}`} className={linkClass('record', 'flex min-h-10 items-center gap-2 px-3 py-1.5 border-t border-border')}>
            {/* Two lines rather than an ellipsis: truncated, the two EMA bots read
                the same (« Croisement EMA H4 … ») and the strip stops telling them apart. */}
            <span className="min-w-0 flex-1 text-sm leading-snug line-clamp-2">{b.name}</span>
            <StatusBadge status={b.status} />
            <span className={`shrink-0 font-mono text-sm font-medium ${pct < 0 ? 'text-negative' : 'text-positive'}`}>{fmtPct(pct)}</span>
            {rule.kind === 'crossed' && <span className="shrink-0 text-severe text-xs" aria-label="règle d’arrêt franchie">✕</span>}
          </Link>
        )
      })}
    </div>
  )
}
