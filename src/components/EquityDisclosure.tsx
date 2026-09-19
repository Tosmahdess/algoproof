import Link from 'next/link'
import { longDate } from '@/lib/format-date'

/**
 * The disclosure block under an equity fiche.
 *
 * WHY IT EXISTS. A per-company verdict (RENFORCER / MAINTENIR / PASSER) sitting
 * next to a price target and a sell plan is, in shape, an investment
 * recommendation. MAR art. 20 and Del. Reg. 2016/958 bind ANY producer of one,
 * professional or not, and unlike crypto — which the site's other half trades —
 * EU-listed equities are squarely inside that perimeter. It stopped being a
 * theoretical question the day the reasoning behind these verdicts became part
 * of what a membership buys.
 *
 * The page already said "c'est mon opinion, pas un conseil en investissement",
 * twice, in two different footers. What it never carried is the part that makes
 * an opinion checkable: WHO wrote it, WHEN exactly, WHAT they hold, and by WHICH
 * method. This block carries those four and replaces both footers.
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
 * Everything else comes from data: the identity from
 * algolab/web/app/mentions-legales (the LCEN publication, already public), the
 * day from the date the fiche passes in. Only a day: both callers pass `as_of`,
 * a date with no time, and the date-and-time formatter rendered it as
 * "à 02:00", an hour nobody wrote anything at (2026-09-11 review).
 *
 * NO PRICE SENTENCE. This block used to tell the reader that the reference
 * price shown above was the one of that instant and no longer moved, while the
 * quote and its change were live. That held while fiches printed a frozen
 * `price_at_generation`; D048 removed it. The only price left on a fiche is the
 * TradingView quote (CoursTradingView), live, fetched by the reader's browser,
 * shown only when the ticker is unambiguous, never on an out-of-scope fiche.
 * A live quote is not a reference price at any instant, so the sentence
 * described something no fiche shows (audit 2026-09-09, §2.4). The fiche says
 * what its quote is, next to the widget.
 *
 * Still missing, and known: RENFORCER / MAINTENIR / PASSER are defined nowhere
 * on the site, and neither is their horizon. Four components render the labels;
 * none says what they mean. Deducing them from sell-plan.ts and publishing the
 * deduction as the author's own definition is the one thing this block must not
 * do, so the gap is carried in the backlog instead.
 */
export function EquityDisclosure({
  generatedAt,
  horsPerimetre = false,
}: {
  generatedAt: string
  /** Out-of-scope fiche: no grade, no figures, no verdict. The sentence on
   *  where the figures come from and the one on the verdict would describe
   *  things this page does not show (2026-09-11 review). */
  horsPerimetre?: boolean
}) {
  return (
    <section className="mt-12 border-t border-border pt-6 text-xs text-muted leading-relaxed space-y-3">
      <h2 className="text-[10px] uppercase tracking-widest text-muted">
        Qui écrit ceci, et dans quel cadre
      </h2>

      {/* "Version du", not "Calcul du": the line just above the block already
          says "Calcul du …" on a graded fiche, and an out-of-scope fiche is
          not a calculation of the rule at all. The day stays: it is the WHEN
          this block exists to carry. */}
      <p>
        Thomas Dessombs, à titre individuel (entrepreneur individuel, sous le nom commercial
        AlgoProof). Version du {longDate(generatedAt)}.
      </p>

      <p>
        Je lis les comptes de bien plus de sociétés que je n&apos;en suis pour moi : ma liste de
        suivi long terme n&apos;en est qu&apos;une petite partie. Je peux détenir certains des titres
        cités ici, en particulier ceux de ma liste de suivi. Aucune société citée ne me rémunère, d&apos;aucune
        manière.
      </p>

      {/* The former sentence sourced the figures from market data shown next to
          them: it described fiches that printed a market price. Graded fiches read the
          annual report and name it in plain text (filing date and accession
          number, in blocs.source), with no link: the sentence says exactly
          that. An out-of-scope fiche has neither figures nor verdict. */}
      <p>
        {horsPerimetre ? (
          <>Le texte de cette fiche est mon interprétation, pas un fait.</>
        ) : (
          <>
            Les chiffres viennent du rapport annuel de la société, dont la fiche donne la
            date de dépôt et le numéro. Les contrôles suivent une règle fixe ; le texte qui les accompagne est
            mon interprétation, pas un fait.
          </>
        )}{' '}
        Ce n&apos;est pas un conseil en investissement personnalisé : je ne connais ni ta
        situation, ni tes objectifs, ni ton horizon, et je ne cherche pas à les connaître.
      </p>

      <p>
        <Link href="/preuve" className="text-accent hover:underline">
          Comment je travaille
        </Link>
        {' · '}
        <Link href="/lexique" className="text-accent hover:underline">
          Le lexique
        </Link>
        {' · '}
        <a
          href="https://lab.algoproof.fr/mentions-legales"
          className="text-accent hover:underline"
        >
          Mentions légales
        </a>
      </p>
    </section>
  )
}
