import { describe, it, expect } from 'vitest'
import { REFRESH_PATHS, config } from '@/middleware'

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
