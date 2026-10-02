// src/app/page.tsx
//
// Refonte « Le registre des décisions », lot 2 (02/10/2026): the home follows
// Astra's mock-up (docs/refonte-registre/MAQUETTE_ASTRA.html, surface Accueil)
// with the owner's corrections. The title of D059 (both activities) and a lead
// whose three numbers are read from the data; the two entries on one line; the
// real-money register in full width, best result first; the library by idea;
// the graveyard and one article; then favourites and Direct.
//
// Gone with this lot: the engine's « 1 sur 500 » balance sheet (audit 2026-10,
// n° 7: it overflowed, and /strategies still carries it), the 30-day lines
// coloured by a result they did not show (n° 8), the four method tiles, the
// stacked cards. Still true from lot 3: no ticker, no ranking of the fleet, and
// the home does not end on an exchange's affiliate link.
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import TrackedLink from '@/components/TrackedLink'
import HomeArticle from '@/components/home/HomeArticle'
import RealMoneyRegister from '@/components/home/RealMoneyRegister'
import { getAllBotsWithStats } from '@/lib/queries'
import { getFunnelCounts } from '@/lib/funnel'
import { getArticles } from '@/lib/articles'
import { getLibraryIdeas } from '@/lib/library'
import { listeInvestir } from '@/lib/investir'
import { excludeArchived, splitCohorts } from '@/lib/cohort'
import { frNumber } from '@/lib/display'
import { librarySummary, readingDate } from '@/lib/home-register'
import { labUrl } from '@/lib/lab-links'
import { DIRECT_SALE_OPEN } from '@/lib/direct-sale'

export const revalidate = 1800

export const metadata: Metadata = {
  // The two activities, in the browser tab, a search result and a link preview
  // (D059). Guarded by tests/lib/site-positioning.test.ts.
  title: 'AlgoProof : stratégies testées, comptes de sociétés examinés',
  description: 'Je fais tourner des bots de trading et j\'expose chaque trade, gains comme pertes. Je passe aussi les rapports annuels de sociétés cotées à travers sept contrôles.',
}

const PRIMARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded border border-accent bg-button px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card-2'
const SECTION = 'border-b border-border py-8 sm:py-9'
const ENTRY = 'flex h-full items-center justify-between gap-4 py-4 md:py-[18px]'

export default async function HomePage() {
  const [allBots, funnel, ideas] = await Promise.all([
    getAllBotsWithStats(),
    getFunnelCounts(),
    // The library is a second source: if its view fails, the home still serves,
    // without the counts rather than with typed ones.
    getLibraryIdeas().catch(() => null),
  ])
  const bots = excludeArchived(allBots)
  const { live } = splitCohorts(bots)
  const companies = listeInvestir().length
  const articles = getArticles()
  const library = ideas && ideas.length > 0 ? librarySummary(ideas) : null
  const fr = (n: number) => frNumber(n, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">

      {/* ---------- Title, lead, and the two entries ---------- */}
      <header data-testid="home-hero" className="pb-2 pt-7 sm:pt-12">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-[75px]">
          <h1 className="text-[34px] font-semibold leading-[1.13] tracking-[-0.03em] sm:text-[44px] lg:text-[52px] lg:leading-[1.12]">
            Des stratégies testées.<br />
            Des comptes de sociétés examinés.
          </h1>
          <div>
            {/* The three numbers are read, never typed (D059: a typed count goes stale
                in silence). The bot count is the same one the register's button gives. */}
            <p data-testid="home-lead" className="max-w-[43ch] text-base leading-relaxed text-muted sm:text-lg">
              Je fais tourner <strong className="font-medium text-foreground tabular-nums">{bots.length}</strong>{' '}bots, dont{' '}
              <strong className="font-medium text-foreground tabular-nums">{live.length}</strong>{' '}avec mon argent. Je passe aussi{' '}
              <strong className="font-medium text-foreground tabular-nums">{fr(companies)}</strong>{' '}rapports annuels à travers sept contrôles.
              Je publie chaque trade et chaque alerte, y compris quand les bots perdent.
            </p>
            <p className="mt-3 text-sm">
              <Link href="/a-propos" className={linkClass('inline')}>Pourquoi je publie tout</Link>
            </p>
          </div>
        </div>

        {/* The two entries (D059/D060), one line on a computer, stacked on a phone. */}
        <div className="mt-7 grid grid-cols-1 border-y border-border md:mt-8 md:grid-cols-2">
          <div data-testid="entry-strategies" className="border-b border-border md:border-b-0 md:border-r md:pr-6">
            <Link href="/bibliotheque" className={linkClass('record', ENTRY)}>
              <span className="min-w-0">
                <span className="block text-lg font-semibold">Mes stratégies, idée par idée</span>
                <span className="mt-1 block text-xs font-normal text-muted">Je distingue la recherche, la simulation et le réel.</span>
              </span>
              <span aria-hidden="true" className="text-2xl text-accent">→</span>
            </Link>
          </div>
          <div data-testid="entry-companies" className="md:pl-6">
            {/* `event` and `location` unchanged: the cta_investir series must not
                break (D059 made this entry measurable). D058: no grade, no verdict. */}
            <TrackedLink href="/investir" event="cta_investir" location="home-hero" className={linkClass('record', ENTRY)}>
              <span className="min-w-0">
                <span className="block text-lg font-semibold">Les sociétés que je lis</span>
                <span className="mt-1 block text-xs font-normal text-muted">Je publie mes contrôles. Des lectures, pas des conseils.</span>
              </span>
              <span aria-hidden="true" className="text-2xl text-accent">→</span>
            </TrackedLink>
          </div>
        </div>
      </header>

      {live.length > 0 && (
        <RealMoneyRegister bots={live} fleetSize={bots.length} reading={readingDate(live.map(b => b.last_sync_at))} />
      )}

      {/* ---------- The library, by idea (no tiers until feat/bot-tiers-cohorts) ---------- */}
      <section data-testid="home-library" aria-labelledby="home-library-title" className={SECTION}>
        <h2 id="home-library-title" className="mb-4 text-2xl font-semibold tracking-tight">Je range les variantes par idée.</h2>
        {library && (
          <>
            <p className="mb-2 flex flex-wrap items-baseline gap-x-3 tabular-nums">
              <strong className="text-[35px] font-medium leading-tight sm:text-[42px]">{fr(library.ideas)}</strong>{' '}
              <span className="text-muted">
                idées ·{' '}<b className="font-medium text-foreground">{fr(library.variants)}</b>{' '}variantes
              </span>
            </p>
            <p className="mb-5 max-w-[66ch] text-muted">
              Je publie aussi ce qui attend :{' '}{fr(library.paper)}{' '}variantes sont en simulation,{' '}
              {fr(library.waiting)}{' '}en backtest seul. Les bots écrits à la main ne sont pas encore dans cette bibliothèque.
            </p>
          </>
        )}
        <Link href="/bibliotheque" className={PRIMARY_BUTTON}>Explorer la bibliothèque →</Link>
      </section>

      {/* ---------- What I reject, and one article ---------- */}
      <section className={`${SECTION} grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-[70px]`}>
        {funnel && funnel.n_no_go > 0 && (
          <div data-testid="home-graveyard">
            <p className="text-[31px] font-medium leading-tight tabular-nums sm:text-[35px]">{fr(funnel.n_no_go)}</p>
            <h2 className="mb-2.5 text-xl font-semibold sm:text-2xl">configurations recalées</h2>
            <p className="text-muted">Je publie leur motif. Une sélection ne raconte rien si je cache tout ce qui a échoué.</p>
            <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'home-cimetiere')} target="_blank" rel="noopener noreferrer"
               className={linkClass('inline', 'mt-1 inline-flex min-h-11 items-center')}>
              Voir le cimetière ↗
            </a>
          </div>
        )}
        <HomeArticle articles={articles} />
      </section>

      {/* ---------- Favourites and Direct: the home ends here, not on an exchange ---------- */}
      <section data-testid="home-follow" aria-labelledby="home-follow-title" className="py-8 sm:py-9">
        <h2 id="home-follow-title" className="mb-3 text-2xl font-semibold tracking-tight">Garder un bot en favori, ou le suivre en direct</h2>
        {/* The sale is read from its flag (lib/direct-sale.ts), never assumed. */}
        <p className="mb-4 max-w-[66ch] text-muted">
          Mets un bot en favori pour le retrouver dans ton espace. Avec l’offre Direct, tu reçois aussi son journal
          de trades en temps réel, sur sa fiche et dans Telegram.
          {!DIRECT_SALE_OPEN && <>{' '}La vente de Direct est encore fermée.</>}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <a href={labUrl('https://lab.algoproof.fr/espace', 'home-espace')} target="_blank" rel="noopener noreferrer"
             className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Ouvrir ton espace ↗
          </a>
          <Link href="/strategies/bot/v1-spot" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Examiner une fiche bot →
          </Link>
          <a href={labUrl('https://lab.algoproof.fr/membre', 'home-offres')} target="_blank" rel="noopener noreferrer"
             className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Comprendre les offres ↗
          </a>
        </div>
      </section>
    </div>
  )
}
