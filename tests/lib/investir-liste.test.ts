// tests/lib/investir-liste.test.ts
//
// What the company list reads, without the package (audit 2026-10, n° 20, 49
// and 13): the French alphabetical order, a search that ignores case and
// accents, and an empty state that names its cause.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { correspond, messageVide, normaliser, trierParNom } from '@/lib/investir-liste'

describe('trierParNom', () => {
  it('sorts as a French reader does, not in ASCII order', () => {
    // n° 49: « AZZ » came before « AbbVie », « lululemon » closed the list.
    const noms = ['lululemon athletica inc.', 'AZZ INC.', 'AbbVie Inc.', 'Éditions Zèbre', 'Exxon', 'ACME 10', 'ACME 9']
    expect(trierParNom(noms.map(name => ({ name }))).map(l => l.name)).toEqual([
      'AbbVie Inc.', 'ACME 9', 'ACME 10', 'AZZ INC.', 'Éditions Zèbre', 'Exxon', 'lululemon athletica inc.',
    ])
  })

  it('leaves its input untouched', () => {
    const lignes = [{ name: 'B' }, { name: 'A' }]
    trierParNom(lignes)
    expect(lignes.map(l => l.name)).toEqual(['B', 'A'])
  })
})

describe('correspond', () => {
  it('finds by name whatever the case and the accents', () => {
    expect(correspond({ name: 'Hermès International' }, normaliser('HERMES'))).toBe(true)
    expect(correspond({ name: 'Société Générale' }, normaliser('societe'))).toBe(true)
  })

  it('finds by ticker, with or without its market', () => {
    expect(correspond({ name: 'Crown Castle Inc.', symbole: 'CCI' }, normaliser('cci'))).toBe(true)
    expect(correspond({ name: 'LVMH', ticker: 'EPA:MC' }, normaliser('mc'))).toBe(true)
  })

  it('lets everything through on an empty query', () => {
    expect(correspond({ name: 'X' }, '')).toBe(true)
  })

  it('refuses what matches neither', () => {
    expect(correspond({ name: 'Apple Inc.', symbole: 'AAPL' }, normaliser('visa'))).toBe(false)
  })
})

describe('messageVide', () => {
  // n° 13: « Retire un filtre » was said to a reader who had set none.
  it('names the search when only the search empties the list', () => {
    const m = messageVide({ recherche: ' LVMH ', filtres: 0, total: 1406 })
    expect(m).toBe('Aucune des 1 406 sociétés que je lis ne correspond à « LVMH ».')
    expect(m).not.toMatch(/filtre/)
  })

  it('names the filters when only the filters empty it', () => {
    expect(messageVide({ recherche: '', filtres: 1, total: 10 })).toBe('Aucune société ne correspond à ce filtre.')
    expect(messageVide({ recherche: '', filtres: 2, total: 10 })).toBe('Aucune société ne correspond à cette combinaison de filtres.')
  })

  it('names both when both are set', () => {
    expect(messageVide({ recherche: 'apple', filtres: 2, total: 10 })).toBe('Aucune société ne correspond à « apple » avec ces filtres.')
  })
})

describe('the list module carries no data (n° 20)', () => {
  it('imports neither the package nor lib/investir at run time', () => {
    for (const f of ['src/lib/investir-liste.ts', 'src/lib/investir-controles.ts']) {
      const src = readFileSync(resolve(__dirname, '../..', f), 'utf8')
      expect(src, f).not.toMatch(/@\/data\//)
      expect(src, f).not.toMatch(/^import (?!type )[^\n]*'@\/lib\/investir'/m)
    }
  })

  it('is what the client list imports, instead of lib/investir', () => {
    const src = readFileSync(resolve(__dirname, '../../src/components/InvestirListe.tsx'), 'utf8')
    expect(src).not.toMatch(/^import (?!type )[^\n]*'@\/lib\/investir'/m)
  })
})
