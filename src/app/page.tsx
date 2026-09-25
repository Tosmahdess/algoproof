// src/app/page.tsx
//
// Lot 3 of the design audit (2026-09-25, conception §5.1, PASS 4 mock-ups,
// variant A chosen by the user). The home shows its proof in the first screen:
// the title of D059 (both activities, the user's own words) with a lead whose
// three numbers come from the data, the three real-money bots beside it on a
// desktop and above the two entries on a phone, then the engine's funnel as
// bars, the four trials as tiles, what I publish when it does not work, three
// articles, the graveyard. Gone with this lot: the ticker (a third party's
// prices scrolling on a site that promises no return), the ten-row table (a
// ranking on the page whose thesis is that a ranking proves nothing), the two
// teaser cards (the bar already says it) and the exchange call to action (the
// home does not end on an affiliate page).
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import TrackedLink from '@/components/TrackedLink'
import Funnel from '@/components/home/Funnel'
import MethodTiles from '@/components/home/MethodTiles'
import Transparency from '@/components/home/Transparency'
import HomeArticles from '@/components/home/HomeArticles'
import { RealMoneyPanel, RealMoneyStrip } from '@/components/home/HomeRealMoney'
import { getAllBotsWithStats } from '@/lib/queries'
import { getFunnelCounts } from '@/lib/funnel'
import { getFleetImpact } from '@/lib/mi-fleet-impact'
import { getArticles } from '@/lib/articles'
import { listeInvestir } from '@/lib/investir'
import { excludeArchived, splitCohorts } from '@/lib/cohort'
import { frNumber } from '@/lib/display'
import { minutesSince } from '@/lib/home-data'

export const revalidate = 1800

export const metadata: Metadata = {
  // The two activities, in the browser tab, a search result and a link preview
  // (D059). Guarded by tests/lib/site-positioning.test.ts.
  title: 'AlgoProof : stratégies testées, comptes de sociétés examinés',
  description: 'Je fais tourner des bots de trading et j\'expose chaque trade, gains comme pertes. Je passe aussi les rapports annuels de sociétés cotées à travers sept contrôles.',
}

export default async function HomePage() {
  const [allBots, funnel, impact] = await Promise.all([getAllBotsWithStats(), getFunnelCounts(), getFleetImpact()])
  const bots = excludeArchived(allBots)
  const { live, paper } = splitCohorts(bots)
  // Longest history first: the same rule as the fleet (C7). The losing bot leads
  // today because it is the oldest, not because it loses.
  const liveByHistory = [...live].sort((a, b) => b.stats.total_trades - a.stats.total_trades)
  const minutes = minutesSince(live.map(b => b.last_sync_at))
  const companies = listeInvestir().length
  const articles = getArticles()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20 sm:pt-12">

      {/* ---------- Hero: message on the left, proof on the right ---------- */}
      <section data-testid="home-hero" className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-start mb-12 sm:mb-16">
        <div className="lg:col-span-7 text-left">
          {/* The mark, decorative: the bar already names the site (D060). */}
          <img src="/logo.svg" alt="" width={44} height={44} className="mb-3 sm:mb-4 w-9 h-9 sm:w-11 sm:h-11" />
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3 sm:mb-4">
            Des stratégies testées.<br />
            Des comptes de sociétés examinés.
          </h1>
          {/* The three numbers are read, never typed (D059: a typed count goes stale
              in silence). */}
          <p data-testid="home-lead" className="text-sm sm:text-base text-muted max-w-[60ch] mb-4 sm:mb-6 leading-relaxed">
            <strong className="text-foreground font-mono font-medium">{bots.length}</strong> bots, dont{' '}
            <strong className="text-foreground font-mono font-medium">{live.length}</strong> avec mon argent.{' '}
            <strong className="text-foreground font-mono font-medium">{frNumber(companies, 0)}</strong> rapports annuels lus par sept contrôles.
            Chaque trade et chaque alerte publiés, y compris ce qui perd.
          </p>

          {/* Phone only: the real-money strip ABOVE the entries (variant A). */}
          {live.length > 0 && <RealMoneyStrip bots={liveByHistory} minutes={minutes} />}

          {/* The two entries (D059/D060): not symmetrical, and that is the point.
              Left, a tool the visitor can run; right, readings I have done. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-testid="entry-strategies" className="bg-card border border-border rounded-lg p-5 flex flex-col">
              <h2 className="text-lg font-semibold mb-2">Les stratégies</h2>
              {/* « fragile, et pourquoi » is the word the lab's free diagnostic really
                  returns (globalVerdict), not an image: what a visitor without an
                  account receives. Pinned by tests/app/home-two-entries.test.tsx. */}
              <p className="text-sm text-muted leading-relaxed">
                Mes bots tournent en simulation et en argent réel, chaque trade publié. Le labo
                où je les teste est ouvert : tu y passes la tienne, il la rejoue et te dit si
                elle est fragile, et pourquoi.
              </p>
              <div className="mt-auto pt-4">
                {/* `event` and `location` unchanged: the analytics series must not break.
                    /lab is the backtester, not the landing (D053, D060); « sans compte »
                    holds, /lab is outside the lab's walled paths. */}
                <TrackedLink href="https://lab.algoproof.fr/lab" event="cta_lab" location="home-hero" className="inline-flex h-10 items-center px-4 bg-foreground text-bg font-semibold rounded-md hover:opacity-90 transition-opacity text-sm">
                  Tester ta stratégie, sans compte →
                </TrackedLink>
                <Link href="/overview" className={linkClass('inline', 'block mt-3 text-sm')}>
                  Voir mes bots
                </Link>
                <p className="mt-3 text-xs text-muted">
                  Un backtester, pas un broker. Rien à déposer, aucune clé à donner.
                </p>
              </div>
            </div>

            <div data-testid="entry-companies" className="bg-card border border-border rounded-lg p-5 flex flex-col">
              <h2 className="text-lg font-semibold mb-2">Les sociétés</h2>
              {/* D058: no page promises a grade or a verdict; this entry sends new
                  traffic to /investir, so it says it itself. */}
              <p className="text-sm text-muted leading-relaxed">
                Pour chaque société cotée que je lis, son dernier rapport annuel passe sept
                contrôles. Je publie les alertes et les chiffres, avec la page du rapport pour
                refaire le calcul. Pas de note, pas de verdict.
              </p>
              <div className="mt-auto pt-4">
                <TrackedLink href="/investir" event="cta_investir" location="home-hero" className="inline-flex h-10 items-center px-4 bg-foreground text-bg font-semibold rounded-md hover:opacity-90 transition-opacity text-sm">
                  Voir les sociétés que je lis →
                </TrackedLink>
                <Link href="/investir#methode" className={linkClass('inline', 'block mt-3 text-sm')}>
                  Les sept contrôles, expliqués
                </Link>
                <p className="mt-3 text-xs text-muted">
                  Des lectures, pas des conseils. Aucune recommandation d&apos;achat ou de vente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {live.length > 0 && <RealMoneyPanel bots={liveByHistory} minutes={minutes} />}
      </section>

      <Funnel counts={funnel} live={live.length} paper={paper.length} />

      <MethodTiles />

      <Transparency liveBots={liveByHistory} impact={impact} />

      <HomeArticles articles={articles} />

      {/* The last word of the home is the graveyard, not an exchange. */}
      {funnel && funnel.n_no_go > 0 && (
        <section data-testid="home-graveyard" className="bg-card border border-border rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-medium leading-tight">{frNumber(funnel.n_no_go, 0)}</p>
            <p className="text-xs text-muted">configurations recalées par le moteur, chacune avec son motif</p>
          </div>
          <a href="https://lab.algoproof.fr/cockpit/cimetiere" target="_blank" rel="noopener noreferrer"
             className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:border-border-strong transition-colors">
            Voir le cimetière ↗
          </a>
        </section>
      )}
    </div>
  )
}
