// tests/lib/engine-method-copy.test.ts
//
// Chantier C0 (audit 2026-09-10): the public site described the engine's method in
// sentences the engine's own code contradicts (backtests_massive, read 2026-09-11).
//
// Each retired sentence is a CLASS rule over src/: a copy/paste cannot bring it back on
// a page nobody re-reads. Each has a positive counterpart on the surface that now carries
// the exact wording, so the negative half cannot pass on an empty or unreadable tree.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { gauntletFunnel, GAUNTLET_TRIALS, GAUNTLET_VERDICTS } from '@/lib/gauntlet-explainer'
import { provenanceSentence } from '@/lib/provenance'
import { getBotExpectations } from '@/lib/bot-expectations'
import { GLOSSARY } from '@/lib/glossary'
import { mkBot } from '../fixtures/bots'

const ROOT = path.resolve(__dirname, '../..')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(full)
  }
  return out
}

// JSX writes an apostrophe as &apos;, &#39; or ’, a JS literal as \'. Whitespace runs
// are collapsed because JSX re-wraps prose. A guard must not pass on either difference.
const norm = (s: string) => s.replace(/&apos;|&#39;|’|\\'/g, "'").replace(/\s+/g, ' ')
const FILES = walk(path.join(ROOT, 'src')).map(f => ({
  rel: path.relative(ROOT, f).replace(/\\/g, '/'),
  text: norm(fs.readFileSync(f, 'utf8')),
}))
const filesContaining = (motif: string) => FILES.filter(f => f.text.includes(norm(motif))).map(f => f.rel)
const fileText = (rel: string) => FILES.find(f => f.rel === rel)!.text

const RETIRED: readonly [why: string, motif: string][] = [
  ['the search tries every variant (it is exhaustive only up to three filters)', 'tester toutes ses variantes'],
  ['the tamis runs no costly computation (it runs a backtest)', 'sans lancer le moindre calcul co'],
  ['ranked by the 12-month PF (trade count, then PF, since 2026-08-31)', 'je classe par profit factor sur les douze derniers mois'],
  ['a trial named after unseen data', 'Tenir sur du jamais'],
  ['the walk-forward tests on unseen slices (worst in-sample quarter)', "puis je la teste sur celles qu'elle n'a jamais vues"],
  ['the walk-forward kills the most (no report field supports it)', 'qui en tue le plus'],
  ['thousands of reshuffles (up to ~100 shifts, one probe market)', 'Je rebats les cartes des milliers de fois'],
  ['the best asset is removed and re-run (no recomputation)', "Je retire l'actif qui a port"],
  ['en sursis = passed narrowly (exactly one robustness trial failed)', 'quand elle passe de justesse'],
  ['/preuve: failing the walk-forward means rejection on unseen periods', "jamais vues. Sinon, c'est de l'"],
  ['/preuve: spread in the modelled costs', '(frais, slippage, spread)'],
  ['bot provenance: an engine verdict called validated', 'Validé le'],
  ['funnel counter: whole-fleet counts presented as gauntlet promotions', 'Promues en bot'],
  ['funding-rev card: an out-of-sample figure the vault does not establish', 'walk-forward OOS'],
]

describe('retired engine-method sentences are gone from src/', () => {
  it('reads the tree (non-vacuous)', () => {
    expect(FILES.length).toBeGreaterThan(50)
    expect(FILES.some(f => f.rel === 'src/lib/gauntlet-explainer.ts')).toBe(true)
  })

  for (const [why, motif] of RETIRED) {
    it(`« ${motif} » is absent: ${why}`, () => {
      expect(filesContaining(motif)).toEqual([])
    })
  }
})

describe('the exact wording is where the old sentence was', () => {
  const funnel = norm(gauntletFunnel(null).join(' '))
  const trials = GAUNTLET_TRIALS.map(t => ({ name: norm(t.name), plain: norm(t.plain) }))
  const verdicts = norm(GAUNTLET_VERDICTS.join(' '))

  it('the search is bounded: exhaustive up to three filters, greedy beyond', () => {
    expect(funnel).toMatch(/Jusqu'à trois filtres d'entrée, j'essaie toutes les combinaisons/)
    expect(funnel).toMatch(/gloutonne/)
  })

  it('the tamis counts entries before any backtest, then a backtest drops PF under 1,30 or under 30 trades', () => {
    expect(funnel).toMatch(/Avant tout backtest, il compte les entrées/)
    expect(funnel).toMatch(/PF est sous 1,30/)
    expect(funnel).toMatch(/moins de 30 trades/)
  })

  it('the judging order is trade count, then PF', () => {
    expect(funnel).toMatch(/je classe d'abord par nombre de trades, du plus grand au plus petit, puis par PF/)
  })

  it('the walk-forward trial says it is the worst quarter of the selection history, and not out-of-sample', () => {
    const wf = trials[0]
    expect(wf.plain).toMatch(/trimestres civils/)
    expect(wf.plain).toMatch(/au moins 20 trades/)
    expect(wf.plain).toMatch(/moins de trois, je prends le PF de tout l'historique/)
    expect(wf.plain).toMatch(/Ce n'est pas un test hors échantillon/)
    expect(wf.plain).toMatch(/l'historique qui a servi à choisir la configuration/)
  })

  it('the null trial says shifts, one probe market, and when it is skipped', () => {
    const nul = trials[1].plain
    expect(nul).toMatch(/décale ses signaux d'entrée dans le temps, jusqu'à une centaine de fois/)
    expect(nul).toMatch(/un seul marché témoin/)
    expect(nul).toMatch(/je saute celle-ci/)
  })

  it('the leave-out trial says there is no recomputation, only one more market required', () => {
    const loo = trials[2].plain
    expect(loo).toMatch(/je ne relance aucun calcul/)
    expect(loo).toMatch(/six au lieu de cinq/)
  })

  it('en sursis = exactly one robustness trial failed, and it stays published', () => {
    expect(verdicts).toMatch(/rate une seule des trois premières épreuves/)
    expect(verdicts).toMatch(/reste publiée parmi les survivantes/)
  })

  it('/preuve: the walk-forward is not out-of-sample and failing it alone is « en sursis »', () => {
    const preuve = fileText('src/app/preuve/page.tsx')
    expect(preuve).toMatch(/dans mon moteur, ce n'est pas un test hors échantillon/)
    expect(preuve).toMatch(/pire trimestre de l'historique qui a servi à choisir la stratégie/)
    expect(preuve).toMatch(/mise en sursis si c'est la seule épreuve qu'elle rate/)
  })

  it('/preuve: costs name a flat unsigned funding and say the spread is not modelled', () => {
    const preuve = fileText('src/app/preuve/page.tsx')
    expect(preuve).toMatch(/frais et slippage fixes, plus un funding forfaitaire de 0,03 % par jour/)
    expect(preuve).toMatch(/quel que soit le sens de la position/)
    expect(preuve).toMatch(/Le spread n'est pas modélisé/)
    expect(preuve).not.toMatch(/Coûts réalistes/)
  })

  it('provenance: an engine-born bot is « retenu par le moteur », never validated', () => {
    const s = provenanceSentence(mkBot({
      origin: 'engine', found_at: '2026-07-12T00:00:00Z', validated_at: '2026-07-15T00:00:00Z',
    }))
    expect(s).toContain('Retenu par le moteur le 15/07/2026.')
    expect(s).not.toMatch(/valid/i)
  })

  it('funding-rev card: no out-of-sample claim, still labelled as a backtest', () => {
    const source = getBotExpectations('funding-rev-long')!.source
    expect(source).toMatch(/backtest 2022-2026/)
    expect(source).not.toMatch(/\bOOS\b|hors[- ]échantillon|out-of-sample/i)
  })

  it('glossary: the general walk-forward definition is not attributed to the engine', () => {
    const wfTerms = GLOSSARY.filter(t => /walk-forward/i.test(t.term + t.definition))
    expect(wfTerms.length).toBeGreaterThan(0)
    for (const t of wfTerms) expect(t.definition, t.id).not.toMatch(/moteur|gantelet/i)
  })
})
