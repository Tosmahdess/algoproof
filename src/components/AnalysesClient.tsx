'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { FicheIndexRow } from '@/lib/equity'
import type { Verdict } from '@/lib/types'
import { categoryLabel } from '@/lib/fiche-categories'

const VERDICT_META: Record<Verdict, { label: string; color: string }> = {
  renforcer: { label: 'RENFORCER', color: '#3fb950' },
  maintenir: { label: 'MAINTENIR', color: '#f6c90e' },
  skip:      { label: 'PASSER',    color: '#ff4444' },
}
const FILTERS: { key: Verdict | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' }, { key: 'renforcer', label: 'Renforcer' },
  { key: 'maintenir', label: 'Maintenir' }, { key: 'skip', label: 'Passer' },
]

export default function AnalysesClient({ fiches }: { fiches: FicheIndexRow[] }) {
  const [filter, setFilter] = useState<Verdict | 'all'>('all')

  const sections = useMemo(() => {
    const shown = filter === 'all' ? fiches : fiches.filter(f => f.verdict === filter)
    const byCat = new Map<string, FicheIndexRow[]>()
    for (const f of shown) {
      const k = f.category ?? 'autres'
      if (!byCat.has(k)) byCat.set(k, [])
      byCat.get(k)!.push(f)
    }
    return [...byCat.entries()].map(([cat, rows]) => ({ cat, rows }))
  }, [fiches, filter])

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-8">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm px-3 py-1 rounded-full border ${
              filter === f.key ? 'border-accent text-accent' : 'border-border text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted italic py-8">Aucune analyse pour ce filtre.</p>
      ) : sections.map(({ cat, rows }) => (
        <section key={cat} className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-accent border-b border-border pb-1 mb-3">
            {categoryLabel(cat === 'autres' ? null : cat)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {rows.map(f => {
              const v = VERDICT_META[f.verdict]
              return (
                <Link
                  key={f.ticker}
                  href={`/wealth/${encodeURIComponent(f.ticker)}`}
                  className="block rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-zinc-900/60"
                  style={{ borderColor: v.color + '40' }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-sm">{f.ticker}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: v.color, background: v.color + '1f' }}>{v.label}</span>
                  </div>
                  <div className="text-[11px] text-muted truncate mt-1">{f.asset_name}</div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
