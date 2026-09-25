import type { ReactNode } from 'react'
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import { longDate } from '@/lib/format-date'
import { labUrl } from '@/lib/lab-links'

/**
 * Who writes this site, and in what capacity. ONE copy, mounted under every
 * company fiche (EquityDisclosure) and on /a-propos (« Qui est derrière »,
 * lot 7 of the design audit, 2026-09-25).
 *
 * TWO SENTENCES HERE ARE ABOUT THE AUTHOR AND CANNOT BE DERIVED FROM CODE — the
 * holdings line and the "no issuer pays me" line. Both were read and kept by the
 * author on 2026-09-05; a third, claiming nobody reviews these texts before
 * publication, was struck out by him in the same pass. Do not reintroduce a
 * personal claim here without asking: this block's whole value is that a reader
 * can hold its statements against him.
 *
 * The sentence on the watchlist was rewritten by the author on 2026-09-11: the
 * rule grades far more companies than he follows, so "these analyses cover my
 * own watchlist" described a list that is a small part of the page's subject.
 *
 * The holdings sentence was rewritten by the author the same day, 2026-09-11,
 * for the mirror-image reason. Saying he might hold "les titres dont il parle"
 * let that "les" slide from the companies he actually follows to every company
 * the rule grades: read literally, it claimed a possible position in each of
 * them. The sentence now names the watchlist as the place those holdings sit.
 * The retired wording is NOT quoted verbatim here on purpose: the guard in
 * tests/lib/copy-guards.test.ts sweeps the whole tree for it, and a comment
 * reproducing it would make this file its own offender.
 *
 * The identity comes from algolab/web/app/mentions-legales (the LCEN
 * publication, already public). `version`, when given, is the day of the fiche:
 * only a day, both callers pass `as_of`, a date with no time (2026-09-11 review).
 * `children` is the caller's own sentence on where its figures come from; it
 * sits in front of the not-advice line, which every mount carries.
 */
export function AuthorIdentity({
  version,
  children,
}: {
  version?: string
  children?: ReactNode
}) {
  return (
    <>
      <p>
        Thomas Dessombs, à titre individuel (entrepreneur individuel, sous le nom commercial
        AlgoProof).{version ? <> Version du {longDate(version)}.</> : null}
      </p>

      <p>
        Je lis les comptes de bien plus de sociétés que je n&apos;en suis pour moi : ma liste de
        suivi long terme n&apos;en est qu&apos;une petite partie. Je peux détenir certains des titres
        cités ici, en particulier ceux de ma liste de suivi. Aucune société citée ne me rémunère, d&apos;aucune
        manière.
      </p>

      <p>
        {children}
        {children ? ' ' : null}
        Ce n&apos;est pas un conseil en investissement personnalisé : je ne connais ni ta
        situation, ni tes objectifs, ni ton horizon, et je ne cherche pas à les connaître.
      </p>

      <p>
        <Link href="/preuve" className={linkClass('inline')}>
          Comment je travaille
        </Link>
        {' · '}
        <Link href="/lexique" className={linkClass('inline')}>
          Le lexique
        </Link>
        {' · '}
        <a
          href={labUrl('https://lab.algoproof.fr/mentions-legales', 'mentions')}
          className={linkClass('inline')}
        >
          Mentions légales
        </a>
      </p>
    </>
  )
}
