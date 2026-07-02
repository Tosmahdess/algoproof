# Conformity Proof — backtest↔live envelope + public kill criteria (+ novice quick-wins)

> Source analysis: brain-vault `_ideas/apex-trading/reponse_prompt_04_besoins_decision_traders.md`
> + design draft `_ideas/algoproof/chantier-A-preuve-conformite-design-draft.md`. User greenlit A + B (2026-07-02).

## Why

The site publishes backtest claims AND live performance but never confronts them. "Does live
confirm the backtest?" is the #1 blocking expectation of both segments (expert: proof; novice:
"is this drawdown normal?"). Live transparency without a reference frame supplies anxiety
without judgment. Publishing pre-registered kill criteria ("when this bot gets cut") is unique
in the retail market and costs nothing — the criteria already exist internally.

## Scope (this PR)

1. **`src/lib/bot-expectations.ts`** — static per-slug expectations, git-versioned (same pattern
   as `bot-params.ts`). Only vault-sourced numbers; a bot without verified numbers simply has no
   entry and no card. Pilot: `v1-spot`, `funding-rev-long`, `hlperps-xsec-degross`, `orb-bf25`.
2. **`src/lib/conformity.ts`** — pure `assessConformity(expectations, stats)`:
   - DD check (any sample size): `breach` if live maxDD > expected × 1.25, `watch` if > × 0.8.
   - PF check (≥ 20 trades only): `watch` if PF < floor, `breach` if PF < 1.0.
   - Global: worst check; `insufficient` when < 20 trades and no watch/breach.
   - FR narrative sentence for the card.
3. **`src/components/ConformityCard.tsx`** — status pill (Dans l'enveloppe ✅ / À surveiller ⚠️ /
   Hors enveloppe ❌ / Échantillon insuffisant ⏳), expected-vs-realized rows, narrative,
   « Quand ce bot sera coupé » (kill criteria + registeredAt + source), « Ce bot en 3 phrases »,
   dormancy note when 0 trades.
4. **`src/lib/simulator.ts` + `src/components/CapitalSimulator.tsx`** — "sur mon capital":
   scale observed history (perf_daily) to a chosen capital (presets 250/500/1000/2500 €), show
   total P&L €, worst month €, max drawdown €. Historical/educational wording, no projection,
   non-advice disclaimer.
5. **Non-custody explicit** — FAQ entry + footer line: the site never touches visitor funds.
6. Wire 3+4 into `strategies/[slug]/page.tsx`.

## Out of scope (follow-ups)

- BotCard mini-pill on lists (after the fiche version settles).
- Lab-side plain-FR verdicts over the diagnostic flags (algolab repo).
- Envelope data entry for the remaining ~29 bots (needs vault backtest numbers per bot).
- Any Supabase migration — everything is front-side on already-fetched data.

## Decisions

- Expectations home = static TS file, not Supabase: versioned, auditable in git history
  (fits the "pre-registered, dated, immutable" promise), zero migration. Revisit if the Lab
  needs to query envelopes.
- Conformity computed front-side from `getBotWithStats` output — avoids touching the diverged
  `algoproof_sync.py` (vault↔VPS reconciliation is a separate debt).
- No envelope = no card (never invent numbers). Provenance (`source`) is displayed.
