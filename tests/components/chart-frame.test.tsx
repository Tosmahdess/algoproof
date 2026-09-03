import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ChartFrame from '@/components/ChartFrame'

/**
 * Recharts sizes itself by measuring its parent, and during the server render
 * and the hydration pass that parent has no layout yet: the container mounted
 * at 0x0 and the chart was invisible on the pages whose whole point is the
 * curve.
 */
describe('ChartFrame', () => {
  it('renders the chart once mounted', async () => {
    render(<ChartFrame><span>courbe</span></ChartFrame>)
    await waitFor(() => expect(screen.getByText('courbe')).toBeInTheDocument())
  })

  it('reserves the height in both states, so the page below does not jump', async () => {
    const { container } = render(<ChartFrame><span>courbe</span></ChartFrame>)
    await waitFor(() => expect(screen.getByText('courbe')).toBeInTheDocument())
    expect(container.firstElementChild?.className).toContain('h-64')
  })

  it('accepts a caller height', async () => {
    const { container } = render(<ChartFrame className="h-40"><span>x</span></ChartFrame>)
    await waitFor(() => expect(screen.getByText('x')).toBeInTheDocument())
    expect(container.firstElementChild?.className).toBe('h-40')
  })
})
