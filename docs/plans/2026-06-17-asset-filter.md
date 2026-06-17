# Asset Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-asset filter (BTC, ETH, SOL…) that recomputes the displayed figures on the four bot/fleet pages of algoproof.fr.

**Architecture:** A pure base-symbol normalizer (`lib/asset.ts`) feeds a shared `<AssetFilterSelect>` dropdown. The existing pure stats functions (`lib/stats.ts`) gain an optional trailing `asset` argument so the four client islands can compose `direction × asset` and recompute everything client-side from `all_trades` — no new Supabase round-trips except adding `asset` to the `/performance` select.

**Tech Stack:** Next.js 14 (App Router, RSC + client islands), TypeScript, Tailwind, Supabase JS, Vitest.

**Reference spec:** `docs/specs/2026-06-17-asset-filter-design.md`

**Verification note:** Local `npm run build` is broken by Avast (Node→Supabase fetch blocked). Validate with `npx tsc --noEmit` + `npx vitest run`. Never claim done without running both.

---

### Task 0: Dedicated branch

**Files:** none (git only)

- [ ] **Step 1: Branch from up-to-date main**

```bash
cd /d/code/algoproof
git fetch origin
git checkout -b feat/asset-filter origin/main
```

Expected: new branch `feat/asset-filter` tracking from `origin/main`.

- [ ] **Step 2: Cherry-pick the spec doc onto the new branch**

The spec was committed on `feat/pages-audit`. Bring just that file over:

```bash
git checkout feat/pages-audit -- docs/specs/2026-06-17-asset-filter-design.md docs/plans/2026-06-17-asset-filter.md
git add docs/specs/2026-06-17-asset-filter-design.md docs/plans/2026-06-17-asset-filter.md
git commit -m "docs: asset filter spec + plan"
```

Expected: spec + plan present on `feat/asset-filter`.

---

### Task 1: `toBaseAsset` normalizer

**Files:**
- Create: `src/lib/asset.ts`
- Test: `tests/lib/asset.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/asset.test.ts
import { describe, it, expect } from 'vitest'
import { toBaseAsset } from '@/lib/asset'

describe('toBaseAsset', () => {
  it('strips hyphen quote', () => {
    expect(toBaseAsset('SOL-USDT')).toBe('SOL')
    expect(toBaseAsset('BTC-USDC')).toBe('BTC')
    expect(toBaseAsset('XAU-USDC')).toBe('XAU')
  })
  it('strips slash quote', () => {
    expect(toBaseAsset('BTC/USDT')).toBe('BTC')
    expect(toBaseAsset('EUR/USD')).toBe('EUR')
  })
  it('keeps bare base symbols', () => {
    expect(toBaseAsset('SOL')).toBe('SOL')
  })
  it('uppercases and trims', () => {
    expect(toBaseAsset(' btc-usdt ')).toBe('BTC')
  })
  it('strips 1000 perp prefix', () => {
    expect(toBaseAsset('1000SHIB/USDT')).toBe('SHIB')
    expect(toBaseAsset('1000PEPE-USDT')).toBe('PEPE')
  })
  it('is defensive on empty input', () => {
    expect(toBaseAsset('')).toBe('UNKNOWN')
    // @ts-expect-error runtime guard
    expect(toBaseAsset(undefined)).toBe('UNKNOWN')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/asset.test.ts`
Expected: FAIL — cannot resolve `@/lib/asset`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/asset.ts

/**
 * Normalize any asset identifier to its base symbol.
 *  'SOL-USDT' -> 'SOL' | 'BTC/USDT' -> 'BTC' | 'XAU-USDC' -> 'XAU'
 *  'EUR/USD'  -> 'EUR' | 'SOL' -> 'SOL' | '1000SHIB/USDT' -> 'SHIB'
 * Defensive: empty/falsy input -> 'UNKNOWN' (must never throw).
 */
export function toBaseAsset(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'UNKNOWN'
  const cleaned = raw.trim().toUpperCase()
  if (!cleaned) return 'UNKNOWN'
  // split on first '/' or '-'
  const base = cleaned.split(/[/-]/)[0]
  if (!base) return 'UNKNOWN'
  // strip leading '1000' perp-contract prefix when a real symbol remains
  const stripped = base.replace(/^1000(?=[A-Z])/, '')
  return stripped || base
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/asset.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset.ts tests/lib/asset.test.ts
git commit -m "feat(asset): toBaseAsset normalizer (base symbol)"
```

---

### Task 2: `assetOptionsFromTrades`

**Files:**
- Modify: `src/lib/asset.ts`
- Test: `tests/lib/asset.test.ts`

- [ ] **Step 1: Write the failing test (append to asset.test.ts)**

```ts
import { assetOptionsFromTrades, type AssetOption } from '@/lib/asset'

describe('assetOptionsFromTrades', () => {
  const trades = [
    { asset: 'SOL-USDT' }, { asset: 'SOL-USDT' }, { asset: 'SOL-USDC' },
    { asset: 'BTC-USDT' }, { asset: 'ETH/USDT' },
  ]
  it('distinct base symbols with counts', () => {
    const opts = assetOptionsFromTrades(trades)
    const sol = opts.find(o => o.value === 'SOL')
    expect(sol).toEqual<AssetOption>({ value: 'SOL', label: 'SOL (3)', count: 3 })
  })
  it('sorts by descending volume', () => {
    const opts = assetOptionsFromTrades(trades)
    expect(opts.map(o => o.value)).toEqual(['SOL', 'BTC', 'ETH'])
  })
  it('handles empty list', () => {
    expect(assetOptionsFromTrades([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/asset.test.ts`
Expected: FAIL — `assetOptionsFromTrades` not exported.

- [ ] **Step 3: Add implementation to `src/lib/asset.ts`**

```ts
export type AssetFilter = string          // 'all' = every asset
export const ALL_ASSETS: AssetFilter = 'all'

export interface AssetOption {
  value: string   // base symbol, e.g. 'BTC'
  label: string   // 'BTC (101)'
  count: number
}

/** Distinct base-symbol options sorted by descending trade volume. */
export function assetOptionsFromTrades(trades: { asset: string }[]): AssetOption[] {
  const counts = new Map<string, number>()
  for (const t of trades) {
    const base = toBaseAsset(t.asset)
    counts.set(base, (counts.get(base) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: `${value} (${count})`, count }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/asset.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset.ts tests/lib/asset.test.ts
git commit -m "feat(asset): assetOptionsFromTrades (volume-sorted options)"
```

---

### Task 3: `filterTrades` gains `asset` param

**Files:**
- Modify: `src/lib/stats.ts:16-19`
- Test: `tests/lib/stats.test.ts`

- [ ] **Step 1: Write the failing test (append to stats.test.ts)**

The existing `makeTrade` hardcodes `asset: 'BTC/USDT'`. Add a small helper and tests:

```ts
import { toBaseAsset } from '@/lib/asset'

const makeAssetTrade = (id: string, asset: string, pnl: number): Trade => ({
  id, bot_id: 'bot1', opened_at: '2026-05-01T08:00:00Z', closed_at: '2026-05-01T12:00:00Z',
  asset, side: 'long', pnl, reason: null, is_paper: true,
})

describe('filterTrades — asset', () => {
  const mixed: Trade[] = [
    makeAssetTrade('a', 'BTC-USDT', 10),
    makeAssetTrade('b', 'BTC/USDT', 5),
    makeAssetTrade('c', 'ETH-USDT', -3),
    makeAssetTrade('d', 'SOL-USDC', 7),
  ]
  it('defaults to all (back-compat)', () => {
    expect(filterTrades(mixed, 'all')).toHaveLength(4)
  })
  it('filters by base symbol, merging quote variants', () => {
    const btc = filterTrades(mixed, 'all', 'BTC')
    expect(btc.map(t => t.id)).toEqual(['a', 'b'])
    expect(btc.every(t => toBaseAsset(t.asset) === 'BTC')).toBe(true)
  })
  it('composes direction and asset', () => {
    const longsEth = filterTrades(mixed, 'long', 'ETH')
    expect(longsEth.map(t => t.id)).toEqual(['c'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/stats.test.ts`
Expected: FAIL — `filterTrades` takes 2 args / asset filtering not applied.

- [ ] **Step 3: Update `filterTrades` in `src/lib/stats.ts`**

Replace lines 16-19:

```ts
import { toBaseAsset, type AssetFilter } from './asset'

export function filterTrades(
  trades: Trade[],
  filter: DirectionFilter,
  asset: AssetFilter = 'all',
): Trade[] {
  let out = filter === 'all' ? trades : trades.filter(t => t.side === filter)
  if (asset !== 'all') out = out.filter(t => toBaseAsset(t.asset) === asset)
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/stats.test.ts`
Expected: PASS (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts tests/lib/stats.test.ts
git commit -m "feat(stats): filterTrades accepts optional asset filter"
```

---

### Task 4: `computeBotStats` gains `asset` param

**Files:**
- Modify: `src/lib/stats.ts:55-100`
- Test: `tests/lib/stats.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```ts
describe('computeBotStats — asset', () => {
  const mixed: Trade[] = [
    makeAssetTrade('a', 'BTC-USDT', 10),
    makeAssetTrade('b', 'BTC-USDT', -4),
    makeAssetTrade('c', 'ETH-USDT', 100),   // must be excluded when asset=BTC
  ]
  it('recomputes from trades (ignores global perf_daily) when asset set', () => {
    const s = computeBotStats(mixed, [], 'all', 1000, 'BTC')
    expect(s.total_trades).toBe(2)
    // PF = 10 / 4 = 2.5 ; latest = 1000 + 10 - 4 = 1006
    expect(s.profit_factor).toBeCloseTo(2.5)
    expect(s.latest_capital).toBe(1006)
  })
  it('asset=all keeps existing perf_daily behaviour', () => {
    const perf: PerfDaily[] = [
      { id: '1', bot_id: 'bot1', date: '2026-05-01', capital: 1106, pnl_day: 106, win_rate: null, profit_factor: null },
    ]
    const s = computeBotStats(mixed, perf, 'all', 1000, 'all')
    expect(s.latest_capital).toBe(1106)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/stats.test.ts`
Expected: FAIL — `computeBotStats` ignores asset / wrong capital.

- [ ] **Step 3: Update `computeBotStats` in `src/lib/stats.ts`**

Change the signature and the `if (filter === 'all')` guard so the perf_daily branch
only runs when NO filter is active:

```ts
export function computeBotStats(
  allTrades: Trade[],
  perfDaily: PerfDaily[],
  filter: DirectionFilter,
  startCapital = 1000,
  asset: AssetFilter = 'all',
): BotStats {
  const trades = filterTrades(allTrades, filter, asset)
  const wins = trades.filter(t => t.pnl > 0).length
  const win_rate = trades.length > 0 ? wins / trades.length : 0

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const profit_factor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  let max_drawdown: number
  let latest_capital: number

  const isFiltered = filter !== 'all' || asset !== 'all'

  if (!isFiltered) {
    const capitals = perfDaily.map(p => p.capital)
    let peak = capitals[0] ?? 0
    let dd = 0
    for (const c of capitals) {
      if (c > peak) peak = c
      const cur = peak > 0 ? (peak - c) / peak : 0
      if (cur > dd) dd = cur
    }
    max_drawdown = dd
    latest_capital = capitals.length > 0
      ? capitals[capitals.length - 1]
      : startCapital + trades.reduce((s, t) => s + t.pnl, 0)
  } else {
    max_drawdown = computeDrawdownFromTrades(trades)
    const netPnl = trades.reduce((s, t) => s + t.pnl, 0)
    latest_capital = startCapital + netPnl
  }

  return { win_rate, profit_factor, max_drawdown, total_trades: trades.length, latest_capital }
}
```

Note: only the signature line, the `filterTrades(...)` call, and the `if (filter === 'all')`
→ `if (!isFiltered)` rename change. The body of each branch is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/stats.test.ts`
Expected: PASS (all existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts tests/lib/stats.test.ts
git commit -m "feat(stats): computeBotStats accepts optional asset filter"
```

---

### Task 5: `AssetFilterSelect` component

**Files:**
- Create: `src/components/AssetFilterSelect.tsx`

No unit test (presentational); validated via `tsc` + visual preview.

- [ ] **Step 1: Create the component**

```tsx
// src/components/AssetFilterSelect.tsx
'use client'

import type { AssetOption } from '@/lib/asset'

interface Props {
  options: AssetOption[]            // base-symbol options, without the 'all' entry
  value: string                     // 'all' | base symbol
  onChange: (v: string) => void
  label?: string
}

/**
 * Asset filter dropdown, styled to match PerformanceClient's date inputs.
 * Auto-hides when there is at most one asset to choose from.
 */
export default function AssetFilterSelect({ options, value, onChange, label = 'Actif' }: Props) {
  if (options.length <= 1) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted font-semibold mb-1.5">{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-card border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
      >
        <option value="all">Tous les actifs</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/AssetFilterSelect.tsx
git commit -m "feat(ui): AssetFilterSelect dropdown (auto-hides for mono-asset)"
```

---

### Task 6: Wire `/strategies/[slug]` (StrategyDetail)

**Files:**
- Modify: `src/components/StrategyDetail.tsx`

- [ ] **Step 1: Add imports + state**

At top, extend imports:

```tsx
import { useMemo, useState } from 'react'
import AssetFilterSelect from '@/components/AssetFilterSelect'
import { assetOptionsFromTrades } from '@/lib/asset'
import { computeBotStats, countByDirection, filterTrades, type DirectionFilter } from '@/lib/stats'
```

Inside the component, after the `direction` state:

```tsx
  const [asset, setAsset] = useState<string>('all')
  const assetOptions = useMemo(() => assetOptionsFromTrades(bot.all_trades), [bot.all_trades])
```

- [ ] **Step 2: Thread asset through the memos**

Replace the three memos so they pass `asset`:

```tsx
  const stats = useMemo(() => (
    direction === 'all' && asset === 'all'
      ? bot.stats
      : computeBotStats(bot.all_trades, bot.perf_daily, direction, startCapital, asset)
  ), [bot.all_trades, bot.perf_daily, bot.stats, direction, asset, startCapital])

  const equityData = useMemo(() => (
    direction === 'all' && asset === 'all'
      ? bot.perf_daily
      : reconstructPerfDaily(filterTrades(bot.all_trades, direction, asset), startCapital)
  ), [bot.all_trades, bot.perf_daily, direction, asset, startCapital])

  const tradesShown = useMemo(() => (
    direction === 'all' && asset === 'all'
      ? bot.recent_trades
      : filterTrades(bot.all_trades, direction, asset).slice(0, 20)
  ), [bot.all_trades, bot.recent_trades, direction, asset])
```

- [ ] **Step 3: Render the dropdown next to the direction pills**

Replace the filter row (the `<div className="mb-6 flex flex-wrap items-center justify-between gap-3">` block) so the right side holds both controls:

```tsx
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-1">Trades exposés</p>
          <p className="text-sm font-mono">
            <span className="font-bold">{breakdown.total}</span>
            {breakdown.total > 0 && (
              <span className="ml-2 text-muted">({breakdown.long}L · {breakdown.short}S)</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} />
          <DirectionFilterPills
            value={direction}
            onChange={setDirection}
            longCount={breakdown.long}
            shortCount={breakdown.short}
          />
        </div>
      </div>
```

- [ ] **Step 4: Type-check + run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StrategyDetail.tsx
git commit -m "feat(bot-page): asset filter on /strategies/[slug]"
```

---

### Task 7: Wire `/performance`

**Files:**
- Modify: `src/app/performance/page.tsx:13-18,30-39`
- Modify: `src/components/PerformanceClient.tsx`

- [ ] **Step 1: Add `asset` to the server query + TradeRow**

In `src/app/performance/page.tsx`, extend the `TradeRow` interface and the select:

```tsx
interface TradeRow {
  pnl: number
  side: string
  closed_at: string
  bot_id: string
  asset: string
}
```

```tsx
      const { data } = await supabaseServer
        .from('trades')
        .select('pnl,side,closed_at,bot_id,asset')
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false })
        .range(from, to)
      return (data ?? []) as TradeRow[]
```

- [ ] **Step 2: Add asset state + filter in PerformanceClient**

In `src/components/PerformanceClient.tsx`:

Extend the `TradeRow` interface (top of file) to include `asset: string`.

Add imports:

```tsx
import AssetFilterSelect from '@/components/AssetFilterSelect'
import { assetOptionsFromTrades, toBaseAsset } from '@/lib/asset'
```

Add state (next to `direction`):

```tsx
  const [asset, setAsset] = useState<string>('all')
  const assetOptions = useMemo(() => assetOptionsFromTrades(trades), [trades])
```

In the aggregation `useMemo`, add the asset filter alongside the others and include
`asset` in the dependency array:

```tsx
    if (asset !== 'all') {
      filtered = filtered.filter(t => toBaseAsset(t.asset) === asset)
    }
```

```tsx
  }, [trades, botFamilyMap, direction, family, asset, dateFrom, dateTo, selectedBots])
```

- [ ] **Step 3: Render the dropdown in filter row 1**

Replace the row-1 div:

```tsx
      <div className="flex flex-wrap gap-6 mb-4">
        <FilterGroup label="Direction" options={DIRECTION_OPTIONS} value={direction} onChange={v => setDirection(v as Direction)} />
        <FilterGroup label="Famille" options={FAMILY_OPTIONS} value={family} onChange={v => setFamily(v as Family)} />
        <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} />
      </div>
```

- [ ] **Step 4: Type-check + run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/performance/page.tsx src/components/PerformanceClient.tsx
git commit -m "feat(performance): asset filter on fleet daily P&L"
```

---

### Task 8: Wire `/overview`

**Files:**
- Modify: `src/components/OverviewClient.tsx`

- [ ] **Step 1: Add imports + state**

```tsx
import AssetFilterSelect from '@/components/AssetFilterSelect'
import { assetOptionsFromTrades, toBaseAsset } from '@/lib/asset'
```

Next to the `direction` state:

```tsx
  const [asset, setAsset] = useState<string>('all')
  const assetOptions = useMemo(
    () => assetOptionsFromTrades(bots.flatMap(b => b.all_trades)),
    [bots],
  )
```

- [ ] **Step 2: Recompute views with asset + drop empty bots**

Replace the `views` memo and add a filtered list:

```tsx
  const views: BotView[] = useMemo(() => bots.map(b => ({
    ...b,
    stats: direction === 'all' && asset === 'all'
      ? b.stats
      : computeBotStats(b.all_trades, b.perf_daily, direction, b.start_capital, asset),
    breakdown: countByDirection(b.all_trades),
  })), [bots, direction, asset])
```

When an asset is selected, hide bots that never traded it. Update `sorted`:

```tsx
  const visibleViews = asset === 'all'
    ? views
    : views.filter(b => b.stats.total_trades > 0)

  const sorted = [...visibleViews].sort((a, b) => {
    const va = getValue(a, sortCol)
    const vb = getValue(b, sortCol)
    return sortDir === 'asc' ? va - vb : vb - va
  })
```

- [ ] **Step 3: Filter today's P&L and recent trades by asset**

Update `botsWithData` to use `visibleViews`:

```tsx
  const botsWithData = visibleViews.filter(b => b.stats.total_trades > 0)
```

Update `todayPnl` (filtered branch) to also match the asset, and recent trades:

```tsx
  const todayPnl     = direction === 'all' && asset === 'all'
    ? bots.reduce((s, b) => {
        const row = b.perf_daily.find(p => p.date === today)
        return s + (row?.pnl_day ?? 0)
      }, 0)
    : bots.reduce((s, b) =>
        s + b.all_trades
              .filter(t =>
                (direction === 'all' || t.side === direction) &&
                (asset === 'all' || toBaseAsset(t.asset) === asset) &&
                t.closed_at.slice(0, 10) === today)
              .reduce((acc, t) => acc + t.pnl, 0),
      0)
```

```tsx
  const filteredRecentTrades = recentTrades.filter(t =>
    (direction === 'all' || t.side === direction) &&
    (asset === 'all' || toBaseAsset(t.asset) === asset),
  )
```

Update `allTimePnl` to use `visibleViews`:

```tsx
  const allTimePnl   = visibleViews.reduce((s, b) => s + (b.stats.latest_capital - b.start_capital), 0)
```

- [ ] **Step 4: Render the dropdown next to direction pills**

Replace the direction-filter block:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted">Filtrer</h2>
        <div className="flex flex-wrap items-end gap-4">
          <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} />
          <DirectionFilterPills
            value={direction}
            onChange={setDirection}
            longCount={fleetCounts.long}
            shortCount={fleetCounts.short}
          />
        </div>
      </div>
```

- [ ] **Step 5: Type-check + run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/OverviewClient.tsx
git commit -m "feat(overview): asset filter recomputes per-bot stats + trades"
```

---

### Task 9: Wire `/strategies` list (BotCard override + StrategiesClient)

**Files:**
- Modify: `src/components/BotCard.tsx`
- Modify: `src/components/StrategiesClient.tsx`

- [ ] **Step 1: Add `statsOverride` prop to BotCard**

In `src/components/BotCard.tsx`, accept an optional override and an optional note:

```tsx
import Link from 'next/link'
import { BotWithStats, BotStats } from '@/lib/types'
import StatusBadge from './StatusBadge'
import SyncBadge from './SyncBadge'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'

export default function BotCard({ bot, statsOverride }: { bot: BotWithStats; statsOverride?: BotStats }) {
  const stats   = statsOverride ?? bot.stats
  const pct     = pnlPct(stats.latest_capital, bot.start_capital)
  const eur     = pnlEur(stats.latest_capital, bot.start_capital)
  const hasData = stats.total_trades > 0
  // ...rest of the component unchanged (it already reads `stats`)
}
```

Everything below already references the local `stats`, so no further changes inside the card.

- [ ] **Step 2: Add asset state + per-card recompute in StrategiesClient**

In `src/components/StrategiesClient.tsx`:

Add imports:

```tsx
import { useMemo, useState } from 'react'
import AssetFilterSelect from '@/components/AssetFilterSelect'
import { assetOptionsFromTrades } from '@/lib/asset'
import { computeBotStats } from '@/lib/stats'
import type { BotStats } from '@/lib/types'
```

Add state + options + a recompute helper inside the component:

```tsx
  const [asset, setAsset] = useState<string>('all')
  const assetOptions = useMemo(
    () => assetOptionsFromTrades(bots.flatMap(b => b.all_trades)),
    [bots],
  )
  // Per-bot stats for the selected asset (null = use bot's lifetime stats).
  const assetStats = useMemo<Record<string, BotStats> | null>(() => {
    if (asset === 'all') return null
    const map: Record<string, BotStats> = {}
    for (const b of bots) {
      map[b.slug] = computeBotStats(b.all_trades, b.perf_daily, 'all', b.start_capital, asset)
    }
    return map
  }, [bots, asset])

  const overrideFor = (slug: string): BotStats | undefined => assetStats?.[slug]
  const effStats = (b: BotWithStats): BotStats => overrideFor(b.slug) ?? b.stats
```

- [ ] **Step 3: Apply asset filter to membership, sorting, and cards**

Update the `filtered` computation to drop bots with zero trades on the asset:

```tsx
  const filtered = bots.filter(b => {
    const statusOk = statusFilter === 'all' || b.status === statusFilter
    const familyOk = familyFilter === null || b.family === familyFilter
    const assetOk  = asset === 'all' || effStats(b).total_trades > 0
    return statusOk && familyOk && assetOk
  })
```

Update the family-section sort to use `effStats`:

```tsx
        const famBots = filteredPaper
          .filter(b => b.family === fam.slug)
          .sort((a, b) =>
            (effStats(b).latest_capital - b.start_capital) - (effStats(a).latest_capital - a.start_capital)
          )
```

Pass the override to every `<BotCard>` (both the Live section and family sections):

```tsx
                <BotCard bot={bot} statsOverride={overrideFor(bot.slug)} />
```

```tsx
                  <BotCard key={bot.slug} bot={bot} statsOverride={overrideFor(bot.slug)} />
```

Also reset asset in `resetFilters`:

```tsx
  const resetFilters = () => { setStatusFilter('all'); setFamilyFilter(null); setAsset('all') }
```

- [ ] **Step 4: Render the dropdown in the filter bar**

After the family pills (before the closing `</div>` of the filter bar), add a divider + the select:

```tsx
        <div className="w-px h-4 bg-border" />
        <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} label="Actif" />
```

- [ ] **Step 5: Type-check + run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/BotCard.tsx src/components/StrategiesClient.tsx
git commit -m "feat(strategies): per-asset recomputed cards on the list page"
```

---

### Task 10: Full verification

**Files:** none

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: all green (existing + new asset/stats tests).

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/asset-filter
```

Expected: branch pushed, Vercel preview builds.

- [ ] **Step 4: Visual check on the Vercel preview**

Open the preview URL, verify on each page: the « Actif » dropdown appears, selecting
an asset recomputes figures, « Tous les actifs » restores the full view, and a
mono-asset bot page (e.g. `breakout-hl-sol`) shows no dropdown.

---

## Notes for the implementer

- **Do not** run `npm run build` locally (Avast blocks Node→Supabase; false failures). Use `tsc` + `vitest`.
- `BotWithStats.all_trades` already ships from `getAllBotsWithStats` / `getBotWithStats`, so no query changes except `/performance`'s select.
- Keep `AssetFilterSelect` visually identical across pages — it's the algoproof.fr UI-consistency rule.
- The changelog for this feature is internal-facing only if it has no user-visible effect — but this IS user-visible, so a French changelog line is warranted at session end (e.g. `- [flotte] [fix] Filtre par actif sur les pages bots, flotte et stratégies`). Decide wording at session close.
