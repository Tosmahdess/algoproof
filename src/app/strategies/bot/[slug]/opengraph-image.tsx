import { ImageResponse } from 'next/og'
import { getBotWithStats } from '@/lib/queries'
import { getBotSimulation, simulationPerfDaily } from '@/lib/bot-simulation'
import { fmtPfDisplay, fmtWinRateDisplay } from '@/lib/display'

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

// Next 16 passes `params` as a Promise. Read without `await`, `params.slug` was
// undefined and every bot got the fallback below (audit 2026-10, n. 5).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bot = await getBotWithStats(slug)

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
        <div style={{ display: 'flex', fontSize: '64px', fontWeight: 700, fontFamily: 'sans-serif' }}>
          <span style={{ color: '#f5f5f5' }}>Algo</span>
          <span style={{ color: '#4ade80' }}>Proof</span>
        </div>
      </div>,
      { width: 1200, height: 630 }
    )
  }

  // Same figures as the fiche's tiles (D072): the simulation since the freeze when the bot
  // has a backtest segment, its P&L read from the simulation's own start.
  const simulation = await getBotSimulation(bot)
  const stats = simulation?.stats ?? bot.stats
  const startCapital = simulation ? simulation.timeline.simStartCapital : bot.start_capital
  const pnlPct = ((stats.latest_capital - startCapital) / startCapital) * 100
  const pnlColor = pnlPct >= 0 ? '#e6edf3' : '#ff4444'
  const isLive = bot.status === 'live'
  const sparklineD = buildSparklinePath(
    simulation ? simulationPerfDaily(simulation) : bot.perf_daily, 1104, 140)

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
        {/* Regime as a form and a word, not the gain colour: same glyphs and words
            as StatusBadge and the embed. It read « Paper Trading » for every bot,
            real-money ones included, unseen while the image was the fallback. */}
        <div
          style={{
            backgroundColor: isLive ? 'rgba(230,237,243,0.12)' : 'rgba(139,148,158,0.12)',
            border: `1px ${isLive ? 'solid rgba(230,237,243,0.4)' : 'dashed rgba(139,148,158,0.4)'}`,
            color: isLive ? '#e6edf3' : '#8b949e',
            padding: '8px 18px',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {isLive ? '● Argent réel' : '○ Simulation'}
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
          { label: 'Taux de gain', value: fmtWinRateDisplay(bot.family, stats.total_trades, stats.win_rate), color: '#e6edf3' },
          { label: 'Facteur de profit', value: fmtPfDisplay(bot.family, stats.total_trades, stats.profit_factor), color: '#e6edf3' },
          { label: 'Trades', value: String(stats.total_trades), color: '#e6edf3' },
        ].map((stat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ color: '#8b949e', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {stat.label}
            </span>
            <span style={{ color: stat.color, fontSize: '34px', fontWeight: 700 }}>{stat.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700 }}>
            <span style={{ color: '#f5f5f5' }}>Algo</span>
            <span style={{ color: '#4ade80' }}>Proof</span>
          </div>
          <span style={{ color: '#8b949e', fontSize: '14px' }}>algoproof.fr</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
