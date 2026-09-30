// The favorite star (components/FavoriteButton.tsx) calls the lab API from the
// browser. Shipped on 2026-09-30 without the API in connect-src: every call
// was blocked by the site's own CSP, the star read "off" for everyone and a
// click did nothing, while every unit test was green (jsdom enforces no CSP).
// Found by driving the served page in a real browser. The CSP must name the
// SAME constant the button fetches, not a copy of it.
import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'
import { LAB_API_ORIGIN } from '@/lib/lab-links'

async function directive(name: string): Promise<string[]> {
  const rules = await nextConfig.headers!()
  const csp = rules.flatMap(r => r.headers).find(h => h.key === 'Content-Security-Policy')!.value
  const d = csp.split(';').map(s => s.trim()).find(s => s.startsWith(`${name} `))!
  return d.split(/\s+/).slice(1)
}

describe('CSP', () => {
  it('lets the browser reach the lab API the favorite star calls', async () => {
    expect(await directive('connect-src')).toContain(LAB_API_ORIGIN)
  })
})
