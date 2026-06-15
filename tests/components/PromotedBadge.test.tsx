import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PromotedBadge from '@/components/PromotedBadge'

describe('PromotedBadge', () => {
  it('renders "Promu" when promoted', () => {
    render(<PromotedBadge promoted={true} />)
    expect(screen.getByText('Promu')).toBeInTheDocument()
  })
  it('renders nothing when not promoted', () => {
    const { container } = render(<PromotedBadge promoted={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
