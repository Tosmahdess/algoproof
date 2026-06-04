import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProofComparison from '@/components/ProofComparison'

describe('ProofComparison', () => {
  it('renders the two columns and all comparison rows', () => {
    render(<ProofComparison />)
    expect(screen.getByText('AlgoProof')).toBeTruthy()
    expect(screen.getByText(/bot-shop/i)).toBeTruthy()
    expect(screen.getByText(/track record live/i)).toBeTruthy()
    expect(screen.getByText(/chaque trade perdant/i)).toBeTruthy()
    expect(screen.getByText(/sans paywall/i)).toBeTruthy()
    expect(screen.getByText(/rejette/i)).toBeTruthy()
  })
})
