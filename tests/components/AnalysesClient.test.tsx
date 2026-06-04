import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalysesClient from '@/components/AnalysesClient'
import type { FicheIndexRow } from '@/lib/equity'

const fiches: FicheIndexRow[] = [
  { ticker: 'SOL', asset_name: 'Solana', category: 'crypto_alt', verdict: 'renforcer' },
  { ticker: 'MSTR', asset_name: 'MicroStrategy', category: 'crypto_proxy', verdict: 'maintenir' },
  { ticker: 'ASML', asset_name: 'ASML Holding', category: 'semiconductors', verdict: 'renforcer' },
  { ticker: 'KLAC', asset_name: 'KLA Corp', category: 'semiconductors', verdict: 'skip' },
]

describe('AnalysesClient', () => {
  it('renders sector headings and all tickers by default', () => {
    render(<AnalysesClient fiches={fiches} />)
    expect(screen.getByText('Semiconducteurs')).toBeTruthy()
    expect(screen.getByText('Crypto')).toBeTruthy()
    expect(screen.getByText('SOL')).toBeTruthy()
    expect(screen.getByText('KLAC')).toBeTruthy()
  })
  it('filters to a verdict when a pill is clicked', () => {
    render(<AnalysesClient fiches={fiches} />)
    fireEvent.click(screen.getByRole('button', { name: /^Renforcer/i }))
    expect(screen.getByText('SOL')).toBeTruthy()
    expect(screen.getByText('ASML')).toBeTruthy()
    expect(screen.queryByText('KLAC')).toBeNull()
    expect(screen.queryByText('MSTR')).toBeNull()
  })
  it('links each card to its fiche page', () => {
    render(<AnalysesClient fiches={fiches} />)
    const link = screen.getByRole('link', { name: /SOL/i })
    expect(link.getAttribute('href')).toBe('/wealth/SOL')
  })
  it('filters by search query on ticker or name', () => {
    render(<AnalysesClient fiches={fiches} />)
    fireEvent.change(screen.getByPlaceholderText(/rechercher/i), { target: { value: 'micro' } })
    expect(screen.getByText('MSTR')).toBeTruthy()
    expect(screen.queryByText('SOL')).toBeNull()
  })
  it('combines verdict filter AND search (AND semantics)', () => {
    render(<AnalysesClient fiches={fiches} />)
    fireEvent.click(screen.getByRole('button', { name: /^Renforcer/i }))
    fireEvent.change(screen.getByPlaceholderText(/rechercher/i), { target: { value: 'asml' } })
    expect(screen.getByText('ASML')).toBeTruthy()
    expect(screen.queryByText('SOL')).toBeNull()
  })
  it('shows empty state when search matches nothing', () => {
    render(<AnalysesClient fiches={fiches} />)
    fireEvent.change(screen.getByPlaceholderText(/rechercher/i), { target: { value: 'zzz' } })
    expect(screen.getByText(/Aucune analyse/i)).toBeTruthy()
  })
})
