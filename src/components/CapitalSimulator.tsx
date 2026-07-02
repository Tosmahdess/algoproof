'use client'

// "Sur mon capital" — re-express the bot's OBSERVED history at a visitor-chosen capital.
// Strictly a reading aid for past results (€ speak louder than % or PF), never a
// projection: the wording below is load-bearing for the non-advice positioning.
import { useState } from 'react'
import type { PerfDaily } from '@/lib/types'
import { simulateOnCapital } from '@/lib/simulator'
import { fmtEur } from '@/lib/display'

const PRESETS = [250, 500, 1000, 2500]

function fmtMonthLabel(month: string | null): string {
  if (!month) return ''
  const [y, m] = month.split('-')
  const names = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const idx = parseInt(m, 10) - 1
  return names[idx] ? `${names[idx]} ${y}` : month
}

export default function CapitalSimulator({
  perfDaily,
  startCapital,
}: {
  perfDaily: PerfDaily[]
  startCapital: number
}) {
  const [capital, setCapital] = useState(500)
  const result = simulateOnCapital(perfDaily, startCapital, capital)
  if (!result) return null

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-8">
      <h2 className="font-semibold mb-1">Et sur mon capital ?</h2>
      <p className="text-xs text-muted mb-4">
        Le même historique observé ({result.firstDate} → {result.lastDate}), relu à l’échelle
        d’un capital de départ que vous choisissez. C’est une lecture du passé, pas une
        projection : les résultats passés ne préjugent pas des résultats futurs.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {PRESETS.map(preset => (
          <button
            key={preset}
            onClick={() => setCapital(preset)}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              capital === preset
                ? 'bg-accent/10 text-accent border-accent/40'
                : 'border-border text-muted hover:text-foreground'
            }`}
          >
            {preset} €
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted mb-0.5">Résultat sur la période</p>
          <p className={`text-xl font-mono ${result.pnlEur >= 0 ? 'text-positive' : 'text-negative'}`}>
            {fmtEur(result.pnlEur)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">
            Pire mois{result.worstMonthLabel ? ` (${fmtMonthLabel(result.worstMonthLabel)})` : ''}
          </p>
          {result.worstMonthEur === 0 ? (
            <p className="text-sm font-mono text-positive pt-1.5">aucun mois négatif</p>
          ) : (
            <p className="text-xl font-mono text-negative">{fmtEur(result.worstMonthEur)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">Pire creux (depuis un plus haut)</p>
          <p className={`text-xl font-mono ${result.maxDrawdownEur < 0 ? 'text-negative' : 'text-positive'}`}>
            {fmtEur(result.maxDrawdownEur)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted/70 mt-4">
        Simple règle de trois sur les résultats déjà publiés de ce bot ; aucune donnée n’est
        envoyée, rien n’est un conseil en investissement personnalisé.
      </p>
    </section>
  )
}
