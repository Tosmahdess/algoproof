import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Le site ne va plus chercher de cours chez Yahoo, et n'en publie plus aucun.
 *
 * Ce garde remplace `quote-provider.test.ts` et `LivePerf.test.ts`, qui
 * testaient le comportement du scrape. Tester un fichier supprimé ne protège
 * rien : ce qui doit tenir, c'est la PROPRIÉTÉ — aucun appel sortant vers
 * Yahoo, aucune colonne de prix demandée à Supabase.
 *
 * Les commentaires sont retirés avant l'examen. Un garde qui lit le fichier
 * brut se laisse satisfaire par une mention en commentaire, et ce dépôt en a
 * déjà fait les frais ailleurs.
 */
function fichiersSource(racine: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(racine)) {
    const p = join(racine, e)
    if (statSync(p).isDirectory()) out.push(...fichiersSource(p))
    else if (/\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}

function sansCommentaires(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const SOURCES = fichiersSource('src').map(f => ({ f, code: sansCommentaires(readFileSync(f, 'utf8')) }))

describe('aucun cours publié', () => {
  it('aucun appel sortant vers Yahoo Finance', () => {
    const coupables = SOURCES.filter(s => /finance\.yahoo\.com|query[12]\.finance/.test(s.code))
    expect(coupables.map(c => c.f)).toEqual([])
  })

  it("aucun User-Agent maquillé", () => {
    const coupables = SOURCES.filter(s => /['"]User-Agent['"]\s*:/i.test(s.code))
    expect(coupables.map(c => c.f)).toEqual([])
  })

  it('aucune colonne de cours demandée à Supabase', () => {
    // `.select(...)` est le seul endroit où une colonne peut entrer dans la
    // charge servie au navigateur. Un composant qui n'affiche pas un champ ne
    // l'empêche pas de voyager : le paywall des fiches l'a déjà appris.
    const interdites = /\.select\([^)]*\b(current_price|price_at_generation|ref_price_180j|high_90d|suggested_min|suggested_max)\b/
    const coupables = SOURCES.filter(s => interdites.test(s.code))
    expect(coupables.map(c => c.f)).toEqual([])
  })
})
