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
    // The view still returns these. The point of the fix is that THIS page no
    // longer prints them: a second bot count beside the hero's is what made
    // « 89 » and « 92 » look like a contradiction.
    n_promoted: 5,
    n_live: 2,
  }),
}))

import HomePage from '@/app/page'
import { STRATEGY_FICHES } from '@/lib/strategy-library'

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
    expect(cls, cls).toMatch(/(^|\s)sm:text-5xl(\s|$)/)
  })

  it('the hero says what I publish on both sides', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    expect(hero.textContent).toMatch(/je publie les résultats de mes bots, gains comme pertes/)
    expect(hero.textContent).toMatch(/sept contrôles/)
    expect(hero.textContent).toMatch(/pour que tu puisses vérifier/)
  })
})

describe('/ — the two entries sit directly under the message', () => {
  it('the entries are ordered strategies, companies, then the counters', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    const strategies = screen.getByTestId('entry-strategies')
    const companies = screen.getByTestId('entry-companies')
    expect(hero.contains(strategies)).toBe(true)
    expect(hero.contains(companies)).toBe(true)
    // The counters must follow the entries, not separate them.
    const order = [...hero.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'))
    expect(order.indexOf('entry-strategies')).toBeLessThan(order.indexOf('entry-companies'))
    expect(order.indexOf('entry-companies')).toBeLessThan(order.indexOf('fleet-counters'))
  })

  // The user's own arbitration (2026-09-20): the strategies entry carries BOTH
  // destinations — the lab to act, the fleet to check — with the lab first.
  it('the strategies entry opens the lab AND the fleet', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    const hrefs = [...card.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).toContain('https://lab.algoproof.fr')
    expect(hrefs).toContain('/overview')
    // The lab is the primary action, so it comes first in the DOM, which is
    // also the reading order on a phone.
    expect(hrefs.indexOf('https://lab.algoproof.fr')).toBeLessThan(hrefs.indexOf('/overview'))
  })

  it('the lab link keeps the cta_lab analytics series intact', async () => {
    render(await HomePage())
    const card = screen.getByTestId('entry-strategies')
    const lab = [...card.querySelectorAll('a')].find(a => a.getAttribute('href') === 'https://lab.algoproof.fr')!
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
  it('the one counter line reads total, real money and simulation', async () => {
    render(await HomePage())
    const line = screen.getByTestId('fleet-counters')
    // 2 live + 3 paper = 5. The archived bot is not in any of them.
    expect(line.textContent).toMatch(/5\s*bots en service/)
    expect(line.textContent).toMatch(/2\s*en argent réel/)
    expect(line.textContent).toMatch(/3\s*en simulation/)
  })

  it('no second block on this page counts bots', async () => {
    render(await HomePage())
    // The funnel's fleet block is what produced the « 89 then 92 » reading.
    expect(screen.queryByTestId('funnel-fleet')).toBeNull()
    expect(screen.queryByText('Bots en service (simulation ou argent réel)')).toBeNull()
  })

  it('the funnel stays, counting configurations and nothing else', async () => {
    render(await HomePage())
    const funnel = screen.getByTestId('funnel-counter')
    expect(within(funnel).getByText('Configurations balayées')).toBeTruthy()
    expect(within(funnel).getByText('Jugées au gantelet')).toBeTruthy()
    expect(funnel.textContent).not.toMatch(/bots? en service/i)
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

describe('/ — the doors the four-card grid used to carry', () => {
  it('the market weather is still reachable from the first screen', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    const hrefs = [...hero.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/intelligence')
  })

  it('the strategy library keeps its live fiche count', async () => {
    render(await HomePage())
    const link = screen.getAllByRole('link').find(a => a.getAttribute('href') === '/strategies')!
    expect(link.textContent).toContain(`${STRATEGY_FICHES.length} stratégies`)
  })

  it('the manifesto is still one click from the first screen', async () => {
    render(await HomePage())
    const hero = screen.getByTestId('home-hero')
    const hrefs = [...hero.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/preuve')
  })
})
