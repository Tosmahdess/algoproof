'use client'

import Link from 'next/link'
import { useState } from 'react'
import { linkClass } from '@/lib/link-roles'

// The variants of one idea (lot 2, D079): a register, not cards, like the lab's
// survivor pages (D-ALG-SURV-TABLE-1). What varies is shown by NAME (filters);
// the values are the lab's, one click away for the running ones' fiche or the
// lab's preset. 25 rows at a time.

export interface VariantRow {
  slug: string
  rank: number | null
  name: string
  state: string
  stateTone: 'run' | 'stop' | 'wait'
  waitLabel: string
  filters: string[]
  mtfCaveat: boolean
  nAssets: number
  pfBacktest: string | null
  tradesBacktest: number | null
  simTrades: number
  simSign: 'up' | 'down' | 'young' | null
  href: string | null
  external: boolean
}

const PAGE = 25

const TONE: Record<VariantRow['stateTone'], string> = {
  run: 'text-positive', stop: 'text-negative', wait: 'text-muted',
}

function Sim({ v }: { v: VariantRow }) {
  if (v.simSign === null) return <span className="text-muted">pas lancée</span>
  if (v.simSign === 'young') return <span className="text-muted">{v.simTrades} trades, trop jeune</span>
  return (
    <span className={v.simSign === 'up' ? 'text-positive' : 'text-negative'}>
      {v.simTrades} trades, {v.simSign === 'up' ? 'au-dessus de zéro' : 'en dessous de zéro'}
    </span>
  )
}

export default function VariantTable({ rows }: { rows: VariantRow[] }) {
  const [shown, setShown] = useState(PAGE)
  return (
    <div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.slice(0, shown).map(v => (
          <li key={v.slug} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {v.rank ? `n° ${v.rank}` : v.name}{' '}
                <span className={`ml-1 text-xs font-normal ${TONE[v.stateTone]}`}>{v.state}</span>
              </p>
              {v.waitLabel && <p className="text-xs text-muted">{v.waitLabel}</p>}
              <p className="mt-1 text-xs text-muted">
                {v.filters.length ? `Filtres : ${v.filters.join(', ')}` : 'Sans filtre'}
                {' · '}{v.nAssets} {v.nAssets > 1 ? 'marchés' : 'marché'}
                {v.mtfCaveat && ' · filtre multi-timeframe (léger écart possible entre backtest et live)'}
              </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs sm:justify-end sm:text-right">
              <span className="font-mono text-muted">
                PF backtest <span className="text-foreground">{v.pfBacktest ?? '—'}</span>
                {v.tradesBacktest != null && ` · ${v.tradesBacktest} trades`}
              </span>
              <Sim v={v} />
              {v.href && (v.external
                ? <a href={v.href} className={linkClass('inline')}>Réglages dans le labo</a>
                : <Link href={v.href} className={linkClass('inline')}>Voir la fiche</Link>)}
            </div>
          </li>
        ))}
      </ul>
      {rows.length > shown && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => setShown(s => s + PAGE)}
            className="min-h-10 rounded-md border border-border-strong bg-card px-5 text-sm text-foreground hover:border-accent">
            Afficher {Math.min(PAGE, rows.length - shown)} de plus ({rows.length - shown} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
