import { ImageResponse } from 'next/og'
import { getBotWithStats } from '@/lib/queries'
import { getBotSimulation, simulationPerfDaily } from '@/lib/bot-simulation'
import { fmtPct, fmtPfDisplay, fmtWinRateDisplay, pnlPct as pnlPctOf } from '@/lib/display'
import { SITE_COLORS as C } from '@/lib/site-colors'
import { RegimeBadge, Wordmark, plain } from '@/lib/share-image'

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
//
// Finitions (2026-10-03): the site's palette instead of GitHub's, a gain in ink, the
// regime drawn beside its word, labels in sentence case, the result as a French
// percentage (« +27,3 % »), one string per line of text. Pinned by
// tests/app/share-images.test.tsx.
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
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <Wordmark fontSize={52} />
      </div>,
      { width: 1200, height: 630 }
    )
  }

  // Same figures as the fiche's tiles (D072): the simulation since the freeze when the bot
  // has a backtest segment, its P&L read from the simulation's own start.
  const simulation = await getBotSimulation(bot)
  const stats = simulation?.stats ?? bot.stats
  const startCapital = simulation ? simulation.timeline.simStartCapital : bot.start_capital
  const pnlPct = pnlPctOf(stats.latest_capital, startCapital)
  const pnlColor = pnlPct < 0 ? C.neg : C.text
  const sparklineD = buildSparklinePath(
    simulation ? simulationPerfDaily(simulation) : bot.perf_daily, 1104, 140)

  const figures = [
    { label: 'Résultat', value: fmtPct(pnlPct), color: pnlColor },
    { label: 'Taux de gain', value: fmtWinRateDisplay(bot.family, stats.total_trades, stats.win_rate), color: C.text },
    { label: 'Facteur de profit', value: fmtPfDisplay(bot.family, stats.total_trades, stats.profit_factor), color: C.text },
    { label: 'Trades', value: String(stats.total_trades), color: C.text },
  ]

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: C.bg,
        color: C.text,
        padding: '48px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: C.muted, fontSize: '20px' }}>AlgoProof · stratégie</span>
          <span style={{ color: C.text, fontSize: '40px', fontWeight: 600, lineHeight: '1.2', maxWidth: '880px' }}>
            {plain(bot.name)}
          </span>
        </div>
        {/* Regime as a form and a word, not the gain colour: the drawn mark and the
            words of StatusBadge and the embed. */}
        <RegimeBadge status={bot.status} fontSize={20} />
      </div>

      <div style={{ display: 'flex', flex: 1, marginBottom: '24px' }}>
        {sparklineD ? (
          <svg width="1104" height="140" viewBox="0 0 1104 140" style={{ display: 'block' }}>
            <path d={sparklineD} fill="none" stroke={pnlColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: C.muted, fontSize: '20px' }}>Données en cours de collecte</span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          borderTop: `1px solid ${C.border}`,
          paddingTop: '24px',
        }}
      >
        {figures.map((stat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ color: C.muted, fontSize: '17px' }}>{stat.label}</span>
            <span style={{ color: stat.color, fontSize: '30px', fontWeight: 600 }}>{plain(stat.value)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <Wordmark fontSize={24} />
          <span style={{ color: C.muted, fontSize: '17px' }}>algoproof.fr</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
