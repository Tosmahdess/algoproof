import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExplainerBox from '@/components/ExplainerBox'

describe('ExplainerBox', () => {
  it('renders Overview label', () => {
    render(<ExplainerBox functional="Simple explanation." technical="Technical detail." />)
    expect(screen.getByText('Overview')).toBeDefined()
  })

  it('renders Technical Details label', () => {
    render(<ExplainerBox functional="Simple explanation." technical="Technical detail." />)
    expect(screen.getByText('Technical Details')).toBeDefined()
  })

  it('renders functional content', () => {
    render(<ExplainerBox functional="Simple explanation." technical="Technical detail." />)
    expect(screen.getByText('Simple explanation.')).toBeDefined()
  })

  it('renders technical content', () => {
    render(<ExplainerBox functional="Simple explanation." technical="Technical detail." />)
    expect(screen.getByText('Technical detail.')).toBeDefined()
  })

  it('functional section appears before technical in DOM', () => {
    const { container } = render(
      <ExplainerBox functional="First" technical="Second" />
    )
    const sections = container.querySelectorAll('[data-section]')
    expect(sections[0].getAttribute('data-section')).toBe('functional')
    expect(sections[1].getAttribute('data-section')).toBe('technical')
  })

  it('accepts ReactNode in technical prop', () => {
    render(
      <ExplainerBox
        functional="Overview text"
        technical={<span data-testid="custom">Custom node</span>}
      />
    )
    expect(screen.getByTestId('custom')).toBeDefined()
  })
})
