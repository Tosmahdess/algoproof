// The site publishes the catalog of what a reader can keep in Mon espace
// (espace-direct lot C): strategy pages and company pages exist only in this
// repo (a TS list and two JSON files), so the lab's API reads this list rather
// than a copy that would drift. Only what the favorites list shows leaves: a
// company's analysis, alerts and figures stay on its page.
import { describe, it, expect } from 'vitest'
import { strategyCatalog, companyCatalog } from '@/lib/public-catalog'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { tousLesSlugs, listeHorsPerimetre } from '@/lib/investir'

describe('strategy catalog', () => {
  it('names every strategy page, and nothing else', () => {
    const cat = strategyCatalog()
    expect(cat.map(s => s.slug).sort()).toEqual(STRATEGY_FICHES.map(f => f.slug).sort())
    for (const s of cat) expect(Object.keys(s).sort()).toEqual(['family', 'slug', 'title'])
  })
})

describe('company catalog', () => {
  const cat = companyCatalog()

  it('names every company page, in scope and out of scope', () => {
    const expected = [...tousLesSlugs(), ...listeHorsPerimetre().map(f => f.slug)].sort()
    expect(cat.map(c => c.slug).sort()).toEqual(expected)
    expect(new Set(cat.map(c => c.slug)).size).toBe(cat.length)
  })

  it('carries only the fields a favorites list shows', () => {
    for (const c of cat) expect(Object.keys(c).sort()).toEqual(['category', 'name', 'slug', 'ticker'])
  })

  it('never ships the analysis a member pays for, nor the alerts', () => {
    const text = JSON.stringify(cat)
    const xiaomi = listeHorsPerimetre().find(f => f.slug === 'xiaomi')!
    expect(text).not.toContain(xiaomi.description!.slice(0, 40))
    expect(text).not.toMatch(/"(blocs|alertes|chiffres|description|fondamentaux|risques)"/)
  })
})

describe('the routes', () => {
  it('serve the two lists as static JSON', async () => {
    const s = await import('@/app/api/catalog/strategies/route')
    const c = await import('@/app/api/catalog/companies/route')
    expect(s.dynamic).toBe('force-static')
    expect(c.dynamic).toBe('force-static')
    const sb = await (await s.GET()).json()
    const cb = await (await c.GET()).json()
    expect(sb.items).toEqual(strategyCatalog())
    expect(cb.items.length).toBe(companyCatalog().length)
  })
})
