// src/components/BacktestSegmentLegend.tsx
//
// What the two segments of the curve are (pilot 2026-09-25). The dotted part is selection
// data, so it must say so under the chart itself, not in a footnote elsewhere.
import { longDate } from '@/lib/format-date'

export default function BacktestSegmentLegend({ launchDate }: { launchDate: string }) {
  return (
    <div className="mt-3 space-y-1 text-xs text-muted">
      <p>
        <span className="inline-block w-5 border-t-2 border-dashed border-[#94a3b8] align-middle mr-2" />
        Pointillé : le backtest du 1er janvier au {longDate(launchDate)}, jour du lancement.
        Ce sont les trades que la stratégie aurait pris sur des données qu&apos;elle avait déjà vues
        pendant sa sélection, donc un historique forcément flatteur, avec la même taille de
        position que la simulation.
      </p>
      <p>
        <span className="inline-block w-5 border-t-2 border-positive align-middle mr-2" />
        Trait plein : la simulation (paper) depuis le lancement. Les chiffres au-dessus du
        graphique ne comptent que ce trait plein.
      </p>
    </div>
  )
}
