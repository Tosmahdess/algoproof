// tests/app/opengraph-image.test.tsx
//
// The OG card used to hardcode « 38 bots » while production held 40 — a claim
// that goes stale silently on a page nobody re-visits to check. The fix derives
// the count from getFunnelCounts() (the same denominator the funnel counter
// shows on-page), and — because an OG image route must never throw — falls
// back to wording with no number at all if that fetch rejects.
//
// ImageResponse (next/og) runs a real satori/resvg render, which is slow and
// irrelevant here: mocked the same way tests/app/bot-slug-routes.test.tsx
// mocks it, capturing the JSX tree instead of rasterizing it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

const captured = vi.hoisted(() => ({ element: null as ReactElement | null }))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement) {
      captured.element = element
    }
  },
}))

const funnel = vi.hoisted(() => ({
  impl: async () => ({ n_swept: 100, n_judged: 80, n_promoted: 40, n_live: 5 }),
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: () => funnel.impl(),
}))

import Image from '@/app/opengraph-image'

describe('/opengraph-image', () => {
  beforeEach(() => {
    captured.element = null
  })

  it('renders the live promoted-bot count from getFunnelCounts', async () => {
    funnel.impl = async () => ({ n_swept: 100, n_judged: 80, n_promoted: 40, n_live: 5 })
    await Image()
    const html = renderToStaticMarkup(captured.element!)
    expect(html).toContain('40 bots')
  })

  it('falls back to the numberless wording, and never throws, when the fetch rejects', async () => {
    funnel.impl = async () => { throw new Error('supabase unreachable') }
    await expect(Image()).resolves.toBeTruthy()
    const html = renderToStaticMarkup(captured.element!)
    expect(html).toContain('données live · zéro faux screenshot')
    expect(html).not.toMatch(/\d+ bots/)
  })

  it('falls back to the numberless wording when getFunnelCounts resolves null', async () => {
    funnel.impl = async () => null as never
    await Image()
    const html = renderToStaticMarkup(captured.element!)
    expect(html).toContain('données live · zéro faux screenshot')
    expect(html).not.toMatch(/\d+ bots/)
  })
})
