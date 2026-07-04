import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
