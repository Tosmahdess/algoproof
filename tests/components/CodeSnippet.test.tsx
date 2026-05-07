import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CodeSnippet from '@/components/CodeSnippet'

describe('CodeSnippet', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('renders the code content', () => {
    render(<CodeSnippet code="return 'BUY'" />)
    const pre = document.querySelector('pre')
    expect(pre).toBeTruthy()
    expect(pre!.textContent).toContain("return")
  })

  it('renders a copy button', () => {
    render(<CodeSnippet code="return 'BUY'" />)
    expect(screen.getByRole('button', { name: /copier/i })).toBeDefined()
  })

  it('copy button calls clipboard.writeText with the code', () => {
    render(<CodeSnippet code="return 'BUY'" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("return 'BUY'")
  })

  it('copy button label changes to Copié! after click', () => {
    render(<CodeSnippet code="return 'BUY'" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    expect(screen.getByRole('button', { name: /copié/i })).toBeDefined()
  })
})
