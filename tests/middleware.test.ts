import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => { throw new Error('corrupt cookie chunk') },
    },
  }),
}))

import { NextRequest } from 'next/server'
import { REFRESH_PATHS, config, middleware } from '@/middleware'

describe('middleware getUser guard', () => {
  it('returns a response instead of throwing when getUser() throws', async () => {
    const req = new NextRequest('http://localhost/wealth/AAPL')
    const res = await middleware(req)
    expect(res).toBeDefined()
    expect(res.status).toBe(200)
  })
})

describe('middleware matcher', () => {
  it('covers every refresh path, in both bare and nested form', () => {
    for (const p of REFRESH_PATHS) {
      expect(config.matcher).toContain(p)
      expect(config.matcher).toContain(`${p}/:path*`)
    }
  })

  it('lists nothing the refresh paths do not claim', () => {
    for (const m of config.matcher) {
      const base = m.replace('/:path*', '')
      expect(REFRESH_PATHS).toContain(base)
    }
  })
})
