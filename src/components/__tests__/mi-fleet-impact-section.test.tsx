import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// The component pulls its phrase builders from @/lib/mi-fleet-impact, which imports the
// server client at module load. supabase-js throws on an empty URL, and vitest.setup.ts
// only seeds the NEXT_PUBLIC_* pair, so the whole suite dies on import without this.
// Same stub the lib's own test uses. Nothing here ever queries: the section is pure props.
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: () => ({}) } }))

import { MiFleetImpactSection } from '@/components/MiFleetImpact'
import { pct, type FleetImpact } from '@/lib/mi-fleet-impact'

// The row actually in mi_fleet_impact on 2026-08-03. Nothing invented.
const IMPACT: FleetImpact = {
  windowDays: 88, nPresets: 8, nTrades: 254, nSmallSample: 4, blockedRed: 0,
  ddBaseline: -0.09134, ddBoth: -0.07106, ddConstant: -0.04999,
  pnlBoth: -216.76, pnlConstant: -199.75,
}
const text = (c: HTMLElement) => c.textContent ?? ''

describe('MiFleetImpactSection', () => {
  // THE guard of this task. Same template constraint HeroBlock already carries for the
  // survivor count and its ratio: the improvement may never appear without its control.
  // Publishing −7,1 % alone is the misleading omission L121-2 targets, on a page whose
  // whole argument is that its numbers can be trusted.
  it('never renders the improvement without the control', () => {
    const { container } = render(<MiFleetImpactSection impact={IMPACT} />)
    const t = text(container)
    expect(t).toContain('7,1')
    expect(t).toContain('5,0')
  })

  // Same guard, stated as the invariant rather than as two literals: whatever the weekly
  // cron writes, if ddBoth reaches the page then ddConstant reaches the same block.
  it('holds that guard on any row, not just the one measured', () => {
    for (const row of [IMPACT, { ...IMPACT, ddBoth: -0.0312, ddConstant: -0.0688 }]) {
      const { container } = render(<MiFleetImpactSection impact={row} />)
      const t = text(container)
      if (t.includes(pct(row.ddBoth))) {
        expect(t, `control missing beside ${pct(row.ddBoth)}`).toContain(pct(row.ddConstant))
      }
      expect(t).toContain(pct(row.ddConstant))
    }
  })

  it('states the period and that these are replay figures on paper presets', () => {
    const { container } = render(<MiFleetImpactSection impact={IMPACT} />)
    const t = text(container)
    expect(t).toContain('88')
    expect(t).toMatch(/rejou|replay/i)
  })

  // The second omission this section could commit: 254 trades reads like a sample until
  // you learn half the presets are under twenty trades each. The caveat is not optional.
  it('carries the small-sample caveat, never the trade count alone', () => {
    const { container } = render(<MiFleetImpactSection impact={IMPACT} />)
    const t = text(container)
    expect(t).toContain('254')
    expect(t).toMatch(/\b4\b[^.]*(vingt|20) trades/)
  })

  it('renders nothing rather than a claim it cannot source', () => {
    const { container } = render(<MiFleetImpactSection impact={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('carries no typed figure: every number on screen comes from the props', () => {
    const other = { ...IMPACT, windowDays: 176, nTrades: 508, nPresets: 11, nSmallSample: 6 }
    const { container } = render(<MiFleetImpactSection impact={other} />)
    const t = text(container)
    expect(t).toContain('176')
    expect(t).toContain('508')
    expect(t).toMatch(/\b11\b/)
    expect(t).toMatch(/\b6\b[^.]*(vingt|20) trades/)
    expect(t).not.toContain('88')
    expect(t).not.toContain('254')
  })

  // The gate sentence is derived, so the section must not freeze it: with blocks, the
  // page has to say what it blocked instead of « rien bloqué ».
  it('lets the derived prose flip when the measurement flips', () => {
    const { container } = render(<MiFleetImpactSection impact={{ ...IMPACT, blockedRed: 3 }} />)
    const t = text(container)
    expect(t).toMatch(/3 signaux/)
    expect(t).not.toMatch(/rien bloqué/)
  })

  // Same hazard one level down, and the one the brief's draft actually carried: « en
  // perdant moins » is a claim about pnlConstant vs pnlBoth. Frozen, it goes false the
  // first week the flat cut loses more, sitting right beside the drawdown that says so.
  it('does not freeze the P&L comparison the way it does not freeze the gate', () => {
    const { container: a } = render(<MiFleetImpactSection impact={IMPACT} />)
    expect(text(a)).toMatch(/meilleur P&L/)
    const flipped = { ...IMPACT, pnlConstant: -400 } // flat cut now loses more
    const { container: b } = render(<MiFleetImpactSection impact={flipped} />)
    expect(text(b)).not.toMatch(/meilleur P&L/)
  })
})

describe('voice', () => {
  const rendered = () => text(render(<MiFleetImpactSection impact={IMPACT} />).container)

  it('stays first person singular and never speaks as a team', () => {
    const t = rendered()
    expect(/\b(nous|notre|nos)\b/i.test(t), t).toBe(false)
    expect(t).toMatch(/\bje\b/i)
  })

  it('uses no em or en dash', () => {
    const t = rendered()
    expect(t.includes('—'), 'em dash').toBe(false)
    expect(t.includes('–'), 'en dash').toBe(false)
  })

  it('leaks no machine identifier into published prose', () => {
    const t = rendered()
    for (const token of ['dd_both', 'dd_constant', 'blocked_red', 'mi_fleet_impact', 'baseline', 'shadow', 'preset']) {
      expect(t.toLowerCase().includes(token), token).toBe(false)
    }
  })
})
