import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BlogListClient } from '@/components/BlogListClient'
import type { ArticleMeta } from '@/app/blog/page'

const articles: ArticleMeta[] = [
  { slug: '2026-07-02-journal', title: 'Journal du 2 juillet', date: '2026-07-02', category: 'journal', summary: 'snapshot quotidien', tags: [] },
  { slug: '2026-06-28-weekly', title: 'Semaine du 22 juin', date: '2026-06-28', category: 'weekly', summary: 'revue hebdo', tags: [] },
  { slug: '2026-06-25-momentum-crypto-de-grossing', title: 'De-grossing', date: '2026-06-25', category: 'methode', summary: 'la thèse', tags: [] },
] as ArticleMeta[]

describe('BlogListClient — daily journals hidden by default (D026)', () => {
  it('hides journal articles from the default list, keeps weekly + methode', () => {
    render(<BlogListClient articles={articles} />)
    expect(screen.queryByText('Journal du 2 juillet')).toBeNull()
    expect(screen.getByText('Semaine du 22 juin')).toBeInTheDocument()
  })

  it('counts only default-visible articles in the "Tous" pill', () => {
    render(<BlogListClient articles={articles} />)
    expect(screen.getByText('Tous (2)')).toBeInTheDocument()
  })

  it('shows the explicit hint about hidden journals', () => {
    render(<BlogListClient articles={articles} />)
    expect(screen.getByText(/journaux de bord quotidiens \(1\)/i)).toBeInTheDocument()
  })

  it('still shows journals when the Journal pill is selected', () => {
    render(<BlogListClient articles={articles} />)
    fireEvent.click(screen.getByText(/Journal de bord \(1\)/))
    expect(screen.getByText('Journal du 2 juillet')).toBeInTheDocument()
  })
})

// Lot 7 of the design audit (spec 5.8, 2026-09-25). Categories and URLs do not
// change (arbitration of 2026-09-17): only the shape of the list does.
const weekly = (n: number): ArticleMeta[] =>
  Array.from({ length: n }, (_, i) => ({
    slug: `2026-0${1 + Math.floor(i / 9)}-${String(1 + (i % 9)).padStart(2, '0')}-revue-${i}`,
    title: `Revue ${i + 1}`,
    date: `2026-0${1 + Math.floor(i / 9)}-${String(1 + (i % 9)).padStart(2, '0')}`,
    category: 'weekly',
    summary: `Première phrase de la revue ${i + 1}. Deuxième phrase, plus longue, que la liste ne montre pas.`,
    tags: [],
  })) as ArticleMeta[]

const methode: ArticleMeta = {
  slug: '2026-06-25-momentum-crypto-de-grossing',
  title: 'De-grossing',
  date: '2026-06-25',
  category: 'methode',
  summary: 'La thèse en une phrase. Et une deuxième que la carte ne montre pas.',
  tags: [],
} as ArticleMeta

describe('BlogListClient — the shape of the list (lot 7)', () => {
  it('opens on the h1 « Articles » and a one-sentence intro', () => {
    render(<BlogListClient articles={[methode]} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Articles')
    const intro = screen.getByTestId('blog-intro').textContent ?? ''
    expect(intro.trim().split(/(?<=[.!?])\s+/).length).toBe(1)
  })

  it('turns the three « Apprendre en pratique » cards into one line of text links', () => {
    render(<BlogListClient articles={[methode]} />)
    const line = screen.getByTestId('apprendre-en-pratique')
    const links = within(line).getAllByRole('link')
    expect(links.map(a => a.getAttribute('href'))).toEqual([
      'https://lab.algoproof.fr/apprendre',
      '/strategies',
      'https://lab.algoproof.fr/agents',
    ])
    expect(line.querySelectorAll('h3').length).toBe(0)
  })

  it('limits the pinned articles to their title and one sentence', () => {
    render(<BlogListClient articles={[methode]} />)
    const pinned = screen.getByTestId('pinned')
    expect(within(pinned).getByText('De-grossing')).toBeInTheDocument()
    expect(pinned.textContent).toContain('La thèse en une phrase.')
    expect(pinned.textContent).not.toContain('deuxième')
  })

  it('gives every filter pill a 40 px tap target', () => {
    render(<BlogListClient articles={[methode, ...weekly(2)]} />)
    const pills = screen.getAllByRole('button', { name: /\(\d+\)$/ })
    expect(pills.length).toBeGreaterThan(1)
    for (const p of pills) expect(p.className.split(/\s+/)).toContain('h-10')
  })

  it('lists the weekly reviews as compact rows (date · title), 8 visible, then the rest on demand', () => {
    render(<BlogListClient articles={weekly(20)} />)
    expect(screen.getAllByTestId('weekly-row').length).toBe(8)
    const more = screen.getByRole('button', { name: 'Afficher les 12 autres' })
    fireEvent.click(more)
    expect(screen.getAllByTestId('weekly-row').length).toBe(20)
    expect(screen.queryByRole('button', { name: /Afficher les/ })).toBeNull()
  })

  it('writes the row date in the site format and links the title', () => {
    render(<BlogListClient articles={weekly(1)} />)
    const row = screen.getByTestId('weekly-row')
    expect(row.textContent).toContain('1 janv. 2026')
    expect(within(row).getByRole('link').getAttribute('href')).toBe('/blog/2026-01-01-revue-0')
    // a row, not a card: no summary
    expect(row.textContent).not.toContain('Première phrase')
  })

  it('shows no « Afficher » button when 8 reviews or fewer', () => {
    render(<BlogListClient articles={weekly(8)} />)
    expect(screen.getAllByTestId('weekly-row').length).toBe(8)
    expect(screen.queryByRole('button', { name: /Afficher les/ })).toBeNull()
  })

  it('keeps the other categories as cards: category, date, title, one sentence', () => {
    render(<BlogListClient articles={[methode, ...weekly(1)]} />)
    const card = screen.getByTestId('article-card')
    expect(card.textContent).toContain('Méthode')
    expect(card.textContent).toContain('25 juin 2026')
    expect(within(card).getByRole('link', { name: 'De-grossing' })).toBeInTheDocument()
    expect(card.textContent).toContain('La thèse en une phrase.')
    expect(card.textContent).not.toContain('deuxième')
    expect(card.textContent).not.toMatch(/Lire la suite/)
    // the weekly one is a row, not a card
    expect(screen.getAllByTestId('article-card').length).toBe(1)
  })

  it('shows only rows when the weekly pill is on, only cards when another is', () => {
    render(<BlogListClient articles={[methode, ...weekly(3)]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Revue hebdo (3)' }))
    expect(screen.getAllByTestId('weekly-row').length).toBe(3)
    expect(screen.queryByTestId('article-card')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Méthode (1)' }))
    expect(screen.queryByTestId('weekly-row')).toBeNull()
    expect(screen.getAllByTestId('article-card').length).toBe(1)
  })
})
