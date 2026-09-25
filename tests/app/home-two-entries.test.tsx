// tests/app/home-two-entries.test.tsx
//
// The home used to open on « Mon labo de trading algorithmique, en public. »,
// a headline that named ONE of the two things this site does. Investir — the
// company accounts read through seven checks — lived in a badge-sized card
// 1 686 px down a 390 px phone, measured in production on 2026-09-20: two and a
// half screens of scroll before the word appears.
//
// The same measurement found the counters the user read as wrong: the hero
// strip said « 3 bots en argent réel · 89 en laboratoire » at 821 px and the
// funnel block said « 92 bots en service » at 941 px. 89 + 3 = 92, so nothing
// was false; the two blocks simply named nested populations under different
// words, 120 px apart, with no sentence saying the second contained the first.
//
// These guards pin the fix: two entries of equal weight under the headline,
// and ONE place on this page that counts bots, written as a sum of its parts.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mkBot } from '../fixtures/bots'

// 2 real-money, 3 in simulation. Distinctive digits: 2, 3 and their sum 5 do
// not collide with the funnel's own numbers below, so a test asserting « 5 »
// cannot pass on a configuration count that happens to match.
vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => [
    mkBot({ slug: 'v1-spot', status: 'live' }),
    mkBot({ slug: 'orb-bf25', status: 'live' }),
    mkBot({ slug: 'paper-a', status: 'paper' }),
    mkBot({ slug: 'paper-b', status: 'paper' }),
    mkBot({ slug: 'paper-c', status: 'paper' }),
    // archived is excluded from every aggregate (lib/cohort.ts) — it must not
    // reach any of the three numbers below.
    mkBot({ slug: 'old-one', status: 'archived' }),
  ],
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => ({
    n_swept: 5855277,
    n_judged: 351359,
    // Sum to n_judged, like the view. 351359 / 713 = 492.8 -> « 1 sur 500 ».
    n_go: 713,
    n_marginal: 20646,
    n_no_go: 330000,
    // The view still returns these. The point of the fix is that THIS page no
    // longer prints them: a second bot count beside the hero's is what made
    // « 89 » and « 92 » look like a contradiction.
    n_promoted: 5,
    n_live: 2,
  }),
}))

// Lot 3 (2026-09-25): the home also reads the market-weather measure and the
// article index; both build clients at import time and are mocked whole.
vi.mock('@/lib/mi-fleet-impact', () => ({
  pct: (f: number) => `${(f * 100).toFixed(1).replace('.', ',')} %`,
  getFleetImpact: async () => null,
}))
vi.mock('@/lib/articles', () => ({ getArticles: () => [] }))

import HomePage from '@/app/page'

describe('/ — the home opens on both activities, not on the lab alone', () => {
  it('the headline names strategies AND company accounts', async () => {
    render(await HomePage())
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/Des stratégies testées/)
    expect(h1.textContent).toMatch(/Des comptes de sociétés examinés/)
  })

  it('no badge above the headline still sells a trading lab only', async () => {
    const { container } = render(await HomePage())
    const hero = within(container).getByTestId('home-hero')
    expect(hero.textContent).not.toMatch(/Labo de trading algo transparent/)
  })

  // Measured on the built page at 390x664 (the project's phone reference):
  // a flat text-5xl headline wrapped to FIVE lines, 240 px tall, and pushed the
  // first entry to 613 px -- below the fold of a 664 px screen. The demand was
  // two entries directly under the message; a visitor who has to scroll to see
  // the first one has neither. The headline is sized per breakpoint.
  it('the headline is sized for a phone before it is sized for a desktop', async () => {
    render(await HomePage())
    const cls = screen.getByRole('heading', { level: 1 }).className
    expect(cls, cls).toMatch(/(^|\s)text-3xl(\s|$)/)
    // 4xl (40 px) since the lot 1 scale closed at 4xl; the phone size is still first.
    expect(cls, cls).toMatch(/(^|\s)sm:text-4xl(\s|$)/)
  })

  it('the hero says what I publish on both sides', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    // Lot 3 lead (PASS 4): three read numbers, then the one promise, losses included.
    expect(hero.textContent).toMatch(/bots, dont \d+ avec mon argent/)
    expect(hero.textContent).toMatch(/rapports annuels lus par sept contrôles/)
    expect(hero.textContent).toMatch(/Chaque trade et chaque alerte publiés, y compris ce qui perd/)
  })
})

describe('/ — the two entries sit directly under the message', () => {
  // Lot 3, variant A: the real-money strip (phone) comes first, then the two entries.
  it('the entries sit in the hero, strategies then companies, under the real-money strip', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    const strategies = screen.getByTestId('entry-strategies')
    const companies = screen.getByTestId('entry-companies')
    expect(hero.contains(strategies)).toBe(true)
    expect(hero.contains(companies)).toBe(true)
    const order = [...hero.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'))
    expect(order.indexOf('home-real-strip')).toBeLessThan(order.indexOf('entry-strategies'))
    expect(order.indexOf('entry-strategies')).toBeLessThan(order.indexOf('entry-companies'))
  })

  // The user's own arbitration (2026-09-20): the strategies entry carries BOTH
  // destinations — the lab to act, the fleet to check — with the lab first.
  //
  // The lab href became `/lab` (the backtester) on 2026-09-20, where it used to
  // be the bare root (the landing-pitch). That amends D051/D053: the landing
  // stays the pitch for COLD traffic — Reddit, SEO, a hand-typed URL — but the
  // visitor who arrives from here has already read the pitch, three lines above
  // the button. The button has promised « Tester ta stratégie » from the start;
  // it is the destination that was wrong, not the label.
  it('the strategies entry opens the lab AND the fleet', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    const hrefs = [...card.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).toContain('https://lab.algoproof.fr/lab')
    expect(hrefs).toContain('/overview')
    // The lab is the primary action, so it comes first in the DOM, which is
    // also the reading order on a phone.
    expect(hrefs.indexOf('https://lab.algoproof.fr/lab')).toBeLessThan(hrefs.indexOf('/overview'))
  })

  // The failure this pins is silent: `https://lab.algoproof.fr` is a perfectly
  // valid URL that serves a perfectly good page, so a revert to it breaks
  // nothing visible — it just puts the pitch back in front of a visitor who
  // already read it. Asserting the presence of `/lab` alone would stay green if
  // BOTH links were there; the absence of the bare root is the real assertion.
  it('the lab button opens the backtester, not the pitch it already read', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    const hrefs = [...card.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).not.toContain('https://lab.algoproof.fr')
    expect(hrefs).not.toContain('https://lab.algoproof.fr/')
  })

  it('the lab link keeps the cta_lab analytics series intact', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    const lab = [...card.querySelectorAll('a')].find(a => a.getAttribute('href') === 'https://lab.algoproof.fr/lab')!
    expect(lab.textContent).toMatch(/Tester ta stratégie, sans compte/)
  })

  it('the strategies entry keeps what the lab actually tells you', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    // « fragile, et pourquoi » is the word globalVerdict() returns in algolab,
    // on a payload with no softwall: it describes what a visitor WITHOUT an
    // account receives. It is the only concrete benefit of the tool on this
    // page, and it does not survive a rewrite by accident.
    expect(card.textContent).toMatch(/fragile, et pourquoi/)
    expect(card.textContent).toMatch(/Un backtester, pas un broker/)
  })

  it('the companies entry opens the list AND the method', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-companies')
    const hrefs = [...card.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/investir')
    expect(hrefs).toContain('/investir#methode')
  })

  // D058 (2026-09-19): no page promises a company grade or verdict any more.
  // The entry that sends fresh traffic to /investir is the last place that
  // should re-open that promise.
  it('the companies entry promises seven checks, never a grade or a verdict', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-companies')
    expect(card.textContent).toMatch(/sept contrôles/)
    expect(card.textContent).toMatch(/Pas de note, pas de verdict/)
    expect(card.textContent).not.toMatch(/\bje note\b|\bnotées?\b|\bverdict\b(?!\.)/i)
  })

  // The chantier that created this entry exists to give Investir visibility.
  // Shipped without an event, it could not be told apart from the old card that
  // sat at 1 686 px — the page would look better and prove nothing. The primary
  // action of each entry carries one; the secondary links do not.
  it('the companies entry is measurable, like the lab one opposite', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-companies')
    const cta = [...card.querySelectorAll('a')].find(a => a.getAttribute('href') === '/investir')!
    expect(cta, 'the /investir call to action').toBeTruthy()
    const src = readFileSync(resolve(__dirname, '../../src/app/page.tsx'), 'utf8').replace(/\s+/g, ' ')
    expect(src, 'the companies CTA fires cta_investir').toMatch(
      /<TrackedLink href="\/investir" event="cta_investir" location="home-hero"/,
    )
  })

  // D051: Investir is an audience asset. Giving it the visibility it lacked
  // does not authorise a subscription bridge from it.
  it('the companies entry sells nothing', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-companies')
    expect(card.textContent).not.toMatch(/membre|abonn|€|payant/i)
    const hrefs = [...card.querySelectorAll('a')].map(a => a.getAttribute('href') ?? '')
    expect(hrefs.some(h => /membre|compte|lab\.algoproof/.test(h))).toBe(false)
  })
})

describe('/ — bots are counted once, and the total shows its parts', () => {
  // Lot 3: the one place that counts bots is the fleet line beside the funnel
  // (outside it, D059), total with its real-money part.
  it('the one counter line reads total and real money, beside the funnel', async () => {
    render(await HomePage())
    const line = screen.getByTestId('home-fleet-line')
    expect(line.textContent).toMatch(/5 bots en service/)
    expect(line.textContent).toMatch(/2 avec mon argent/)
    expect(screen.getByTestId('home-funnel').contains(line)).toBe(false)
  })

  it('no second block on this page counts bots', async () => {
    render(await HomePage())
    // The funnel's fleet block is what produced the « 89 then 92 » reading.
    expect(screen.queryByTestId('funnel-fleet')).toBeNull()
    expect(screen.queryByText('Bots en service (simulation ou argent réel)')).toBeNull()
  })

  it('the funnel counts configurations the way the cockpit does, and no bot', async () => {
    render(await HomePage())
    const funnel = screen.getByTestId('home-funnel')
    for (const label of ['Configurations balayées', 'Jugées au gantelet', 'Leurs verdicts', 'Candidates']) {
      expect(within(funnel).getByText(label), label).toBeTruthy()
    }
    expect(funnel.textContent!.replace(/\s/g, ' ')).toMatch(/330 000 recalées · 93 %/) // floor(100 * 330000 / 351359) = 93
    expect(funnel.textContent).not.toMatch(/bots? en service/i)
  })

  // Cockpit spec §9.3, carried over: « 713 » alone reads as 713 winners.
  it('the candidate count never renders without its denominator', async () => {
    render(await HomePage())
    expect(screen.getByTestId('home-funnel').textContent).toMatch(/1 sur 500 jugées/)
  })

  // Owner, 2026-09-24: no cimetière link on this band.
  it('the funnel itself carries no link to the cimetière; the fleet line beside it does', async () => {
    render(await HomePage())
    expect(screen.getByTestId('home-funnel').querySelector('a[href*="cimetiere"]')).toBeNull()
    expect(screen.getByTestId('home-fleet-line').querySelector('a[href*="cimetiere"]')).not.toBeNull()
  })

  // Vocabulary decision (2026-09-20): « le labo » is the TOOL, « simulation »
  // is the bot STATUS. StatusBadge already says « Simulation »; the hero said
  // « laboratoire » for the same thing, which is what made one word cover two
  // meanings on the page that has to be clearest.
  it('the hero says simulation, never laboratoire, for the bot status', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    expect(hero.textContent).not.toMatch(/laboratoire/i)
  })
})

// Owner, 2026-09-24, desktop pass: the three text links under the counters, the
// manifesto card and the « IA » card are gone. The ticker leads straight to the
// strategies table. Météo and Apprendre stay in the nav, /preuve in the footer.
describe('/ — no side links in the hero, no retired blocks (lot 3)', () => {
  it('the hero no longer carries the three text links', async () => {
    render(await HomePage())
    const hrefs = [...screen.getByTestId('home-hero').querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).not.toContain('/intelligence')
    expect(hrefs).not.toContain('/preuve')
    expect(hrefs).not.toContain('/strategies')
  })

  it('carries neither the manifesto, nor the IA card, nor the ranking table, nor the teasers', async () => {
    const { container } = render(await HomePage())
    expect(container.textContent).not.toMatch(/Lire le manifeste/)
    expect(container.textContent).not.toMatch(/Faire vérifier une stratégie écrite par une IA/)
    expect(container.querySelector('table')).toBeNull()
    expect(screen.queryByTestId('teaser-learn')).toBeNull()
    expect(screen.queryByTestId('teaser-fleet')).toBeNull()
  })

  // Same recipe as the two entries: background, border, padding, title, white
  // prose. Comparing class attributes, not grepping one token, so the pair
  // cannot drift apart in either direction.
})

// The 2026-09-20 second pass (user). Three of the four asks were about the two
// entries reading as ONE pair rather than a primary and an afterthought: the
// same button colour, the same bottom line, and a mark above the headline.
describe('/ — the two entries are a matched pair', () => {
  // The two CTAs used to differ: `bg-positive text-black` on the left,
  // `bg-card border border-border` on the right. Comparing the two class
  // attributes rather than grepping for `bg-positive` is deliberate — a guard
  // that only checks the right-hand button is green stays green if the LEFT one
  // later stops being, and the pair would be uniform in the wrong direction.
  it('both entry buttons carry the same green treatment', async () => {
    render(await HomePage())
    const lab = [...screen.getByTestId('entry-strategies').querySelectorAll('a')]
      .find(a => a.getAttribute('href') === 'https://lab.algoproof.fr/lab')!
    const investir = [...screen.getByTestId('entry-companies').querySelectorAll('a')]
      .find(a => a.getAttribute('href') === '/investir')!
    expect(lab.getAttribute('class')).toContain('bg-foreground')
    expect(investir.getAttribute('class')).toBe(lab.getAttribute('class'))
  })

  // The user asked for the reassurance line on the left to be REMOVED so the
  // two cards' bottoms would line up. Symmetry buys the same alignment without
  // spending the reassurance — and it is worth more now that the button next to
  // it opens a tool directly rather than a pitch. If a later session deletes
  // one of the two, this fails rather than quietly re-staggering the cards.
  it('each entry ends on its own reassurance line', async () => {
    render(await HomePage())
    expect(screen.getByTestId('entry-strategies').textContent)
      .toMatch(/Un backtester, pas un broker\. Rien à déposer, aucune clé à donner\./)
    expect(screen.getByTestId('entry-companies').textContent)
      .toMatch(/Des lectures, pas des conseils\. Aucune recommandation d'achat ou de vente\./)
  })

  // D058 retired the company grade and verdict on 2026-09-19, but no sentence
  // on this page said the reading is not advice. The companies card now does.
  it('the companies entry says it is not investment advice', async () => {
    render(await HomePage())
    expect(screen.getByTestId('entry-companies').textContent).toMatch(/pas des conseils/i)
  })

  // Decorative on purpose: the nav already carries « ALGOPROOF » as text inside
  // a link. A non-empty alt here would make a screen reader announce the brand
  // twice, ~100 px apart, as two separate things.
  it('the hero carries the mark, above the headline and without a second name', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    const mark = hero.querySelector('img[src="/logo.svg"]')
    expect(mark, 'the mark above the H1').toBeTruthy()
    expect(mark!.getAttribute('alt')).toBe('')
    const h1 = hero.querySelector('h1')!
    expect(
      mark!.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the mark comes before the H1',
    ).toBeTruthy()
  })
})

// Until 2026-09-20 this repo still shipped `src/app/favicon.ico` exactly as
// Create Next App wrote it in commit 141efe9 — so every browser tab, and every
// link preview that falls back to the icon, showed the Next.js logo. The
// launch post makes that the first thing a stranger sees.
describe('the site ships its own icon', () => {
  const repo = (p: string) => resolve(__dirname, '../..', p)

  it('the Create Next App favicon is gone and an SVG icon replaces it', () => {
    expect(existsSync(repo('src/app/favicon.ico')), 'the default favicon.ico').toBe(false)
    expect(existsSync(repo('src/app/icon.svg')), 'src/app/icon.svg').toBe(true)
    expect(existsSync(repo('public/logo.svg')), 'public/logo.svg').toBe(true)
  })

  // The hero mark and the favicon are two files by necessity — one assumes the
  // site background for the check's halo, the other carries its own tile — but
  // they must stay the SAME mark. The check path is what makes it that mark.
  it('the hero mark, the favicon and the OG card draw the same check', () => {
    const CHECK = 'M36 22 L45 32 L60 9'
    for (const f of ['public/logo.svg', 'src/app/icon.svg', 'src/app/opengraph-image.tsx']) {
      expect(readFileSync(repo(f), 'utf8'), `${f} draws the mark's check`).toContain(CHECK)
    }
  })

  // The palette is not decorative here: a mark that drifts from the site's
  // tokens is a mark that stops matching the site it stands for.
  it('the mark uses the site tokens, not hand-picked hexes', () => {
    const svg = readFileSync(repo('public/logo.svg'), 'utf8')
    expect(svg).toContain('#4ade80') // positive
    expect(svg).toContain('#f87171') // negative
    expect(svg).toContain('#0a0a0a') // bg — the check's halo
  })
})
