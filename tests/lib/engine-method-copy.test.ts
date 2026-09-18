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
  // 2026-09-12 round (Fable review + the measured screening leak):
  ['bot fiche: a measured value printed next to its classified bar', 'pour une barre à'],
  ['the gauntlet demands all four trials, contradicting « en sursis reste publiée »', 'Il faut tenir les quatre'],
  ['the null control described as random entries (a circular shift is not random)', 'qui entrent au hasard'],
  ['the worst-quarter trial carrying a second, repeated reservation', 'L’épreuve dit si elle'],
  ['the macro-blackout replay understated as a slightly worse drawdown', 'drawdown pire'],
  // 2026-09-18: the dated re-judge notice, removed on the owner's decision once the
  // corrected D1 tour was published (EngineRejudgeNotice deleted with its three mounts).
  ['the 2026-09-10 audit notice', 'un audit a trouvé trois défauts'],
  ['the engine figures called provisional until re-judged', "d'ici là ils restent provisoires"],
  ['the notice component itself', 'EngineRejudgeNotice'],
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

// The judge's gate thresholds are CLASSIFIED and never published (algolab DECISIONS
// 2026-07-28 « seuils classés JAMAIS »; migration 024 « Thresholds are classified too »).
// They must never reach rendered text or a client prop. Comments may cite them, so comments
// are blanked before matching. The patterns target the prose forms engine copy takes; the
// per-bot pre-registered kill criteria in bot-expectations.ts (« PF net < 1.30 → mort du
// bot ») are a separate published contract written with symbols, and do not match.
const CLASSIFIED: readonly [name: string, re: RegExp][] = [
  ['PF floor in prose', /PF (?:net )?(?:est )?(?:sous|inférieur à|en dessous de)\s*\d/i],
  ['trade-count floor', /(?:moins de|au moins|minimum de)\s*\d+\s*trades/i],
  ['window-count floor', /il y en a moins de (?:\d+|deux|trois|quatre|cinq)\b/i],
  ['qualified-market count', /\b(?:\d+|trois|quatre|cinq|six|sept) au lieu de (?:\d+|trois|quatre|cinq|six|sept)\b/i],
]
// The Labo's NUMERIC list, on top of the prose forms: the judge's values themselves
// (wf bar 1,15 / PF floor 1,30 / trade floors 30 and 20 / three windows / five-or-six
// markets / null bar 95), plus the phrasing that leaked them on a bot fiche (« barre à »).
//
// Two tiers, because the same digits are legitimately public elsewhere:
//
// TIER A runs over ALL of src/. These forms appear nowhere else: the wf bar value, the
// « barre à » phrasing, a bare 95 in prose (not « 95 % », not « bg-bg/95 »), and the PF
// floor. ALLOWED_PF_FLOOR below is the one exemption, and it is the user's call: the
// per-bot pre-registered death criteria in bot-expectations.ts (« PF ≥ 1.30, DD ≤ 20 % »,
// « PF net < 1.30 → mort du bot ») are a deliberate public commitment about a BOT, not the
// engine judge's gate. That is why the /overview and /lexique profit-factor example moved
// from 1,3 to 1,5 rather than widening this list.
//
// TIER B runs over the ENGINE SURFACES only: the trade floors, the DD limit and the window
// and market counts collide with numbers the site publishes on purpose (« <20 trades » on a
// low-sample badge, the public 2-year/20-trade rule on /preuve, the per-bot envelopes). A
// global rule there would be noise, and noise is how a guard stops being read.
const NUMERIC_GLOBAL: readonly [name: string, re: RegExp][] = [
  ['wf bar value', /\b1[,.]15\b/],
  ['bar phrasing', /barre à/i],
  ['null bar 95', /(?<![\w/.])95(?![\w%])/],
  ['PF floor value', /\b1[,.]30?\b/],
]
// The two exemptions, and they are the user's call: both publish a PF floor that is a
// deliberate commitment about a BOT, not the engine judge's gate.
//   bot-expectations.ts   per-bot pre-registered death criteria (« PF ≥ 1.30, DD ≤ 20 % »)
//   path-to-real.ts       DEFAULT_LIVE_GATE.minPf, the paper->real gate PathToRealCard
//                         prints on a fiche, so a reader can hold me to it
const ALLOWED_PF_FLOOR = ['src/lib/bot-expectations.ts', 'src/lib/path-to-real.ts']
const NUMERIC_ENGINE: readonly [name: string, re: RegExp][] = [
  ['trade floor value', /\b(?:20|30)\s*trades\b/i],
  ['DD limit value', /\b20\s*%/],
  ['window count', /\b(?:trois|3)\s*trimestres\b/i],
  ['market count', /\b(?:cinq|six|5|6)\s*march/i],
]
// Every surface that describes the judge or renders its payload.
const ENGINE_SURFACES = [
  'src/lib/gauntlet-explainer.ts',
  'src/lib/screening.ts',
  'src/lib/provenance.ts',
  'src/components/GauntletExplainer.tsx',
  'src/components/FunnelCounter.tsx',
  'src/components/BotProvenance.tsx',
]

const blankComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, '')
const classifiedHits = (text: string) => CLASSIFIED.filter(([, re]) => re.test(norm(text))).map(([name]) => name)
const hitsFor = (patterns: readonly [string, RegExp][], text: string) =>
  patterns.filter(([, re]) => re.test(norm(text))).map(([name]) => name)

describe('no classified gate threshold reaches rendered copy', () => {
  it('positive control: the detector catches each threshold sentence retired on 2026-09-11', () => {
    const FIXTURE = [
      'Les autres passent un premier backtest, et j’écarte celles dont le PF est sous 1,30 ou qui font moins de 30 trades.',
      'parmi ceux qui comptent au moins 20 trades. S’il y en a moins de trois, je prends le PF de tout l’historique à la place.',
      'La règle revient à exiger un marché qualifié de plus que l’épreuve suivante, six au lieu de cinq, pour que le retrait…',
    ].join(' ')
    expect(classifiedHits(FIXTURE)).toEqual(
      ['PF floor in prose', 'trade-count floor', 'window-count floor', 'qualified-market count'],
    )
  })

  it('positive control: the numeric list catches the values, prose or not', () => {
    expect(hitsFor(NUMERIC_GLOBAL, 'le walk-forward doit rendre 1,15')).toEqual(['wf bar value'])
    expect(hitsFor(NUMERIC_GLOBAL, '95,16 pour une barre à 95')).toEqual(
      ['bar phrasing', 'null bar 95'],
    )
    expect(hitsFor(NUMERIC_GLOBAL, 'un plancher de PF à 1,30')).toEqual(['PF floor value'])
    expect(hitsFor(NUMERIC_ENGINE, 'il faut 30 trades, un drawdown sous 20 %, trois trimestres et six marchés'))
      .toEqual(['trade floor value', 'DD limit value', 'window count', 'market count'])
  })

  it('negative control: UI numbers and non-gate figures pass', () => {
    // « bg-bg/95 » and « 95% » are CSS, « 0,03 % » a cost, « une centaine » a run count.
    expect(hitsFor(NUMERIC_GLOBAL, 'bg-bg/95 backdrop-blur, stopOpacity 95%')).toEqual([])
    expect(hitsFor(NUMERIC_GLOBAL, 'un funding forfaitaire de 0,03 % par jour, jusqu’à une centaine de fois')).toEqual([])
    expect(hitsFor(NUMERIC_GLOBAL, 'PF 1,41 sur 25 actifs, PF 1,35')).toEqual([])
  })

  it('no rendered string under src/ carries a value from the global list', () => {
    const files = walk(path.join(ROOT, 'src'))
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.flatMap(f => {
      const rel = path.relative(ROOT, f).replace(/\\/g, '/')
      return hitsFor(NUMERIC_GLOBAL, blankComments(fs.readFileSync(f, 'utf8')))
        .filter(name => !(name === 'PF floor value' && ALLOWED_PF_FLOOR.includes(rel)))
        .map(name => `${rel}: ${name}`)
    })
    expect(offenders).toEqual([])
  })

  it('each exemption is live, not dead: it still carries the commitment it was granted for', () => {
    // An exemption that stops matching is a stale exemption, and stale is how an allowlist
    // quietly becomes a hole. Every entry must still trip the pattern it excuses.
    for (const rel of ALLOWED_PF_FLOOR) {
      const code = blankComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
      expect(hitsFor(NUMERIC_GLOBAL, code), `${rel} no longer needs its exemption`)
        .toContain('PF floor value')
    }
    // and each one is the commitment named in the comment above, not some other 1,30
    expect(fileText('src/lib/bot-expectations.ts')).toMatch(/PF ≥ 1\.30/)
    expect(fileText('src/lib/path-to-real.ts')).toMatch(/DEFAULT_LIVE_GATE[^=]*=\s*\{ minPf: 1\.3/)
  })

  it('no engine surface carries a value from the scoped list', () => {
    const offenders = ENGINE_SURFACES.flatMap(rel => {
      const full = path.join(ROOT, rel)
      expect(fs.existsSync(full), `${rel} must exist`).toBe(true)
      return hitsFor(NUMERIC_ENGINE, blankComments(fs.readFileSync(full, 'utf8'))).map(n => `${rel}: ${n}`)
    })
    expect(offenders).toEqual([])
  })

  it('negative control: numbers that are not gate thresholds pass', () => {
    expect(classifiedHits(
      'Jusqu’à trois filtres d’entrée, jusqu’à une centaine de fois, un funding forfaitaire de 0,03 % par jour.',
    )).toEqual([])
  })

  it('control: a threshold in a comment is ignored, the same threshold in a string is not', () => {
    const src = "// j'écarte celles dont le PF est sous 1,30\nconst s = 'ou qui font moins de 30 trades'"
    expect(classifiedHits(blankComments(src))).toEqual(['trade-count floor'])
  })

  it('no rendered string under src/ carries one (comments excluded)', () => {
    const files = walk(path.join(ROOT, 'src'))
    expect(files.length).toBeGreaterThan(50)
    const offenders = files.flatMap(f =>
      classifiedHits(blankComments(fs.readFileSync(f, 'utf8')))
        .map(name => `${path.relative(ROOT, f).replace(/\\/g, '/')}: ${name}`))
    expect(offenders).toEqual([])
  })

  it('the gauntlet copy handed to the client carries none, whatever the data', () => {
    const client = [
      ...gauntletFunnel(null),
      ...gauntletFunnel({ base: 'EMAcross', tf: 'D1', nParams: 66, nFilterConfigs: 17780, nExits: 31, nBehaviors: 2782865, nJudged: 20000 }),
      ...GAUNTLET_TRIALS.flatMap(t => [t.name, t.plain]),
      ...GAUNTLET_VERDICTS,
    ].join(' ')
    expect(classifiedHits(client)).toEqual([])
  })
})

describe('the exact wording is where the old sentence was', () => {
  const funnel = norm(gauntletFunnel(null).join(' '))
  const trials = GAUNTLET_TRIALS.map(t => ({ name: norm(t.name), plain: norm(t.plain) }))
  const verdicts = norm(GAUNTLET_VERDICTS.join(' '))

  it('the search is bounded: exhaustive up to three filters, greedy beyond', () => {
    expect(funnel).toMatch(/Jusqu'à trois filtres d'entrée, j'essaie toutes les combinaisons/)
    expect(funnel).toMatch(/gloutonne/)
  })

  it('the tamis counts entries before any backtest, then a backtest drops weak PF and thin trade counts, naming no threshold', () => {
    expect(funnel).toMatch(/Avant tout backtest, il compte les entrées/)
    expect(funnel).toMatch(/celles dont le PF est trop faible/)
    expect(funnel).toMatch(/qui ont trop peu de trades/)
  })

  it('the judging order is trade count, then PF', () => {
    expect(funnel).toMatch(/je classe d'abord par nombre de trades, du plus grand au plus petit, puis par PF/)
  })

  it('the walk-forward trial says it is the worst quarter of the selection history, and not out-of-sample', () => {
    const wf = trials[0]
    expect(wf.plain).toMatch(/trimestres civils/)
    expect(wf.plain).toMatch(/parmi ceux qui comptent assez de trades/)
    expect(wf.plain).toMatch(/S'il y en a trop peu, je prends le PF de tout l'historique/)
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
    expect(loo).toMatch(/exiger un marché qualifié de plus que l'épreuve suivante, pour que le retrait de n'importe lequel en laisse encore assez/)
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
