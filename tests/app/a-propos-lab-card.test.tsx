import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

// The page reads the weekly fleet-impact row (its « what I do not know » section
// carries the measured window, never a number typed by hand). The lib imports the
// server client at module load; same stub as the section's own test.
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: () => ({}) } }))
vi.mock('@/lib/mi-fleet-impact', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mi-fleet-impact')>()
  return { ...real, getFleetImpact: vi.fn() }
})

import { getFleetImpact, type FleetImpact } from '@/lib/mi-fleet-impact'
import { membershipPrice } from '@/lib/launch-offer'
import { listeHorsPerimetre } from '@/lib/investir'
import { getBotExpectations } from '@/lib/bot-expectations'
import AProposPage from '@/app/a-propos/page'

const IMPACT: FleetImpact = {
  windowDays: 137, nPresets: 8, nTrades: 409, nSmallSample: 4, blockedRed: 0,
  ddBaseline: -0.115, ddBoth: -0.09, ddConstant: -0.05,
  pnlBoth: -216.76, pnlConstant: -199.75,
}

async function page(impact: FleetImpact | null = IMPACT) {
  vi.mocked(getFleetImpact).mockResolvedValue(impact)
  const ui = await AProposPage()
  const { container } = render(ui)
  return { container, text: container.textContent?.replace(/\s+/g, ' ') ?? '' }
}

const h2s = (c: HTMLElement) => Array.from(c.querySelectorAll('h2')).map(h => h.textContent?.trim())

// Lot 7 of the design audit (spec 5.7, audit §6.3, 2026-09-25): five sections, the
// prose template, no navigation cards, both activities named.
describe('À propos (lot 7)', () => {
  it('has the five sections, in this order, and nothing else', async () => {
    const { container } = await page()
    expect(h2s(container)).toEqual([
      "AlgoProof, c'est quoi",
      'Pourquoi je publie tout',
      'Qui est derrière',
      "Comment c'est financé",
      'Ce que je ne sais pas',
    ])
  })

  it('names both activities in its first section: bots and company accounts', async () => {
    const { container } = await page()
    const first = container.querySelector('section')!.textContent ?? ''
    expect(first).toMatch(/bots?/i)
    expect(first).toMatch(/sociétés/i)
    expect(first).not.toMatch(/labo de trading/i)
    expect(first).not.toMatch(/investis sur le long terme/i)
  })

  it('carries the identity block of the company fiches under « Qui est derrière »', async () => {
    const { text } = await page()
    expect(text).toContain('Thomas Dessombs, à titre individuel (entrepreneur individuel, sous le nom commercial AlgoProof)')
    expect(text).toContain('Aucune société citée ne me rémunère')
    expect(text).toContain('pas un conseil en investissement personnalisé')
  })

  it('says how it is financed: the membership price and the Bybit affiliate link, nothing else', async () => {
    const { container, text } = await page()
    expect(text).toContain(membershipPrice())
    expect(text).toMatch(/Bybit/)
    expect(text).not.toMatch(/sponsor|publicité|signal payant/i)
    // The free/paid line still lands on /preuve#gratuit (no-grade-sitewide guard).
    expect(container.querySelector('a[href="/preuve#gratuit"]')).not.toBeNull()
  })

  it('states what it does not know, each item from data, none typed by hand', async () => {
    const { text } = await page()
    // the weather: the measured window and the verdict phrase built from the row
    expect(text).toMatch(/137 jours/)
    // the walk-forward: not out of sample
    expect(text).toMatch(/walk-forward/i)
    expect(text).toMatch(/pas un test hors échantillon/)
    // the out-of-scope companies: their count read from the data file
    expect(text).toContain(`${listeHorsPerimetre().length} sociétés`)
    // ORB: the last decision on file, its date, kept
    const orb = getBotExpectations('orb-bf25')!.decisions!.at(-1)!
    expect(orb.status).toBe('kept')
    expect(text).toMatch(/ORB/)
    expect(text).toMatch(/25 septembre 2026/)
    expect(text).toMatch(/22 octobre 2026/)
  })

  it('says the weather is unproven without a number when the measurement row is missing', async () => {
    const { text } = await page(null)
    expect(text).toMatch(/météo/i)
    expect(text).not.toMatch(/\d+ jours/)
  })

  it('has no navigation cards any more', async () => {
    const { container, text } = await page()
    expect(text).not.toMatch(/Comment les pièces s.articulent/)
    // inline links stay; the card role (the grid of five) is gone
    expect(container.querySelectorAll('a[href="/blog"]').length).toBe(0)
    expect(container.querySelectorAll('h3').length).toBe(0)
  })

  it('uses the prose template, and no em or en dash', async () => {
    const { container, text } = await page()
    const main = container.querySelector('main')!
    for (const cls of ['max-w-3xl', 'px-6', 'py-12']) expect(main.className).toContain(cls)
    expect(text).not.toMatch(/[—–]/)
  })

  // The identity block is shared, not copied: one file carries the holdings
  // sentence, and both the fiche disclosure and this page import it.
  it('shares the identity block with EquityDisclosure instead of duplicating it', () => {
    const src = (f: string) => readFileSync(f, 'utf8')
    expect(src('src/app/a-propos/page.tsx')).toMatch(/from '@\/components\/AuthorIdentity'/)
    expect(src('src/components/EquityDisclosure.tsx')).toMatch(/from '@\/components\/AuthorIdentity'/)
    expect(src('src/app/a-propos/page.tsx')).not.toMatch(/Aucune société citée ne me rémunère/)
    expect(src('src/components/EquityDisclosure.tsx')).not.toMatch(/Aucune société citée ne me rémunère/)
    expect(src('src/components/AuthorIdentity.tsx')).toMatch(/Aucune société citée ne me rémunère/)
  })
})
