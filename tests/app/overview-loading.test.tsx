import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loading from '@/app/overview/loading'

// /overview is a dynamic route (it reads searchParams), so Next has nothing to
// prefetch for it without a loading.tsx: the click produced no paint at all
// until the server finished. Measured on 2026-09-23, that was 3.9-6.7 s of dead
// page, which is why visitors clicked again — the reviewer's words: "les gens
// vont cliquer en boucle pensant que c'est pas lancé".
//
// This file exists so the skeleton cannot silently become a bare spinner that
// shifts the page when the real content lands.
describe('the /overview loading shell', () => {
  it('announces the wait to assistive tech', () => {
    render(<Loading />)
    expect(screen.getByRole('status')).toHaveAccessibleName(/chargement/i)
  })

  it('keeps the page title, so the header does not pop in under the reader', () => {
    render(<Loading />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('La flotte')
  })

  it('reserves the register with placeholder rows rather than collapsing to nothing', () => {
    const { container } = render(<Loading />)
    expect(container.querySelectorAll('[data-testid="fleet-skeleton-row"]').length)
      .toBeGreaterThanOrEqual(6)
  })
})
