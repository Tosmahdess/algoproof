# Register slice by side and asset, thin fiche for engine bots — design

**Date:** 2026-08-21
**Status:** approved in conversation (owner), awaiting implementation plan
**Context:** the 75-bot armada wave (engine-originated, `engine_unit_key` set) is about to
be published. Two product decisions taken with the owner on 2026-08-21:

1. A wave bot keeps its own public fiche (`/strategies/bot/<slug>`): curve, trades,
   provenance, gated parameters. Its *description* lives on the strategy page
   (`/strategies/<concept>`), not on the fiche — 10 texts, not 75.
2. On the register (`/overview`), the visitor can slice by trade **side** (long / short)
   and by **asset**, and the displayed stats are **recomputed on that slice** — not merely
   filtered. "Which bots win on their shorts?" must have an answer.

Sort behaviour is **not** changed: default and keys stay exactly as today (owner decision).

## Non-goals

- No change to the publisher (`algoproof_sync.py`), no Supabase migration, no VPS deploy.
- No per-slice controls on the strategy (concept) page — it is a server component; its
  incarnation table keeps global stats. May come later behind a client wrapper.
- No change to the stage-0 fleet balance (`computeFleetAggregate`) or the real-money
  cards: the slice is a reading of the register, not of the balance sheet — same boundary
  the existing facets already respect.
- No new sort key, no change of default sort.

## 1. State and URL

`src/lib/bot-filters.ts`

- `FleetFilterState` gains `side: SideFilter` where `type SideFilter = 'all' | 'long' | 'short'`,
  default `'all'`. `EMPTY_FILTERS.side = 'all'`.
- `asset` keeps its current meaning for *membership* (`matchesAsset` on `bot.assets`,
  exact base-asset match). A chosen asset both filters the bot list (as today) and drives
  the slice (section 2).
- `PARAM_ORDER` becomes `['family', 'status', 'asset', 'side', 'tf', 'sort', 'dir']`.
  `parseFleetFilters` reads `side` (anything but `long`/`short` → `'all'`);
  `serializeFleetFilters` emits `side` **only** when not `'all'`.
- `activeFilterCount` counts `side !== 'all'` as one active filter.
- `describeEmptyResult` names the side in its explanation ("… en short").
- `optionCounts` gains `side: { long: number; short: number }`, computed with the side
  facet left out (same `applyExcept` pattern) and counting bots with **≥ 1 trade of that
  side** in `all_trades` — not bots that exist. `FilterableBot` therefore gains an optional
  `all_trades?: Trade[]` (the register always has it; tests may omit it → counts are 0).
- `src/app/robots.ts`: add `'/*?side='` to the disallow list, next to `'/*?asset='`.
- Filter bar (`FleetRegister` / its pills component): one group of two pills « Long » /
  « Short », mutually exclusive, clicking the active one returns to `'all'`. Counts shown
  like the other pills.

## 2. Slice recompute

`src/lib/stats.ts` — new pure function next to `computeBotStats`:

```ts
export function sliceBotStats(
  bot: Pick<BotWithStats, 'stats' | 'all_trades' | 'perf_daily' | 'start_capital'>,
  side: SideFilter,
  assets: string[],
): BotStats
```

- **Identity:** `side === 'all'` and `assets.length === 0` → returns `bot.stats` (the same
  object). The default view is bit-identical to today. This is a test.
- Otherwise: trades = `bot.all_trades` filtered by side (when not `'all'`) and by asset
  (when `assets` non-empty: `toBaseAsset(trade.asset)` ∈ `assets.map(toBaseAsset)`, union
  across assets). Then `computeBotStats(trades, bot.perf_daily, side, bot.start_capital, ...)`
  — reuse the existing function; if its asset parameter is single-valued, pre-filter the
  trades and pass the direction only. `latest_capital` = reconstructed from the slice
  (`start_capital + Σ pnl`), `max_drawdown` from the reconstructed curve, as the fiche does.
- **Empty slice:** `total_trades: 0`, `profit_factor: 0`, `win_rate: 0`, `max_drawdown: 0`,
  `latest_capital: start_capital`. `BotTable` already renders « — » when
  `total_trades === 0`, so no misleading PF 0 is ever shown. Test pins that an empty slice
  never produces `total_trades > 0` and that `hasData` semantics hold.

`src/components/FleetRegister.tsx`

- After `filtered`, derive
  `viewBots = useMemo(() => filtered.map(b => ({ ...b, stats: sliceBotStats(b, state.side, state.asset) })), [filtered, state.side, state.asset])`
  and feed `viewBots` to the existing sort and timeframe grouping. Nothing else changes.
- `BotTable` is **not** modified. The ⚠ « < 20 trades » marker reads `stats.total_trades`
  and therefore applies to the sliced n automatically.

## 3. Thin fiche for engine bots

`src/app/strategies/bot/[slug]/page.tsx`, `functional` slot of `ExplainerBox`:

- If `bot.engine_unit_key` is set **and** `strategy-keys.ts` resolves a concept for the bot,
  render one line: « Ce bot fait tourner **<label du concept>** — ce que fait cette
  stratégie, quand elle marche et quand elle meurt : → `/strategies/<concept>` ».
- Otherwise: current behaviour (`bot.description` or the "disponible prochainement"
  fallback).
- The `technical` slot (gated parameters + dossier link) is unchanged.
- `ARMADA_BASE_DESC_FR` stays in the publisher and in the DB; the site simply stops
  repeating it. Zero publisher change, zero VPS deploy.

## Tests (TDD, vitest)

- `stats.sliceBotStats`: identity on `'all'`/`[]` (same reference); short only; single asset;
  union of two assets; side × asset; empty slice → `total_trades 0`, `latest_capital ===
  start_capital`, no PF; asset matching goes through `toBaseAsset` (`BTC/USDT:USDT` vs `BTC`).
- `bot-filters`: parse `side=short`; unknown value → `'all'`; round-trip serialize/parse;
  `side=all` never serialized; `PARAM_ORDER` position; `activeFilterCount`; `optionCounts.side`
  counts bots by trades, and a bot without `all_trades` counts 0 (no vacuous count).
- `robots.ts`: disallow contains `/*?side=`.
- Fiche: engine bot with resolvable concept → link rendered, `bot.description` **not**
  rendered; legacy bot → description rendered. Engine bot whose base resolves to no concept
  → falls back to description (never an empty slot).
- Register: with `side='short'` the rows' displayed trade counts equal the per-bot short
  counts of the fixture; with no slice the rendered output equals today's (snapshot of the
  stats passed to `BotTable`).
- Existing guards stay green: `concurrency.test.ts` (fan-out), `queries-cache-size.test.ts`.

## Files touched

`src/lib/bot-filters.ts`, `src/lib/stats.ts`, `src/components/FleetRegister.tsx`
(+ its pill bar), `src/app/robots.ts`, `src/app/strategies/bot/[slug]/page.tsx`, tests.
Not touched: `BotTable.tsx`, `queries.ts`, `fleet-aggregate.ts`, publisher, migrations.

## Risks named

- Sorting a slice by PF mechanically favours tiny samples (False Strategy Theorem). Owner
  chose to keep today's sort unchanged; the ⚠ marker on the sliced n is the only guard.
- A bot that lists an asset in its recipe but has no trade on it shows « — » under that
  asset — correct, and the count pill (trades-based) will not have promised otherwise.
