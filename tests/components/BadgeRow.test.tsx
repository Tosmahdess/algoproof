import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BadgeRow from '@/components/BadgeRow'
import type { Badge } from '@/lib/types'

const badges: Badge[] = [
  { emoji: '✅', label: '100 trades live', color: '#3fb950' },
  { emoji: '🏆', label: 'PF ≥ 1.5',       color: '#58a6ff' },
]

describe('BadgeRow', () => {
  it('renders nothing when badges array is empty', () => {
    const { container } = render(<BadgeRow badges={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all badge labels', () => {
    render(<BadgeRow badges={badges} />)
    expect(screen.getByText(/100 trades live/)).toBeDefined()
    expect(screen.getByText(/PF ≥ 1\.5/)).toBeDefined()
  })

  it('renders correct number of chips', () => {
    const { container } = render(<BadgeRow badges={badges} />)
    const chips = container.querySelectorAll('span[data-badge]')
    expect(chips.length).toBe(2)
  })
})
