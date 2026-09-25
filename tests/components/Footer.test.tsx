import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from '@/components/Footer'

// Lot 2 of the design audit (conception §2.4): four columns instead of six, titles
// in sentence case, the same five words as the bar, the lab's links under one
// heading that says it leaves the site.
describe('Footer sitemap', () => {
  it('renders the four column titles, in sentence case', () => {
    render(<Footer />)
    const titles = screen.getAllByRole('heading', { level: 3 })
    expect(titles.map(h => h.textContent?.trim())).toEqual(['Le site', 'Comprendre', 'Le labo ↗', 'Le projet'])
    for (const h of titles) expect(h.className).not.toMatch(/\buppercase\b|tracking-wid/)
  })

  it('« Le site » lists the five destinations of the bar, with the bar’s words', () => {
    render(<Footer />)
    const col = screen.getByRole('heading', { name: 'Le site', level: 3 }).parentElement!
    expect(within(col).getAllByRole('link').map(a => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['La flotte', '/overview'], ['Stratégies', '/strategies'], ['Sociétés', '/investir'],
      ['Météo', '/intelligence'], ['Articles', '/blog'],
    ])
  })

  it('« Comprendre » links the method, the lexicon, the FAQ and the graveyard', () => {
    render(<Footer />)
    const col = screen.getByRole('heading', { name: 'Comprendre', level: 3 }).parentElement!
    const hrefs = within(col).getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs).toEqual(['/preuve', '/lexique', '/faq', 'https://lab.algoproof.fr/cockpit/cimetiere?ref=footer'])
  })

  it('« Le labo » opens the app, the tutorials, the agents, the membership, the account, and keeps the landing', () => {
    render(<Footer />)
    const col = screen.getByRole('heading', { name: 'Le labo ↗', level: 3 }).parentElement!
    const links = within(col).getAllByRole('link').map(a => [a.textContent?.trim(), a.getAttribute('href')])
    expect(links).toEqual([
      // Lot 8: every lab link carries ref=footer (labUrl).
      ['Tester une stratégie', 'https://lab.algoproof.fr/lab?ref=footer'],
      ['Tutoriels', 'https://lab.algoproof.fr/apprendre?ref=footer'],
      ['Agents IA (MCP)', 'https://lab.algoproof.fr/agents?ref=footer'],
      ['Abonnement', 'https://lab.algoproof.fr/membre?ref=footer'],
      ['Compte', 'https://lab.algoproof.fr/account?ref=footer'],
      ['Découvrir le labo', 'https://lab.algoproof.fr/?ref=footer'],
    ])
  })

  it('« Le projet » links about, the platforms, MiCA and X', () => {
    render(<Footer />)
    const col = screen.getByRole('heading', { name: 'Le projet', level: 3 }).parentElement!
    const links = within(col).getAllByRole('link').map(a => [a.textContent?.trim(), a.getAttribute('href')])
    expect(links.slice(0, 3)).toEqual([
      ['À propos', '/a-propos'], ['Démarrer (plateformes)', '/start'], ['MiCA & fiscalité', '/mica'],
    ])
    expect(links[3][0]).toMatch(/X/)
  })

  it('no longer links the removed public journal', () => {
    render(<Footer />)
    expect(screen.queryByRole('link', { name: /ce qui a changé/i })).toBeNull()
  })

  it('keeps the site sentence and says « simulation », the word of the badges, not « paper trading »', () => {
    render(<Footer />)
    expect(screen.getByText(/chaque trade, chaque perte/i)).toBeDefined()
    const p = screen.getByText(/pas un conseil financier/i)
    expect(p.textContent).toMatch(/simulation/)
    expect(p.textContent).not.toMatch(/paper trading/)
  })

  it('renders the financial disclaimer at full opacity and at least 13 px', () => {
    render(<Footer />)
    const p = screen.getByText(/pas un conseil financier/i)
    const cls = p.className
    expect(cls).not.toMatch(/text-muted\/\d+/)
    expect(cls).not.toMatch(/\bopacity-\d+/)
    expect(cls).toMatch(/text-\[(1[3-9]|[2-9]\d)px\]|text-(xs|sm|base|lg)\b/)
  })

  it('keeps the legal links, on the lab', () => {
    render(<Footer />)
    for (const name of [/mentions légales/i, /confidentialité/i, /conditions/i]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toMatch(/^https:\/\/lab\.algoproof\.fr\//)
    }
  })
})
