import { ImageResponse } from 'next/og'
import { getBotWithStats } from '@/lib/queries'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function buildSparklinePath(
  perf: Array<{ capital: number }>,
  w: number,
  h: number
): string {
  if (perf.length < 2) return ''
  const vals = perf.map(p => p.capital)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  return vals
    .map((v, i) => {
      const x = Math.round((i / (vals.length - 1)) * w)
      const y = Math.round(h - ((v - min) / range) * h)
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`
    })
    .join(' ')
}

export default async function Image({ params }: { params: { slug: string } }) {
  const bot = await getBotWithStats(params.slug)

  if (!bot) {
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#0d1117',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#ff6b35', fontSize: '64px', fontWeight: 700, fontFamily: 'sans-serif' }}>
          AlgoProof
        </span>
      </div>,
      { width: 1200, height: 630 }
    )
  }

  const DISPLAY_CAPITAL = 1000
  const pnlPct = ((bot.stats.latest_capital - DISPLAY_CAPITAL) / DISPLAY_CAPITAL) * 100
  const pnlColor = pnlPct >= 0 ? '#3fb950' : '#ff4444'
  const sparklineD = buildSparklinePath(bot.perf_daily, 1104, 140)

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0d1117',
        padding: '48px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: '#8b949e', fontSize: '18px' }}>AlgoProof · stratégie</span>
          <span style={{ color: '#ffffff', fontSize: '46px', fontWeight: 700, lineHeight: '1.1', maxWidth: '800px' }}>
            {bot.name}
          </span>
        </div>
        <div
          style={{
            backgroundColor: 'rgba(255,107,53,0.15)',
            border: '1px solid rgba(255,107,53,0.4)',
            color: '#ff6b35',
            padding: '8px 18px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Paper Trading
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, marginBottom: '24px' }}>
        {sparklineD ? (
          <svg width="1104" height="140" viewBox="0 0 1104 140" style={{ display: 'block' }}>
            <path d={sparklineD} fill="none" stroke={pnlColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#8b949e', fontSize: '18px' }}>Données en cours de collecte</span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          borderTop: '1px solid #21262d',
          paddingTop: '24px',
          gap: '0',
        }}
      >
        {[
          { label: 'P&L', value: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`, color: pnlColor },
          { label: 'Win Rate', value: `${(bot.stats.win_rate * 100).toFixed(1)}%`, color: '#e6edf3' },
          { label: 'Profit Factor', value: bot.stats.profit_factor.toFixed(2), color: '#e6edf3' },
          { label: 'Trades', value: String(bot.stats.total_trades), color: '#e6edf3' },
        ].map((stat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ color: '#8b949e', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {stat.label}
            </span>
            <span style={{ color: stat.color, fontSize: '34px', fontWeight: 700 }}>{stat.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <span style={{ color: '#ff6b35', fontSize: '22px', fontWeight: 700 }}>AlgoProof</span>
          <span style={{ color: '#8b949e', fontSize: '14px' }}>algoproof.fr</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
