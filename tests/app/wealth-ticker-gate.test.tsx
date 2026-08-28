import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const PROSE = 'CETTE-PHRASE-EST-PAYANTE'
const REASON = 'raison Z'
const summary = {
  ticker: 'ZZZ', ticker_yf: 'ZZZ', asset_name: 'Zeta', category: 'tech',
  generated_at: '2026-08-02T00:00:00Z', thesis_version: 3,
  price_at_generation: 100, verdict: 'maintenir', verdict_reason: REASON,
  is_featured: false,
}
const full = {
  ...summary,
  fondamentaux: PROSE, valorisation: PROSE, momentum: PROSE, risques: PROSE,
}

const getFicheSummary = vi.fn(async () => summary)
const getFicheFull = vi.fn(async () => full)
const getFreeTickers = vi.fn(async () => ['AAA'])
const getEntitlement = vi.fn(async () => 'guest')

vi.mock('@/lib/equity', () => ({
  getFicheSummary, getFicheFull, getGrowthRow: async () => null,
  getFichesByCategory: async () => [],
}))
vi.mock('@/lib/free-tier', () => ({ getFreeTickers }))
vi.mock('@/lib/entitlement', () => ({ getEntitlement }))
vi.mock('@/lib/supabase-auth', () => ({ createSupabaseAuthServer: async () => ({}) }))

async function renderPage(ticker: string) {
  const { default: Page } = await import('@/app/wealth/[ticker]/page')
  const el = await Page({ params: Promise.resolve({ ticker }) })
  return renderToStaticMarkup(el)
}

describe('/wealth/[ticker] gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFicheSummary.mockResolvedValue(summary)
    getFicheFull.mockResolvedValue(full)
    getFreeTickers.mockResolvedValue(['AAA'])
    getEntitlement.mockResolvedValue('guest')
  })

  describe('guest on a locked ticker', () => {
    it('shows neither the verdict text nor the reason', async () => {
      const html = await renderPage('ZZZ')
      expect(html).not.toContain('MAINTENIR')
      expect(html).not.toContain(REASON)
    })

    it('shows no prose', async () => {
      const html = await renderPage('ZZZ')
      expect(html).not.toContain(PROSE)
    })

    it('renders the neutral MEMBRES chip', async () => {
      const html = await renderPage('ZZZ')
      expect(html).toContain('MEMBRES')
    })

    it('never fetches the full fiche', async () => {
      await renderPage('ZZZ')
      expect(getFicheFull).not.toHaveBeenCalled()
      expect(getFicheSummary).toHaveBeenCalledWith('ZZZ')
    })
  })

  describe('guest on a free-five ticker', () => {
    beforeEach(() => {
      getFreeTickers.mockResolvedValue(['ZZZ'])
    })

    it('shows the verdict and its reason', async () => {
      const html = await renderPage('ZZZ')
      expect(html).toContain('MAINTENIR')
      expect(html).toContain(REASON)
    })

    it('does not show the prose', async () => {
      const html = await renderPage('ZZZ')
      expect(html).not.toContain(PROSE)
    })

    it('never fetches the full fiche', async () => {
      await renderPage('ZZZ')
      expect(getFicheFull).not.toHaveBeenCalled()
    })
  })

  describe('paid on any ticker', () => {
    beforeEach(() => {
      getEntitlement.mockResolvedValue('paid')
    })

    it('shows verdict, reason and prose', async () => {
      const html = await renderPage('ZZZ')
      expect(html).toContain('MAINTENIR')
      expect(html).toContain(REASON)
      expect(html).toContain(PROSE)
      expect(getFicheFull).toHaveBeenCalledWith('ZZZ')
    })
  })

  describe('signed-in non-member on a locked ticker', () => {
    beforeEach(() => {
      getEntitlement.mockResolvedValue('free')
    })

    it('is treated exactly like a guest: no verdict, no reason, no prose', async () => {
      const html = await renderPage('ZZZ')
      expect(html).not.toContain('MAINTENIR')
      expect(html).not.toContain(REASON)
      expect(html).not.toContain(PROSE)
      expect(getFicheFull).not.toHaveBeenCalled()
    })
  })
})
