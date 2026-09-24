import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FleetKpiCards from '@/components/FleetKpiCards'

// User request 24/09: /overview opens on the cockpit's card shape, two cards,
// bots in service and bots on real money, and no prose around them.
const COUNTS = { n_swept: 5855277, n_judged: 351359, n_promoted: 92, n_live: 3 }

describe('FleetKpiCards', () => {
  it('renders one card per fleet count, labelled', () => {
    render(<FleetKpiCards counts={COUNTS} />)
    const cards = screen.getAllByTestId('fleet-kpi-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent(/Bots en service/i)
    expect(cards[0]).toHaveTextContent('92')
    expect(cards[1]).toHaveTextContent(/En argent réel/i)
    expect(cards[1]).toHaveTextContent('3')
  })

  it('carries no explanatory text and none of the engine funnel', () => {
    const { container } = render(<FleetKpiCards counts={COUNTS} />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
    expect(container.textContent).not.toMatch(/balayées|gantelet|jugées|entonnoir/i)
    expect(screen.queryByText(/5\s?855\s?277/)).toBeNull()
  })

  it('renders nothing when the counts are missing', () => {
    const { container } = render(<FleetKpiCards counts={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
