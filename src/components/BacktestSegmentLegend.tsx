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
        Pointillé : le backtest, parti de 1 000 € le 1er janvier jusqu&apos;au lancement du{' '}
        {longDate(launchDate)}. La stratégie avait déjà vu ces données pendant sa sélection,
        donc cette partie est flatteuse par construction. Ses chiffres sont dans le bloc
        « Backtest » plus bas.
      </p>
      <p>
        <span className="inline-block w-5 border-t-2 border-positive align-middle mr-2" />
        Trait plein : la simulation (paper) depuis le lancement. Elle repart du niveau atteint par
        le backtest, avec des positions dimensionnées sur ce capital. Les chiffres en haut de
        page ne comptent que ce trait plein.
      </p>
    </div>
  )
}
