import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AlsoLiveBadge from '@/components/AlsoLiveBadge'

describe('AlsoLiveBadge', () => {
  it('renders for v1-spot when status is not live', () => {
    render(<AlsoLiveBadge slug="v1-spot" status="paper" />)
    expect(screen.getByText(/aussi en réel/i)).toBeInTheDocument()
  })
  it('renders nothing for other slugs', () => {
    const { container } = render(<AlsoLiveBadge slug="hatrend-bf28" />)
    expect(container).toBeEmptyDOMElement()
  })
  it('renders nothing when the bot badge already says live (redundant)', () => {
    const { container } = render(<AlsoLiveBadge slug="v1-spot" status="live" />)
    expect(container).toBeEmptyDOMElement()
  })
})
