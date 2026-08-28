import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const PROSE = 'CETTE-PHRASE-EST-PAYANTE'
const summary = {
  ticker: 'ZZZ', ticker_yf: 'ZZZ', asset_name: 'Zeta', category: 'tech',
  generated_at: '2026-08-02T00:00:00Z', thesis_version: 3,
  price_at_generation: 100, verdict: 'maintenir', verdict_reason: 'raison Z',
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

  it('never puts the paid prose in the markup for a guest on a locked ticker', async () => {
    const html = await renderPage('ZZZ')
    expect(html).not.toContain(PROSE)
  })

  it('never even fetches it', async () => {
    await renderPage('ZZZ')
    expect(getFicheFull).not.toHaveBeenCalled()
    expect(getFicheSummary).toHaveBeenCalledWith('ZZZ')
  })

  it('still shows the name, the verdict and its reason', async () => {
    const html = await renderPage('ZZZ')
    expect(html).toContain('Zeta')
    expect(html).toContain('raison Z')
  })

  it('opens the prose on one of the free five', async () => {
    getFreeTickers.mockResolvedValue(['ZZZ'])
    const html = await renderPage('ZZZ')
    expect(html).toContain(PROSE)
    expect(getFicheFull).toHaveBeenCalledWith('ZZZ')
  })

  it('opens the prose for a member on any ticker', async () => {
    getEntitlement.mockResolvedValue('paid')
    const html = await renderPage('ZZZ')
    expect(html).toContain(PROSE)
  })

  it('treats a signed-in non-member like a guest', async () => {
    getEntitlement.mockResolvedValue('free')
    const html = await renderPage('ZZZ')
    expect(html).not.toContain(PROSE)
  })
})
