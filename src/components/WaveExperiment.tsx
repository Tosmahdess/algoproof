// src/components/WaveExperiment.tsx
// « Expérience en cours » — the /overview encart above the timeframe tables,
// task 7 of the armada-wave-visibility plan. Deliberately NOT `'use client'`:
// plain, synchronous JSX like FleetOverview next to it, all data (waveBotCount,
// measure) arrives as props from the server component tree.
//
// Controller ruling (plan Task 11): waveBotCount === 0 means wave 1 has
// nothing publicly listed yet — render nothing at all, not an empty shell.
import type { WaveMeasure } from '@/lib/types'

export interface WaveExperimentProps {
  waveBotCount: number
  measure: WaveMeasure | null
}

// Below this trade count on EITHER cohort, a PF is noise, not a result —
// same 30-trade floor the plan's brief pins in both directions (Step 1's
// tests: 40/10 withholds, 30/30 shows). Distinct from LOW_SAMPLE_TRADES
// (20) in src/lib/display.ts, which gates per-bot cards: this gate is about
// a paired-cohort comparison, not a single bot's own track record.
const MIN_TRADES_PER_COHORT = 30

// Named so the copy below and this constant can't drift apart silently.
//
// This one is a DESIGN PARAMETER of the wave, fixed when it launched on
// 2026-08-21, not a live count: the controls run outside the bots table (median
// witnesses and a frontier group), so there is nothing to read them back from.
// The copy says « fixés au lancement » for that reason. Everything that CAN be
// counted from the data is counted (waveBotCount, paired clusters).
const MEASUREMENT_CONTROLS = 39

function fmtPf(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

interface MeasuredGap {
  headPf: number
  medianPf: number
}

// Isolated from the JSX below so the "both cohorts, all four fields present"
// check is one guard clause instead of a chain of `!` assertions in markup.
function computeGap(measure: WaveMeasure | null): MeasuredGap | null {
  if (!measure) return null
  const { head_trades, median_trades, head_pf, median_pf } = measure
  if (head_trades === null || median_trades === null) return null
  if (head_pf === null || median_pf === null) return null
  if (head_trades < MIN_TRADES_PER_COHORT || median_trades < MIN_TRADES_PER_COHORT) return null
  return { headPf: head_pf, medianPf: median_pf }
}

export default function WaveExperiment({ waveBotCount, measure }: WaveExperimentProps) {
  if (waveBotCount === 0) return null

  const gap = computeGap(measure)

  return (
    <section data-testid="wave-experiment" className="bg-card border border-border rounded-lg p-6 space-y-2">
      <h2 className="text-xs uppercase tracking-wider text-muted">Expérience en cours</h2>
      <p className="text-sm">
        Je fais tourner {waveBotCount} configurations issues du gantelet du moteur, en paper,
        listées ci-dessous comme n&apos;importe quel bot du labo, sans tri par résultat. À côté,{' '}
        {MEASUREMENT_CONTROLS} instruments de mesure, fixés au lancement de la vague, tournent
        volontairement hors de cette liste,
        des témoins médians et un groupe frontière, pour vérifier si le classement du moteur tient
        une fois sorti du backtest (la malédiction du vainqueur : la meilleure configuration
        d&apos;un groupe est souvent la plus chanceuse, pas la meilleure), pas pour gagner de
        l&apos;argent.
      </p>
      <p className="text-sm">
        {gap ? (
          <>
            Sur cet échantillon, le profit factor de la cohorte tête ressort à {fmtPf(gap.headPf)},
            contre {fmtPf(gap.medianPf)} pour la cohorte médiane.
          </>
        ) : (
          <>Trop tôt pour mesurer l&apos;écart : j&apos;attends au moins {MIN_TRADES_PER_COHORT} trades
          clôturés sur chaque cohorte avant de publier un chiffre.</>
        )}
      </p>
    </section>
  )
}
