'use client'

// "Sur mon capital" — re-express the bot's OBSERVED history at a visitor-chosen capital.
// Strictly a reading aid for past results (€ speak louder than % or PF), never a
// projection: the wording below is load-bearing for the non-advice positioning.
//
// Refonte lot 3 (2026-10-02, audit 2026-10 constat 4): on a curve that starts with a
// backtest, the simulation's own result leads, in colour, with its own worst month and
// trough; the result since 1 January, backtest included, is a grey line apart that names
// the backtest's share. The amounts are pressed buttons (aria-pressed, constat 33).
import { useState } from 'react'
import type { PerfDaily } from '@/lib/types'
import { simulateOnCapital, simulationOnlyPerf } from '@/lib/simulator'
import { fmtEur } from '@/lib/display'
import { longDateOrdinal } from '@/lib/format-date'

const PRESETS = [250, 500, 1000, 2500]

function fmtMonthLabel(month: string | null): string {
  if (!month) return ''
  const [y, m] = month.split('-')
  const names = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const idx = parseInt(m, 10) - 1
  return names[idx] ? `${names[idx]} ${y}` : month
}

/** « du 31 août au 28 septembre 2026 », the year written once when both dates share it. */
function period(first: string, last: string): string {
  const a = longDateOrdinal(first)
  const b = longDateOrdinal(last)
  return first.slice(0, 4) === last.slice(0, 4)
    ? `du ${a.replace(/ \d{4}$/, '')} au ${b}`
    : `du ${a} au ${b}`
}

function nextDay(isoDate: string): string {
  const t = new Date(`${isoDate}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}

const tone = (n: number) => (n < 0 ? 'text-negative' : 'text-foreground')

export default function CapitalSimulator({
  perfDaily,
  startCapital,
  backtestUntil,
  backtestEndCapital,
}: {
  perfDaily: PerfDaily[]
  startCapital: number
  /** When the curve starts with a backtest (engine bots, 2026-09-28): its last day and
   *  the capital it reached, so the backtest's share of the result is named apart. */
  backtestUntil?: string
  backtestEndCapital?: number
}) {
  const [capital, setCapital] = useState(500)
  const whole = simulateOnCapital(perfDaily, startCapital, capital)
  if (!whole) return null
  const withBacktest = backtestUntil !== undefined && backtestEndCapital !== undefined
  // The simulation alone, on the same scale as the whole curve (capital / start capital).
  const simOnly = withBacktest
    ? simulateOnCapital(simulationOnlyPerf(perfDaily, backtestUntil), backtestEndCapital,
      capital * backtestEndCapital / startCapital)
    : null
  const lead = simOnly ?? whole
  const backtestEur = withBacktest ? (backtestEndCapital - startCapital) * capital / startCapital : 0

  return (
    <section aria-labelledby="capital-title" className="border-t border-border py-8">
      <h2 id="capital-title" className="text-2xl font-semibold mb-3">Et sur mon capital ?</h2>
      {withBacktest ? (
        <p className="text-sm text-muted mb-4 max-w-[68ch]">
          {`La courbe de ce bot, ${period(whole.firstDate, whole.lastDate)}, relue à l’échelle d’un capital de départ que tu choisis. Jusqu’au ${longDateOrdinal(backtestUntil)}, c’est le backtest, sur des données que la stratégie avait déjà vues ; la suite est la simulation, et c’est elle que je chiffre d’abord. C’est une lecture du passé, pas une projection : les résultats passés ne préjugent pas des résultats futurs.`}
        </p>
      ) : (
        <p className="text-sm text-muted mb-4 max-w-[68ch]">
          {`Le même historique observé (${period(whole.firstDate, whole.lastDate)}), relu à l’échelle d’un capital de départ que tu choisis. C’est une lecture du passé, pas une projection : les résultats passés ne préjugent pas des résultats futurs.`}
        </p>
      )}

      <div role="group" aria-label="Capital de départ" className="flex gap-2 mb-5 flex-wrap">
        {PRESETS.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => setCapital(preset)}
            aria-pressed={capital === preset}
            className={`min-h-11 px-3 rounded border text-sm font-medium tabular-nums transition-colors ${
              capital === preset
                ? 'border-accent bg-card-2 text-foreground'
                : 'border-border-strong text-foreground hover:bg-card-2'
            }`}
          >
            {`${preset} €`}
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-border py-4">
        <div>
          <dt className="text-xs text-muted mb-0.5">
            {withBacktest ? `Résultat de la simulation, depuis le ${longDateOrdinal(nextDay(backtestUntil))}` : 'Résultat sur la période'}
          </dt>
          <dd className={`text-xl tabular-nums ${tone(lead.pnlEur)}`}>{fmtEur(lead.pnlEur)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted mb-0.5">
            {`Pire mois${lead.worstMonthLabel ? ` (${fmtMonthLabel(lead.worstMonthLabel)})` : ''}`}
          </dt>
          {lead.worstMonthEur === 0 ? (
            <dd className="text-sm tabular-nums text-foreground pt-1.5">aucun mois négatif</dd>
          ) : (
            <dd className="text-xl tabular-nums text-negative">{fmtEur(lead.worstMonthEur)}</dd>
          )}
        </div>
        <div>
          <dt className="text-xs text-muted mb-0.5">Pire creux (depuis un plus haut)</dt>
          <dd className={`text-xl tabular-nums ${tone(lead.maxDrawdownEur)}`}>{fmtEur(lead.maxDrawdownEur)}</dd>
        </div>
      </dl>
      {withBacktest && (
        <p data-testid="capital-backtest" className="text-sm text-muted mt-3 tabular-nums">
          {`Depuis le 1er janvier, backtest compris : ${fmtEur(whole.pnlEur)}, dont ${fmtEur(backtestEur)} de backtest.`}
        </p>
      )}

      <p className="text-xs text-muted mt-4">
        Simple règle de trois sur les résultats déjà publiés de ce bot ; aucune donnée n’est
        envoyée, rien n’est un conseil en investissement personnalisé.
      </p>
    </section>
  )
}
