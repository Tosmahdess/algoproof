// The home, refonte « Le registre des décisions », lot 2 (02/10/2026), after lot 3 of
// the design audit (2026-09-25). The mock-up (docs/refonte-registre/MAQUETTE_ASTRA.html)
// rules the composition: title and lead, two entries, the real-money register in full
// width, the library by idea, the graveyard and one article, then favourites and Direct.
//
// What changed from lot 3, and why each test below moved:
// - the bots in real money are ordered from the best result to the least good (owner,
//   02/10, replacing « longest history first », C7), in one register, without the
//   30-day line (audit 2026-10, n° 8) or the PF/WR/DD row (the mock-up's columns);
// - the engine's « 1 sur 500 » left the home (audit 2026-10, n° 7, it overflowed),
//   then came back on 03/10 as an addition under the register (EngineLedger);
// - the four method tiles and the three articles became one article.
// Kept from lot 3: the crossed rule and my decision in the row of the losing bot, the
// lead read from the data, the graveyard's count, none of the retired blocks.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { mkBot } from '../fixtures/bots'
import { longDate } from '@/lib/format-date'

const sale = vi.hoisted(() => ({ open: false }))
const syncedAt = new Date(Date.now() - 26 * 60_000).toISOString()

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => { throw new Error('lists read summaries (D094)') },
  getListBots: async () => [
    mkBot({ slug: 'orb-bf25', name: 'Cassure de range d’ouverture H1 Hyperliquid', exchange: 'Hyperliquid',
      status: 'live', start_capital: 1000, live_since: '2026-04-26T00:00:00Z', last_sync_at: syncedAt,
      stats: { total_trades: 280, win_rate: 0.45, profit_factor: 0.95, max_drawdown: 0.291, latest_capital: 935.26 } }),
    mkBot({ slug: 'v1-hl', name: 'Croisement EMA H4 Hyperliquid', exchange: 'Hyperliquid', status: 'live',
      start_capital: 1000, live_since: null,
      stats: { total_trades: 68, win_rate: 0.456, profit_factor: 1.69, max_drawdown: 0.048, latest_capital: 1198.39 } }),
    mkBot({ slug: 'v1-spot', name: 'Croisement EMA H4 Kraken Spot', exchange: 'Kraken Spot', status: 'live',
      start_capital: 1000, live_since: '2026-04-17T00:00:00Z',
      stats: { total_trades: 42, win_rate: 0.595, profit_factor: 2.82, max_drawdown: 0.022, latest_capital: 1272.73 } }),
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
vi.mock('@/lib/library', () => ({
  getLibraryIdeas: async () => [
    { idea_key: 'a', n_variants: 30, n_live: 0, n_paper: 4, n_backtest: 26 },
    { idea_key: 'b', n_variants: 12, n_live: 1, n_paper: 2, n_backtest: 9 },
  ],
}))
vi.mock('@/lib/direct-sale', () => ({ get DIRECT_SALE_OPEN() { return sale.open } }))
vi.mock('@/lib/articles', () => ({
  getArticles: () => [
    { slug: '2026-09-19-journal', title: 'Journal', date: '2026-09-19', summary: 's', tags: [], category: 'journal' },
    { slug: '2026-07-11-95', title: 'Pourquoi 95 % des backtests mentent', date: '2026-07-11',
      summary: 'Les quatre mensonges qui fabriquent un backtest gagnant. Avec les preuves de mon cimetière.', tags: [], category: 'methode' },
    { slug: '2026-07-02-dorment', title: 'Pourquoi certains de mes bots ne tradent pas', date: '2026-07-02', summary: 's', tags: [], category: 'methode' },
  ],
}))

import HomePage from '@/app/page'

const rows = () => within(screen.getByTestId('home-real')).getAllByTestId('home-real-row')

describe('/ — « Mes bots en argent réel », a register in full width', () => {
  it('lists the three live bots from the best result to the least good, and says so', async () => {
    render(await HomePage())
    const register = screen.getByTestId('home-real')
    expect(within(register).getByRole('heading', { level: 2 }).textContent).toBe('Mes bots en argent réel')
    expect(register.textContent).toMatch(/Du meilleur résultat au moins bon\./)
    expect(rows().map(r => within(r).getAllByRole('link')[0].getAttribute('href'))).toEqual([
      '/strategies/bot/v1-spot', '/strategies/bot/v1-hl', '/strategies/bot/orb-bf25',
    ])
  })

  it('heads its three columns as the mock-up does', async () => {
    render(await HomePage())
    const text = screen.getByTestId('home-real').textContent!
    expect(text).toMatch(/Bot et marché/)
    expect(text).toMatch(/État et décision/)
    expect(text).toMatch(/Résultat depuis le départ/)
  })

  it('each row: the bot over its market and trade count, then its result since the start', async () => {
    render(await HomePage())
    const [spot, hl, orb] = rows()
    expect(within(spot).getAllByRole('link')[0].textContent).toBe('Croisement EMA H4 Kraken Spot')
    expect(spot.textContent).toMatch(/Kraken Spot · 42 trades publiés/)
    // textContent keeps the narrow no-break spaces of the French figures
    const result = (r: HTMLElement) => within(r).getByTestId('home-real-result').textContent!.replace(/\s/g, ' ')
    expect(result(spot)).toMatch(/\+272,73 €\+27,3 % · depuis le 17 avril/)
    expect(result(hl)).toMatch(/\+198,39 €\+19,8 % · depuis le départ/)
    expect(result(orb)).toMatch(/−64,74 €−6,5 % · depuis le 26 avril/)
  })

  it('a loss is in the loss colour, a gain in ink: green is never the colour of a gain', async () => {
    render(await HomePage())
    const [spot, , orb] = rows()
    expect(within(orb).getByText(/−64,74/)).toHaveClass('text-negative')
    expect(within(spot).getByText(/\+272,73/)).toHaveClass('text-foreground')
  })

  it('the state comes from the published rule and my last decision', async () => {
    render(await HomePage())
    const [spot, hl, orb] = rows()
    const state = (r: HTMLElement) => within(r).getByTestId('home-real-state')
    expect(state(orb).textContent).toMatch(/^Règle d’arrêt franchieJe le garde · lire ma décision$/)
    expect(state(orb)).toHaveClass('text-negative')
    expect(within(state(orb)).getByRole('link', { name: 'lire ma décision' }).getAttribute('href')).toBe('/strategies/bot/orb-bf25')
    // v1-hl has no pre-registered envelope (bot-expectations.ts): the row says so
    // rather than pretending it is inside one.
    expect(state(hl).textContent).toMatch(/Limites non définies/)
    expect(state(spot).textContent).toMatch(/Dans les limites attendues/)
  })

  it('the state is read before the figure, in the DOM as on screen', async () => {
    render(await HomePage())
    for (const r of rows()) {
      const html = r.innerHTML
      expect(html.indexOf('home-real-state')).toBeLessThan(html.indexOf('home-real-result'))
    }
  })

  it('draws no line: the 30-day curve took the colour of a result it did not show (audit n° 8)', async () => {
    render(await HomePage())
    expect(screen.getByTestId('home-real').querySelector('svg')).toBeNull()
  })

  it('links the whole fleet at the top, and under the register with the count of every bot', async () => {
    render(await HomePage())
    const register = screen.getByTestId('home-real')
    expect(within(register).getByRole('link', { name: 'Toute la flotte →' }).getAttribute('href')).toBe('/overview')
    const button = within(register).getByRole('link', { name: /Voir toute la flotte/ })
    expect(button.textContent).toBe('Voir toute la flotte · 5 bots, réels et simulés →')
    expect(button.getAttribute('href')).toBe('/overview')
  })

  it('dates the reading from the freshest sync', async () => {
    render(await HomePage())
    expect(screen.getByTestId('home-real').textContent).toContain(`Relevé du ${longDate(syncedAt)}.`)
  })
})

describe('/ — the lead, the library, the graveyard and one article', () => {
  it('the lead names the three counts from the data, never typed', async () => {
    render(await HomePage())
    const lead = screen.getByTestId('home-lead')
    expect(lead.textContent).toMatch(/5 bots, dont 3 avec mon argent/)
    expect(lead.textContent).toMatch(/rapports annuels à travers sept contrôles/)
    expect(lead.textContent).toMatch(/y compris quand les bots perdent/)
  })

  it('links « Pourquoi je publie tout » to /a-propos, and signs with no name', async () => {
    const { container } = render(await HomePage())
    expect(within(screen.getByTestId('home-hero')).getByRole('link', { name: 'Pourquoi je publie tout' }).getAttribute('href')).toBe('/a-propos')
    expect(container.textContent).not.toMatch(/Dessombs/)
  })

  it('counts the library by idea and by variant, from the view, without the tiers', async () => {
    render(await HomePage())
    const lib = screen.getByTestId('home-library')
    const text = lib.textContent!.replace(/\s/g, ' ')
    expect(text).toMatch(/2 idées · 42 variantes/)
    expect(text).toMatch(/6 variantes sont en simulation, 35 en backtest seul/)
    expect(within(lib).getByRole('link', { name: /Explorer la bibliothèque/ }).getAttribute('href')).toBe('/bibliotheque')
    // feat/bot-tiers-cohorts is not merged: no Live / Promu / Labo tiers.
    expect(text).not.toMatch(/paliers?|Promu/i)
  })

  // The engine's numbers came back on 03/10 (owner: « on perd l'info du nombre de
  // configurations testées, de celles qui ont eu un go »), as an addition and not as
  // the card that overflowed (audit n° 7). The method tiles stay retired.
  it('the engine’s five figures on one row, largest to smallest, the ratio in words under them', async () => {
    render(await HomePage())
    expect(screen.queryByTestId('home-funnel')).toBeNull()
    expect(screen.queryByTestId('home-method')).toBeNull()
    const e = screen.getByTestId('home-engine')
    expect(within(e).getByRole('heading', { level: 2 }).textContent).toMatch(/environ 1 configuration sur\s*500/)
    const values = within(e).getAllByTestId('engine-figure').map(c => Number(c.querySelector('.tabular-nums')!.textContent!.replace(/\D/g, '')))
    expect(values).toEqual([41333092, 1754244, 1490926, 259782, 3536])
    expect(1490926 + 259782 + 3536).toBe(1754244)
  })

  it('names the swept corpus without calling it rejected, and links the graveyard', async () => {
    render(await HomePage())
    const e = screen.getByTestId('home-engine')
    expect(within(e).getAllByTestId('engine-figure')[0].textContent).not.toMatch(/recal/)
    expect(within(e).getByRole('link', { name: /Voir le cimetière/ }).getAttribute('href')).toBe('https://lab.algoproof.fr/cockpit/cimetiere?ref=home-cimetiere')
    expect(screen.queryByTestId('home-graveyard')).toBeNull()
  })

  it('places the engine right after the real-money register, before the library', async () => {
    const { container } = render(await HomePage())
    const order = [...container.querySelectorAll('[data-testid="home-real"], [data-testid="home-engine"], [data-testid="home-library"]')]
      .map(el => el.getAttribute('data-testid'))
    expect(order).toEqual(['home-real', 'home-engine', 'home-library'])
  })

  it('shows one article, the latest that is not a daily journal: title, one sentence, the way in', async () => {
    render(await HomePage())
    const a = screen.getByTestId('home-article')
    expect(within(a).getByRole('heading').textContent).toBe('Pourquoi 95 % des backtests mentent')
    expect(a.textContent).toMatch(/Les quatre mensonges qui fabriquent un backtest gagnant\./)
    expect(a.textContent).not.toMatch(/Avec les preuves/)
    const link = within(a).getByRole('link', { name: /Lire l’article/ })
    expect(link.getAttribute('href')).toBe('/blog/2026-07-11-95')
    expect(screen.queryByTestId('home-articles')).toBeNull()
  })

  it('carries none of the retired blocks', async () => {
    const { container } = render(await HomePage())
    expect(container.querySelector('table')).toBeNull()
    expect(screen.queryByText(/Stratégies actives/)).toBeNull()
    expect(screen.queryByText(/Où trader en règle/)).toBeNull()
    expect(screen.queryByTestId('teaser-learn')).toBeNull()
    expect(screen.queryByTestId('engine-band')).toBeNull()
    expect(screen.queryByTestId('home-transparency')).toBeNull()
    expect(container.innerHTML).not.toMatch(/tradingview/i)
  })
})

describe('/ — favourites and Direct, the last word of the home', () => {
  const TEXT = 'Mets un bot en favori pour le retrouver dans ton espace. Avec l’offre Direct, tu reçois aussi son journal de trades en temps réel, sur sa fiche et dans Telegram.'

  it('says what a favourite and Direct give, and that the sale is closed while its flag says so', async () => {
    sale.open = false
    render(await HomePage())
    const block = screen.getByTestId('home-follow')
    expect(within(block).getByRole('heading', { level: 2 }).textContent).toBe('Garder un bot en favori, ou le suivre en direct')
    expect(block.querySelector('p')!.textContent).toBe(`${TEXT} La vente de Direct est encore fermée.`)
  })

  it('does not say the sale is closed once the flag opens it', async () => {
    sale.open = true
    render(await HomePage())
    expect(screen.getByTestId('home-follow').querySelector('p')!.textContent).toBe(TEXT)
    sale.open = false
  })

  it('opens the space, a bot sheet and the offers', async () => {
    render(await HomePage())
    const hrefs = Object.fromEntries([...screen.getByTestId('home-follow').querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')]))
    expect(hrefs).toEqual({
      'Ouvrir ton espace ↗': 'https://lab.algoproof.fr/espace?ref=home-espace',
      'Examiner une fiche bot →': '/strategies/bot/v1-spot',
      'Comprendre les offres ↗': 'https://lab.algoproof.fr/membre?ref=home-offres',
    })
  })

  // Lot 3 (2026-09-25): the home does not end on an exchange's affiliate page.
  it('the home ends on this block, and carries no exchange or affiliate link', async () => {
    const { container } = render(await HomePage())
    const sections = container.querySelectorAll('section')
    expect(sections[sections.length - 1].getAttribute('data-testid')).toBe('home-follow')
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href') ?? '')
    expect(hrefs.filter(h => /bybit|binance|kraken\.com|hyperliquid\.xyz|\/start\b/i.test(h))).toEqual([])
  })
})
