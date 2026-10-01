// Where the stars live (espace-direct lot C). Read from the source: the pages
// are static and heavy to render in a unit test, and what matters is that the
// right kind reaches the right page and that the fleet's stars sit under ONE
// provider (one request for ~120 rows).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('stars on the site', () => {
  it('a strategy page stars itself as a strategy', () => {
    expect(src('src/app/strategies/[concept]/page.tsx')).toMatch(/<FavoriteButton slug=\{fiche\.slug\} kind="strategy" \/>/)
  })

  it('a company page stars itself as a company, both kinds of company page', () => {
    const page = src('src/app/investir/[slug]/page.tsx')
    expect(page.match(/<FavoriteButton slug=\{fiche\.slug\} kind="company" \/>/g)).toHaveLength(2)
  })

  it('the fleet table and the strategy page tables sit under one provider each', () => {
    expect(src('src/components/FleetRegister.tsx')).toMatch(/<FavoritesProvider kind="bot">\s*<BotTable/)
    expect(src('src/app/strategies/[concept]/page.tsx')).toMatch(/<FavoritesProvider kind="bot">/)
  })

  it('a table row never nests the star inside its link', () => {
    const table = src('src/components/BotTable.tsx')
    const mobile = table.slice(table.indexOf('bot-table-mobile'), table.indexOf('bot-table-desktop'))
    const link = mobile.slice(mobile.indexOf('<Link'), mobile.indexOf('</Link>'))
    expect(link).not.toContain('FavoriteStar')
    expect(mobile).toContain('<FavoriteStar kind="bot"')
  })
})
