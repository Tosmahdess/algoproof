import { notFound } from 'next/navigation'
import { getBotSlugs, getBotWithStats } from '@/lib/queries'
import { pnlEur, fmtEur, fmtPfDisplay, fmtWinRateDisplay } from '@/lib/display'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await getBotSlugs()
    return slugs.map(slug => ({ slug }))
  } catch {
    return []
  }
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)
  if (!bot) notFound()

  const eur = pnlEur(bot.stats.latest_capital, bot.start_capital)
  const isLive = bot.status === 'live'

  const metrics: Array<{ label: string; value: string; neutral?: boolean; pos?: boolean }> = [
    { label: 'T. GAIN',   value: fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate), neutral: true },
    { label: 'F. PROFIT', value: fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor), pos: bot.stats.profit_factor >= 1 },
    { label: 'DRAWDOWN',  value: `${(bot.stats.max_drawdown * 100).toFixed(1)}%`, pos: false },
    { label: 'P&L',       value: fmtEur(eur),                                 pos: eur >= 0 },
  ]

  return (
    <div style={{
      padding: '16px', border: '1px solid #30363d', borderRadius: 10,
      background: '#0d1117', maxWidth: 480, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', margin: 0 }}>{bot.name}</p>
          <p style={{ fontSize: 11, color: '#8b949e', margin: '3px 0 0' }}>{bot.exchange} · {bot.timeframe}</p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
          color: isLive ? '#3fb950' : '#8b949e',
          background: isLive ? 'rgba(63,185,80,0.1)' : 'rgba(139,148,158,0.1)',
          border: `1px solid ${isLive ? 'rgba(63,185,80,0.3)' : 'rgba(139,148,158,0.3)'}`,
        }}>
          {isLive ? '● Live' : 'Paper'}
        </span>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>
              {m.label}
            </p>
            <p style={{
              fontSize: 13, fontWeight: 700, fontFamily: 'monospace', margin: 0,
              color: m.neutral ? '#e6edf3' : m.pos ? '#3fb950' : '#ff4444',
            }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'right' }}>
        <a href={`https://algoproof.fr/strategies/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 10, color: '#8b949e', textDecoration: 'none' }}>
          Vérifié par algoproof.fr →
        </a>
      </div>
    </div>
  )
}
