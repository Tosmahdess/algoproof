import { ImageResponse } from 'next/og'
import { getBotWithStats } from '@/lib/queries'
import { getBotSimulation } from '@/lib/bot-simulation'
import { pnlEur, fmtEur, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss } from '@/lib/display'
import { periodOf } from '@/lib/embed-card'
import { SITE_COLORS as C } from '@/lib/site-colors'
import { RegimeBadge, Wordmark, plain } from '@/lib/share-image'

export const runtime = 'nodejs'
export const revalidate = 3600

// The share card of a bot (finitions 2026-10-03): the site's palette, a gain in ink,
// the regime drawn beside its word, the result dated and based like the embed, and
// « Publié sur algoproof.fr » where it said « données vérifiées » (nobody verifies
// these figures but me). Pinned by tests/app/share-images.test.tsx.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) return new Response('Not found', { status: 404 })

  // Same figures as the fiche that offers this share (D072): the simulation since the
  // freeze when the bot has a backtest segment, its P&L read from the simulation's start.
  const simulation = await getBotSimulation(bot)
  const stats = simulation?.stats ?? bot.stats
  const startCapital = simulation ? simulation.timeline.simStartCapital : bot.start_capital
  const eur = pnlEur(stats.latest_capital, startCapital)
  const tone = (loss: boolean) => (loss ? C.neg : C.text)

  const metrics = [
    { label: 'WR', value: fmtWinRateDisplay(bot.family, stats.total_trades, stats.win_rate), color: C.text },
    { label: 'PF', value: fmtPfDisplay(bot.family, stats.total_trades, stats.profit_factor), color: tone(stats.total_trades > 0 && stats.profit_factor < 1) },
    // Red only when there is a drawdown to show; « 0.0% » is neutral (display.ts).
    { label: 'DD', value: fmtDrawdown(stats.max_drawdown), color: tone(drawdownIsLoss(stats.max_drawdown)) },
  ]

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        background: C.bg, padding: 56, color: C.text, fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 880 }}>
            <span style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.2 }}>{plain(bot.name)}</span>
            <span style={{ fontSize: 20, color: C.muted, marginTop: 8 }}>{plain(`${bot.exchange} · ${bot.timeframe}`)}</span>
          </div>
          <RegimeBadge status={bot.status} fontSize={20} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
          <span style={{ fontSize: 20, color: C.muted }}>P&L</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 4 }}>
            <span style={{ fontSize: 52, fontWeight: 600, color: tone(eur < 0) }}>{plain(fmtEur(eur))}</span>
            <span style={{ fontSize: 20, color: C.muted }}>{plain(periodOf(bot, startCapital, simulation?.timeline.simStart))}</span>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 36, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          {metrics.map(m => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 20, color: C.muted }}>{m.label}</span>
              <span style={{ fontSize: 30, fontWeight: 600, color: m.color, marginTop: 4 }}>{plain(m.value)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <Wordmark fontSize={24} />
          <span style={{ fontSize: 20, color: C.muted }}>Publié sur algoproof.fr</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
