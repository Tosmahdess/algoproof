import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FunnelCounter from '@/components/FunnelCounter'

describe('FunnelCounter', () => {
  it('renders the three numbers', () => {
    render(<FunnelCounter counts={{ n_tested: 34550, n_promoted: 41, n_live: 2 }} />)
    expect(screen.getByText(/34\s?550/)).toBeTruthy()
    expect(screen.getByText('41')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('renders nothing at all when the counts are unavailable', () => {
    const { container } = render(<FunnelCounter counts={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing rather than a zero denominator', () => {
    // "0 configurations testées" on a site whose whole argument is the number of
    // attempts is worse than saying nothing.
    const { container } = render(<FunnelCounter counts={{ n_tested: 0, n_promoted: 41, n_live: 2 }} />)
    expect(container.firstChild).toBeNull()
  })

  it('groups thousands so the denominator is readable at a glance', () => {
    render(<FunnelCounter counts={{ n_tested: 1234567, n_promoted: 1, n_live: 1 }} />)
    expect(screen.getByText(/1\s?234\s?567/)).toBeTruthy()
  })
})
