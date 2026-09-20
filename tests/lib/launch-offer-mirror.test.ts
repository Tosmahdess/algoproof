/** Le prix du Labo, tel que CE site le raconte.
 *
 *  Ce dépôt ne vend rien : Stripe, /membre et les CGV vivent dans algolab. Mais
 *  l'inventaire du 2026-09-20 a trouvé le prix RECOPIÉ À LA MAIN dans trois
 *  phrases d'ici (la FAQ, /a-propos, la phrase d'accès du gantelet), chacune
 *  vraie le jour où elle a été écrite et aucune reliée aux deux autres. Une
 *  d'elles portait même un commentaire demandant au prochain lecteur de la
 *  tenir à jour à la main.
 *
 *  Les trois lisent maintenant lib/launch-offer.ts. Ce fichier vérifie qu'elles
 *  le lisent VRAIMENT : l'offre est éteinte par défaut, donc un garde écrit
 *  pour elle resterait vert sans l'avoir jamais vue ouverte. */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { membershipPrice, membershipPriceShort, launchOfferOpen, launchOfferEndsOn } from '@/lib/launch-offer'

const SRC = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8')
const OPEN = '2099-01-12'
const BEFORE = new Date('2026-12-01T10:00:00Z')

afterEach(() => vi.unstubAllEnvs())

describe('the mirror is off until the launch is dated', () => {
  it('is shut with no date, which is the default everywhere today', () => {
    expect(launchOfferEndsOn()).toBeNull()
    expect(launchOfferOpen(BEFORE)).toBe(false)
    expect(membershipPrice(BEFORE)).toBe('29 € par mois')
    expect(membershipPriceShort(BEFORE)).toBe('29 € par mois')
  })

  // Fails closed on a bad value too: a typo in an environment variable must not
  // be what decides whether this site announces a price the other one does not.
  it.each(['12/01/2099', '2099-1-12', 'au lancement', ''])('is shut on %s', (bad) => {
    vi.stubEnv('NEXT_PUBLIC_LAUNCH_OFFER_ENDS', bad)
    expect(launchOfferOpen(BEFORE)).toBe(false)
  })

  it('names both amounts once the window is open, never the 9 alone', () => {
    vi.stubEnv('NEXT_PUBLIC_LAUNCH_OFFER_ENDS', OPEN)
    for (const out of [membershipPrice(BEFORE), membershipPriceShort(BEFORE)]) {
      // Lookbehind obligatoire : « 29 € » contient « 9 € », donc un toContain
      // sur « 9 € » est satisfait par le prix PLEIN et ne peut pas échouer.
      expect(out, 'the intro price, not the 9 inside 29').toMatch(/(?<!\d)9 €/)
      expect(out, 'the price it becomes').toMatch(/29 €/)
      expect(out, 'how long it lasts').toMatch(/3 mois|3 premiers mois/)
    }
  })
})

describe('no surface types the price by hand any more', () => {
  // Le vrai défaut n'était pas le chiffre, c'était les TROIS copies. Un garde
  // qui vérifie la phrase rendue laisserait revenir un « 29 € » tapé en dur à
  // côté ; celui-ci interdit la source du problème, dans les fichiers.
  it.each([
    'src/app/faq/page.tsx',
    'src/app/a-propos/page.tsx',
    'src/lib/gauntlet-explainer.ts',
  ])('%s reads the price instead of spelling it', (file) => {
    const src = SRC(file)
    expect(src, 'reads lib/launch-offer').toMatch(/membershipPrice(Short)?\(\)/)
    // « 290 € par an » reste écrit en clair, et c'est voulu : l'annuel ne bouge
    // pas avec l'offre de lancement. C'est le MENSUEL qui ne doit plus être tapé.
    expect(src, 'no hand-typed monthly price').not.toMatch(/29 € par mois/)
  })
})
