import { AuthorIdentity } from '@/components/AuthorIdentity'

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
 * The WHO and the WHAT-they-hold live in AuthorIdentity since lot 7 of the
 * design audit (2026-09-25): /a-propos mounts the same lines under « Qui est
 * derrière », and one copy is the only way they stay word for word the same.
 * The author's rules on those two sentences are documented there.
 *
 * Everything else comes from data: the day from the date the fiche passes in.
 * Only a day: both callers pass `as_of`, a date with no time, and the
 * date-and-time formatter rendered it as "à 02:00", an hour nobody wrote
 * anything at (2026-09-11 review).
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
      <h2 className="text-xs font-semibold text-muted">
        Qui écrit ceci, et dans quel cadre
      </h2>

      {/* "Version du", not "Calcul du": the line just above the block already
          says "Calcul du …" on a graded fiche, and an out-of-scope fiche is
          not a calculation of the rule at all. The day stays: it is the WHEN
          this block exists to carry. */}
      <AuthorIdentity version={generatedAt}>
        {/* The former sentence sourced the figures from market data shown next to
            them: it described fiches that printed a market price. Graded fiches read the
            annual report and name it in plain text (filing date and accession
            number, in blocs.source), with no link: the sentence says exactly
            that. An out-of-scope fiche has neither figures nor verdict. */}
        {horsPerimetre ? (
          <>Le texte de cette fiche est mon interprétation, pas un fait.</>
        ) : (
          <>
            Les chiffres viennent du rapport annuel de la société, dont la fiche donne la
            date de dépôt et le numéro. Les contrôles suivent une règle fixe ; le texte qui les accompagne est
            mon interprétation, pas un fait.
          </>
        )}
      </AuthorIdentity>
    </section>
  )
}
