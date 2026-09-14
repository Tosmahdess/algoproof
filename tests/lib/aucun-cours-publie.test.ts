import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Le site ne va plus chercher de cours, et n'en publie aucun.
 *
 * Ce garde remplace `quote-provider.test.ts` et `LivePerf.test.ts`, qui
 * testaient le comportement du scrape. Tester un fichier supprimé ne protège
 * rien : ce qui doit tenir, c'est la PROPRIÉTÉ.
 *
 * ── Ce que la version précédente laissait passer, trouvé le 2026-09-14 ──
 *
 * Elle listait SIX noms de colonnes interdits. Trois chemins vivants sont
 * passés à côté pendant six jours :
 *
 *   1. `/api/wealth` servait `.select('asset,price_eur,…')` — `price_eur`
 *      n'était pas dans la liste.
 *   2. `queries.getAssetPrices()` faisait `.select('*')` sur `asset_prices` —
 *      AUCUNE liste de noms de colonnes ne peut voir un `*`.
 *   3. Les deux lisaient une table alimentée toutes les heures par un cron
 *      qui appelle Yahoo et stocke le résultat.
 *
 * D'où les trois changements de forme ci-dessous :
 *
 *   • **On interdit la TABLE, pas la colonne.** Une table qui contient des
 *     cours ne doit pas être interrogée du tout. C'est le seul invariant qui
 *     survit à un `select('*')` et à un renommage de colonne.
 *   • **On vérifie que le garde a vraiment regardé quelque chose.** Trois
 *     assertions sur un tableau vide sont trois assertions vertes et vides ;
 *     c'est ce qui arrive le jour où l'arbre source déménage.
 *   • **Une sonde permanente.** Le 2026-09-08, réintroduire les défauts et
 *     regarder le garde tomber a été fait UNE FOIS, à la main. Rien ne
 *     maintenait la propriété. Les détecteurs sont maintenant des fonctions
 *     pures, et la sonde leur donne du code fautif de synthèse : elle prouve
 *     que le détecteur détecte encore, indépendamment de l'état de l'arbre.
 *
 * Les commentaires sont retirés avant l'examen. Un garde qui lit le fichier
 * brut se laisse satisfaire par une mention en commentaire, et ce dépôt en a
 * déjà fait les frais ailleurs.
 */

/** Tables dont le contenu EST un cours, ou en contient une colonne. */
const TABLES_DE_COURS = ['asset_prices']

/**
 * Noms de colonnes qui portent un cours. Gardé en plus de l'interdit de table :
 * une nouvelle table pourrait en porter un sans qu'on l'ait recensée.
 * `amount_eur` n'en est PAS un — c'est un montant investi, pas une cotation.
 */
const COLONNES_DE_COURS =
  /\b(current_price|price_at_generation|ref_price_180j|high_90d|suggested_min|suggested_max|price_eur|prix_eur|last_price|close_price)\b/

export function sansCommentaires(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** `.from('x')` où x est une table de cours. */
export function interrogeUneTableDeCours(code: string): boolean {
  return TABLES_DE_COURS.some(t =>
    new RegExp(`\\.from\\(\\s*['"\`]${t}['"\`]\\s*\\)`).test(code)
  )
}

/** `.select(...)` demandant une colonne de cours. */
export function demandeUneColonneDeCours(code: string): boolean {
  const selects = code.match(/\.select\(\s*['"`][^'"`]*['"`]/g) ?? []
  return selects.some(s => COLONNES_DE_COURS.test(s))
}

export function appelleYahoo(code: string): boolean {
  return /finance\.yahoo\.com|query[12]\.finance/.test(code)
}

export function maquilleSonUserAgent(code: string): boolean {
  return /['"]User-Agent['"]\s*:/i.test(code)
}

function fichiersSource(racine: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(racine)) {
    const p = join(racine, e)
    if (statSync(p).isDirectory()) out.push(...fichiersSource(p))
    else if (/\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}

const SOURCES = fichiersSource('src').map(f => ({
  f,
  code: sansCommentaires(readFileSync(f, 'utf8')),
}))

const coupables = (predicat: (code: string) => boolean) =>
  SOURCES.filter(s => predicat(s.code)).map(s => s.f)

describe('aucun cours publié', () => {
  it('le garde a réellement balayé l’arbre source', () => {
    // Sans ce plancher, un déplacement de `src/` rendrait tout le reste
    // vert-à-vide sans que rien ne le signale.
    expect(SOURCES.length).toBeGreaterThan(150)
  })

  it('aucune table de cours n’est interrogée', () => {
    expect(coupables(interrogeUneTableDeCours)).toEqual([])
  })

  it('aucune colonne de cours n’est demandée', () => {
    expect(coupables(demandeUneColonneDeCours)).toEqual([])
  })

  it('aucun appel sortant vers Yahoo Finance', () => {
    expect(coupables(appelleYahoo)).toEqual([])
  })

  it('aucun User-Agent maquillé', () => {
    expect(coupables(maquilleSonUserAgent)).toEqual([])
  })
})

/**
 * La sonde. Elle ne regarde PAS l'arbre : elle nourrit chaque détecteur avec du
 * code fautif de synthèse et vérifie qu'il le voit encore. Un détecteur qui
 * cesse de détecter devient rouge ici, même si l'arbre est propre.
 */
describe('sonde — les détecteurs détectent encore', () => {
  it('voit une table de cours, y compris derrière un select(*)', () => {
    expect(interrogeUneTableDeCours(`supabase.from('asset_prices').select('*')`)).toBe(true)
    expect(interrogeUneTableDeCours(`supabase.from("asset_prices").select('asset')`)).toBe(true)
    expect(interrogeUneTableDeCours(`supabase.from('bots').select('*')`)).toBe(false)
  })

  it('voit une colonne de cours dans un select', () => {
    expect(demandeUneColonneDeCours(`.select('asset,price_eur,source')`)).toBe(true)
    expect(demandeUneColonneDeCours(`.select('id,current_price')`)).toBe(true)
    // Un montant investi n'est pas une cotation : le garde ne doit pas le crier.
    expect(demandeUneColonneDeCours(`.select('id,amount_eur,venue')`)).toBe(false)
  })

  it('voit un appel Yahoo', () => {
    expect(appelleYahoo(`fetch('https://query2.finance.yahoo.com/v8/finance/chart/GC=F')`)).toBe(true)
    expect(appelleYahoo(`fetch('https://api.coingecko.com/api/v3/simple/price')`)).toBe(false)
  })

  it('voit un User-Agent maquillé', () => {
    expect(maquilleSonUserAgent(`headers: { 'User-Agent': 'Mozilla/5.0' }`)).toBe(true)
    expect(maquilleSonUserAgent(`headers: { 'Accept': 'application/json' }`)).toBe(false)
  })

  it('ne se laisse pas satisfaire par un commentaire', () => {
    const code = sansCommentaires(`// supabase.from('asset_prices')\nconst x = 1`)
    expect(interrogeUneTableDeCours(code)).toBe(false)
  })
})
