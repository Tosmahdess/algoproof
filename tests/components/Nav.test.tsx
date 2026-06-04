import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Nav from '@/components/Nav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('Nav', () => {
  it('keeps the core links in the top bar', () => {
    render(<Nav />)
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/overview')
    expect(hrefs).toContain('/blog')
    expect(hrefs).toContain('/start')
  })

  it('does not expose the secondary pages in the menu (reachable via content/SEO only)', () => {
    render(<Nav />)
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
    expect(hrefs).not.toContain('/journal')
    expect(hrefs).not.toContain('/mica')
    expect(hrefs).not.toContain('/preuve')
  })
})
