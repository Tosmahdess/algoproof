// src/components/BacktestSegmentLegend.tsx
//
// What the two segments of the curve are (pilot 2026-09-25, freeze boundary 2026-09-28).
// The dotted part is selection data, so it must say so under the chart itself, not in a
// footnote elsewhere.
import { longDateOrdinal } from '@/lib/format-date'

export default function BacktestSegmentLegend({ freezeDate, simStart, verdict = null,
  paperScaling = 'proportional' }: {
  freezeDate: string; simStart: string
  verdict?: 'exploration' | 'rejected' | null
  paperScaling?: 'proportional' | 'additive'
}) {
  // D074: a hand-written bot was TESTED on its data, not selected on it; a fixed-notional
  // bot keeps its position size, it is not resized on the capital reached.
  const data = verdict
    ? "dernier jour des données sur lesquelles je l'ai testée"
    : "dernier jour des données sur lesquelles j'ai sélectionné cette stratégie"
  const sizing = paperScaling === 'additive'
    ? "Les positions gardent la même taille qu'en backtest ; leur résultat s'ajoute au niveau atteint."
    : 'Les positions sont dimensionnées sur le capital atteint à ce moment-là.'
  return (
    <div className="mt-3 space-y-1 text-xs text-muted">
      <p>
        <span className="inline-block w-5 border-t-2 border-dashed border-[#94a3b8] align-middle mr-2" />
        Pointillé : le backtest, parti de 1 000 € le 1er janvier. Il s&apos;arrête au{' '}
        {longDateOrdinal(freezeDate)}, {data}. Elle les avait donc déjà vues, et cette partie est flatteuse
        par construction. Ses chiffres sont à part, dans le bloc « Backtest » plus bas.
      </p>
      <p>
        <span className="inline-block w-5 border-t-2 border-positive align-middle mr-2" />
        Trait plein : la simulation à partir du {longDateOrdinal(simStart)}, sur des jours que
        {verdict ? ' la stratégie ' : ' le moteur '}n&apos;avait jamais vus. {sizing} Les chiffres
        en haut de page ne comptent que ce trait plein.
      </p>
    </div>
  )
}
