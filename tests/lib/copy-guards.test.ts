// tests/lib/copy-guards.test.ts
//
// Pre-launch audit 2026-09-09: the site described the same paid offer three
// different ways (« quatre parties », « sélection du jour », « deux
// paragraphes »), while the code sells exactly two fields (`lecture`,
// `risques`, see src/app/api/investir/[slug]/recit/route.ts). These guards
// sweep src/ and content/ for the phrases the audit retired, so a copy/paste
// cannot bring the old offer back on a page nobody re-reads.
//
// Each guard here is a CLASS rule over the whole tree, not a check on the one
// file the audit happened to name. The positive counterpart (the canonical
// sentence must exist somewhere) keeps the negative one from passing on an
// empty site.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const TEXT_EXT = new Set(['.ts', '.tsx', '.mdx', '.md'])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(full, out)
    } else if (TEXT_EXT.has(path.extname(entry.name)) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const FILES = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'content'))]
const read = (f: string) => fs.readFileSync(f, 'utf8')
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/')

/** Every swept file, read and whitespace-collapsed ONCE at module load. This
 *  used to happen inside `filesMatching`, so each of the ~25 guards below
 *  re-read and re-collapsed the whole of src/ and content/ — the file took
 *  over 5 s on a cold machine and tripped vitest's default per-test timeout. */
const TEXTS = FILES.map(f => ({ rel: rel(f), text: read(f).replace(/\s+/g, ' ') }))

/** Files whose text matches `re`, as repo-relative paths. JSX wraps prose
 *  across indented lines, so whitespace runs are collapsed before matching:
 *  a sentence must be found whatever the line breaks, and a guard must not
 *  pass because a phrase was merely re-wrapped. */
function filesMatching(re: RegExp): string[] {
  // A /g regex keeps `lastIndex` between `.test()` calls, so reusing one over
  // a list of files silently skips matches. Nothing here needs /g, and a
  // shared TEXTS array makes the state harder to notice than it already was.
  if (re.global) throw new Error(`filesMatching: pattern must not carry the /g flag: ${re}`)
  return TEXTS.filter(t => re.test(t.text)).map(t => t.rel)
}

// JSX writes an apostrophe as &apos; or ’ as often as ', and a JS string
// literal escapes it as \'. Every phrase below is matched with the apostrophe
// class so a guard cannot pass on an encoding difference it did not mean to
// test.
const APOS = "(?:\\\\'|'|’|&apos;)"

describe('the paid Investir offer has one description', () => {
  const CANON = new RegExp(
    `deux paragraphes d${APOS}analyse par société : ce que ses chiffres veulent dire pour son métier, et ce qui peut mal tourner`,
  )

  it('« quatre parties » is gone from src/ and content/', () => {
    expect(filesMatching(/quatre parties/i)).toEqual([])
  })

  it('« sélection du jour » is gone from src/ and content/', () => {
    expect(filesMatching(/s[ée]lection du jour/i)).toEqual([])
  })

  // 2026-09-11 review (P3): the FAQ and /a-propos still sold « le raisonnement
  // complet » of each analysis, a third version of an offer that is two
  // paragraphs.
  it('« raisonnement complet » is gone from src/ and content/, and both pages say two paragraphs', () => {
    expect(filesMatching(/raisonnement complet/i)).toEqual([])
    const TWO = new RegExp(`deux paragraphes d${APOS}analyse par société`)
    expect(filesMatching(TWO)).toEqual(expect.arrayContaining([
      'src/app/faq/page.tsx',
      'src/app/a-propos/page.tsx',
    ]))
  })

  // 2026-09-11 review (P4): the free part was told four ways (« le verdict,
  // sa raison courte et les comptes », « le verdict et la raison qui va avec »,
  // « le verdict de chacune de mes analyses »…). One wording, shared with the
  // lab, and scoped: it only holds on the companies the rule grades.
  //
  // 2026-09-19 (D058): the grade and the verdict left the Investir fiches on
  // 2026-09-15, and this sentence kept promising them on /faq, /preuve,
  // /a-propos, RecitInvestir and the lab's terms. It now names what a fiche
  // shows, in plain French; the lab pins the same words.
  it('the free part has one wording, scoped to the companies whose accounts I read, on every surface that names it', () => {
    const FREE = /les sept contrôles et leurs alertes, les chiffres et le rapport annuel/i
    const SCOPE = /sur les sociétés dont je lis les comptes/i
    const SURFACES = ['src/app/faq/page.tsx', 'src/app/preuve/page.tsx', 'src/app/a-propos/page.tsx']
    expect(filesMatching(FREE)).toEqual(expect.arrayContaining([...SURFACES, 'src/components/RecitInvestir.tsx']))
    expect(filesMatching(SCOPE)).toEqual(expect.arrayContaining(SURFACES))
    // The retired enumeration, in any of its forms, is gone everywhere.
    expect(filesMatching(/verdict(?:,| et)\s+(?:sa|la)\s+raison/i)).toEqual([])
    expect(filesMatching(/\bnote,\s+(?:le\s+)?verdict\b/i)).toEqual([])
  })

  it('the canonical sentence is on every surface that sells the offer', () => {
    const where = filesMatching(CANON)
    expect(where).toEqual(expect.arrayContaining([
      'src/app/preuve/page.tsx',
      'src/app/faq/page.tsx',
      'src/components/RecitInvestir.tsx',
    ]))
  })
})

// Audit §2.4 / production evidence §10: « Binance a cessé de servir la France »
// was written as a definitive past on four surfaces, with no source and no
// date of reading, three weeks before the AMF rules on Binance's new MiCA
// filing (due before 1 October 2026). The fact is true today; it is written
// as if it could not stop being true. Every surface that states it must now
// carry the day it happened, the date at which it was still true, the
// 1 October appointment — and only the sources the production evidence
// actually found (no invented URL).
describe('the Binance claim is dated and sourced', () => {
  const CLAIM = /Binance (a|ait) cessé de servir|Binance ne sert (plus|toujours pas)|Ton bot Binance est mort/i
  const ALLOWED_SOURCES = [
    'https://www.cointribune.com/deux-mois-apres-mica-binance-vise-un-retour-en-france-via-lamf/',
    'https://www.moneyvox.fr/placement/actualites/109356/binance-suspend-ses-activites-en-france-les-consequences-pour-vos-crypto-ici-le-1er-juillet-2026',
    'https://www.francecryptos.fr/articles/binance-suspend-ses-services-en-france-le-1er-juillet-2026-ce-que-doivent-faire--756231',
    'https://cryptoast.fr/binance-quitte-france-cryptos/',
  ]
  const SURFACES = [
    'src/app/page.tsx',
    'src/app/start/page.tsx',
    'src/app/mica/page.tsx',
    'content/blog/2026-07-10-ton-bot-binance-est-mort-le-1er-juillet.mdx',
  ]

  it('the four audited surfaces still state the claim (else the rest is vacuous)', () => {
    expect(filesMatching(CLAIM)).toEqual(expect.arrayContaining(SURFACES))
  })

  it('every surface stating it carries the day, the date of reading and the 1 October appointment', () => {
    for (const f of filesMatching(CLAIM)) {
      const text = read(path.join(ROOT, f)).replace(/\s+/g, ' ')
      expect(text, `${f}: day of the cut`).toMatch(/1er juillet 2026/)
      expect(text, `${f}: date at which it was still true`).toMatch(/10 septembre 2026/)
      expect(text, `${f}: AMF appointment`).toMatch(/1er octobre( 2026)?/)
      // The sources say Binance AIMS for a return through a new filing; a
      // surface must not say the filing has been made (lab-side review).
      expect(text, `${f}: overstated filing`).not.toMatch(/a (re)?déposé/i)
      expect(text, `${f}: the lab's wording`).toMatch(/vise un retour par un nouveau dépôt/)
    }
  })

  it('only the sources the production evidence found are cited', () => {
    for (const f of SURFACES) {
      const urls = [...read(path.join(ROOT, f)).matchAll(/https?:\/\/[^\s"')\]]+/g)].map(m => m[0])
      const press = urls.filter(u => /cointribune|moneyvox|francecryptos|cryptoast|binance/i.test(u))
      for (const u of press) expect(ALLOWED_SOURCES, `${f}: ${u}`).toContain(u)
    }
    // and at least one of them is cited somewhere, or the guard above checks nothing
    const cited = SURFACES.flatMap(f => ALLOWED_SOURCES.filter(u => read(path.join(ROOT, f)).includes(u)))
    expect(cited.length).toBeGreaterThan(0)
  })
})

// Audit §2.1: « aucune ne reste profitable » on the home and « Profitables
// sur 2 ans : 0 » in the article, while the article's own table gives the
// Ichimoku a PF of 1,02 and its prose « ces dix euros … cinq trades ». The
// claim now carried is the one the table supports: nine lose, the tenth
// makes ten euros on five trades.
describe('the ten-AI-strategies claim matches the article\'s own table', () => {
  const ARTICLE = 'content/blog/2026-07-11-10-strategies-ia-au-bulletin.mdx'
  const article = () => read(path.join(ROOT, ARTICLE))

  it('the table still says what the claim rests on (PF 1.02, five trades)', () => {
    expect(article()).toMatch(/Ichimoku[^\n]*\| 1\.02 \|[^\n]*5 meilleurs trades/)
  })

  it('no surface says « aucune ne reste profitable » or counts zero profitable', () => {
    expect(filesMatching(/aucune ne reste profitable/i)).toEqual([])
    expect(article()).not.toMatch(/label="Profitables sur 2 ans" value="0"/)
    expect(article()).not.toMatch(/z[ée]ro profitable/i)
  })

  it('the home and the article carry the nine-lose / ten-euros / five-trades claim', () => {
    const CLAIM = /neuf perdent[^.]*dixième gagne dix euros[^.]*cinq trades/i
    expect(filesMatching(CLAIM)).toEqual(expect.arrayContaining(['src/app/page.tsx']))
    expect(article()).toMatch(/dix euros[^.]*cinq trades/)
  })
})

// Audit 2026-09-09 (P3): /investir closed on a link to /wealth, which
// redirects to /investir in 308 (a link back to the page itself), and
// /a-propos described Investir as « DCA crypto, ETF, actions », a page that
// no longer exists. Investir is company accounts graded by a rule the reader
// can redo, and the description must not carry a hand-typed company count.
describe('Investir is described as the page it is', () => {
  it('/investir carries no link to /wealth, which only redirects back to it', () => {
    const page = read(path.join(ROOT, 'src/app/investir/page.tsx'))
    expect(page).toMatch(/Mon travail d’analyse, publié en transparence/) // the paragraph is still there
    expect(page).not.toMatch(/href="\/wealth"/)
  })

  // 2026-09-11 review (P8): the home Investir card and both /compte links
  // (the magic-link return and the member link) still went to /wealth, which
  // next.config.ts redirects to /investir. next.config.ts is outside src/ and
  // keeps its redirects. Four components still build /wealth/<ticker> links,
  // but no page mounts them (only their own tests import them): they are
  // named here, and mounting one again fails this test before a visitor
  // follows the link.
  it('no link, redirectTo or next in src/ sends a reader to /wealth', () => {
    const LINK = /(?:href|redirectTo|next)\s*[=:]\s*\{?\s*["'`]\/wealth/
    const NEXT_PARAM = /[?&]next=(?:\/|%2F)wealth/i
    const UNMOUNTED = [
      'src/components/AnalysesClient.tsx',
      'src/components/LatestAnalyses.tsx',
      'src/components/SignalTable.tsx',
      'src/components/TopPicks.tsx',
    ]
    const srcFiles = FILES.filter(f => rel(f).startsWith('src/'))
    const hits = srcFiles
      .filter(f => { const t = read(f).replace(/\s+/g, ' '); return LINK.test(t) || NEXT_PARAM.test(t) })
      .map(rel)
      .sort()
    // exactly the unmounted four: proves the pattern fires, and that no
    // mounted file joined them
    expect(hits).toEqual([...UNMOUNTED].sort())
    for (const dead of UNMOUNTED) {
      const name = path.basename(dead, '.tsx')
      const importers = srcFiles
        .filter(f => rel(f) !== dead && new RegExp(`from ['"](?:@/components/|\\./)${name}['"]`).test(read(f)))
        .map(rel)
      expect(importers, `${name} is mounted again`).toEqual([])
    }
  })

  // 2026-09-20: the home stopped routing through a four-card grid. Investir is
  // now one of the two entries directly under the headline, with its own copy,
  // so the old assertion (home and /a-propos carry the SAME description) is
  // obsolete by decision, not by drift. What must still hold whatever the
  // markup: the entry exists, it opens both the list and the method, and it
  // promises seven checks rather than the grade D058 retired. The structural
  // side is checked at render in tests/app/home-two-entries.test.tsx.
  it('the home companies entry opens /investir and its method, promising no grade', () => {
    const home = read(path.join(ROOT, 'src/app/page.tsx')).replace(/\s+/g, ' ')
    expect(home, 'the companies entry').toMatch(/data-testid="entry-companies"/)
    expect(home, 'the company list').toMatch(/href="\/investir"/)
    expect(home, 'the seven checks').toMatch(/href="\/investir#methode"/)
    expect(home).toMatch(/sept contrôles/)
    expect(home).toMatch(/Pas de note, pas de verdict/)
  })

  it('no surface describes Investir as a DCA on crypto, ETFs and shares', () => {
    expect(filesMatching(/accumulation long terme \(DCA\)/i)).toEqual([])
  })

  it('/a-propos opens /investir and describes graded accounts, with no number typed by hand', () => {
    const page = read(path.join(ROOT, 'src/app/a-propos/page.tsx')).replace(/\s+/g, ' ')
    const card = page.match(/\{ href: '([^']*)', title: 'Investir', desc: '([^']*)' \}/)
    expect(card, 'the Investir card').toBeTruthy()
    expect(card![1]).toBe('/investir')
    expect(card![2]).toMatch(/comptes de sociétés cotées, lus par sept contrôles que tu peux refaire/)
    expect(card![2]).not.toMatch(/\d/)
  })
})

// Audit 2026-09-09 §2.4: the disclosure block under every company fiche told
// the reader that the « prix de référence affiché plus haut » was the one of
// the instant the analysis was finished. D048 removed the frozen price; the
// only quote left is the live TradingView widget, and not on every fiche. A
// sentence pointing at a price the page does not show must not come back.
describe('no surface points at a reference price the fiche does not show', () => {
  it('« prix de référence affiché » is gone from src/ and content/', () => {
    expect(filesMatching(/prix de r[ée]f[ée]rence affich/i)).toEqual([])
  })

  it('the disclosure block still says who wrote it and when', () => {
    const block = read(path.join(ROOT, 'src/components/EquityDisclosure.tsx')).replace(/\s+/g, ' ')
    expect(block).toMatch(/Thomas Dessombs, à titre individuel/)
    // 2026-09-11 review (P6): the value passed in is `as_of`, a date with no
    // time, and longDateTime printed it « à 02:00, heure de Paris ». A day only.
    // « Version du », not « Calcul du »: the line above the block already says
    // « Calcul du » on a graded fiche, and an out-of-scope fiche is no calculation.
    expect(block).toMatch(/Version du \{longDate\(generatedAt\)\}\./)
    expect(block).not.toMatch(/longDateTime/)
    expect(block).not.toMatch(/heure de Paris/)
    // No fiche prints a market price any more (D048).
    expect(filesMatching(/chiffres de march[ée] viennent des donn/i)).toEqual([])
  })

  // 2026-09-11, the author's own rewrite of the holdings sentence. « Je peux
  // détenir les titres dont je parle » let « les » cover every company the rule
  // grades; he holds some of them, and chiefly the ones he follows.
  it('the disclosure scopes the holdings sentence to the watchlist (author\'s wording, 2026-09-11)', () => {
    expect(filesMatching(/Je peux détenir les titres dont je parle/)).toEqual([])
    expect(filesMatching(/c(?:\\'|'|’|&apos;)est même en général la raison pour laquelle je les suis/)).toEqual([])
    const block = read(path.join(ROOT, 'src/components/EquityDisclosure.tsx')).replace(/\s+/g, ' ')
    // « notés » became « cités » on 2026-09-19 (D058), approved by the author:
    // the fiches no longer grade anything.
    expect(block).toMatch(
      /Je peux détenir certains des titres cités ici, en particulier ceux de ma liste de suivi\./,
    )
  })

  it('the disclosure says the watchlist is a small part of what I grade (author\'s wording, 2026-09-11)', () => {
    expect(filesMatching(/ma propre liste de suivi long terme et sur mes versements mensuels/)).toEqual([])
    const block = read(path.join(ROOT, 'src/components/EquityDisclosure.tsx')).replace(/\s+/g, ' ')
    expect(block).toMatch(new RegExp(
      `Je lis les comptes de bien plus de sociétés que je n${APOS}en suis pour moi : ma liste de suivi long terme n${APOS}en est qu${APOS}une petite partie\\.`,
    ))
  })
})

// Audit 2026-09-09 (P3), small copy. Each rule was checked in the code before
// the copy was changed.
describe('small copy says what the site does', () => {
  // « simulation fidèle » promised a conformity the vault had already caught
  // failing (site trades != Telegram). What is checkable: the paper bots trade
  // real market data and debit fees and slippage (armada exits.py nets both;
  // a hand-deployed bot's config.py carries taker_fee and slippage_pct).
  it('« simulation fidèle » is gone, and the three surfaces say what the simulation includes', () => {
    expect(filesMatching(/simulation fid[eè]le/i)).toEqual([])
    expect(filesMatching(/simulation sur données réelles, frais et slippage compris/)).toEqual(
      expect.arrayContaining(['src/app/a-propos/page.tsx', 'src/app/faq/page.tsx', 'src/app/overview/page.tsx']),
    )
  })

  // « Ce système garantit que les gains sont partiellement sécurisés dès le
  // TP1 »: a gap through TP1 secures nothing. A negation (« ne garantit pas
  // que ») is fine; an affirmative guarantee about a trading outcome is not.
  it('no surface guarantees a trading outcome', () => {
    expect(filesMatching(/(?<!ne )garantit que/i)).toEqual([])
  })

  // The 27 May article states a present that stopped being true: the only
  // real-money bot, on Binance Spot, next to 37 others. History is not
  // rewritten; a dated note at the head says what changed.
  it('the 27 May EMA article opens on a dated update note while it keeps its old claims', () => {
    const text = read(path.join(ROOT, 'content/blog/2026-05-27-ema-cross-h4-spot.mdx'))
    expect(text).toMatch(/le seul en live sur Binance Spot|Les 37 autres/) // else there is nothing to date
    const body = text.split(/^---\r?$/m)[2] ?? ''
    expect(body.trimStart().startsWith('<Callout type="info" title="Mise à jour du 11 septembre 2026">')).toBe(true)
    expect(body).toMatch(/migré sur Kraken le 30 juin 2026/)
    expect(body).toMatch(/retirées le 23 juillet 2026/)
    // 2026-09-11 review (P9). The note's grammar, the Hard-Gate the body still
    // calls « en shadow » (layers 1-2 decommissioned 15/06/2026 per
    // decision-stack.md; layer 3 never in v1-spot's code per D-APX-L3-8), and a
    // summary whose figures are those of 27 May.
    expect(body).not.toMatch(/les 37 autres bots en simulation sont/)
    expect(body).toMatch(/la flotte en simulation compte aujourd'hui bien plus que ces 37 bots/)
    // « en shadow » est le mot-machine que f0416fc a retiré de la prose
    // publiée ; le garde le cherchait encore et tombait sur main depuis. Ce
    // qu'il doit épingler est la CORRECTION, pas son vocabulaire : le corps de
    // l'article étiquette toujours le Hard-Gate « (en shadow) » plus bas, et
    // le callout doit dire qu'il n'est plus là, avec ses deux dates.
    expect(body).toMatch(
      /Le Hard-Gate présenté plus bas n'est plus en place : ses deux premières couches ont été retirées le 15 juin 2026, et la troisième n'a jamais tourné sur ce bot\./,
    )
    const front = text.split(/^---\r?$/m)[1] ?? ''
    expect(front).toMatch(/10 trades, PF 3\.71, \+52 USDC \(chiffres du 27 mai\)/)
  })

  // /start promised that the page « changera le jour même » the AMF rules on
  // Binance: a promise of a same-day edit nobody can guarantee.
  it('/start does not promise a same-day edit on the AMF decision', () => {
    expect(filesMatching(/changera le jour même/)).toEqual([])
    const start = read(path.join(ROOT, 'src/app/start/page.tsx')).replace(/\s+/g, ' ')
    expect(start).toMatch(new RegExp(`Si l${APOS}AMF dit oui, je le noterai ici\\.`))
  })

  // /compte, free tier: the membership was said to give access « à cette
  // page », to a reader already on it. What it opens on this site is the two
  // paragraphs of each company fiche, told with the one sentence of the offer.
  it('/compte says what membership opens on this site, in the offer\'s own sentence', () => {
    expect(filesMatching(/donne aussi accès à cette page/)).toEqual([])
    const compte = read(path.join(ROOT, 'src/app/compte/page.tsx')).replace(/\s+/g, ' ')
    expect(compte).toMatch(new RegExp(
      `deux paragraphes d${APOS}analyse par société : ce que ses chiffres veulent dire pour son métier, et ce qui peut mal tourner`,
    ))
  })

  // FAQ: « Voir un bot trader ne permet de rien reproduire », unscoped, while
  // the three real-money bots publish their parameters on their fiche. True of
  // engine-born bots only, whose recipe is the paid part.
  it('« nothing to reproduce » is scoped to engine-born bots, and the real bots do publish', async () => {
    expect(filesMatching(/(?<!moteur, )voir un bot trader ne permet de rien reproduire/i)).toEqual([])
    expect(filesMatching(/Pour les bots sortis du moteur, voir un bot trader ne permet de rien reproduire/))
      .toEqual(['src/app/faq/page.tsx'])
    const { getBotParams } = await import('@/lib/bot-params')
    for (const slug of ['v1-spot', 'v1-hl', 'orb-bf25']) expect(getBotParams(slug), slug).toBeTruthy()
  })
})

// Le moteur a retiré la note (« Comptes solides » / « À surveiller » /
// « Fragile ») le 2026-09-14 : elle se trompait dans les deux sens — 38 des 220
// « solides » portant un bilan cachaient un signal de dette dur, et 50 des 189
// « fragiles » avaient de quoi financer plus de trois ans de pertes.
//
// Une RÈGLE sur tout l'arbre, pas un contrôle sur les trois fichiers que cette
// session a touchés : la prochaine instance sera écrite demain, sur une page
// que personne ne relit. Les surfaces /investir sont visées nommément parce que
// « fragile » et « solide » restent des mots français légitimes ailleurs.
describe('Investir states facts, and grades nothing', () => {
  const SURFACES = TEXTS.filter(t =>
    /^src\/(app\/investir|components\/Investir|lib\/investir)/.test(t.rel))

  it('sweeps a surface that really exists', () => {
    // Sans ce plancher, tous les gardes ci-dessous sont satisfaits à la
    // perfection par un motif de chemin qui ne matche rien.
    expect(SURFACES.length).toBeGreaterThan(2)
  })

  it('no Investir surface carries the three retired grades', () => {
    const grade = new RegExp(`Comptes solides|À surveiller|Je ne note pas`)
    expect(SURFACES.filter(t => grade.test(t.text)).map(t => t.rel)).toEqual([])
  })

  it('no Investir surface still says it GRADES the accounts', () => {
    // La RÈGLE, pas les trois phrases que j'avais sous les yeux : « je note »
    // et « ma note » se sont retrouvés dans une description de recherche et
    // dans un pied de page hors périmètre, que le premier jet de ce garde ne
    // voyait pas. Le verbe est visé au plus près de son sujet — un garde qui
    // listerait « note » tout court tirerait sur « une note de bas de page »
    // et sur les notes de version.
    const juge = new RegExp(
      `je note |ma note |rétrograder une note|la note est décidée|sociétés que je note`, 'i')
    expect(SURFACES.filter(t => juge.test(t.text)).map(t => t.rel)).toEqual([])
  })

  it('no Investir PAGE renders the field the retired anchor left behind', () => {
    // `annees_de_valorisation` vaut `null` sur les 1 407 fiches depuis le
    // retrait de l'ancre : la quatrième case du bandeau de faits affichait
    // « Valorisation — » partout, un tiret qui a l'air d'une donnée manquante
    // alors que la mesure n'existe plus du tout. Le champ SURVIT dans le
    // paquet et dans le type (le moteur garde la clé, valeur nulle), donc le
    // garde vise les pages, pas `src/lib`.
    const pages = TEXTS.filter(t => t.rel.startsWith('src/app/investir'))
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.filter(t => /annees_de_valorisation/.test(t.text)).map(t => t.rel)).toEqual([])
  })

  it('no Investir surface mentions the retired valuation anchor', () => {
    // `anchor` vaut `null` sur les 1 407 lignes depuis le retrait de l'ancre :
    // la mention « sans ancre », testée par `anchor !== 'mesuree'`, serait
    // affichée partout. Une affirmation fausse 1 407 fois.
    expect(SURFACES.filter(t => /sans ancre|mesuree/i.test(t.text)).map(t => t.rel)).toEqual([])
  })

  it('no Investir surface offers to filter on the ABSENCE of a signal', () => {
    // MAR art. 3(1)(35) vise l'opinion sur la valeur d'un titre, y compris
    // IMPLICITE. Une liste filtrée sur « aucune alerte » est une liste de
    // sociétés que le site n'a rien trouvé à reprocher : un blanc-seing sans
    // adjectif, et un « 0 sur 7 » a l'air d'une mesure, donc porte plus loin
    // que l'ancien « Comptes solides ». La MENTION du zéro reste permise —
    // c'est le FILTRE qui est refusé — tant qu'elle colle à son dénominateur.
    // `<summary` too: since 2026-09-19 the alert chips sit in a <details>,
    // and its summary comes BEFORE the first chip, ~500 characters after the
    // previous aria-pressed — a « · sans alerte » written there slipped past.
    const filtre = /(aria-pressed|<summary)[\s\S]{0,300}?(aucune alerte|sans alerte)/i
    expect(SURFACES.filter(t => filtre.test(t.text)).map(t => t.rel)).toEqual([])
  })

  it('the positive counterpart: the sieve is actually described somewhere', () => {
    // Sinon les cinq gardes ci-dessus passent sur une page vidée de tout.
    expect(SURFACES.filter(t => /contrôles lus/.test(t.text)).length).toBeGreaterThan(0)
  })

  it('defines the accounting words once on the Investir entry page', () => {
    const page = TEXTS.find(t => t.rel === 'src/app/investir/page.tsx')?.text ?? ''
    const vocab = TEXTS.find(t => t.rel === 'src/lib/investir-vocab.ts')?.text ?? ''

    expect(page).toContain('INVESTIR_VOCAB')
    for (const terme of ['Exercice', 'Chiffre d’affaires', 'Résultat net', 'Marge nette',
      'Capitaux propres', 'Dilution', 'Médiane du secteur']) {
      expect(vocab).toContain(terme)
    }
  })

  it('does not apply an investment predicate to a security on the sales page', () => {
    const page = TEXTS.find(t => t.rel === 'src/app/investir/page.tsx')?.text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? ''
    const phrases = page.split(/[.!?]+/)
    const sujets = ["le titre", "ce titre", "l'action", "cette action", 'la valorisation']
    const predicats = ['attractif', 'attrayant', 'cher', 'chere', 'bon marche',
      'interessant', 'potentiel', 'convient', 'horizon']

    expect(phrases.filter(phrase =>
      sujets.some(sujet => phrase.includes(sujet)) &&
      predicats.some(predicat => phrase.includes(predicat))
    )).toEqual([])
  })
})
