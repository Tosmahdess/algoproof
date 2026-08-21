# Register Slice by Side and Asset — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/overview`, let a visitor pick a trade side (long / short) and/or assets, and see every bot's PF / WR / drawdown / P&L / n **recomputed on that slice**; and stop repeating a per-strategy description on the fiche of every engine bot.

**Architecture:** A pure `sliceBotStats()` in `src/lib/stats.ts` wraps the existing `computeBotStats()`. `FleetRegister` maps its filtered bots through it before sorting/grouping; `BotTable` is untouched and renders « — » for an empty slice because `total_trades === 0` already means that. `side` joins the URL facet state in `src/lib/bot-filters.ts` with the same parse/serialize/robots discipline as the other facets. The fiche swaps `bot.description` for a link to the concept page when the bot is engine-originated and a concept resolves.

**Tech Stack:** Next.js App Router (server + client components), TypeScript, vitest + @testing-library/react (jsdom). Run tests with `npx vitest run <file>` from the repo root; typecheck with `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-08-21-register-side-asset-slice-design.md`

## Global Constraints

- Sort behaviour is unchanged: no new sort key, no change to `groupByTimeframe` / `byGainDesc` / `EMPTY_FILTERS.sort`.
- `BotTable.tsx`, `queries.ts`, `fleet-aggregate.ts`, the publisher (`algoproof_sync.py`) and Supabase migrations are **not** modified.
- Default view must stay bit-identical: with `side === 'all'` and no asset, `sliceBotStats` returns the **same object** as `bot.stats`.
- Every URL facet in `PARAM_ORDER` has a `/*?<name>=` line in `src/app/robots.ts` (existing test `tests/lib/robots-facets.test.ts` enforces it).
- Tailwind: only theme colours already used in `FleetFilterBar.tsx` (`bg-bg`, `bg-card`, `text-muted`, `border-border`, `bg-accent`, `text-bg`). No new colour tokens.
- User-facing copy is French. Code, comments and commit messages are English.
- Commit after each task. Do not push to `main` (a push to `main` deploys the site); work stays on `session/register-slice-0821`.

---

### Task 1: `sliceBotStats` — the pure slice recompute

**Files:**
- Modify: `src/lib/stats.ts` (append after `computeBotStats`, before `sideLabel`)
- Test: `tests/lib/stats.test.ts` (append a new `describe` at the end)

**Interfaces:**
- Consumes: `computeBotStats(allTrades, perfDaily, filter: DirectionFilter, startCapital, asset: AssetFilter)` and `DirectionFilter = 'all' | 'long' | 'short'` (both already in `stats.ts`); `toBaseAsset(raw: string): string` from `src/lib/asset.ts`; `BotStats`, `Trade`, `PerfDaily` from `src/lib/types.ts`.
- Produces: `export type SideFilter = DirectionFilter` and
  `export function sliceBotStats(bot: { stats: BotStats; all_trades: Trade[]; perf_daily: PerfDaily[]; start_capital: number }, side: SideFilter, assets: readonly string[]): BotStats`.
  Task 3 calls it with `(b, state.side, state.asset)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/stats.test.ts` (the file already defines `makeTrade`, `makeAssetTrade`, `trades`, `perfDaily` at the top — reuse them; add `sliceBotStats` to the existing import line from `@/lib/stats`):

```ts
describe('sliceBotStats', () => {
  const bot = {
    stats: { win_rate: 0.6, profit_factor: 2.0, max_drawdown: 0.05, total_trades: 5, latest_capital: 1040 },
    all_trades: trades,
    perf_daily: perfDaily,
    start_capital: 1000,
  }

  it('returns the SAME stats object when nothing is sliced — the default view is bit-identical', () => {
    expect(sliceBotStats(bot, 'all', [])).toBe(bot.stats)
  })

  it('recomputes on the short side only', () => {
    const s = sliceBotStats(bot, 'short', [])
    // shorts: +20, -15
    expect(s.total_trades).toBe(2)
    expect(s.win_rate).toBeCloseTo(0.5)
    expect(s.profit_factor).toBeCloseTo(20 / 15)
    expect(s.latest_capital).toBeCloseTo(1005)
  })

  it('recomputes on one asset, matching through toBaseAsset on both sides', () => {
    const mixed = {
      ...bot,
      all_trades: [
        makeAssetTrade('a', 'BTC/USDT:USDT', +10),
        makeAssetTrade('b', 'ETH/USDT', -4),
        makeAssetTrade('c', 'BTC-USDT', +6),
      ],
    }
    const s = sliceBotStats(mixed, 'all', ['btc'])
    expect(s.total_trades).toBe(2)
    expect(s.latest_capital).toBeCloseTo(1016)
  })

  it('takes the UNION of several assets', () => {
    const mixed = {
      ...bot,
      all_trades: [
        makeAssetTrade('a', 'BTC/USDT', +10),
        makeAssetTrade('b', 'ETH/USDT', -4),
        makeAssetTrade('c', 'SOL/USDT', +6),
      ],
    }
    const s = sliceBotStats(mixed, 'all', ['BTC', 'SOL'])
    expect(s.total_trades).toBe(2)
    expect(s.latest_capital).toBeCloseTo(1016)
  })

  it('combines side and asset', () => {
    const mixed = {
      ...bot,
      all_trades: [
        { ...makeAssetTrade('a', 'BTC/USDT', +10), side: 'short' as const },
        { ...makeAssetTrade('b', 'BTC/USDT', -4), side: 'long' as const },
        { ...makeAssetTrade('c', 'ETH/USDT', +6), side: 'short' as const },
      ],
    }
    const s = sliceBotStats(mixed, 'short', ['BTC'])
    expect(s.total_trades).toBe(1)
    expect(s.latest_capital).toBeCloseTo(1010)
  })

  it('an empty slice is an empty slice: 0 trades, capital untouched, never a fake PF', () => {
    const longsOnly = { ...bot, all_trades: trades.filter(t => t.side === 'long') }
    const s = sliceBotStats(longsOnly, 'short', [])
    expect(s.total_trades).toBe(0)
    expect(s.latest_capital).toBe(1000)
    expect(s.profit_factor).toBe(0)
    expect(s.win_rate).toBe(0)
    expect(s.max_drawdown).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/stats.test.ts`
Expected: FAIL — `sliceBotStats` is not exported from `@/lib/stats` (import error / `undefined is not a function`).

- [ ] **Step 3: Implement `sliceBotStats`**

In `src/lib/stats.ts`, add the type alias right after `export type DirectionFilter = ...`:

```ts
/** The register's side facet. Same three values as the fiche's direction
 *  switch — one vocabulary for "which side of the trades are we looking at". */
export type SideFilter = DirectionFilter
```

and append after `computeBotStats` (before `sideLabel`):

```ts
/**
 * The register's slice: a bot's stats recomputed on its trades of one side
 * and/or one or more assets. Wraps computeBotStats so the fiche's selector
 * and the register's pills compute the same numbers from the same trades.
 *
 * - No slice (`side === 'all'`, no asset) returns `bot.stats` ITSELF — the
 *   server-computed stats, by reference. The default view must stay
 *   bit-identical to what the page rendered before the slice existed; a test
 *   pins the identity, not just equality.
 * - Several assets are a UNION. computeBotStats only knows one asset, so the
 *   asset pre-filter happens here and `'all'` is passed down for that axis;
 *   the side still goes through computeBotStats so the drawdown/capital
 *   reconstruction path ("isFiltered") is taken whenever anything is sliced.
 * - An empty slice yields total_trades 0 / latest_capital = start_capital /
 *   PF 0 — which BotTable renders as « — », never as a zero performance.
 */
export function sliceBotStats(
  bot: { stats: BotStats; all_trades: Trade[]; perf_daily: PerfDaily[]; start_capital: number },
  side: SideFilter,
  assets: readonly string[],
): BotStats {
  if (side === 'all' && assets.length === 0) return bot.stats
  const wanted = new Set(assets.map(a => toBaseAsset(a)))
  const pool = wanted.size === 0
    ? bot.all_trades
    : bot.all_trades.filter(t => wanted.has(toBaseAsset(t.asset)))
  // Passing an EMPTY perf_daily forces computeBotStats onto its
  // reconstruct-from-trades path for capital (start + Σ pnl) even when
  // `side === 'all'`; drawdown on that path comes from the trade sequence
  // (computeDrawdownFromTrades) only when computeBotStats sees a filter, so
  // apply the side there and, for the side-'all'-with-asset case, recompute
  // the drawdown from the pool explicitly.
  const stats = computeBotStats(pool, [], side, bot.start_capital, 'all')
  if (side !== 'all') return stats
  return { ...stats, max_drawdown: computeDrawdownFromTrades(pool) }
}
```

`computeDrawdownFromTrades` already exists in the file (module-private, ~line 37); `sliceBotStats` must be placed in the same module so it can call it. **Do not** pass `bot.perf_daily` into the slice: the global curve is not a baseline for a subset of trades (same reasoning as `computeBotStats`'s own comment).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/stats.test.ts`
Expected: PASS, all existing `stats` tests still green plus the 6 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts tests/lib/stats.test.ts
git commit -m "feat(stats): sliceBotStats recomputes a bot's stats on one side and/or assets"
```

---

### Task 2: `side` joins the facet state, URL and robots

**Files:**
- Modify: `src/lib/bot-filters.ts` (state, parse, serialize, `PARAM_ORDER`, `optionCounts`, `activeFilterCount`, the I5 comment)
- Modify: `src/app/robots.ts:21-30` (disallow list)
- Test: `tests/lib/bot-filters.test.ts` (append), `tests/lib/robots-facets.test.ts` (unchanged — it must stay green)

**Interfaces:**
- Consumes: `SideFilter` from `@/lib/stats` (Task 1). `mkBot`, `FIXTURE_FLEET` from `tests/fixtures/bots` (`mkBot(over)` returns a full `BotWithStats` with `all_trades: []` by default).
- Produces:
  - `FleetFilterState.side: SideFilter` (default `'all'`; `EMPTY_FILTERS.side === 'all'`).
  - `PARAM_ORDER = ['family', 'status', 'asset', 'side', 'tf', 'sort', 'dir'] as const`.
  - `FilterableBot.all_trades?: ReadonlyArray<{ side: 'long' | 'short' }>` (optional; register bots always carry it).
  - `OptionCounts.side: { long: number; short: number }` — bots with ≥ 1 trade of that side, counted against the other facets.
  - `activeFilterCount` counts `side !== 'all'` as 1.
  - `describeEmptyResult` unchanged (side is a slice, never a predicate, so it can never empty the list).

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/bot-filters.test.ts` (add `PARAM_ORDER` to the existing import from `@/lib/bot-filters` if not already imported; `mkBot` and `FIXTURE_FLEET` are already imported):

```ts
describe('side facet (slice, not predicate)', () => {
  it('defaults to all and parses long / short', () => {
    expect(EMPTY_FILTERS.side).toBe('all')
    expect(parseFleetFilters(new URLSearchParams('side=short')).side).toBe('short')
    expect(parseFleetFilters(new URLSearchParams('side=long')).side).toBe('long')
  })

  it('drops an unknown side value instead of trusting it', () => {
    expect(parseFleetFilters(new URLSearchParams('side=sideways')).side).toBe('all')
  })

  it('round-trips and never serialises the default', () => {
    const s = { ...EMPTY_FILTERS, side: 'short' as const, asset: ['BTC'] }
    const qs = serializeFleetFilters(s).toString()
    expect(qs).toBe('asset=BTC&side=short')
    expect(parseFleetFilters(new URLSearchParams(qs))).toEqual(s)
    expect(serializeFleetFilters({ ...EMPTY_FILTERS, side: 'all' }).toString()).toBe('')
  })

  it('sits between asset and tf in PARAM_ORDER', () => {
    expect([...PARAM_ORDER]).toEqual(['family', 'status', 'asset', 'side', 'tf', 'sort', 'dir'])
  })

  it('counts as one active filter', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, side: 'long' })).toBe(1)
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
  })

  it('does NOT remove bots from the list — a bot with no short keeps its row', () => {
    const longsOnly = mkBot({ all_trades: [] })
    expect(applyFleetFilters([longsOnly], { ...EMPTY_FILTERS, side: 'short' })).toHaveLength(1)
  })

  it('counts bots by the presence of trades on that side, not by existence', () => {
    const t = (side: 'long' | 'short') => ({
      id: `t-${side}`, bot_id: 'x', opened_at: '2026-05-01T00:00:00Z', closed_at: '2026-05-01T01:00:00Z',
      asset: 'BTC/USDT', side, pnl: 1, reason: null, is_paper: true, entry_price: null, exit_price: null,
    })
    const both = mkBot({ all_trades: [t('long'), t('short')] })
    const longOnly = mkBot({ all_trades: [t('long')] })
    const none = mkBot({ all_trades: [] })
    const counts = optionCounts([both, longOnly, none], EMPTY_FILTERS)
    expect(counts.side).toEqual({ long: 2, short: 1 })
  })

  it('a bot without all_trades counts for neither side (no vacuous count)', () => {
    const bare = { family: 'trend' as const, status: 'paper', assets: ['BTC'], timeframe: 'H4' }
    expect(optionCounts([bare], EMPTY_FILTERS).side).toEqual({ long: 0, short: 0 })
  })

  it('side counts respect the OTHER facets (family narrows them)', () => {
    const t = (side: 'long' | 'short') => ({
      id: `t-${side}`, bot_id: 'x', opened_at: '2026-05-01T00:00:00Z', closed_at: '2026-05-01T01:00:00Z',
      asset: 'BTC/USDT', side, pnl: 1, reason: null, is_paper: true, entry_price: null, exit_price: null,
    })
    const trend = mkBot({ family: 'trend', all_trades: [t('short')] })
    const breakout = mkBot({ family: 'breakout', all_trades: [t('short')] })
    const counts = optionCounts([trend, breakout], { ...EMPTY_FILTERS, family: ['trend'] })
    expect(counts.side.short).toBe(1)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/bot-filters.test.ts tests/lib/robots-facets.test.ts`
Expected: the new `side facet` tests FAIL (`side` undefined / `PARAM_ORDER` mismatch); `robots-facets` still passes for now (it only checks existing entries).

- [ ] **Step 3: Implement in `bot-filters.ts`**

Replace the I5 comment block (lines 22-31) with:

```ts
// The side facet is a SLICE, not a predicate. Choosing « short » keeps every
// bot in the register and recomputes each row's stats on its short trades
// (FleetRegister → sliceBotStats); a bot with no short shows « — ». That is
// why `side` is absent from PREDICATES and from describeEmptyResult: it can
// never empty the list, so it can never be blamed for an empty one. Its
// option counts, by contrast, DO depend on trades — a pill says how many bots
// have at least one trade on that side, against the other facets.
//
// History (final review, I5): an earlier `direction` / `dir_trade` parameter
// lived here with a comment promising a recompute that FleetRegister never
// did. It was deleted for that reason; this is the version that does it.
import type { SideFilter } from './stats'
```

(Keep the `import ... from './stats'` next to the other imports at the top of the file — move it up.)

Then:

```ts
export interface FleetFilterState {
  family: Family[]
  status: FleetStatusFilter[]
  asset: string[]
  side: SideFilter
  timeframe: string[]
  sort: SortKey
  dir: SortDir
}

export const EMPTY_FILTERS: FleetFilterState = {
  family: [], status: [], asset: [], side: 'all', timeframe: [],
  sort: 'proven', dir: 'desc',
}

export interface FilterableBot {
  family: Family
  status: string
  assets: string[]
  timeframe: string
  /** Present on register bots (BotWithStats). Used only by optionCounts.side. */
  all_trades?: ReadonlyArray<{ side: 'long' | 'short' }>
}

export const PARAM_ORDER = ['family', 'status', 'asset', 'side', 'tf', 'sort', 'dir'] as const
```

In `parseFleetFilters`, add after `asset:`:

```ts
    side: (() => { const v = sp.get('side'); return v === 'long' || v === 'short' ? v : 'all' })(),
```

In `serializeFleetFilters`' `values`, add after `asset:`:

```ts
    side: s.side === EMPTY_FILTERS.side ? '' : s.side,
```

In `OptionCounts` add `side: { long: number; short: number }`, and in `optionCounts` before the `return`:

```ts
  // Side counts: bots with at least one trade on that side, against the other
  // facets. `side` is not a PREDICATE (see header), so there is nothing to
  // skip — `applyFleetFilters` is the right base. A bot without `all_trades`
  // (a caller that built a bare FilterableBot) contributes to neither.
  const side = { long: 0, short: 0 }
  for (const b of applyFleetFilters(bots, s)) {
    const ts = b.all_trades ?? []
    if (ts.some(t => t.side === 'long')) side.long += 1
    if (ts.some(t => t.side === 'short')) side.short += 1
  }

  return { family, status, timeframe, side }
```

`activeFilterCount`:

```ts
export function activeFilterCount(s: FleetFilterState): number {
  return s.family.length + s.status.length + s.asset.length + s.timeframe.length
    + (s.side === 'all' ? 0 : 1)
}
```

In `src/app/robots.ts`, insert `'/*?side=',` between `'/*?asset=',` and `'/*?tf=',`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/bot-filters.test.ts tests/lib/robots-facets.test.ts`
Expected: PASS. Then `npx tsc --noEmit` — expect errors only where `FleetFilterState` literals are built without `side` (e.g. `src/app/__tests__/overview.test.tsx` fixtures, `FleetFilterBar` has none). Fix each by spreading `EMPTY_FILTERS` or adding `side: 'all'`; re-run `tsc` until clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot-filters.ts src/app/robots.ts tests/lib/bot-filters.test.ts
git commit -m "feat(filters): side facet as a slice — state, URL, counts, robots"
```

---

### Task 3: Pills and the recompute in the register

**Files:**
- Modify: `src/components/FleetFilterBar.tsx` (props + one pill group)
- Modify: `src/components/FleetRegister.tsx` (toggleSide, viewBots)
- Test: `src/components/__tests__/FleetRegister.side.test.tsx` (create)

**Interfaces:**
- Consumes: `sliceBotStats(b, side, assets)` (Task 1); `FleetFilterState.side`, `OptionCounts.side`, `activeFilterCount` (Task 2); existing `applyFleetFilters`, `optionCounts`, `groupByTimeframe`, `byGainDesc`, `BotTable`.
- Produces: `FleetFilterBar` gains prop `onToggleSide: (side: 'long' | 'short') => void`. Register rows render sliced stats.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/FleetRegister.side.test.tsx`:

```tsx
// The side pills must change what the rows SHOW, not just the URL. The old
// `direction` parameter failed exactly this (bot-filters.ts header): it
// round-tripped and rendered nothing. This test clicks « Short » and reads
// the trade count cell of a known row.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import type { Trade } from '@/lib/types'

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

import FleetRegister from '@/components/FleetRegister'

const t = (id: string, side: 'long' | 'short', pnl: number): Trade => ({
  id, bot_id: 'x', opened_at: '2026-05-01T00:00:00Z', closed_at: `2026-05-0${id}T01:00:00Z`,
  asset: 'BTC/USDT', side, pnl, reason: null, is_paper: true, entry_price: null, exit_price: null,
})

// mkBot takes Partial<BotWithStats>, so `stats` must be a FULL BotStats.
const alpha = mkBot({
  name: 'Alpha Slice Bot',
  stats: { win_rate: 1, profit_factor: 999, max_drawdown: 0, total_trades: 3, latest_capital: 1030 },
  all_trades: [t('1', 'long', 10), t('2', 'long', 15), t('3', 'short', 5)],
})
const beta = mkBot({
  name: 'Beta Longs Only',
  stats: { win_rate: 1, profit_factor: 999, max_drawdown: 0, total_trades: 2, latest_capital: 1020 },
  all_trades: [t('1', 'long', 10), t('2', 'long', 10)],
})

function rowOf(name: string): HTMLElement {
  const cell = screen.getByText(name)
  const row = cell.closest('tr')
  if (!row) throw new Error(`no <tr> for ${name}`)
  return row
}

describe('FleetRegister — side slice', () => {
  it('shows server stats by default and the short slice after clicking « Short »', () => {
    render(<FleetRegister bots={[alpha, beta]} initialState={EMPTY_FILTERS} />)
    // Filters live in a closed <details>; open it.
    fireEvent.click(screen.getByText(/Filtrer la flotte/))

    expect(within(rowOf('Alpha Slice Bot')).getByText(/^3( ⚠)?$/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Short \(/ }))

    // Alpha: 1 short. Beta: none → « — » in the stats cells, still listed.
    expect(within(rowOf('Alpha Slice Bot')).getByText(/^1( ⚠)?$/)).toBeInTheDocument()
    expect(rowOf('Beta Longs Only')).toBeInTheDocument()
    expect(within(rowOf('Beta Longs Only')).getAllByText('—').length).toBeGreaterThan(0)
    // The pill counts bots with ≥1 short: only Alpha.
    expect(screen.getByRole('button', { name: /^Short \(1\)/ })).toHaveAttribute('aria-pressed', 'true')
    expect(window.location.search).toContain('side=short')
  })

  it('clicking the active side pill returns to all', () => {
    render(<FleetRegister bots={[alpha, beta]} initialState={{ ...EMPTY_FILTERS, side: 'short' }} />)
    fireEvent.click(screen.getByText(/Filtrer la flotte/))
    fireEvent.click(screen.getByRole('button', { name: /^Short \(/ }))
    expect(within(rowOf('Alpha Slice Bot')).getByText(/^3( ⚠)?$/)).toBeInTheDocument()
    expect(window.location.search).not.toContain('side=')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/FleetRegister.side.test.tsx`
Expected: FAIL — no button matching `/^Short \(/`.

- [ ] **Step 3: Implement the pill group in `FleetFilterBar.tsx`**

Add to `Props`:

```ts
  onToggleSide: (side: 'long' | 'short') => void
```

Destructure it in the component signature (`state, counts, activeCount, onToggleFamily, onToggleSide, onReset`), and insert this block right after the « Famille » `<div>` (before the venue history comment):

```tsx
        {/* Side is a SLICE (bot-filters.ts header): every row stays, its
            stats are recomputed on that side. The count is "bots with at
            least one trade on this side", so a 0 means the pill would turn
            every row to « — ». Two pills, mutually exclusive; clicking the
            active one returns to all. */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">Sens des trades</div>
          <div className="flex flex-wrap gap-2">
            {(['long', 'short'] as const).map(side => (
              <Pill
                key={side}
                label={side === 'long' ? 'Long' : 'Short'}
                count={counts.side[side]}
                active={state.side === side}
                onClick={() => onToggleSide(side)}
              />
            ))}
          </div>
        </div>
```

- [ ] **Step 4: Implement `toggleSide` and `viewBots` in `FleetRegister.tsx`**

Add the import:

```ts
import { sliceBotStats } from '@/lib/stats'
```

After `toggleFamily`:

```ts
  const toggleSide = useCallback((side: 'long' | 'short') => {
    push({ ...state, side: state.side === side ? 'all' : side })
  }, [state, push])
```

Replace the `timeframeGroups` / `archivedVisible` memos' input: after `filtered`, add

```ts
  // The slice. `filtered` decides WHICH bots are rows; `viewBots` decides
  // what each row SHOWS. With no side and no asset this is `filtered` with
  // the same stats objects (sliceBotStats returns bot.stats by reference), so
  // the default render is unchanged. BotTable is not told about any of this:
  // it renders the stats it is given, and its `total_trades === 0` → « — »
  // rule is what makes an empty slice honest.
  const viewBots = useMemo(
    () => filtered.map(b => ({ ...b, stats: sliceBotStats(b, state.side, state.asset) })),
    [filtered, state.side, state.asset],
  )
```

and change the two memos to read `viewBots` instead of `filtered`:

```ts
  const timeframeGroups = useMemo(
    () => groupByTimeframe(viewBots.filter(b => b.status !== 'archived')),
    [viewBots],
  )
  const archivedVisible = useMemo(
    () => viewBots
      .filter(b => b.status === 'archived')
      .sort(byGainDesc),
    [viewBots],
  )
```

Pass the handler to the bar: `onToggleSide={toggleSide}` next to `onToggleFamily={toggleFamily}`.

Update the stale sentence in `FleetRegister`'s file header (`Filterable (family only — see below)`) to `Filterable (family, and a side slice — see below)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/__tests__/FleetRegister.side.test.tsx src/app/__tests__/overview.test.tsx`
Expected: PASS (both). If `overview.test.tsx` complains about a missing `onToggleSide` in some fixture render of `FleetFilterBar`, add the prop there.

- [ ] **Step 6: Commit**

```bash
git add src/components/FleetFilterBar.tsx src/components/FleetRegister.tsx src/components/__tests__/FleetRegister.side.test.tsx
git commit -m "feat(register): long/short pills recompute every row on the chosen side"
```

---

### Task 4: Thin fiche — engine bots point to their strategy page instead of repeating it

**Files:**
- Modify: `src/app/strategies/bot/[slug]/page.tsx:150-160` (the `functional` slot of `ExplainerBox`)
- Test: `src/app/__tests__/bot-fiche-thin-engine.test.tsx` (create)

**Interfaces:**
- Consumes: `ficheSlugForBot(bot)` (already imported and computed as `conceptSlug` at line 61); `getStrategyFiche(slug): StrategyFiche | null` from `@/lib/strategy-library` (has `.title`); `ExplainerBox` props `functional` / `technical` (unchanged).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Write the failing test**

Create `src/app/__tests__/bot-fiche-thin-engine.test.tsx` (same scaffolding as `bot-fiche-gated-params.test.tsx`):

```tsx
// An engine bot's description is ARMADA_BASE_DESC_FR[base] — the same
// sentence on every bot of that base. The site stops repeating it: when the
// bot resolves to a concept page, the functional tab points there instead.
// A legacy bot keeps its hand-written description.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

const REPEATED = 'Croisement de moyennes de Hull, configuration issue du gantelet du moteur.'
let current = mkBot()

vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => current,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', () => ({
  getProvenanceForBot: async () => null,
}))

import StrategyPage from '@/app/strategies/bot/[slug]/page'

describe('bot fiche — functional tab for engine bots', () => {
  it('links to the concept page and does NOT print the repeated description', async () => {
    current = mkBot({
      slug: 'arm-hmacross-h4-head00',
      origin: 'engine',
      engine_unit_key: 'HMAcross|H4|data_20260802|3',
      description: REPEATED,
    })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.queryByText(REPEATED)).toBeNull()
    const link = screen.getByRole('link', { name: /ce que fait cette stratégie/i })
    expect(link).toHaveAttribute('href', '/strategies/ma-cross')
  })

  it('keeps the description for a legacy bot', async () => {
    current = mkBot({ slug: 'v1-spot', description: 'Texte écrit à la main.' })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.getByText('Texte écrit à la main.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ce que fait cette stratégie/i })).toBeNull()
  })

  it('falls back to the description when an engine base has no concept page', async () => {
    current = mkBot({
      slug: 'arm-williamsvolb-d1-head00',
      origin: 'engine',
      engine_unit_key: 'WilliamsVolBreak|D1|data_20260802|3',
      description: 'Cassure de volatilité selon Larry Williams.',
    })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.getByText('Cassure de volatilité selon Larry Williams.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/__tests__/bot-fiche-thin-engine.test.tsx`
Expected: first test FAILS (repeated description is rendered, no such link); tests 2 and 3 pass already.

- [ ] **Step 3: Implement**

Add the import at the top of `src/app/strategies/bot/[slug]/page.tsx`:

```ts
import { getStrategyFiche } from '@/lib/strategy-library'
```

Replace the `functional={...}` expression (currently `bot.description ? <p>{bot.description}</p> : <p className="text-muted italic">Description disponible prochainement.</p>`) with:

```tsx
          functional={(() => {
            // An engine bot's `description` is one generic sentence per base,
            // identical on every bot of that base (publisher: ARMADA_BASE_DESC_FR).
            // The strategy page already explains how it works, when it works
            // and when it dies — so point there instead of repeating the line
            // 75 times. Legacy bots keep their hand-written text; an engine
            // base with no concept page yet (WilliamsVolBreak) falls back too,
            // because an empty slot would read as "nothing to say".
            const fiche = bot.engine_unit_key && conceptSlug ? getStrategyFiche(conceptSlug) : null
            if (fiche) {
              return (
                <p>
                  Ce bot fait tourner <strong>{fiche.title}</strong>.{' '}
                  <Link href={`/strategies/${conceptSlug}`} className="text-accent underline">
                    Ce que fait cette stratégie, quand elle marche et quand elle meurt →
                  </Link>
                </p>
              )
            }
            return bot.description ? (
              <p>{bot.description}</p>
            ) : (
              <p className="text-muted italic">Description disponible prochainement.</p>
            )
          })()}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/__tests__/bot-fiche-thin-engine.test.tsx src/app/__tests__/bot-fiche-gated-params.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/strategies/bot/[slug]/page.tsx" src/app/__tests__/bot-fiche-thin-engine.test.tsx
git commit -m "feat(fiche): engine bots point to their strategy page instead of repeating its description"
```

---

### Task 5: Whole-suite gate, typecheck, spec amendment

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-register-side-asset-slice-design.md` (one sentence)
- No source changes expected.

- [ ] **Step 1: Amend the spec**

In section 1 of the spec, replace the bullet `describeEmptyResult names the side in its explanation ("… en short").` with:

```
- `describeEmptyResult` is unchanged: side is a slice, never a predicate, so it can never
  empty the list and can never be blamed for an empty one.
```

- [ ] **Step 2: Run the full suite and the typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: all test files pass (baseline before this plan: 106 files / 634 tests; expect 109 files, ~655 tests), `tsc` exit 0. The pre-existing guards `src/lib/__tests__/concurrency.test.ts` and `src/lib/__tests__/queries-cache-size.test.ts` must still be green.

- [ ] **Step 3: Check the default view really is unchanged**

Run: `npx vitest run src/app/__tests__/overview.test.tsx tests/lib/bot-filters.test.ts`
Expected: PASS — these are the tests that render `/overview` with no slice and assert its content.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-21-register-side-asset-slice-design.md
git commit -m "docs(spec): side is a slice, so describeEmptyResult stays as it is"
```

Then stop. **Do not merge to `main` and do not push `main`** — on this repo a push to `main` is the production deploy, which needs the owner's named GO. Push the session branch only:

```bash
git push -u origin session/register-slice-0821
```
