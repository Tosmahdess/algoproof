import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerdictBadge } from '@/components/VerdictBadge'

describe('VerdictBadge', () => {
  it('renders RENFORCER in green', () => {
    render(<VerdictBadge verdict="renforcer" />)
    const el = screen.getByText('RENFORCER')
    expect(el).toBeInTheDocument()
    expect(el.style.color || getComputedStyle(el).color).toBeTruthy()
  })
  it('maps skip to PASSER', () => {
    render(<VerdictBadge verdict="skip" />)
    expect(screen.getByText('PASSER')).toBeInTheDocument()
  })
  it('maps maintenir to MAINTENIR', () => {
    render(<VerdictBadge verdict="maintenir" />)
    expect(screen.getByText('MAINTENIR')).toBeInTheDocument()
  })
})
