# Spec — Filtre par actif (asset filter)

> Date : 2026-06-17
> Repo : `D:\code\algoproof` (algoproof.fr, Next.js 14 + Supabase)
> Statut : design validé, prêt pour plan d'implémentation

## 1. Objectif

Ajouter un filtre **par actif** (BTC, ETH, SOL…) sur les pages où des bots/trades
sont affichés, pour répondre à « comment performe la flotte / ce bot **sur tel
actif** ». Le filtre **recalcule** les chiffres affichés (P&L, win rate, profit
factor, drawdown, trades) pour l'actif sélectionné — même sémantique que le filtre
long/short déjà en place.

### Pages concernées (4)

| Page | Composant | Effet du filtre |
|---|---|---|
| `/strategies/[slug]` | `StrategyDetail` | Recalcule metrics + courbe d'équité reconstruite + table trades du bot. |
| `/performance` | `PerformanceClient` | Recalcule le P&L journalier agrégé de la flotte. |
| `/overview` | `OverviewClient` | Recalcule les stats par bot ; masque les bots à 0 trade sur l'actif ; filtre les 20 derniers trades. |
| `/strategies` (liste) | `StrategiesClient` | Recalcule les chiffres de **chaque carte** (perf de l'actif seul) ; masque les cartes à 0 trade. |

Toutes les pages sont donc **trade-level** : le filtre recompute, il ne se contente
pas de masquer.

## 2. Données

- `trades.asset` : format `BASE-QUOTE` (`SOL-USDT`, `BTC-USDC`, `XAU-USDC`). ~31 bases distinctes.
- `bots.assets` : format mixte (`BTC/USDT`, `BTC-USDC`, `EUR/USD`, `SOL` nu).
- Décision : on filtre **toujours par symbole de base** (granularité validée). `BTC-USDT`,
  `BTC-USDC`, `BTC/USDT` fusionnent en `BTC`.

## 3. Unité partagée — `src/lib/asset.ts` (nouveau)

Fonctions pures, testées (TDD).

```ts
// Normalise un identifiant d'actif vers son symbole de base.
//  'SOL-USDT' -> 'SOL' | 'BTC/USDT' -> 'BTC' | 'XAU-USDC' -> 'XAU'
//  'EUR/USD'  -> 'EUR' | 'SOL' -> 'SOL' | '1000SHIB/USDT' -> 'SHIB'
export function toBaseAsset(raw: string): string

export type AssetFilter = string            // 'all' = tous les actifs
export const ALL_ASSETS: AssetFilter = 'all'

export interface AssetOption { value: string; label: string; count: number }

// Liste triée par volume décroissant, à partir d'une liste de trades.
export function assetOptionsFromTrades(trades: { asset: string }[]): AssetOption[]
```

Règles `toBaseAsset` :
1. `trim()` puis `toUpperCase()`.
2. Split sur le premier `/` **ou** `-`, garder la partie gauche.
3. Strip préfixe `1000` si le reste est non vide et alphabétique (`1000SHIB` → `SHIB`, `1000PEPE` → `PEPE`).
4. Entrée vide / falsy → `'UNKNOWN'` (défensif, ne doit pas crasher).

## 4. Refactor `src/lib/stats.ts`

Étendre les fonctions existantes avec un paramètre `asset` **optionnel en fin de
signature** (rétro-compatible — les appels et tests actuels passent `'all'` par défaut).

```ts
export function filterTrades(
  trades: Trade[],
  direction: DirectionFilter,
  asset?: AssetFilter,            // défaut 'all'
): Trade[]

export function computeBotStats(
  allTrades: Trade[],
  perfDaily: PerfDaily[],
  direction: DirectionFilter,
  startCapital?: number,          // inchangé (défaut 1000)
  asset?: AssetFilter,            // défaut 'all'
): BotStats
```

- `filterTrades` : applique direction **puis** `toBaseAsset(t.asset) === asset` (si asset ≠ all).
- `computeBotStats` : la branche « perf_daily » (drawdown/capital depuis la courbe globale)
  n'est valide **que** si **aucun** filtre n'est actif. Nouvelle condition :

  ```
  const isFiltered = direction !== 'all' || (asset && asset !== 'all')
  if (!isFiltered) { ...branche perf_daily existante... }
  else            { ...reconstruction synthétique depuis les trades filtrés... }
  ```

  La reconstruction synthétique (drawdown depuis pnls cumulés + `latest_capital =
  startCapital + Σ pnl`) est déjà codée pour le cas direction ; on l'étend au cas asset.

Helper d'affichage des compteurs (optionnel, si utile aux pages) :
```ts
export function countByAsset(trades: Trade[]): Record<string, number>
```

## 5. Composant UI — `src/components/AssetFilterSelect.tsx` (nouveau)

`<select>` stylé, cohérent avec les `input[type=date]` de `PerformanceClient`
(`bg-card border border-border rounded-md px-2.5 py-1 text-xs`). Pattern « client island ».

```tsx
interface Props {
  options: AssetOption[]          // sans l'option 'Tous'
  value: string                   // 'all' | base symbol
  onChange: (v: string) => void
  label?: string                  // défaut 'Actif'
}
```

- Première option : « Tous les actifs » (`value='all'`).
- Options : `BTC (101)`, `ETH (29)`… (label = base + count entre parenthèses).
- **Auto-masquage** : si `options.length <= 1`, le composant retourne `null`
  (un bot mono-actif n'affiche pas de filtre inutile).

## 6. Câblage par page

### 6.1 `/strategies/[slug]` — `StrategyDetail.tsx`
- Nouveau state `asset` à côté de `direction`.
- Options dérivées de `bot.all_trades` via `assetOptionsFromTrades`.
- `stats`, `equityData`, `tradesShown` recalculés en passant `asset` à
  `computeBotStats` / `filterTrades`.
- `reconstructPerfDaily` reçoit `filterTrades(bot.all_trades, direction, asset)`.
- `AssetFilterSelect` rendu à côté des `DirectionFilterPills`.
- Libellés equity/trades mentionnent l'actif quand `asset !== 'all'`.

### 6.2 `/performance` — `page.tsx` + `PerformanceClient.tsx`
- `page.tsx getData()` : ajouter `asset` au `.select('pnl,side,closed_at,bot_id')`
  → `.select('pnl,side,closed_at,bot_id,asset')`. Ajouter `asset` à `TradeRow`.
- `PerformanceClient` : nouveau state `asset` ; options via `assetOptionsFromTrades(trades)` ;
  filtre `toBaseAsset(t.asset) === asset` dans le `useMemo` agrégateur ; `AssetFilterSelect`
  ajouté dans la rangée 1 (à côté de Direction / Famille).

### 6.3 `/overview` — `OverviewClient.tsx`
- Nouveau state `asset`. Options via `assetOptionsFromTrades` sur l'union des `b.all_trades`.
- `views` : `computeBotStats(b.all_trades, b.perf_daily, direction, b.start_capital, asset)`.
- Quand `asset !== 'all'` : filtrer `sorted`/`botsWithData` aux bots ayant ≥ 1 trade sur l'actif
  (sinon ils s'affichent en « — »).
- `todayPnl` (branche filtrée) et `recentTrades` filtrés aussi par `toBaseAsset === asset`.
- `AssetFilterSelect` à côté des `DirectionFilterPills`.

### 6.4 `/strategies` (liste) — `StrategiesClient.tsx` + `BotCard.tsx`
- `BotCard` : nouvelle prop optionnelle `statsOverride?: BotStats` et `tradeCountNote?: string`.
  Si `statsOverride` fourni, la carte l'utilise au lieu de `bot.stats` (P&L override calculé
  depuis `statsOverride.latest_capital`).
- `StrategiesClient` : nouveau state `asset` ; options via union des `b.all_trades`.
  Quand `asset !== 'all'` :
  - calcule `recompute(b) = computeBotStats(b.all_trades, b.perf_daily, 'all', b.start_capital, asset)`,
  - exclut les bots dont `recompute(b).total_trades === 0`,
  - le tri par P&L des sections famille utilise les stats recalculées,
  - passe `statsOverride` à `BotCard`.
- `AssetFilterSelect` ajouté dans la barre de filtres (après status/famille).

## 7. Tests (TDD)

Nouveaux fichiers / cas :
- `tests/lib/asset.test.ts` :
  - `toBaseAsset` couvre `SOL-USDT`, `BTC/USDT`, `BTC-USDC`, `EUR/USD`, `SOL`, `1000SHIB/USDT`, `''`.
  - `assetOptionsFromTrades` : distinct, count correct, tri volume décroissant.
- `tests/lib/stats.test.ts` (ajouts) :
  - `filterTrades(trades, 'all', 'BTC')` ne garde que les trades base BTC.
  - `filterTrades` compose direction + asset.
  - `computeBotStats(..., asset='BTC')` recalcule depuis trades (pas perf_daily) et donne
    le bon P&L synthétique / drawdown.
  - Régression : tous les tests existants passent inchangés.

## 8. Hors scope (YAGNI v1)

- Pas d'état du filtre dans l'URL (deep-link) — state local, comme direction aujourd'hui.
- Pas de filtre multi-actifs (sélection unique).
- Pas de modif du pipeline VPS→Supabase (on lit `trades.asset` tel quel).
- `BotCard` reste un Server Component sans data fetching propre (les `all_trades` viennent
  déjà du parent via `getAllBotsWithStats`).

## 9. Risques / points d'attention

- **Branch entanglement** : la branche courante `feat/pages-audit` porte d'autres chantiers
  non mergés (cf. mémoire). Implémenter sur une branche dédiée `feat/asset-filter` partant de
  `origin/main` à jour, pour éviter les commits entrelacés.
- **Build local cassé par Avast** : valider via `tsc` + `vitest`, pas `npm run build`
  (cf. learnings). Preview Vercel pour le visuel.
- **`/performance` cap 1000 lignes** : déjà géré par `paginateAll` ; ajouter `asset` au select
  ne change pas la pagination.
- **Cohérence design** : `AssetFilterSelect` doit matcher visuellement les contrôles existants
  (règle UI algoproof.fr).
