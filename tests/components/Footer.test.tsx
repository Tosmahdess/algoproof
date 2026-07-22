import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from '@/components/Footer'

describe('Footer sitemap', () => {
  it('renders all 5 hub column titles', () => {
    render(<Footer />)
    for (const t of ['Mes bots', 'Investir', 'Météo du marché', 'Apprendre', 'Le labo']) {
      expect(screen.getByRole('heading', { name: t, level: 3 })).toBeDefined()
    }
  })

  it('links the previously-orphan pages', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /en règle/i })).toBeDefined()       // /mica
    expect(screen.getByRole('link', { name: /ma méthode/i })).toBeDefined()     // /preuve
    expect(screen.getByRole('link', { name: /ce qui a changé/i })).toBeDefined() // /journal
    expect(screen.getByRole('link', { name: /démarrer/i })).toBeDefined()       // /start
  })
})
