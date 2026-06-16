import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AlsoLiveBadge from '@/components/AlsoLiveBadge'

describe('AlsoLiveBadge', () => {
  it('renders for v1-spot', () => {
    render(<AlsoLiveBadge slug="v1-spot" />)
    expect(screen.getByText(/aussi en réel/i)).toBeInTheDocument()
  })
  it('renders nothing for other slugs', () => {
    const { container } = render(<AlsoLiveBadge slug="hatrend-bf28" />)
    expect(container).toBeEmptyDOMElement()
  })
})
