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
    // The fleet's list is the ledger since the refonte « registre » (lot 4, 2026-10-02).
    expect(src('src/components/FleetRegister.tsx')).toMatch(/<FavoritesProvider kind="bot">\s*<FleetLedger/)
    expect(src('src/app/strategies/[concept]/page.tsx')).toMatch(/<FavoritesProvider kind="bot">/)
  })

  it('a fleet ledger row never nests the star or the bell inside its link', () => {
    const ledger = src('src/components/FleetLedger.tsx')
    const link = ledger.slice(ledger.indexOf('<Link'), ledger.indexOf('</Link>'))
    expect(link).not.toContain('FavoriteStar')
    expect(link).not.toContain('FollowBell')
    expect(ledger).toContain('<FavoriteStar kind="bot"')
    expect(ledger).toContain('<FollowBell slug={bot.slug}')
  })

  it('a table row never nests the star inside its link', () => {
    const table = src('src/components/BotTable.tsx')
    const mobile = table.slice(table.indexOf('bot-table-mobile'), table.indexOf('bot-table-desktop'))
    const link = mobile.slice(mobile.indexOf('<Link'), mobile.indexOf('</Link>'))
    expect(link).not.toContain('FavoriteStar')
    expect(mobile).toContain('<FavoriteStar kind="bot"')
  })
})

describe('bells on the site (espace-direct lot H)', () => {
  it('the fleet table and the strategy page tables sit under one bell provider each', () => {
    expect(src('src/components/FleetRegister.tsx')).toMatch(/<FollowsProvider slugs=\{rows\.map\(r => r\.slug\)\}>/)
    expect(src('src/app/strategies/[concept]/page.tsx')).toMatch(/<FollowsProvider slugs=/)
  })

  it('a bot page carries the bell next to the star', () => {
    expect(src('src/app/strategies/bot/[slug]/page.tsx')).toMatch(/<FavoriteButton slug=\{bot\.slug\} \/>\s*<FollowButton slug=\{bot\.slug\} \/>/)
  })

  it('a table row never nests the bell inside its link, on both layouts', () => {
    const table = src('src/components/BotTable.tsx')
    const mobile = table.slice(table.indexOf('bot-table-mobile'), table.indexOf('bot-table-desktop'))
    const link = mobile.slice(mobile.indexOf('<Link'), mobile.indexOf('</Link>'))
    expect(link).not.toContain('FollowBell')
    expect(mobile).toContain('<FollowBell slug={bot.slug}')
    expect(table.slice(table.indexOf('bot-table-desktop'))).toContain('<FollowBell slug={bot.slug}')
  })

  it('the sale flag is read statically, so the browser bundle gets it', () => {
    // A dynamic process.env[name] never reaches the browser (vault lesson).
    expect(src('src/lib/direct-sale.ts')).toMatch(/process\.env\.NEXT_PUBLIC_DIRECT_SALE_OPEN === '1'/)
  })
})
