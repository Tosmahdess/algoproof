// tests/lib/investir-hors-perimetre.test.ts
//
// Audit 2026-10, n° 14 and n° 54. The 27 out-of-scope fiches all said « Elle ne
// dépose pas de rapport annuel auprès du régulateur américain », which was
// false for Visa, Electronic Arts, AeroVironment, Planet Labs, Block, and also
// for ASML, TSMC, Sanofi and Philips (EDGAR, read on 2026-10-03: 10-K or 20-F
// on file). Block and Philips were already read under another slug, so two
// pages contradicted each other. Solana is not a company. And the descriptions
// judged (« excellent », « La bonne nouvelle »), misread Yahoo's debtToEquity
// (a PERCENTAGE) as a multiple (« 116 fois les fonds propres »), and wrote a
// sign twice (« baisse de -2,9 % »).
//
// The rules below are CLASS rules over the whole file, not checks on the fiches
// the audit named, so a fiche added later is held to them too.
import { describe, it, expect } from 'vitest'
import brut from '@/data/investir-hors-perimetre.json'
import {
  HORS_PERIMETRE_RETIREES, ficheParSlug, horsPerimetreParSlug, listeHorsPerimetre,
  listeInvestir, phraseCause, phraseListeHorsPerimetre, redirectionHorsPerimetre,
  type FicheHorsPerimetre,
} from '@/lib/investir'

const FICHES = listeHorsPerimetre()
const DESCRIPTIONS = FICHES.map(f => ({ slug: f.slug, texte: f.description ?? '' }))

describe('out-of-scope fiches: which companies, and why', () => {
  it('Block, Philips and Solana are retired, each to a page that exists', () => {
    expect(Object.keys(HORS_PERIMETRE_RETIREES).sort()).toEqual(['block', 'philips', 'solana'])
    for (const [slug, cible] of Object.entries(HORS_PERIMETRE_RETIREES)) {
      expect(horsPerimetreParSlug(slug), slug).toBeNull()
      expect(redirectionHorsPerimetre(slug)).toBe(cible)
      if (cible !== '/investir') {
        const lu = cible.replace(/^\/investir\//, '')
        expect(ficheParSlug(lu), `${slug} → ${cible}`).toBeDefined()
      }
    }
    expect(redirectionHorsPerimetre('block')).toBe('/investir/block-inc')
    expect(redirectionHorsPerimetre('philips')).toBe('/investir/koninklijke-philips-nv')
    expect(redirectionHorsPerimetre('solana')).toBe('/investir')
  })

  it('a live fiche or an unknown slug is never redirected', () => {
    expect(redirectionHorsPerimetre('visa')).toBeNull()
    expect(redirectionHorsPerimetre('block-inc')).toBeNull()
    expect(redirectionHorsPerimetre('nexiste-pas')).toBeNull()
  })

  it('no fiche is a company the registry already reads (same CIK or same symbol)', () => {
    const ciks = new Set(listeInvestir().map(l => l.cik))
    const symboles = new Set(listeInvestir().map(l => l.symbole).filter(Boolean))
    for (const f of FICHES) {
      if (f.cik != null) expect(ciks.has(f.cik), f.slug).toBe(false)
      expect(symboles.has(f.ticker), f.slug).toBe(false)
    }
  })

  it('every fiche carries a cause, and a company that files names its CIK', () => {
    for (const f of FICHES) {
      expect(['sans_depot', 'depot_non_lu', 'enregistrement_clos'], f.slug).toContain(f.cause)
      if (f.cause !== 'sans_depot') expect(f.cik, f.slug).toEqual(expect.any(Number))
      if (f.cause === 'enregistrement_clos') {
        expect(f.dernier_rapport, f.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(f.fin_enregistrement, f.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('the companies EDGAR shows filing a 10-K or a 20-F are not told they do not file', () => {
    const deposantes = ['visa', 'electronic-arts', 'aerovironment', 'planet-labs', 'asml', 'tsmc', 'sanofi']
    for (const slug of deposantes) {
      const f = horsPerimetreParSlug(slug)!
      expect(f, slug).not.toBeNull()
      expect(f.cause, slug).not.toBe('sans_depot')
      expect(phraseCause(f), slug).not.toMatch(/ne dépose (pas|ni)/)
    }
    expect(horsPerimetreParSlug('electronic-arts')!.cause).toBe('enregistrement_clos')
  })
})

describe('phraseCause: one sentence per cause, computed from the fiche', () => {
  const base: FicheHorsPerimetre = {
    slug: 'x', name: 'X', ticker: 'X', categorie: null, description: null, as_of: '2026-06-02', cause: 'sans_depot',
  }

  it('a company with no 10-K and no 20-F', () => {
    const p = phraseCause(base)
    expect(p).toMatch(/ne dépose auprès du régulateur américain ni 10-K ni 20-F/)
    expect(p).toMatch(/aucun document à lire/)
  })

  it('a company that files but that I do not read yet', () => {
    const p = phraseCause({ ...base, cause: 'depot_non_lu', cik: 1 })
    expect(p).toMatch(/^Elle dépose un rapport annuel auprès du régulateur américain/)
    expect(p).toMatch(/je ne lis pas encore ses comptes/)
    expect(p).not.toMatch(/ne dépose pas/)
  })

  it('a company that filed, then ended its registration: both dates', () => {
    const p = phraseCause({
      ...base, cause: 'enregistrement_clos', cik: 1, dernier_rapport: '2026-05-11', fin_enregistrement: '2026-08-14',
    })
    expect(p).toMatch(/11 mai 2026/)
    expect(p).toMatch(/14 août 2026/)
    expect(p).toMatch(/mis fin à son enregistrement/)
    expect(p).not.toMatch(/ne dépose pas/)
  })

  it('the index counts each cause, and the counts add up to the list', () => {
    const p = phraseListeHorsPerimetre(FICHES)
    const n = (c: string) => FICHES.filter(f => f.cause === c).length
    expect(p).toContain(`${n('sans_depot')} ne déposent auprès du régulateur américain ni 10-K ni 20-F`)
    const deposees = n('depot_non_lu') + n('enregistrement_clos')
    expect(p).toContain(`${deposees} y ont déposé un rapport annuel`)
    expect(n('sans_depot') + deposees).toBe(FICHES.length)
  })

  it('the index sentence takes the singular when one company is in a group', () => {
    const p = phraseListeHorsPerimetre([base, { ...base, slug: 'y', cause: 'depot_non_lu', cik: 1 }])
    expect(p).toContain('1 ne dépose auprès du régulateur américain ni 10-K ni 20-F')
    expect(p).toContain('1 y a déposé un rapport annuel')
  })
})

describe('out-of-scope descriptions: findings, not judgments (audit 2026-10, n° 14, n° 54)', () => {
  it('there are descriptions to check (else every rule below is vacuous)', () => {
    expect(DESCRIPTIONS.filter(d => d.texte.length > 0).length).toBeGreaterThan(20)
  })

  // Judgments on the company, the price or the opportunity. Stems, so the
  // feminine and the plural are caught too.
  const BANNIS: [string, RegExp][] = [
    ['excellent', /excellen/i], ['exceptionnel', /exceptionnel/i], ['colossal', /colossa/i],
    ['solide', /solide/i], ['sain', /\bsaine?s?\b/i], ['correct', /\bcorrecte?s?\b/i],
    ['honnête', /honn[êe]te/i], ['modeste', /modeste/i], ['préoccupant', /pr[ée]occupant/i],
    ['spectaculaire', /spectaculaire/i], ['mastodonte', /mastodonte/i],
    ['bonne nouvelle', /bonne nouvelle/i], ['mérite attention', /m[ée]rite (?:l.)?attention/i],
    ['à surveiller', /surveiller/i], ['alarmant', /alarmant/i], ['effondrement', /effondr/i],
    ['le bât blesse', /b[âa]t blesse/i], ['gérable', /g[ée]rable/i], ['fragile', /fragil/i],
    ['vigilance', /vigilance/i], ['signal', /\bsignal/i], ['élevé', /[ée]lev[ée]/i],
    ['faible', /faible/i], ['massif', /massi(?:f|ve)/i], ['explosif', /explosi/i],
    ['emblématique', /embl[ée]matique/i], ['iconique', /iconique/i], ['célèbre', /c[ée]l[èe]bre/i],
    ['monopole', /monopole/i], ['risque', /risque/i], ['bon niveau', /\bbon niveau/i],
    ['cher / bon marché', /\bcher\b|bon march[ée]|opportunit[ée]|sous-?[ée]valu|sur-?[ée]valu/i],
  ]

  for (const [mot, re] of BANNIS) {
    it(`no description says « ${mot} »`, () => {
      expect(DESCRIPTIONS.filter(d => re.test(d.texte)).map(d => d.slug)).toEqual([])
    })
  }

  // Yahoo's debtToEquity is a percentage: 116 means a debt equal to 116 % of
  // equity, not 116 times it.
  it('no « fois » anywhere: the debt ratio is a percentage, never a multiple', () => {
    expect(DESCRIPTIONS.filter(d => /\bfois\b/i.test(d.texte)).map(d => d.slug)).toEqual([])
  })

  it('every debt figure is written as a percentage of equity', () => {
    for (const d of DESCRIPTIONS) {
      // A sentence that gives a number next to « capitaux propres » or « fonds propres ».
      for (const phrase of d.texte.split(/(?<=\.)\s+/)) {
        if (!/(capitaux|fonds) propres/i.test(phrase) || !/\d/.test(phrase)) continue
        expect(phrase, d.slug).toMatch(/une dette égale à \d+(?:,\d+)? % (?:des|de ses) capitaux propres/)
      }
    }
  })

  // \b: « opérationnelle » contains « ratio ».
  it('no bare ratio: « ratio » is never followed by its number', () => {
    expect(DESCRIPTIONS.filter(d => /\bratio\b[^.%]{0,40}?\d/i.test(d.texte)).map(d => d.slug)).toEqual([])
  })

  it('no em dash or en dash in a description, nor in a name', () => {
    for (const f of FICHES) {
      expect(f.description ?? '', f.slug).not.toMatch(/[—–]/)
      expect(f.name, f.slug).not.toMatch(/[—–]/)
    }
  })

  it('a sign is written once: never « de -2,9 % » nor « de +17 % »', () => {
    expect(DESCRIPTIONS.filter(d => /\bde\s*[-−+]\s*\d/.test(d.texte)).map(d => d.slug)).toEqual([])
  })

  it('no « je ne dispose pas… ce que je sais de façon structurelle »: a fact without a source is not kept', () => {
    expect(DESCRIPTIONS.filter(d => /structurel/i.test(d.texte)).map(d => d.slug)).toEqual([])
    // Roche keeps the fact that it has no figures.
    expect(horsPerimetreParSlug('roche')!.description).toMatch(/pas de données financières/)
  })

  it('every fiche keeps its as_of', () => {
    for (const f of (brut as { fiches: { slug: string; as_of: string }[] }).fiches) {
      expect(f.as_of, f.slug).toMatch(/^2026-(06-02|09-01)$/)
    }
  })
})
