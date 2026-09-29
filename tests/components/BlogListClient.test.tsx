import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BlogListClient } from '@/components/BlogListClient'
import type { ArticleMeta } from '@/app/blog/page'

const articles: ArticleMeta[] = [
  { slug: '2026-07-02-journal', title: 'Journal du 2 juillet', date: '2026-07-02', category: 'journal', summary: 'snapshot quotidien', tags: [] },
  { slug: '2026-06-04-mica-explique', title: 'MiCA expliqué', date: '2026-06-04', category: 'guide', summary: 'le guide', tags: [] },
  { slug: '2026-06-25-momentum-crypto-de-grossing', title: 'De-grossing', date: '2026-06-25', category: 'methode', summary: 'la thèse', tags: [] },
] as ArticleMeta[]

describe('BlogListClient — daily journals hidden by default (D026)', () => {
  it('hides journal articles from the default list, keeps guide + methode', () => {
    render(<BlogListClient articles={articles} />)
    expect(screen.queryByText('Journal du 2 juillet')).toBeNull()
    expect(screen.getByText('MiCA expliqué')).toBeInTheDocument()
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
const guides = (n: number): ArticleMeta[] =>
  Array.from({ length: n }, (_, i) => ({
    slug: `2026-0${1 + Math.floor(i / 9)}-${String(1 + (i % 9)).padStart(2, '0')}-guide-${i}`,
    title: `Guide ${i + 1}`,
    date: `2026-0${1 + Math.floor(i / 9)}-${String(1 + (i % 9)).padStart(2, '0')}`,
    category: 'guide',
    summary: `Première phrase du guide ${i + 1}. Deuxième phrase, plus longue, que la liste ne montre pas.`,
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
      'https://lab.algoproof.fr/apprendre?ref=blog',
      '/strategies',
      'https://lab.algoproof.fr/agents?ref=blog',
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
    render(<BlogListClient articles={[methode, ...guides(2)]} />)
    const pills = screen.getAllByRole('button', { name: /\(\d+\)$/ })
    expect(pills.length).toBeGreaterThan(1)
    for (const p of pills) expect(p.className.split(/\s+/)).toContain('h-10')
  })

  it('keeps the other categories as cards: category, date, title, one sentence', () => {
    render(<BlogListClient articles={[methode]} />)
    const card = screen.getByTestId('article-card')
    expect(card.textContent).toContain('Méthode')
    expect(card.textContent).toContain('25 juin 2026')
    expect(within(card).getByRole('link', { name: 'De-grossing' })).toBeInTheDocument()
    expect(card.textContent).toContain('La thèse en une phrase.')
    expect(card.textContent).not.toContain('deuxième')
    expect(card.textContent).not.toMatch(/Lire la suite/)
    expect(screen.getAllByTestId('article-card').length).toBe(1)
  })

  // 2026-09-29: the weekly reviews were retired; the list has no weekly section
  // and the intro sends the reader to the live fleet page for the bots' results.
  it('has no weekly section, and points to the fleet for the results', () => {
    render(<BlogListClient articles={[methode, ...guides(3)]} />)
    expect(screen.queryByText(/Revues hebdo/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Revue hebdo/ })).toBeNull()
    expect(within(screen.getByTestId('blog-intro')).getByRole('link', { name: 'la flotte' }).getAttribute('href')).toBe('/overview')
    expect(screen.getAllByTestId('article-card').length).toBe(4)
  })
})
