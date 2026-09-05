import Link from 'next/link'
import { longDateTime } from '@/lib/format-date'

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
 * Everything else comes from data: the identity from
 * algolab/web/app/mentions-legales (the LCEN publication, already public), the
 * instant from `equity_fiches.generated_at`, the price from
 * `price_at_generation`.
 *
 * Still missing, and known: RENFORCER / MAINTENIR / PASSER are defined nowhere
 * on the site, and neither is their horizon. Four components render the labels;
 * none says what they mean. Deducing them from sell-plan.ts and publishing the
 * deduction as the author's own definition is the one thing this block must not
 * do, so the gap is carried in the backlog instead.
 */
export function EquityDisclosure({ generatedAt }: { generatedAt: string }) {
  return (
    <section className="mt-12 border-t border-border pt-6 text-xs text-muted leading-relaxed space-y-3">
      <h2 className="text-[10px] uppercase tracking-widest text-muted/70">
        Qui écrit ceci, et dans quel cadre
      </h2>

      <p>
        Thomas Dessombs, à titre individuel (entrepreneur individuel, sous le nom commercial
        AlgoProof). Analyse terminée le {longDateTime(generatedAt)}, heure de Paris. Le prix
        de référence affiché plus haut est celui de cet instant et ne bouge plus ; le cours
        et sa variation, eux, sont en direct.
      </p>

      <p>
        Ces analyses portent sur ma propre liste de suivi long terme et sur mes versements
        mensuels. Je peux détenir les titres dont je parle, et c&apos;est même en général la
        raison pour laquelle je les suis. Aucune société citée ne me rémunère, d&apos;aucune
        manière.
      </p>

      <p>
        Les chiffres de marché viennent des données affichées à côté d&apos;eux. Le verdict
        et le texte qui l&apos;accompagne sont mon interprétation, pas un fait. Ce n&apos;est
        pas un conseil en investissement personnalisé : je ne connais ni ta situation, ni tes
        objectifs, ni ton horizon, et je ne cherche pas à les connaître.
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
