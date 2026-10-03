import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Callout from '@/components/Callout'

// Spec §3.4 (design audit, 2026-09-25): ONE page-level callout, three tones.
// `negative-result` is red because it frames « the measurement says no » (the
// weather's fleet impact on /intelligence): red is a data colour, and this block
// carries a negative result. It is not the MDX Callout of the blog posts.
//
// Finitions (2026-10-03): it was a 2 px border on the left side only. Like every
// box of the site it is now a surface with a full 1 px rule (DESIGN.md « Cards /
// Containers »); the tone colours the whole rule, as the verdict panel's does
// when a rule is crossed.
const classes = (el: Element) => el.className.split(/\s+/)

describe('Callout', () => {
  it('renders its children on a surface with a full 1 px rule, no side border', () => {
    render(<Callout><p>Le corps.</p></Callout>)
    const box = screen.getByText('Le corps.').closest('[data-tone]')!
    expect(box.getAttribute('data-tone')).toBe('info')
    expect(classes(box)).toEqual(expect.arrayContaining(['bg-card', 'border', 'border-border', 'rounded-lg']))
    expect(classes(box).filter(c => /^border-[lrse](?:-|$)/.test(c))).toEqual([])
  })

  it('colours the whole rule red for a negative result, and only then', () => {
    const { container: a } = render(<Callout tone="negative-result"><p>Non.</p></Callout>)
    const neg = a.querySelector('[data-tone="negative-result"]')!
    expect(classes(neg)).toContain('border-negative')
    expect(classes(neg)).toContain('border')

    const { container: b } = render(<Callout tone="warning"><p>Bof.</p></Callout>)
    const warn = b.querySelector('[data-tone="warning"]')!
    expect(classes(warn)).toContain('border-warning')
    expect(classes(warn)).not.toContain('border-negative')
  })
})
