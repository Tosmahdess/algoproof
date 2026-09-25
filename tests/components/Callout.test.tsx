import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Callout from '@/components/Callout'

// Spec §3.4 (design audit, 2026-09-25): ONE page-level callout, a 2 px left border,
// three tones. `negative-result` is red because it frames « the measurement says no »
// (the weather's fleet impact on /intelligence): red is a data colour, and this block
// carries a negative result. It is not the MDX Callout of the blog posts.
describe('Callout', () => {
  it('renders its children behind a 2 px left border', () => {
    render(<Callout><p>Le corps.</p></Callout>)
    const box = screen.getByText('Le corps.').closest('[data-tone]')!
    expect(box.className).toContain('border-l-2')
    expect(box.getAttribute('data-tone')).toBe('info')
  })

  it('colours the border red for a negative result, and only then', () => {
    const { container: a } = render(<Callout tone="negative-result"><p>Non.</p></Callout>)
    expect(a.querySelector('[data-tone="negative-result"]')!.className).toContain('border-negative')

    const { container: b } = render(<Callout tone="warning"><p>Bof.</p></Callout>)
    expect(b.querySelector('[data-tone="warning"]')!.className).toContain('border-warning')
    expect(b.querySelector('[data-tone="warning"]')!.className).not.toContain('border-negative')
  })
})
