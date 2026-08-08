import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FunnelCounter from '@/components/FunnelCounter'

// 2026-08-08: the counter used to print one number labelled « testées » that
// was really the sum of two different things (see lib/funnel.ts). It now shows
// the pair under honest names — the same pair the cockpit hero prints on
// lab.algoproof.fr, so the two sites cannot disagree.
const COUNTS = { n_swept: 5855277, n_judged: 351359, n_promoted: 25, n_live: 2 }

describe('FunnelCounter', () => {
  it('renders the four numbers', () => {
    render(<FunnelCounter counts={COUNTS} />)
    expect(screen.getByText(/5\s?855\s?277/)).toBeTruthy()
    expect(screen.getByText(/351\s?359/)).toBeTruthy()
    expect(screen.getByText('25')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('labels swept and judged under their honest names', () => {
    render(<FunnelCounter counts={COUNTS} />)
    expect(screen.getByText('Configurations balayées')).toBeTruthy()
    expect(screen.getByText('Jugées au gantelet')).toBeTruthy()
  })

  it('renders nothing at all when the counts are unavailable', () => {
    const { container } = render(<FunnelCounter counts={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing rather than a zero denominator', () => {
    // "0 configurations balayées" on a site whose whole argument is the number
    // of attempts is worse than saying nothing.
    const { container } = render(<FunnelCounter counts={{ ...COUNTS, n_swept: 0 }} />)
    expect(container.firstChild).toBeNull()
  })

  it('groups thousands so the denominator is readable at a glance', () => {
    render(<FunnelCounter counts={{ ...COUNTS, n_swept: 1234567 }} />)
    expect(screen.getByText(/1\s?234\s?567/)).toBeTruthy()
  })
})
