import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'
import { PARAM_ORDER } from '@/lib/bot-filters'

describe('robots facet coverage', () => {
  // Fix round 1, finding 3: `dir` was emitted by serializeFleetFilters but had
  // no /*?dir= disallow line — caught only by the blanket /overview?* rule,
  // which would stop covering a second route that mounts the same filters.
  // This test ties the two files together so adding a facet to PARAM_ORDER
  // without adding its robots.ts line fails here instead of shipping silently.
  it('has one /*?<name>= disallow rule for every PARAM_ORDER entry', () => {
    const { rules } = robots()
    const disallow = Array.isArray(rules) ? rules.flatMap(r => r.disallow ?? []) : (rules.disallow ?? [])
    const list = Array.isArray(disallow) ? disallow : [disallow]

    for (const param of PARAM_ORDER) {
      expect(list, `missing disallow rule for PARAM_ORDER entry "${param}"`)
        .toContain(`/*?${param}=`)
    }
  })
})
