import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ExplainerBox from '@/components/ExplainerBox'

describe('ExplainerBox', () => {
  it('renders the Fonctionnel tab button', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    expect(screen.getByRole('button', { name: /fonctionnel/i })).toBeDefined()
  })

  it('renders the Technique tab button', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    expect(screen.getByRole('button', { name: /technique/i })).toBeDefined()
  })

  it('shows functional content by default', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    expect(screen.getByText('Plain text.')).toBeDefined()
    expect(screen.queryByText('Tech detail.')).toBeNull()
  })

  it('shows technical content after clicking Technique tab', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    fireEvent.click(screen.getByRole('button', { name: /technique/i }))
    expect(screen.getByText('Tech detail.')).toBeDefined()
    expect(screen.queryByText('Plain text.')).toBeNull()
  })

  it('clicking Fonctionnel tab after Technique shows functional again', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    fireEvent.click(screen.getByRole('button', { name: /technique/i }))
    fireEvent.click(screen.getByRole('button', { name: /fonctionnel/i }))
    expect(screen.getByText('Plain text.')).toBeDefined()
    expect(screen.queryByText('Tech detail.')).toBeNull()
  })

  it('accepts ReactNode in technical prop and renders after tab click', () => {
    render(
      <ExplainerBox
        functional="Overview"
        technical={<span data-testid="custom-node">Custom</span>}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /technique/i }))
    expect(screen.getByTestId('custom-node')).toBeDefined()
  })
})
