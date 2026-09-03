import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.fn() with no explicit generic infers a zero-length parameter tuple, so
// `selectSpy.mock.calls[0][0]` would not type-check under `npx tsc --noEmit`.
// Giving the mock an explicit (..._args: unknown[]) signature keeps the call
// record typed as unknown[], and we narrow to string only at the read site.
const selectSpy = vi.fn((..._args: unknown[]) => {})
function chain() {
  const c: Record<string, unknown> = {}
  c.select = (cols: string) => { selectSpy(cols); return c }
  c.eq = () => c
  c.order = () => c
  c.limit = async () => ({ data: [{ ticker: 'AAA' }], error: null })
  return c
}
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: () => chain() } }))
// The prose reader holds the privileged client since SEC-02; it must still be
// observable here, because this file is what pins that it asks for the prose.
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: () => chain() }) }))

const PROSE = ['fondamentaux', 'valorisation', 'momentum', 'risques']

describe('fiche column lists', () => {
  beforeEach(() => { vi.resetModules(); selectSpy.mockClear() })

  it('the summary reader asks for no prose column, and no star', async () => {
    const { getFicheSummary } = await import('@/lib/equity')
    await getFicheSummary('AAA')
    const cols = selectSpy.mock.calls[0][0] as string
    expect(cols).not.toBe('*')
    for (const p of PROSE) expect(cols).not.toContain(p)
  })

  it('the summary reader still carries what a locked page has to show', async () => {
    const { getFicheSummary } = await import('@/lib/equity')
    await getFicheSummary('AAA')
    const cols = selectSpy.mock.calls[0][0] as string
    for (const c of ['ticker', 'asset_name', 'category', 'verdict', 'verdict_reason', 'generated_at', 'price_at_generation']) {
      expect(cols).toContain(c)
    }
  })

  it('the full reader does ask for the prose', async () => {
    const { getFicheFull } = await import('@/lib/equity')
    await getFicheFull('AAA')
    const cols = selectSpy.mock.calls[0][0] as string
    for (const p of PROSE) expect(cols).toContain(p)
  })
})
