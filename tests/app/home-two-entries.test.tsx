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
// and the bots counted as ONE total with its real-money part.
//
// Refonte « Le registre des décisions », lot 2 (02/10/2026): the mock-up turns each
// entry into one line, the whole line a link. « Mes stratégies, idée par idée » opens
// the library, « Les sociétés que je lis » the company list. Left with the cards: the
// lab button and its small print (the nav keeps « Le labo », cta_lab location nav),
// the fleet link (the register right below links it twice), /investir#methode, and
// the mark above the headline (the bar names the site).
import tailwindConfig from '../../tailwind.config'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mkBot } from '../fixtures/bots'

// 2 real-money, 3 in simulation. Distinctive digits: 2, 3 and their sum 5 do
// not collide with the funnel's own numbers below, so a test asserting « 5 »
// cannot pass on a configuration count that happens to match.
vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => { throw new Error('lists read summaries (D094)') },
  getListBots: async () => [
    mkBot({ slug: 'v1-spot', status: 'live' }),
    mkBot({ slug: 'orb-bf25', status: 'live' }),
    mkBot({ slug: 'paper-a', status: 'paper' }),
    mkBot({ slug: 'paper-b', status: 'paper' }),
    mkBot({ slug: 'paper-c', status: 'paper' }),
    // archived is excluded from every aggregate (lib/cohort.ts) — it must not
    // reach any of the numbers below.
    mkBot({ slug: 'old-one', status: 'archived' }),
  ],
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => ({
    n_swept: 5855277,
    n_judged: 351359,
    n_go: 713,
    n_marginal: 20646,
    n_no_go: 330000,
    // The view still returns these. The point of the fix is that THIS page does
    // not print them: a second bot count beside the hero's is what made « 89 »
    // and « 92 » look like a contradiction.
    n_promoted: 5,
    n_live: 2,
  }),
}))

vi.mock('@/lib/articles', () => ({ getArticles: () => [] }))
vi.mock('@/lib/library', () => ({ getLibraryIdeas: async () => [] }))

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
  // first entry to 613 px -- below the fold of a 664 px screen. The headline is
  // sized per breakpoint, the phone size first. Refonte lot 2: the mock-up's
  // sizes, 34 px on a phone, 52 px on a computer. Finitions (2026-10-03): on the
  // closed scale, 30 px on a phone (3xl), 40 px from 640 px (4xl) and the named
  // display size, 52 px, from 1 024 px.
  it('the headline is sized for a phone before it is sized for a desktop', async () => {
    render(await HomePage())
    const cls = screen.getByRole('heading', { level: 1 }).className
    expect(cls, cls).toMatch(/(^|\s)text-3xl(\s|$)/)
    expect(cls, cls).toMatch(/(^|\s)sm:text-4xl(\s|$)/)
    expect(cls, cls).toMatch(/(^|\s)lg:text-display(\s|$)/)
    const sizes = tailwindConfig.theme?.extend?.fontSize as Record<string, [string, unknown]>
    expect(sizes.display[0]).toBe('52px')
  })

  it('the hero says what I publish on both sides', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    expect(hero.textContent).toMatch(/bots, dont \d+ avec mon argent/)
    expect(hero.textContent).toMatch(/rapports annuels à travers sept contrôles/)
    expect(hero.textContent).toMatch(/Je publie chaque trade et chaque alerte, y compris quand les bots perdent/)
  })
})

describe('/ — the two entries sit directly under the message', () => {
  it('the entries sit in the hero, strategies then companies, after the lead', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    const order = [...hero.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'))
    expect(order).toEqual(['home-lead', 'entry-strategies', 'entry-companies'])
  })

  it('the strategies entry opens the library, by idea', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    const links = [...card.querySelectorAll('a')]
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/bibliotheque'])
    expect(links[0].textContent).toMatch(/Mes stratégies, idée par idée/)
    expect(links[0].textContent).toMatch(/Je distingue la recherche, la simulation et le réel\./)
  })

  // The failure the lab guard pinned is silent: `https://lab.algoproof.fr` is a
  // valid URL that serves the pitch. The home has no lab button any more, but no
  // link on it may send a visitor who has read the pitch back to it.
  it('no lab link on the home opens the pitch it already read', async () => {
    const { container } = render(await HomePage())
    const labPaths = [...container.querySelectorAll('a')].map(a => a.getAttribute('href') ?? '')
      .filter(h => h.startsWith('https://lab.algoproof.fr')).map(h => new URL(h).pathname)
    expect(labPaths.length).toBeGreaterThan(0)
    expect(labPaths).not.toContain('/')
  })

  it('the companies entry opens the list', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-companies')
    expect([...card.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/investir'])
    expect(card.textContent).toMatch(/Les sociétés que je lis/)
  })

  // D058 (2026-09-19): no page promises a company grade or verdict any more.
  // The entry that sends fresh traffic to /investir is the last place that
  // should re-open that promise. The seven checks are named in the lead above it.
  it('the companies entry promises no grade and no verdict', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-companies')
    expect(card.textContent).toMatch(/Je publie mes contrôles/)
    expect(card.textContent).not.toMatch(/\bje note\b|\bnotées?\b|\bverdict\b/i)
  })

  // The chantier that created this entry exists to give Investir visibility.
  // Shipped without an event, it could not be told apart from the old card that
  // sat at 1 686 px — the page would look better and prove nothing.
  it('the companies entry is measurable', async () => {
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
  // The rule FleetLine carried until the refonte: one total, with its real-money
  // part. The lead says it; the register's button repeats the SAME total, under
  // the same word, never a nested population under another name.
  it('the lead reads total and real money, and every other bot count on the page is that total', async () => {
    const { container } = render(await HomePage())
    expect(screen.getByTestId('home-lead').textContent).toMatch(/Je fais tourner 5 bots, dont 2 avec mon argent/)
    const counts = [...(container.textContent ?? '').matchAll(/(\d[\d\s  ]*)\s?bots?\b/g)]
      .map(m => Number(m[1].replace(/\D/g, '')))
    expect(counts.length).toBeGreaterThanOrEqual(2)
    expect(new Set(counts)).toEqual(new Set([5]))
  })

  it('no second block on this page counts bots', async () => {
    render(await HomePage())
    expect(screen.queryByTestId('funnel-fleet')).toBeNull()
    expect(screen.queryByTestId('home-fleet-line')).toBeNull()
    expect(screen.queryByText('Bots en service (simulation ou argent réel)')).toBeNull()
  })

  // The engine counts configurations, the fleet counts bots (D059). The engine's
  // addition counts no bot; its note says, in words, that bots are counted apart.
  it('the engine figures on the home count configurations, and no bot', async () => {
    render(await HomePage())
    // The five figures on one row (owner, 03/10): configurations only, never a bot (D059).
    const row = screen.getByTestId('engine-row-figures')
    expect(row.textContent!.replace(/\s/g, ' ')).toMatch(/recalées\s*330 000/)
    expect(row.textContent).toMatch(/jugées/)
    expect(row.textContent).not.toMatch(/bots?\b/i)
    expect(screen.getByTestId('engine-outside').textContent).toMatch(/Mes bots et les variantes de la bibliothèque se comptent à part/)
  })

  // Vocabulary decision (2026-09-20): « le labo » is the TOOL, « simulation »
  // is the bot STATUS.
  it('the hero says simulation, never laboratoire, for the bot status', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    expect(hero.textContent).not.toMatch(/laboratoire/i)
  })
})

// Owner, 2026-09-24, desktop pass: the three text links under the counters, the
// manifesto card and the « IA » card are gone. Météo and Apprendre stay in the nav,
// /preuve in the footer.
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
})

// The 2026-09-20 second pass (user): the two entries read as ONE pair rather than
// a primary and an afterthought.
describe('/ — the two entries are a matched pair', () => {
  // Comparing the two class attributes rather than grepping one token: a guard
  // that only checks one side stays green if the other drifts.
  it('both entries carry the same treatment', async () => {
    render(await HomePage())
    const strategies = screen.getByTestId('entry-strategies').querySelector('a')!
    const companies = screen.getByTestId('entry-companies').querySelector('a')!
    expect(strategies.getAttribute('class')).toBeTruthy()
    expect(companies.getAttribute('class')).toBe(strategies.getAttribute('class'))
  })

  it('each entry carries one line under its title', async () => {
    render(await HomePage())
    expect(screen.getByTestId('entry-strategies').textContent).toMatch(/Je distingue la recherche, la simulation et le réel\./)
    expect(screen.getByTestId('entry-companies').textContent).toMatch(/Je publie mes contrôles\. Des lectures, pas des conseils\./)
  })

  // D058 retired the company grade and verdict on 2026-09-19, but no sentence
  // on this page said the reading is not advice. The companies entry does.
  it('the companies entry says it is not investment advice', async () => {
    render(await HomePage())
    expect(screen.getByTestId('entry-companies').textContent).toMatch(/pas des conseils/i)
  })

  // The bar names the site (« AlgoProof », Proof in green). The mark above the
  // headline left with the refonte (the mock-up has none); the hero still does not
  // announce the brand a second time.
  it('the hero names the site nowhere, the bar already does', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    expect(hero.textContent).not.toMatch(/AlgoProof/i)
    for (const img of hero.querySelectorAll('img')) expect(img.getAttribute('alt')).toBe('')
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
