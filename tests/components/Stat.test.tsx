import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Stat } from '@/components/mdx/Stat'

describe('Stat', () => {
  it('explicit intent wins over the sign of value', () => {
    render(<Stat label="P&L" value="+12 USDT" intent="negative" />)
    const value = screen.getByText('+12 USDT')
    expect(value.className).toContain('text-negative')
  })

  it('maps trend up to positive', () => {
    render(<Stat label="Perf" value="216" trend="up" />)
    const value = screen.getByText('216')
    expect(value.className).toContain('text-positive')
  })

  it('maps trend down to negative', () => {
    render(<Stat label="Perf" value="216" trend="down" />)
    const value = screen.getByText('216')
    expect(value.className).toContain('text-negative')
  })

  it('maps trend neutral to neutral', () => {
    render(<Stat label="Perf" value="216" trend="neutral" />)
    const value = screen.getByText('216')
    expect(value.className).toContain('text-foreground')
  })

  it('auto-detects a negative sign on the value when no intent/trend is given', () => {
    render(<Stat label="P&L flotte" value="−77.97 USDT" />)
    const value = screen.getByText('−77.97 USDT')
    expect(value.className).toContain('text-negative')
  })

  it('defaults to neutral text-foreground when value has no sign and no intent/trend', () => {
    render(<Stat label="Trades" value="216" />)
    const value = screen.getByText('216')
    expect(value.className).toContain('text-foreground')
  })
})
