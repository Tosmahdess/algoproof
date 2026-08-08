// tests/components/Sparkline.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Sparkline from '@/components/Sparkline'

describe('Sparkline', () => {
  it('draws one polyline through the series', () => {
    const { container } = render(<Sparkline values={[1000, 1010, 990, 1040]} />)
    const line = container.querySelector('svg polyline')
    expect(line).toBeTruthy()
    expect(line!.getAttribute('points')!.split(' ').length).toBe(4)
  })

  it('renders nothing below two points — a dot is not a trend', () => {
    const { container: one } = render(<Sparkline values={[1000]} />)
    expect(one.querySelector('svg')).toBeNull()
    const { container: none } = render(<Sparkline values={[]} />)
    expect(none.querySelector('svg')).toBeNull()
  })

  it('survives a flat series without dividing by zero', () => {
    const { container } = render(<Sparkline values={[1000, 1000, 1000]} />)
    const points = container.querySelector('svg polyline')!.getAttribute('points')!
    expect(points.includes('NaN')).toBe(false)
  })

  it('stays out of the accessibility tree — it decorates the row, the numbers carry the facts', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} />)
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })
})
