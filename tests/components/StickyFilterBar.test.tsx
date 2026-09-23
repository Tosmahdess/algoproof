import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import StickyFilterBar from '@/components/StickyFilterBar'

// External review, 2026-09-23: "Sur la plupart des pages rendre les filtres
// collant, surtout sur les grosses pages comme survivant, blog, etc."
//
// Scrolling a long list and losing the controls that shaped it means scrolling
// back to the top to change one thing.
const bar = () => screen.getByTestId('sticky-filters')

describe('a filter bar that follows the reader', () => {
  it('sticks below the nav rather than under it', () => {
    render(<StickyFilterBar activeCount={0} onReset={() => {}}><p>contrôles</p></StickyFilterBar>)

    expect(bar().className).toContain('sticky')
    // The offset is the nav's own height token, not a number copied here. A
    // literal would be right until the nav changes height — which it does, at
    // the md breakpoint — and then the bar hides its own first line.
    expect(bar().className).toContain('top-[var(--nav-h)]')
  })

  it('is opaque, so the list does not scroll through it', () => {
    render(<StickyFilterBar activeCount={0} onReset={() => {}}><p>contrôles</p></StickyFilterBar>)
    expect(bar().className).toMatch(/\bbg-bg\b/)
  })

  // A sticky element that outranks the nav covers the nav. The two numbers are
  // a pair, so this reads BOTH files: changing either one alone fails here.
  it('stacks below the nav, not above it', () => {
    render(<StickyFilterBar activeCount={0} onReset={() => {}}><p>contrôles</p></StickyFilterBar>)
    const navSource = readFileSync(join(__dirname, '..', '..', 'src', 'components', 'Nav.tsx'), 'utf8')

    expect(navSource, 'the nav is the reference for this pair').toContain('z-50')
    expect(bar().className).toContain('z-40')
  })

  // Fable's point, and the one that would have earned the next complaint: a
  // full filter bar pinned on a phone eats a third of the screen, so the fix
  // for "I lose my filters" becomes "I cannot see the list".
  it('is collapsed on a phone and says how many filters are on', () => {
    render(
      <StickyFilterBar activeCount={3} onReset={() => {}}>
        <p>contrôles</p>
      </StickyFilterBar>,
    )

    expect(screen.getByTestId('filter-controls').className).toMatch(/\bhidden\b/)
    expect(screen.getByRole('button', { name: /filtres/i })).toHaveTextContent('3')
  })

  it('opens the controls in place when asked', () => {
    render(
      <StickyFilterBar activeCount={0} onReset={() => {}}>
        <p>contrôles</p>
      </StickyFilterBar>,
    )

    fireEvent.click(screen.getByRole('button', { name: /filtres/i }))
    expect(screen.getByTestId('filter-controls').className).not.toMatch(/\bhidden\b/)
  })

  it('shows the controls on a wide screen without any click', () => {
    render(<StickyFilterBar activeCount={0} onReset={() => {}}><p>contrôles</p></StickyFilterBar>)
    expect(screen.getByTestId('filter-controls').className).toContain('lg:block')
  })

  it('offers a reset only when something is actually filtered', () => {
    const onReset = vi.fn()
    const { rerender } = render(
      <StickyFilterBar activeCount={0} onReset={onReset}><p>contrôles</p></StickyFilterBar>,
    )
    expect(screen.queryByRole('button', { name: /effacer/i })).toBeNull()

    rerender(<StickyFilterBar activeCount={2} onReset={onReset}><p>contrôles</p></StickyFilterBar>)
    fireEvent.click(screen.getByRole('button', { name: /effacer/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('tells assistive tech whether the controls are open', () => {
    render(<StickyFilterBar activeCount={0} onReset={() => {}}><p>contrôles</p></StickyFilterBar>)
    const toggle = screen.getByRole('button', { name: /filtres/i })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
