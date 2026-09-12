import { ImageResponse } from 'next/og'
import { getBotWithStats } from '@/lib/queries'
import { pnlEur, fmtEur, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss } from '@/lib/display'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) return new Response('Not found', { status: 404 })

  const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
  const isLive = bot.status === 'live'

  const metrics = [
    { label: 'T. GAIN',   value: fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate), color: '#e6edf3' },
    { label: 'F. PROFIT', value: fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor), color: bot.stats.profit_factor >= 1 ? '#3fb950' : '#ff4444' },
    // Red only when there is a drawdown to show; « 0.0% » is neutral (display.ts).
    { label: 'DRAWDOWN',  value: fmtDrawdown(bot.stats.max_drawdown), color: drawdownIsLoss(bot.stats.max_drawdown) ? '#ff4444' : '#e6edf3' },
    { label: 'P&L',       value: fmtEur(eur),                                 color: eur >= 0 ? '#3fb950' : '#ff4444' },
  ]

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        background: '#0d1117', padding: 48,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#e6edf3' }}>{bot.name}</span>
            <span style={{ fontSize: 16, color: '#8b949e', marginTop: 6 }}>{bot.exchange} · {bot.timeframe}</span>
          </div>
          <span style={{
            fontSize: 14, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
            // Regime as a form and a word, not the gain colour (audit 2026-09-09):
            // same glyphs and words as StatusBadge on the site.
            color: isLive ? '#e6edf3' : '#8b949e',
            background: isLive ? 'rgba(230,237,243,0.12)' : 'rgba(139,148,158,0.12)',
            border: `1px ${isLive ? 'solid rgba(230,237,243,0.4)' : 'dashed rgba(139,148,158,0.4)'}`,
          }}>
            {isLive ? '● Argent réel' : '○ Simulation'}
          </span>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 'auto' }}>
          {metrics.map(m => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {m.label}
              </span>
              <span style={{ fontSize: 28, fontWeight: 700, color: m.color, fontFamily: 'monospace' }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
          <span style={{ fontSize: 13, color: '#8b949e' }}>algoproof.fr, données vérifiées</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
