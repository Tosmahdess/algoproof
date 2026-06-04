import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Nav from '@/components/Nav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('Nav', () => {
  it('links to the journal', () => {
    render(<Nav />)
    const links = screen.getAllByRole('link', { name: /journal/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links.some(l => l.getAttribute('href') === '/journal')).toBe(true)
  })

  it('links to the MiCA page', () => {
    render(<Nav />)
    const links = screen.getAllByRole('link', { name: /en règle/i })
    expect(links.some(l => l.getAttribute('href') === '/mica')).toBe(true)
  })
})
