// Lot 3 of the design audit (2026-09-25, conception §5.1, mock-ups of PASS 4, variant A
// chosen by the user): the home shows its proof in the first screen. The three bots in
// real money, the losing one first, with their real figures; the engine as a unit chart (bars until the 2026-09-26 counter-audit);
// the method as four tiles; the two things the site publishes when it does not work
// (the ORB decision, the market-weather measure); three articles; the graveyard.
// Gone: the ticker, the ten-row table, the two teaser cards, the exchange call to action.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { mkBot } from '../fixtures/bots'

const day = (i: number) => `2026-09-${String(i).padStart(2, '0')}`
const series = (from: number, to: number) => Array.from({ length: 30 }, (_, i) => ({
  id: `p${i}`, bot_id: 'b', date: day(i + 1), capital: from + ((to - from) * i) / 29,
  pnl_day: 0, win_rate: 0.5, profit_factor: 1,
}))

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => [
    mkBot({ slug: 'orb-bf25', name: 'Cassure de range d’ouverture H1 Hyperliquid', status: 'live', start_capital: 1000,
      last_sync_at: new Date(Date.now() - 26 * 60_000).toISOString(),
      stats: { total_trades: 280, win_rate: 0.45, profit_factor: 0.95, max_drawdown: 0.291, latest_capital: 935.26 },
      perf_daily: series(900, 935.26) }),
    mkBot({ slug: 'v1-hl', name: 'Croisement EMA H4 Hyperliquid', status: 'live', start_capital: 1000,
      stats: { total_trades: 68, win_rate: 0.456, profit_factor: 1.69, max_drawdown: 0.048, latest_capital: 1198.39 },
      perf_daily: series(1210, 1198.39) }),
    mkBot({ slug: 'v1-spot', name: 'Croisement EMA H4 Kraken Spot', status: 'live', start_capital: 1000,
      stats: { total_trades: 42, win_rate: 0.595, profit_factor: 2.82, max_drawdown: 0.022, latest_capital: 1272.73 },
      perf_daily: series(1240, 1272.73) }),
    mkBot({ slug: 'paper-a', status: 'paper' }),
    mkBot({ slug: 'paper-b', status: 'paper' }),
    mkBot({ slug: 'old-one', status: 'archived' }),
  ],
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => ({
    n_swept: 41333092, n_judged: 1754244, n_go: 3536, n_marginal: 259782, n_no_go: 1490926, n_promoted: 5, n_live: 3,
  }),
}))
// Mocked whole: the real module builds a Supabase client at import time.
vi.mock('@/lib/mi-fleet-impact', () => ({
  pct: (f: number) => `${(f * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`.replace(/^-/, '−'),
  getFleetImpact: async () => ({
    windowDays: 137, nPresets: 8, nTrades: 409, nSmallSample: 2, blockedRed: 0,
    ddBaseline: -0.138, ddBoth: -0.115, ddConstant: -0.09, pnlBoth: 10, pnlConstant: 12,
  }),
}))
vi.mock('@/lib/articles', () => ({
  getArticles: () => [
    { slug: '2026-09-20-weekly', title: 'Les shorts : la leçon la plus chère', date: '2026-09-20', summary: 's', tags: [], category: 'weekly' },
    { slug: '2026-09-19-journal', title: 'Journal', date: '2026-09-19', summary: 's', tags: [], category: 'journal' },
    { slug: '2026-07-11-95', title: 'Pourquoi 95 % des backtests mentent', date: '2026-07-11', summary: 's', tags: [], category: 'methode' },
    { slug: '2026-07-02-dorment', title: 'Pourquoi certains de mes bots ne tradent pas', date: '2026-07-02', summary: 's', tags: [], category: 'methode' },
    { slug: '2026-06-25-six', title: 'J’ai testé 6 méthodes', date: '2026-06-25', summary: 's', tags: [], category: 'strategie' },
    { slug: '2026-06-04-mica', title: 'MiCA expliqué', date: '2026-06-04', summary: 's', tags: [], category: 'guide' },
  ],
}))

import HomePage from '@/app/page'

describe('/ — the proof is in the first screen', () => {
  it('renders the real-money panel with the three live bots, the longest history first', async () => {
    render(await HomePage())
    const panel = screen.getByTestId('home-real')
    // the first link of a card is the bot's name; a crossed bot carries a second one
    const names = within(panel).getAllByTestId('home-bot-card').map(c => within(c).getAllByRole('link')[0].textContent)
    expect(names).toEqual([
      'Cassure de range d’ouverture H1 Hyperliquid', 'Croisement EMA H4 Hyperliquid', 'Croisement EMA H4 Kraken Spot',
    ])
  })

  it('each card carries the real figures: signed %, trades, PF, WR, DD, and a 30-day sparkline', async () => {
    render(await HomePage())
    const [orb] = within(screen.getByTestId('home-real')).getAllByTestId('home-bot-card')
    // getByText normalises U+202F to a space; textContent checks below keep the real one
    expect(within(orb).getByText(/−6,5 %/)).toHaveClass('text-negative')
    expect(orb.textContent).toMatch(/280 trades/)
    expect(orb.textContent).toMatch(/PF 0,95/)
    expect(orb.textContent).toMatch(/WR 45,0 %/)
    expect(orb.textContent).toMatch(/DD 29,1 %/)
    expect(orb.querySelector('svg polyline')).not.toBeNull()
  })

  it('says under the losing bot that its published rule is crossed, and what I decided', async () => {
    render(await HomePage())
    const [orb, hl, spot] = within(screen.getByTestId('home-real')).getAllByTestId('home-bot-card')
    expect(within(orb).getByTestId('home-bot-rule').textContent).toMatch(/règle d’arrêt franchie/)
    expect(within(orb).getByTestId('home-bot-rule').textContent).toMatch(/je le garde/)
    // v1-hl has no pre-registered envelope (bot-expectations.ts): the card says so
    // rather than pretending it is inside one.
    expect(within(hl).getByTestId('home-bot-rule').textContent).toMatch(/pas d’enveloppe/)
    expect(within(spot).getByTestId('home-bot-rule').textContent).toMatch(/dans l’enveloppe/)
  })

  it('names the panel « Argent réel » with its freshness, and links the whole fleet', async () => {
    render(await HomePage())
    const panel = screen.getByTestId('home-real')
    expect(panel.textContent).toMatch(/Argent réel/)
    expect(panel.textContent).toMatch(/il y a 26 min/)
    expect(within(panel).getByRole('link', { name: /toute la flotte/i }).getAttribute('href')).toBe('/overview')
  })

  it('on a phone, a compact strip of the same three bots sits ABOVE the two entries (variant A)', async () => {
    const { container } = render(await HomePage())
    const strip = screen.getByTestId('home-real-strip')
    const rows = within(strip).getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/strategies/bot/'))
    expect(rows.map(a => a.getAttribute('href'))).toEqual(['/strategies/bot/orb-bf25', '/strategies/bot/v1-hl', '/strategies/bot/v1-spot'])
    for (const r of rows) expect(r.className).toMatch(/\bh-10\b/)
    expect(within(rows[0]).getByText(/−6,5 %/)).toHaveClass('text-negative')
    const html = container.innerHTML
    expect(html.indexOf('data-testid="home-real-strip"')).toBeLessThan(html.indexOf('data-testid="entry-strategies"'))
    expect(strip.className).toMatch(/lg:hidden/)
    expect(screen.getByTestId('home-real').className).toMatch(/hidden lg:block/)
  })

  it('the lead names the three counts from the data, never typed', async () => {
    render(await HomePage())
    const lead = screen.getByTestId('home-lead')
    expect(lead.textContent).toMatch(/5 bots, dont 3 avec mon argent/)
    expect(lead.textContent).toMatch(/rapports annuels lus par sept contrôles/)
    expect(lead.textContent).toMatch(/y compris ce qui perd/)
  })
})

// Counter-audit 2026-09-26: the four bars became a typographic balance sheet in
// the hero (Codex Astra's proposal, chosen by the owner). The numbers and their
// rules stay: configurations only, the denominator always beside the ratio.
describe('/ — the engine, as a balance sheet in the hero', () => {
  it('sits inside the hero and counts configurations, never a bot', async () => {
    render(await HomePage())
    const engine = screen.getByTestId('home-funnel')
    expect(screen.getByTestId('home-hero').contains(engine)).toBe(true)
    const text = engine.textContent!.replace(/\s/g, ' ')
    expect(text).toMatch(/Sur 1 754 244 configurations jugées/)
    expect(text).toMatch(/41 333 092 balayées/)
    expect(engine.textContent).not.toMatch(/bots? en service|en argent réel/)
  })

  it('draws no bar and no dot', async () => {
    render(await HomePage())
    expect(screen.queryAllByTestId('funnel-bar')).toHaveLength(0)
    expect(screen.getByTestId('home-funnel').querySelector('[data-dot]')).toBeNull()
  })

  it('gives the three verdicts as counts', async () => {
    render(await HomePage())
    const verdicts = screen.getByTestId('funnel-verdicts').textContent!.replace(/\s/g, ' ')
    expect(verdicts).toMatch(/Recalées\s*1 490 926/)
    expect(verdicts).toMatch(/En sursis\s*259 782/)
    expect(verdicts).toMatch(/Candidates\s*3 536/)
  })

  it('writes the fleet beside the funnel, outside it (D059), as a total and its real-money part', async () => {
    render(await HomePage())
    const line = screen.getByTestId('home-fleet-line')
    expect(line.textContent).toMatch(/5 bots en service/)
    expect(line.textContent).toMatch(/3 avec mon argent/)
    expect(within(line).getByRole('link', { name: /cimetière/i }).getAttribute('href')).toBe('https://lab.algoproof.fr/cockpit/cimetiere?ref=funnel')
    expect(within(line).getByRole('link', { name: /comment je décide/i }).getAttribute('href')).toBe('/strategies#comment-je-decide')
  })
})

describe('/ — method, transparency, articles, graveyard', () => {
  it('shows the four trials as tiles, in the gauntlet’s order, one sentence each', async () => {
    render(await HomePage())
    const tiles = within(screen.getByTestId('home-method')).getAllByTestId('method-tile')
    expect(tiles.map(t => within(t).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Tenir sur son pire trimestre', 'Battre le hasard, pas seulement le marché', 'Ne pas dépendre d’un seul marché', 'Convaincre assez de marchés',
    ])
    expect(within(screen.getByTestId('home-method')).getByRole('link', { name: /méthode complète/i }).getAttribute('href')).toBe('/strategies#comment-je-decide')
  })

  it('publishes the ORB decision under its rule, and the market-weather measure that says no', async () => {
    render(await HomePage())
    const t = screen.getByTestId('home-transparency')
    const decision = within(t).getByTestId('home-decision')
    expect(decision.textContent).toMatch(/DD > 20 % ou PF < 1\.0/)
    expect(decision.textContent).toMatch(/DD 29,1 %/)
    expect(decision.textContent).toMatch(/PF 0,95/)
    expect(decision.textContent).toMatch(/Le 25 septembre, je le garde/)
    const weather = within(t).getByTestId('home-weather-measure')
    expect(weather.textContent).toMatch(/137 jours/)
    expect(weather.textContent).toMatch(/0 signal/)
    expect(weather.textContent).toMatch(/409/)
    expect(within(weather).getByRole('link').getAttribute('href')).toBe('/intelligence')
  })

  it('lists the three latest articles that are not a daily journal nor a weekly review', async () => {
    render(await HomePage())
    const links = within(screen.getByTestId('home-articles')).getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/blog/'))
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/blog/2026-07-11-95', '/blog/2026-07-02-dorment', '/blog/2026-06-25-six'])
    expect(links[0].textContent).toMatch(/11 juil\. 2026/)
  })

  it('ends on the graveyard, with the count of the rejected', async () => {
    render(await HomePage())
    const g = screen.getByTestId('home-graveyard')
    expect(g.textContent.replace(/\s/g, '')).toMatch(/1490926/)
    expect(within(g).getByRole('link').getAttribute('href')).toBe('https://lab.algoproof.fr/cockpit/cimetiere?ref=home-cimetiere')
  })

  it('carries none of the retired blocks', async () => {
    const { container } = render(await HomePage())
    expect(container.querySelector('table')).toBeNull()
    expect(screen.queryByText(/Stratégies actives/)).toBeNull()
    expect(screen.queryByText(/Où trader en règle/)).toBeNull()
    expect(screen.queryByTestId('teaser-learn')).toBeNull()
    expect(screen.queryByTestId('engine-band')).toBeNull()
    expect(container.innerHTML).not.toMatch(/tradingview/i)
  })
})
