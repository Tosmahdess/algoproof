// tests/lib/recipe-params.test.ts
//
// A wave bot's exact recipe (bot_recipes, members only) is rendered with the
// same BotParams visual as the hand-written fiches. The mapping is pure so the
// client component carries no data of its own. Values here are SYNTHETIC: the
// repo is public, a real recipe never goes into a fixture.
import { describe, it, expect } from 'vitest'
import { toBotParams, type BotRecipe } from '@/lib/recipe-params'

const recipe: BotRecipe = {
  tf: 'H4',
  params: { period: 7, multiplier: 1.5, session_anchor: 'London', brand_new_knob: 2 },
  filters: {
    adx_min: { adx_period: 11, adx_min: 17 },
    rsi_gate: { mode: 'no_extreme' },
    brand_new_filter: { knob: 3 },
  },
  exit: { atr_mult: 2.5, rr: 3 },
  assets: ['AAA/USDT:USDT', 'BBB/USDT:USDT'],
  provenance: { dataset: 'data_20990101', engine_fingerprint: 'feedbeef' },
}

const flat = (r: BotRecipe) =>
  toBotParams(r).groups.flatMap(g => g.items.map(i => `${g.title}|${i.label}|${i.value}|${i.note ?? ''}`))

describe('toBotParams', () => {
  it('renders every signal parameter, numbers and strings alike', () => {
    const rows = flat(recipe)
    expect(rows).toContain('Signal|période|7|')
    expect(rows).toContain('Signal|multiplicateur|1.5|')
    expect(rows).toContain("Signal|session d'ancrage|London|")
    expect(rows).toContain('Signal|brand_new_knob|2|')
    expect(rows.some(r => r.startsWith('Signal|Unité de temps|H4'))).toBe(true)
    expect(rows.some(r => r.startsWith('Signal|Actifs|2|') && r.includes('AAA, BBB'))).toBe(true)
  })

  it('labels known filters in French and keeps unknown ones under their raw key', () => {
    const rows = flat(recipe)
    expect(rows).toContain('Filtres|force de tendance (ADX)|adx_period 11 · adx_min 17|')
    expect(rows).toContain('Filtres|zone du RSI|mode no_extreme|')
    expect(rows).toContain('Filtres|brand_new_filter|knob 3|')
  })

  it('renders the exit, and says so when the engine default applies', () => {
    expect(flat(recipe)).toContain('Sortie|Stop loss|ATR × 2.5|')
    expect(flat(recipe)).toContain('Sortie|R:R minimal|1 : 3|')
    expect(flat({ ...recipe, exit: null })).toContain('Sortie|Sortie|stop et cible par défaut|')
    expect(flat({ ...recipe, exit: { atr_mult: 2, atr_period: 21 } })).toContain('Sortie|atr_period|21|')
  })

  it('says when there is no filter at all rather than dropping the group', () => {
    expect(flat({ ...recipe, filters: {} })).toContain('Filtres|Filtres|aucun|')
  })

  it('names the engine generation it came from', () => {
    // User rule 24/09: no engine jargon, a dated dataset reads as a date.
    expect(flat(recipe)).toContain('Provenance|Données|jusqu’au 01/01/2099|version feedbeef')
    expect(flat(recipe).join(' ')).not.toMatch(/moteur|data_/)
  })
})
