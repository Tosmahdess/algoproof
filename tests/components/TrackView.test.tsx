import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import TrackView from '@/components/TrackView'
import { trackViewBot } from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({ trackViewBot: vi.fn() }))

describe('TrackView', () => {
  beforeEach(() => {
    vi.mocked(trackViewBot).mockClear()
  })

  it('fires view_bot with the slug on mount', () => {
    render(<TrackView slug="v1-spot" />)
    expect(trackViewBot).toHaveBeenCalledWith('v1-spot')
  })

  it('renders nothing', () => {
    const { container } = render(<TrackView slug="orb-bf25" />)
    expect(container).toBeEmptyDOMElement()
  })
})
