// tests/lib/no-grade-sitewide.test.ts
//
// 2026-09-19 (D058). The Investir fiches stopped grading companies on
// 2026-09-15: no grade, no verdict, « Il n'y a pas de mot au bout ». The guard
// « Investir states facts, and grades nothing » in copy-guards.test.ts sweeps
// the Investir files only, and the retired vocabulary survived on /preuve,
// /a-propos, /faq, the footer of every page, RecitInvestir (outside the
// `components/Investir` path pattern) and EquityDisclosure. A copy guard even
// REQUIRED it. This one sweeps src/ and content/, with patterns anchored to
// their subject: « note » alone is a legitimate French word.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
// .json too: the fiche content lives in src/data (final review 2026-09-19).
const EXT = new Set(['.ts', '.tsx', '.mdx', '.md', '.json'])

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (EXT.has(path.extname(e.name))) out.push(full)
  }
  return out
}

const TEXTS = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'content'))].map(f => ({
  rel: path.relative(ROOT, f).replace(/\\/g, '/'),
  text: fs.readFileSync(f, 'utf8').replace(/\s+/g, ' '),
}))
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\s+/g, ' ')
const hits = (re: RegExp) => TEXTS.filter(t => re.test(t.text)).map(t => t.rel)

const RETIRED = [
  /soci[ée]t[ée]s? que je note/i,
  /la note, le verdict/i,
  /la note et le verdict/i,
  /le verdict et sa raison/i,
  /je note (?:une|les|des|cette|la|bien plus de) soci/i,
  /titres notés/i,
  /notés par une règle/i,
  /le verdict et le texte/i,
]

describe('no page still says it grades companies', () => {
  it('each retired pattern fires on a sentence it was written for', () => {
    // Without this, a mis-escaped pattern passes the sweep below on nothing.
    const temoins = [
      'Même chose sur les sociétés que je note : la note, le verdict et sa raison',
      'la note et le verdict de chaque société',
      'Je note bien plus de sociétés que je n’en suis pour moi',
      'Je peux détenir certains des titres notés ici',
      'Les comptes de sociétés cotées, notés par une règle',
      'Le verdict et le texte qui l’accompagne',
    ]
    for (const re of RETIRED) expect(temoins.some(t => re.test(t)), String(re)).toBe(true)
  })

  it('and on none of the legitimate uses of « note »', () => {
    for (const ok of ['une note de bas de page', 'role="note"', 'je le noterai ici',
                      '<SampleNote />', 'les notes de version']) {
      expect(RETIRED.some(re => re.test(ok)), ok).toBe(false)
    }
  })

  it('no file under src/ or content/ carries one', () => {
    expect(TEXTS.length).toBeGreaterThan(100)
    for (const re of RETIRED) expect(hits(re), String(re)).toEqual([])
  })

  // Lot 2 (2026-09-25, conception §2.2): the bar and the footer share five words,
  // and the word for /investir is « Sociétés », a thing, never « Investir », a verb
  // that promises advice. What the page does is on the page's own H1.
  it('the footer names the Investir page by what it is, never by the verb', () => {
    expect(read('src/components/Footer.tsx'))
      .toMatch(/href: '\/investir',\s*label: 'Sociétés'/)
    expect(read('src/components/Footer.tsx')).not.toMatch(/label: 'Investir'/)
  })
})

describe('/preuve', () => {
  const page = () => read('src/app/preuve/page.tsx')

  it('anchors its three sections, and /a-propos lands on the free/paid one', () => {
    for (const id of ['validation', 'pertes', 'gratuit']) expect(page()).toContain(`id="${id}"`)
    expect(read('src/app/a-propos/page.tsx'))
      .toMatch(/href="\/preuve#gratuit"[^>]*>Où passera la ligne, en détail/)
  })

  it('states one rule for every bot, the engine trials on top (author, 2026-09-19)', () => {
    // The intro said the list was the rule of the hand-deployed bots while two
    // of its four points spoke of « mon moteur ». The author's answer: the
    // same rule for all.
    expect(page()).toMatch(/Tout ce que je déploie suit la règle ci-dessous/)
    expect(page()).not.toMatch(/déployés à la main suivent la règle/)
    const liste = page().split('<ul')[1].split('</ul>')[0]
    expect(liste).not.toMatch(/dans mon moteur|du moteur/)
    expect(liste).toMatch(/pire trimestre/)
  })
})
