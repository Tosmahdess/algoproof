# Custom Analytics Events — Design

> Date: 2026-07-14 · Repo: algoproof · Status: approved (design), pre-launch

## Context

algoproof.fr is about to get its first real traffic (imminent Reddit launch, U5).
Today the site ships **Vercel Web Analytics** (`<Analytics />` in the root layout) but
**zero custom events** — so we can measure *how many* visitors and *from where*, but not
*what they do*: which bot they open, whether they subscribe, whether they click through to
the lab, whether they click an affiliate exchange link. For a launch where every conversion
counts, those are the numbers that matter. This adds a small, typed set of custom events on
the highest-value conversion points, reusing what the codebase already exposes.

## Events (4)

| Event | Property | Fired in | Answers |
|---|---|---|---|
| `email_subscribe` | `source` | `EmailCapture` on success | Newsletter vs formation-waitlist vs membership — who converts, from which page |
| `view_bot` | `slug` | `StrategyDetail` on mount | Which strategies attract attention |
| `cta_lab` | `location` | Primary lab CTAs | Does the site actually push toward the product |
| `outbound_exchange` | `exchange`, `location` | Exchange links on `/start` | Monetisation nerve — affiliate (Bybit) + venue clicks |

`source` reuses the existing `SubscribeSource` union (`home`, `blog`, `labo`,
`formation-waitlist`, `lab-membership`, …) — so the formation waitlist is NOT a separate
event, just a `source` value on `email_subscribe`.

`exchange` ∈ `bybit | hyperliquid | kraken` (Bybit is the only affiliated one).

`cta_lab` scope = **primary CTAs only** (home hero, `/labo`, bot→lab bridge, nav lab
entry) — not every lab link — to keep the signal clean and the Hobby-plan event quota sane.

## Units

1. **`src/lib/analytics.ts`** — thin typed layer over `@vercel/analytics`'s `track()`.
   One exported function per event: `trackEmailSubscribe(source)`, `trackViewBot(slug)`,
   `trackCtaLab(location)`, `trackOutboundExchange(exchange, location)`. Single source of
   truth for event names → no string typos scattered across components. Types:
   `Exchange = 'bybit' | 'hyperliquid' | 'kraken'`; `location` is a plain `string`
   (low-cardinality call-site label).

2. **`src/components/TrackedLink.tsx`** — `'use client'` link wrapper. Renders `<a>`
   (external) with a `beacon: () => void` fired `onClick` before the browser navigates.
   Passes through `href`, `className`, `target`, `rel`, children. Dumb on purpose — the
   taxonomy lives in `analytics.ts`; call sites pass `beacon={() => trackCtaLab('home-hero')}`.

3. **Two direct calls** (no new component):
   - `EmailCapture.tsx` — call `trackEmailSubscribe(source)` in the success branch of
     `handleSubmit` (right after `setSubmitted(true)`).
   - `StrategyDetail.tsx` — `useEffect(() => trackViewBot(slug), [slug])`. (Component is
     already `'use client'`; confirm the bot slug is in props — pass it from the server page
     if not already available.)

### Wiring points (representative, not exhaustive)

- `/start` (`src/app/start/page.tsx`): the 3 exchange `<a>` (Bybit `BYBIT_AFFILIATE_URL`,
  HL `HL_AFFILIATE_URL`, Kraken raw) become `<TrackedLink>` with
  `beacon={() => trackOutboundExchange('bybit', 'start')}` etc. `/start` is a Server
  Component; `TrackedLink` is the client boundary.
- Lab CTAs: home hero lab button (`src/app/page.tsx`), `/labo` primary CTA, bot→lab bridge
  on `src/app/strategies/[slug]` / `StrategyDetail`, nav lab entry (`src/components/Nav.tsx`).

## Testing (TDD, vitest + RTL, mock `track`)

- `tests/lib/analytics.test.ts` — mock `@vercel/analytics`; assert each helper calls
  `track` with the exact event name + props (`trackEmailSubscribe('home')` →
  `track('email_subscribe', { source: 'home' })`, etc.).
- `tests/components/TrackedLink.test.tsx` — click fires `beacon` once; renders `href`,
  passes through `target`/`rel`/children.
- `EmailCapture` test — successful submit (mock `fetch` ok) fires `email_subscribe` with the
  `source` prop; failed submit does NOT fire.
- `StrategyDetail` test — mount fires `view_bot` with the slug.

## Verification

1. `npx tsc --noEmit` clean.
2. `npx vitest run` green (existing suite + new tests).
3. Push → Vercel auto-deploy (local `npm run build` fails under Avast — known; validate via
   tsc + vitest + Vercel deploy).
4. Post-deploy: open the site, click a bot / a lab CTA / an exchange link / submit an email;
   confirm events appear in **Vercel → algoproof → Analytics → Events**.

## Risk to confirm BEFORE relying on the data

Site is on **Vercel Hobby/free tier**. Custom events are captured there but under a **monthly
event cap + short retention**; a Reddit spike can exhaust the quota mid-launch. Confirm the
plan's event allowance in the Vercel dashboard; consider Pro for the launch window. The code
is correct regardless — this is a plan question, not a code one.

## Out of scope (YAGNI)

- No product-analytics tool (PostHog/Plausible) — separate decision.
- No Speed Insights.
- No tracking of every lab link, blog read, or scroll depth.
