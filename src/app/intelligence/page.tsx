import ExplainerBox from '@/components/ExplainerBox'
import MiRegimeBadge from '@/components/MiRegimeBadge'

export const metadata = {
  title: 'Market Intelligence — AlgoProof',
  description:
    'The AI-powered market watchdog that protects every AlgoProof bot. Live monitoring of sentiment, derivatives, news, and macro events.',
}

const PILLARS = [
  {
    id: 'sentiment',
    label: 'Sentiment',
    weight: '30%',
    color: '#ff6b35',
    functional:
      "Tracks market fear and greed in real time. When traders are extremely fearful, it's often a warning sign. When they're greedy, risk is elevated. This pillar tells us the crowd's emotional state.",
    technical:
      'Fear & Greed Index (0–100), normalized to [−50, +50]. Score contribution = (raw − 50) / 50 × weight. Fetched every 60 seconds. Cached up to 15 minutes on API failure.',
  },
  {
    id: 'derivatives',
    label: 'Derivatives',
    weight: '30%',
    color: '#d2a8ff',
    functional:
      'Watches the crypto futures market in real time. Funding rates, open interest, and liquidation events reveal when leverage is dangerously high — a classic precursor to sharp corrections.',
    technical:
      'Binance Futures: funding rate (8h), open interest Δ, Long/Short ratio. WebSocket liquidation stream (60-second rolling window). Composite: funding × 0.4 + OI_delta × 0.3 + LS_ratio × 0.3.',
  },
  {
    id: 'news',
    label: 'News',
    weight: '20%',
    color: '#3fb950',
    functional:
      "Scans financial headlines continuously. A major negative event (exchange hack, regulatory crackdown, macro shock) can move markets faster than any indicator. We watch the news so the bots don't trade into a storm.",
    technical:
      'RSS feeds from 3 sources (CoinDesk, CoinTelegraph, Reuters via Google News proxy). TF-IDF impact scoring per headline. T2 event: 30-minute trading blackout. T1 event: 2-hour halt.',
  },
  {
    id: 'macro',
    label: 'Macro',
    weight: '20%',
    color: '#40c4ff',
    functional:
      "Monitors macroeconomic conditions: stock market volatility (VIX), US Dollar strength (DXY), and upcoming events like Fed decisions or CPI releases. Crypto doesn't exist in a vacuum.",
    technical:
      'VIX > 30 → hard gate regardless of composite score. DXY momentum scoring. Economic calendar: 134 events across 2 tiers. T1 (Fed/CPI/NFP): 2-hour halt. T2 (secondary data): 30-minute blackout.',
  },
]

export default function IntelligencePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-16">
      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          Market Intelligence Service
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          The watchdog that never sleeps.
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
          Every AlgoProof bot is gated by a live market intelligence layer. Before any trade
          is placed, the MI service checks 4 real-time data sources and decides whether the
          market is safe. If it&apos;s not, no bot trades — period.
        </p>
      </div>

      {/* Live regime */}
      <MiRegimeBadge />

      {/* Defense Mesh */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-4">Defense Mesh</h2>
        <ExplainerBox
          functional={
            <p>
              Think of the Defense Mesh as a five-layer safety net around every bot. Each layer
              independently stops trading if it detects danger — a single failed layer never brings
              the system down. Even if the MI service goes offline, bots fall back to conservative defaults.
            </p>
          }
          technical={
            <div className="space-y-1 text-xs font-mono">
              <div className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-1">
                <span className="font-semibold">Layer 1</span>
                <span className="text-muted">Position sizing — scales with MI composite score</span>
                <span className="font-semibold">Layer 2</span>
                <span className="text-muted">is_safe_to_trade() — hard gate, all conditions must pass</span>
                <span className="font-semibold">Layer 3</span>
                <span className="text-muted">VIX &gt; 30 — unconditional full stop</span>
                <span className="font-semibold">Layer 4</span>
                <span className="text-muted">T1/T2 event blackouts — 2h / 30min halts</span>
                <span className="font-semibold">Layer 5</span>
                <span className="text-muted">Heartbeat watchdog — stale data defaults to BLOCKED</span>
              </div>
              <p className="pt-2 text-[10px] text-muted">
                Score range: [−100, +100]. Weights: Sentiment 30% · Derivatives 30% · News 20% · Macro 20%.
                Gate: composite &gt; −30 AND VIX ≤ 30 AND no T1 in 2h AND no T2 in 30min.
              </p>
            </div>
          }
        />
      </section>

      {/* 4 Pillars */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">The 4 Pillars</h2>
        <div className="space-y-6">
          {PILLARS.map((p) => (
            <div key={p.id} className="rounded border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: p.color }}
                >
                  {p.label}
                </span>
                <span className="ml-auto text-xs text-muted font-mono">{p.weight} weight</span>
              </div>
              <div className="border-t-0">
                <ExplainerBox functional={p.functional} technical={p.technical} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats placeholder */}
      <div className="rounded border border-dashed border-border px-6 py-8 text-center">
        <p className="text-xs text-muted">
          Historical MI signal accuracy and regime tracking — coming soon.
        </p>
      </div>
    </main>
  )
}
