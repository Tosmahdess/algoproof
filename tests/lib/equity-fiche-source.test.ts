import { describe, it, expect, vi, beforeEach } from 'vitest'

// SEC-02. The application layer already redacts correctly — equity-fiche-columns
// pins that the summary reader never asks for a prose column. That guard filters
// the tap; this one closes the valve next to it.
//
// Measured on production 2026-09-03: the shipped bundle carries TWO createClient
// calls on the same project and the same publishable key. One is the identity
// client (cookieOptions `sb-algoproof-auth`), legitimately public. The other is
// bare — `src/lib/supabase.ts`, the CONTENT client, pulled in by MiRegimeBadge
// ('use client') through @/lib/queries. Identity and content are ONE Supabase
// project, so every visitor holds a key that reads `equity_fiches`, whose policy
// is still `FOR SELECT USING (true)`.
//
// The fix is redaction in SQL, per project_engine_verdicts_exposure: a view that
// simply does not carry the prose, and the base table revoked from anon. NOT a
// column-level revoke — that is fail-open, the next column added is readable the
// day it is created, which is exactly how that incident grew from one surface to
// three.
//
// So the invariant this file pins: anything a guest can reach reads the VIEW,
// and the only reader of the base table is the one holding a privileged key.
const PUBLIC_VIEW = 'equity_fiches_public'
const BASE_TABLE = 'equity_fiches'

type Call = { client: 'anon' | 'admin'; table: string }
const calls: Call[] = []

function chain(client: 'anon' | 'admin') {
  return (table: string) => {
    calls.push({ client, table })
    // Chainable AND awaitable: some readers stop at .order(), others go on to
    // .limit(). Same thenable shape the repo already uses in equity.test.ts.
    const p = Promise.resolve({ data: [{ ticker: 'AAA' }], error: null })
    const c: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'order', 'limit']) c[m] = () => c
    return Object.assign(c, { then: p.then.bind(p) })
  }
}

// vi.hoisted so the factory below can read it: vi.mock is lifted above every
// top-level const, and a plain `let` here would be in the temporal dead zone.
const state = vi.hoisted(() => ({ adminThrows: false }))

vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: chain('anon') } }))
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    if (state.adminThrows) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
    return { from: chain('admin') }
  },
}))

beforeEach(() => {
  vi.resetModules()
  calls.length = 0
  state.adminThrows = false
})

describe('which source each fiche reader reads', () => {
  // Every reader a guest can trigger. Named one by one rather than looped over
  // the module's exports: a reader added later should make someone choose a
  // side deliberately, not inherit whichever side the loop happened to assert.
  const GUEST_READERS: [string, (m: Record<string, (t?: string) => unknown>) => unknown][] = [
    ['getFicheSummary', (m) => m.getFicheSummary('AAA')],
    ['getCoveredFiches', (m) => m.getCoveredFiches()],
    ['getAllFiches', (m) => m.getAllFiches()],
    ['getFicheSitemapData', (m) => m.getFicheSitemapData()],
  ]

  for (const [name, run] of GUEST_READERS) {
    it(`${name} reads the redacted view, never the base table`, async () => {
      const mod = await import('@/lib/equity')
      await run(mod as unknown as Record<string, (t?: string) => unknown>)
      const touched = calls.filter((c) => c.table.startsWith('equity_fiches'))
      expect(touched.length, `${name} read no fiche source at all`).toBeGreaterThan(0)
      for (const c of touched) {
        expect(c.table, `${name} must not read ${BASE_TABLE} directly`).toBe(PUBLIC_VIEW)
      }
    })
  }

  it('the free-five selector reads the redacted view too', async () => {
    const { getFreeTickers } = await import('@/lib/free-tier')
    await getFreeTickers()
    const touched = calls.filter((c) => c.table.startsWith('equity_fiches'))
    expect(touched.length).toBeGreaterThan(0)
    for (const c of touched) expect(c.table).toBe(PUBLIC_VIEW)
  })

  it('the prose reader is the ONLY one on the base table, and holds the privileged key', async () => {
    const { getFicheFull } = await import('@/lib/equity')
    await getFicheFull('AAA')
    const touched = calls.filter((c) => c.table.startsWith('equity_fiches'))
    expect(touched).toEqual([{ client: 'admin', table: BASE_TABLE }])
  })
})

describe('a missing privileged key degrades, loudly', () => {
  // The repo already settled this shape once: getEntitlement used to answer
  // 'guest' in silence, and the fix was to JOURNAL what it caught, not to stay
  // quiet and not to throw. A raw throw here 500s the fiche page for a paying
  // member; swallowing it hides a misconfiguration for as long as nobody looks.
  // So: locked page, and a named line in the log.
  it('getFicheFull returns null and names itself in the log', async () => {
    state.adminThrows = true
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getFicheFull } = await import('@/lib/equity')

    await expect(getFicheFull('AAA')).resolves.toBeNull()

    expect(spy).toHaveBeenCalledTimes(1)
    const line = String(spy.mock.calls[0][0])
    // Named, so a launch-week log search finds it without knowing the cause.
    expect(line).toContain('getFicheFull')
    expect(line).toContain('SUPABASE_SERVICE_ROLE_KEY')
    spy.mockRestore()
  })

  it('a locked guest never reaches the privileged client at all', async () => {
    // The guard that matters for cost as well as safety: a guest must not make
    // the page try, fail and log on every request.
    state.adminThrows = true
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getFicheSummary } = await import('@/lib/equity')
    await getFicheSummary('AAA')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('the privileged client fails CLOSED', () => {
  // A missing service-role key must lock the page, never open it. The vault has
  // paid for the other direction twice: an empty secret that still "verified"
  // against the empty string. So: absent key -> no prose, loudly, and a paying
  // member sees the lock rather than the site serving the corpus with the
  // publishable key because someone kept a fallback.
  it('getSupabaseAdmin throws when the key is absent rather than falling back', async () => {
    // NO vi.unmock here: vitest hoists vi.mock AND vi.unmock to the top of the
    // file, so unmocking inside this test cancelled the mock for every test
    // above it. importActual already bypasses the mock, which is all we need.
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { getSupabaseAdmin } = await vi.importActual<typeof import('@/lib/supabase-admin')>(
      '@/lib/supabase-admin',
    )
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    vi.unstubAllEnvs()
  })
})
