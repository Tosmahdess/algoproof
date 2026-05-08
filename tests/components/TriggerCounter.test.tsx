import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TriggerCounter from '@/components/TriggerCounter'
import type { TriggerData } from '@/lib/types'

const livePending: TriggerData = { profitFactor: 1.31, totalTrades: 24, isLive: true }
const liveMet: TriggerData    = { profitFactor: 1.50, totalTrades: 35, isLive: true }
const paper: TriggerData      = { profitFactor: 1.31, totalTrades: 24, isLive: false }

describe('TriggerCounter', () => {
  it('renders nothing when data is null', () => {
    const { container } = render(<TriggerCounter data={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when bot is not live', () => {
    const { container } = render(<TriggerCounter data={paper} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows locked label when criteria not met', () => {
    render(<TriggerCounter data={livePending} />)
    expect(screen.getByText(/vente fermée/i)).toBeDefined()
  })

  it('shows unlocked label when all criteria met', () => {
    render(<TriggerCounter data={liveMet} />)
    expect(screen.getByText(/vente ouverte/i)).toBeDefined()
  })

  it('renders profit factor with 2 decimal places', () => {
    render(<TriggerCounter data={livePending} />)
    expect(screen.getByText(/1\.31/)).toBeDefined()
  })

  it('renders trades count against target', () => {
    render(<TriggerCounter data={livePending} />)
    expect(screen.getByText(/24 \/ 30/)).toBeDefined()
  })
})
