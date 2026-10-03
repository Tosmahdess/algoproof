// tests/lib/investir-controles.test.ts
//
// Audit 2026-10, n° 53: a fiche printed the engine's alerts as one paragraph
// of lower-case sentences and never listed the seven controls with their
// state. lireControles gives each control one state (alerte, sans alerte, non
// lu) and the engine's own sentence for it. Checked here on a fixture, and on
// the whole committed package, so an engine change of identifiers fails.
import { describe, expect, it } from 'vitest'
import {
  SEPT_CONTROLES, capitale, lireControles, phrasesDesAlertes,
} from '@/lib/investir-controles'
import { contexte, ficheParSlug, tousLesSlugs } from '@/lib/investir'

const CROWN = "perte sur un exercice. chiffre d'affaires sous son niveau d'il y a deux ans. résultat sous son niveau d'il y a deux ans. capitaux propres négatifs. dette long terme nette de la trésorerie : plus de cinquante années de résultat, contre 11,8 pour la médiane des 45 sociétés bénéficiaires de son secteur."

describe('phrasesDesAlertes', () => {
  it('cuts the engine block into its three kinds of sentence', () => {
    const p = phrasesDesAlertes(
      "pertes récurrentes (2 exercices sur 3). nombre d'actions en hausse de 213 % en deux ans. En regard, trésorerie nette couvrant 0,37 années de pertes au rythme du dernier exercice. Non lu : dernier exercice sans bénéfice : la dette ne se mesure pas en années de résultat.")
    expect(p.alertes).toEqual([
      'pertes récurrentes (2 exercices sur 3).',
      "nombre d'actions en hausse de 213 % en deux ans.",
    ])
    expect(p.regard).toBe('trésorerie nette couvrant 0,37 années de pertes au rythme du dernier exercice.')
    expect(p.nonLus).toEqual(['dernier exercice sans bénéfice : la dette ne se mesure pas en années de résultat.'])
  })

  it('keeps a decimal comma inside its sentence', () => {
    expect(phrasesDesAlertes(CROWN).alertes).toHaveLength(5)
  })

  it('returns nothing for an empty block', () => {
    expect(phrasesDesAlertes(undefined)).toEqual({ alertes: [], regard: null, nonLus: [] })
  })
})

describe('lireControles', () => {
  const LIB = contexte.libelles

  it('lists the seven controls in the engine order, each with one state', () => {
    const l = lireControles(
      { alertes: ['perte_unique', 'ca_sous_niveau', 'resultat_sous_niveau', 'capitaux_propres_negatifs', 'dette_nette'], non_lus: [] },
      CROWN, LIB)
    expect(l.map(c => c.nom)).toEqual([
      'Pertes', 'Chiffre d’affaires', 'Résultat', 'Dilution', 'Capitaux propres', 'Dette long terme', 'Trésorerie',
    ])
    expect(l.map(c => c.etat)).toEqual([
      'alerte', 'alerte', 'alerte', 'sans-alerte', 'alerte', 'alerte', 'sans-alerte',
    ])
  })

  it('gives each alert its own sentence, with a capital letter', () => {
    const l = lireControles(
      { alertes: ['perte_unique', 'ca_sous_niveau', 'resultat_sous_niveau', 'capitaux_propres_negatifs', 'dette_nette'], non_lus: [] },
      CROWN, LIB)
    expect(l[0].fait).toBe('Perte sur un exercice.')
    expect(l[5].fait).toMatch(/^Dette long terme nette de la trésorerie : plus de cinquante années/)
    // A control without an alert carries no invented sentence.
    expect(l[3].fait).toBeNull()
  })

  it('names what was not read, and why', () => {
    const l = lireControles(
      { alertes: ['resultat_sous_niveau'], non_lus: ['dette_nette', 'lecture_tresorerie'] },
      "résultat sous son niveau d'il y a deux ans. Non lu : aucun poste de dette à long terme dans ce dépôt. Non lu : trésorerie ou dette long terme absente de ce dépôt.",
      LIB)
    const dette = l.find(c => c.cle === 'dette')!
    const tresorerie = l.find(c => c.cle === 'tresorerie')!
    expect(dette.etat).toBe('non-lu')
    expect(dette.fait).toBe('Aucun poste de dette à long terme dans ce dépôt.')
    expect(tresorerie.etat).toBe('non-lu')
    expect(tresorerie.fait).toBe('Trésorerie ou dette long terme absente de ce dépôt.')
  })

  it('puts the « En regard » reading under the treasury control, read without an alert', () => {
    const l = lireControles(
      { alertes: ['pertes_recurrentes'], non_lus: ['dette_nette'] },
      'pertes récurrentes (2 exercices sur 3). En regard, trésorerie nette couvrant 4,64 années de pertes au rythme du dernier exercice. Non lu : dernier exercice sans bénéfice : la dette ne se mesure pas en années de résultat.',
      LIB)
    const tresorerie = l.find(c => c.cle === 'tresorerie')!
    expect(tresorerie.etat).toBe('sans-alerte')
    expect(tresorerie.fait).toBe('Trésorerie nette couvrant 4,64 années de pertes au rythme du dernier exercice.')
  })

  it('attaches no sentence when the block does not cut as the fiche says, and falls back to the engine label', () => {
    const l = lireControles({ alertes: ['dilution', 'ca_sous_niveau'], non_lus: ['dette_nette'] }, 'une seule phrase.', LIB)
    expect(l.find(c => c.cle === 'dilution')!.fait).toBe(capitale(LIB.dilution))
    expect(l.find(c => c.cle === 'dette')!.fait).toBeNull()
  })
})

describe('the committed package, all 1 406 fiches', () => {
  const fiches = tousLesSlugs().map(s => ficheParSlug(s)!)

  it('maps every alert identifier to exactly one control', () => {
    const connus = SEPT_CONTROLES.flatMap(c => c.alertes)
    expect(new Set(connus).size).toBe(connus.length)
    expect(Object.keys(contexte.libelles).filter(id => !connus.includes(id))).toEqual([])
  })

  it('maps every unread identifier to a control', () => {
    const connus = SEPT_CONTROLES.map(c => c.nonLu).filter(Boolean)
    expect(Object.keys(contexte.libelles_non_lus).filter(id => !connus.includes(id))).toEqual([])
  })

  it('never puts two alerts on one control, nor an alert on an unread control', () => {
    const fautives = fiches.filter(f => {
      const l = lireControles(f, f.blocs.alertes, contexte.libelles)
      const alertes = l.filter(c => c.etat === 'alerte').length
      const nonLus = l.filter(c => c.etat === 'non-lu').length
      return alertes !== f.alertes.length || nonLus !== f.non_lus.length || 7 - nonLus !== f.n_lus
    })
    expect(fautives.map(f => f.slug)).toEqual([])
  })

  it('cuts every engine block into as many sentences as the fiche has alerts and unread controls', () => {
    const fautives = fiches.filter(f => {
      const p = phrasesDesAlertes(f.blocs.alertes)
      return p.alertes.length !== f.alertes.length || p.nonLus.length !== f.non_lus.length
    })
    expect(fautives.map(f => f.slug)).toEqual([])
  })
})
