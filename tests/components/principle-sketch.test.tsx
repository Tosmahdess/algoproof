import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import PrincipleSketch from '@/components/library/PrincipleSketch'

// The sketch of an idea's principle (D079), on the idea page since the refonte
// « registre » (2026-10-03). Audit n° 76: its « entrée » was SVG text at 10 units,
// scaled down with the drawing to under the 13 px floor on a phone. The words live in
// HTML now, at the floor; the drawing carries no text.
describe('PrincipleSketch', () => {
  it.each(['breakout', 'mean-reversion', 'momentum', 'price-action', 'trend'])('%s: no text in the drawing, a caption in HTML', family => {
    const { container } = render(<PrincipleSketch family={family} />)
    expect(container.querySelector('svg text')).toBeNull()
    const caption = container.querySelector('figcaption')!
    expect(caption.textContent).toMatch(/entrée/)
    expect(caption.textContent).toMatch(/pas un résultat/)
    expect(caption.className).toMatch(/text-xs/)
  })
})
