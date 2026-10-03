// « Est-ce que ça marche ? » — the honest verdict on the sizing matrix.
//
// Continues the register already on this page: the Layer 4 line of « Bouclier défensif »
// publishes that the event blackouts were withdrawn because a two-year replay showed they
// cost P&L without cutting drawdown. This section does the same for the sizing matrix, and
// hands the reader the control that beats it.
//
// TEMPLATE CONSTRAINT, not an editorial preference: the improvement (ddBoth) NEVER renders
// without its control (ddConstant) in the same block. Publishing « mon dispositif a ramené
// le drawdown de −9,1 % à −7,1 % » while omitting « une coupe à plat serait descendue à
// −5,0 % » is the misleading omission L121-2 targets, on a page whose entire argument is
// that its numbers can be trusted. Guarded by mi-fleet-impact-section.test.tsx, and that
// guard has been seen red.
//
// Every figure is a prop. No number is typed here, including the window: the weekly cron
// moves them, and a hand-written number goes false on its own.
//
// So is every COMPARATIVE. A sentence whose truth depends on a value is built from that
// value, never frozen: « passe de X à Y » instead of « a ramené », and the P&L comparison
// branches on the measurement. Frozen prose beside a live number is worse than a stale
// number, because the reader sees both at once.
import { gatePhrase, regimePhrase, verdictPhrase, pct, type FleetImpact } from '@/lib/mi-fleet-impact'
import Callout from '@/components/Callout'
import Repli from '@/components/Repli'

export function MiFleetImpactSection({ impact }: { impact: FleetImpact | null }) {
  // No data, no section. Never a stale or invented claim on a page whose argument is
  // that the numbers can be trusted.
  if (!impact) return null

  const pnlDelta = impact.pnlConstant - impact.pnlBoth
  const pnlNote =
    pnlDelta > 0 ? 'et avec un meilleur P&L' : pnlDelta < 0 ? 'mais avec un P&L moins bon' : 'à P&L identique'

  return (
    <section>
      {/* Lot 7 (spec 5.4): framed as a negative result, a red rule all round. It is the
          most honest block of the page, so it sits second, right under the state of
          the day (refonte page Météo, 2026-10-03: kept as it was, the audit's best block). */}
      <Callout tone="negative-result" className="space-y-3 text-sm leading-relaxed">
      <h2 className="text-xl font-semibold mb-3">Est-ce que ça marche ?</h2>
        {/* Counter-audit 2026-09-26 (item 22): on a phone this block ran 810 px before the
            chart. The result and the verdict stay in view; how I measure and why I keep the
            rule fold below sm only (Repli), and stay open on a computer. */}
        <p>
          Dernier passage, sur{' '}{impact.windowDays}{' '}jours de rejeux de backtest (pas d&apos;argent réel) :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>le blocage en régime rouge{' '}{gatePhrase(impact)}{' '};</li>
          <li>
            avec la matrice de taille de position, le drawdown moyen passe de{' '}
            {pct(impact.ddBaseline)}{' '}à{' '}{pct(impact.ddBoth)}{' '};
          </li>
          <li>
            mais couper l&apos;exposition à plat, sans aucun timing, donne{' '}
            {pct(impact.ddConstant)}{' '}sur la même fenêtre,{' '}{pnlNote}.
          </li>
        </ul>
        {/* {' '} after the expressions below: RSC dropped the ambient space that follows
            an interpolation in mixed text (« 4de », « 102jours » in production). */}
        <p>
          {verdictPhrase(impact)}{' '}{impact.nTrades}{' '}trades,{' '}{impact.nPresets}{' '}configurations,
          une seule fenêtre, et{' '}{impact.nSmallSample}{' '}de ces configurations tournent sous
          vingt trades chacune. C&apos;est trop peu pour trancher dans un sens ou dans
          l&apos;autre{regimePhrase(impact)}.
        </p>
        <Repli
          id="meteo-mesure"
          titre="Comment je mesure, et pourquoi je garde la règle"
          titreClassName="text-sm font-semibold"
          corpsClassName="mt-2 space-y-3"
        >
        <p>
          Chaque semaine, je rejoue mes{' '}{impact.nPresets}{' '}configurations de flotte sur la
          fenêtre que couvre mon flux météo, une fois avec les règles, une fois sans. Ce sont
          des rejeux de backtest sur des bots de laboratoire, pas des trades en argent réel.
        </p>
        <p>
          Je garde quand même la politique. Elle coûte peu, et elle couvre un scénario que
          ces{' '}{impact.windowDays}{' '}jours n&apos;ont pas contenu (le rouge franc, celui où je
          serais content d&apos;avoir un frein). Tu vas me dire qu&apos;il est commode de
          garder une règle que la mesure ne soutient pas. Oui. C&apos;est pour ça que je
          publie le contrôle qui la met en cause, et que je le republierai chaque semaine.
        </p>
        </Repli>
      </Callout>
    </section>
  )
}
