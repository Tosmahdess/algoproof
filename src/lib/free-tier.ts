export type FreeTierFiche = { ticker: string; verdict: string }
export type FreeTierMarket = {
  ticker: string
  signal_level: string | null
  drawdown_pct: number | null
}
export type FreeTierInput = { fiches: FreeTierFiche[]; universe: FreeTierMarket[] }

// Same ranking as the Top picks have always used: signal strength first, then
// how deep the drawdown is. Spec 2.1: this is a ranking by entry condition, not
// by past performance or by an upside target.
const SIGNAL_RANK: Record<string, number> = { crash: 3, major: 2, minor: 1 }

/** The five companies whose fiche is open without a membership. Pure: the
 *  server reads the two tables, this decides. */
export function selectFreeTickers(input: FreeTierInput, limit = 5): string[] {
  const market = new Map(input.universe.map((m) => [m.ticker, m]))
  const candidates = input.fiches
    .filter((f) => f.verdict === 'renforcer')
    .map((f) => ({ ticker: f.ticker, m: market.get(f.ticker) }))
    .filter((c): c is { ticker: string; m: FreeTierMarket } => c.m !== undefined)

  const rank = (c: { m: FreeTierMarket }) => SIGNAL_RANK[c.m.signal_level ?? ''] ?? 0
  const depth = (c: { m: FreeTierMarket }) => c.m.drawdown_pct ?? 0

  // Signalled names first, deepest drawdown first inside a signal tier. When
  // the market is high and nothing is signalled, fall back to the renforcer
  // names closest to a trough, so the free five are never empty on a good day.
  candidates.sort((a, b) => (rank(b) - rank(a)) || (depth(a) - depth(b)))
  return candidates.slice(0, limit).map((c) => c.ticker)
}

/** Server-side reader. Uses the CONTENT client: both tables live in this
 *  site's own Supabase project, not in the identity one. */
export async function getFreeTickers(limit = 5): Promise<string[]> {
  const { supabaseServer } = await import('@/lib/supabase-server')
  const [fichesRes, universeRes] = await Promise.all([
    supabaseServer
      .from('equity_fiches')
      .select('ticker,verdict,thesis_version')
      .order('thesis_version', { ascending: false }),
    supabaseServer.from('growth_universe').select('ticker,signal_level,drawdown_pct'),
  ])
  const seen = new Map<string, FreeTierFiche>()
  for (const r of (fichesRes.data ?? []) as Array<FreeTierFiche & { thesis_version: number }>) {
    if (!seen.has(r.ticker)) seen.set(r.ticker, { ticker: r.ticker, verdict: r.verdict })
  }
  return selectFreeTickers(
    { fiches: [...seen.values()], universe: (universeRes.data ?? []) as FreeTierMarket[] },
    limit,
  )
}
