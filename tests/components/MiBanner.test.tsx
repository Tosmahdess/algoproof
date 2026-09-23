import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MiBanner from '@/components/MiBanner'

// Measured in Chrome on /overview, 2026-09-23: CLS 0.17 ("needs improvement"),
// one shift of 0.1716 landing at ~1256 ms — some 600 ms AFTER the content
// itself. The impacted element was the « Argent réel » section, which sits
// directly below this banner.
//
// The cause is here: MiBanner paints a ONE-LINE placeholder while it fetches
// /api/mi, then swaps in the real banner, measured at 113 px. Everything below
// it drops by the difference, at the moment the fetch resolves.
//
// Worth recording because I got this wrong first: I blamed the page's loading
// skeleton and corrected ~760 px of its heights. CLS came back at 0.1716 — the
// SAME score to four digits, which is what proved the skeleton innocent. A fix
// that does not move the number is evidence, not a step forward.
describe('the market-weather banner while it is loading', () => {
  beforeEach(() => {
    // A promise that never settles: the component stays in its loading state,
    // which is the state under test.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  })

  it('reserves the height the loaded banner will take', () => {
    const { container } = render(<MiBanner />)
    const placeholder = container.firstElementChild!

    expect(screen.getByText(/chargement du régime/i)).toBeInTheDocument()
    expect(
      placeholder.className,
      'the placeholder must hold the space, or the page drops when the fetch lands',
    ).toMatch(/min-h-\[113px\]/)
  })

  it('reserves it in the unavailable state too', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: async () => null })))
    const { container, rerender } = render(<MiBanner />)
    await vi.waitFor(() => expect(screen.getByText(/non disponibles/i)).toBeInTheDocument())
    rerender(<MiBanner />)

    expect(container.firstElementChild!.className).toMatch(/min-h-\[113px\]/)
  })
})
