// The top of /overview since 2026-09-24 (user request): the same card shape as
// the cockpit's EngineKpiCards on lab.algoproof.fr (tinted wash, glyph in a
// square, uppercase label in the card's hue, big number), two cards, and no
// prose. The engine funnel (swept / judged) stays on the home page and the
// cockpit; this page is about the fleet.
//
// Hues: accent for the whole fleet, foreground for real money, the same white
// the « Argent réel » StatusBadge uses. Never green: D066 keeps green for gains.
import type { ReactNode } from 'react'
import type { FunnelCounts } from '@/lib/funnel'

const nf = new Intl.NumberFormat('fr-FR')

// Inline, like the cockpit's: the site ships no icon package.
const ICON_FLEET: ReactNode = (
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>
)
const ICON_LIVE: ReactNode = (
  <>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M14.6 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.8.9-2.8 2.1 0 2.8 5.6 1.4 5.6 4.2 0 1.2-1.2 2.1-2.8 2.1-1.1 0-2.1-.5-2.6-1.4M12 6.4v1.4M12 16.2v1.4" />
  </>
)

function KpiCard({ tone, label, value, icon }: { tone: string; label: string; value: number; icon: ReactNode }) {
  return (
    <div
      data-testid="fleet-kpi-card"
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
      style={{ background: `color-mix(in srgb, ${tone} 6%, var(--card))` }}
    >
      <dt className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border"
          style={{
            color: tone,
            borderColor: `color-mix(in srgb, ${tone} 25%, transparent)`,
            background: `color-mix(in srgb, ${tone} 10%, transparent)`,
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone }}>
          {label}
        </span>
      </dt>
      <dd className="text-[32px] leading-none font-semibold tabular-nums lg:text-[40px]">{nf.format(value)}</dd>
    </div>
  )
}

export default function FleetKpiCards({ counts }: { counts: FunnelCounts | null }) {
  if (!counts) return null
  return (
    <dl aria-label="Ma flotte" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <KpiCard tone="var(--accent)" label="Bots en service" value={counts.n_promoted} icon={ICON_FLEET} />
      <KpiCard tone="var(--foreground)" label="En argent réel" value={counts.n_live} icon={ICON_LIVE} />
    </dl>
  )
}
