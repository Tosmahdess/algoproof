import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

// Lot 8 of the design audit (2026-09-25): the client leaf that posts one hit per
// page. It reads the URL inside an effect (never useSearchParams, whose CSR
// bailout stripped the register out of /overview once), posts with sendBeacon
// so a navigation cannot cancel it, and remembers the ref of the URL for the
// session so a later page keeps the first touch.
const pathname = vi.hoisted(() => ({ current: '/overview' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

import PageHit from '@/components/PageHit'

const beacon = vi.fn(() => true)

beforeEach(() => {
  beacon.mockClear()
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/overview?ref=home-hero')
})

async function sent(): Promise<Record<string, unknown>> {
  const [url, blob] = beacon.mock.calls[0]! as unknown as [string, Blob]
  expect(url).toBe('/api/hit')
  return JSON.parse(await blob.text())
}

describe('PageHit', () => {
  it('posts the page and the ref of the URL, and remembers the ref for the session', async () => {
    render(<PageHit site="algoproof" />)
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(await sent()).toEqual({ site: 'algoproof', path: '/overview', ref: 'home-hero', referrer_host: null })
    expect(window.sessionStorage.getItem('ap_ref')).toBe('home-hero')
  })

  it('posts again when the path changes, with the remembered ref', async () => {
    const { rerender } = render(<PageHit site="lab" />)
    window.history.replaceState(null, '', '/cockpit')
    pathname.current = '/cockpit'
    rerender(<PageHit site="lab" />)
    expect(beacon).toHaveBeenCalledTimes(2)
    const [, blob] = beacon.mock.calls[1]! as unknown as [string, Blob]
    expect(JSON.parse(await blob.text())).toMatchObject({ path: '/cockpit', ref: 'home-hero' })
    pathname.current = '/overview'
  })

  it('renders nothing', () => {
    const { container } = render(<PageHit site="algoproof" />)
    expect(container.innerHTML).toBe('')
  })
})
