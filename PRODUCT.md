# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyone who lands on algoproof.fr, with no single priority persona (confirmed by the owner, 2026-10-01). In practice the site serves:

- people curious about algorithmic trading who want to see what holds up over time: the fleet, every published trade with its losses, the configurations that were rejected and why;
- beginners who would rather follow bots than code them (the target of the Direct offer, whose sales are currently closed);
- readers of the company side (`/investir`), who come for annual reports run through the "sept contrôles".

The "visitor arriving with their own backtest" persona has never been measured (D047).

## Product Purpose

Two activities under one name: trading bots (real money and simulation) with every trade published, losses included; and listed-company annual reports read through seven checks. The site exists so a visitor can check what holds up over time. Publishing everything also keeps the author disciplined ("Pourquoi je publie tout", `/a-propos`). Transparency is the proposition, not a means to advertise performance (D047).

Success, in the owner's words (2026-10-01), on three levels:

1. the visitor understands and verifies: they leave knowing what holds, what was rejected, and why;
2. they come back and take part: free account, favourites, feedback;
3. they subscribe to the Lab (lab.algoproof.fr).

## Positioning

A solo, named author who runs bots with personal money and publishes everything, including the failures. Claims a neighbour cannot copy truthfully:

- bots trading the author's real money, labelled « Argent réel », everything else is simulation;
- every trade published, losses included;
- a public graveyard of rejected configurations, each with its reason;
- a "Ce que je ne sais pas" section;
- the same author, under his own name, behind every number.

The angle is community, lab and sharing. Never put profit or gains first (D022).

## Operating Context

- Main sections (nav): La flotte `/overview`, Stratégies `/bibliotheque`, Sociétés `/investir`, Météo `/intelligence`, Articles `/blog`. Also `/preuve` (method), `/lexique`, `/faq`, `/a-propos`, `/start`, `/mica`, bot pages `/strategies/bot/[slug]`, embeds `/embed/[slug]`.
- A free account gives "Mon espace" and favourites on this site (D077, D081).
- Subscription, checkout, account management and the legal pages (terms, privacy, mentions légales) live on the Lab, lab.algoproof.fr. Both sites share one Supabase project and link to each other from the nav and footer.

## Capabilities and Constraints

- Existing Next.js app, deployed on Vercel. A strict CSP is set in `next.config.ts`: any new third-party origin must be added there or it silently fails in the browser.
- Counts (bots, companies, trades, variants) are computed live, never typed by hand.
- Pricing shown for the Lab: 29 €/month or 290 €/year, the two amounts always shown together. Direct: 59 €/month, Lab included, sales closed for now. A launch offer exists but is switched off until a date is set.
- Withdrawn, never promise again: free trial (D042), founder pricing and email-capture widgets (D043), a 14-day refund on request (D-ALG-RESIL-1).
- Only closed trades are shown, no open positions.
- "The best" strategy cannot be ranked on backtest profit factor (D085).
- Undecided: ORB decision (D056), home ticker (D059), button green (D060), "Investir" vs "Sociétés" in the nav, library default sort, whether the launch offer covers the annual plan.

## Brand Commitments

- Name AlgoProof; wordmark "Algo" in white and "Proof" in green. Logo: three candles (red, grey, green) and a check mark, `public/logo.svg` and `src/app/icon.svg`. Social assets in the vault under `projects/algoproof/brand/`.
- The lab is called AlgoLab, never "Yuna".
- Voice: first person singular ("je", "mon"), never "on"/"nous" for the author's own actions. Direct, no hype, no AI-style em dashes. Articles talk about what readers care about, not about code.
- Byline: Thomas Dessombs, as an individual (entrepreneur individuel, trading name AlgoProof).
- Revenue: Lab subscription and a Bybit affiliate link on `/start`. No ads, no company pays to be covered.
- Disclaimers stay visible: "Ceci n'est pas un conseil financier…" with simulation unless marked « Argent réel » (footer); « Des lectures, pas des conseils » on the company side.

## Evidence on Hand

- Live fleet data, published trades, rejected configurations and their reasons, strategy library, company reports: all from the production database, computed at render time.
- Real-money bots are shown on a 1 000 € mirror base (D049).
- 13 blog articles in `content/blog`.
- Absent, never fabricate: testimonials, user or subscriber counts, performance promises, external audits or endorsements, rankings of "the best" strategy.

## Product Principles

1. Show the failures as prominently as the successes; a verdict is never hidden behind a fold.
2. Every number is live and traceable to its source; nothing is typed by hand.
3. Understanding before conversion: the visitor must be able to verify on their own before being asked to sign up or pay.
4. One person, one voice: first person, plain French, no promise of gains.

## Accessibility & Inclusion

French only (`lang="fr"`). A skip link "Aller au contenu" exists. On phones, long explanations may collapse but the verdict never does (D054, D057). No `prefers-reduced-motion` handling found yet.
