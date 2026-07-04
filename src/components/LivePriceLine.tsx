'use client'

import { useEffect, useState } from 'react'

// Cours live (Yahoo via /api/quote) + variation depuis le prix d'analyse (figé).
export function LivePriceLine({ tickerYf, priceAtGeneration, fallback }: { tickerYf: string; priceAtGeneration: number | null; fallback: number | null }) {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/quote/${encodeURIComponent(tickerYf)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(q => { if (alive) setPrice(q.price) })
      .catch(() => { if (alive) setPrice(fallback) })
    return () => { alive = false }
  }, [tickerYf, fallback])

  if (price == null) return <span className="text-[11px] text-zinc-600">cours…</span>

  const pct = priceAtGeneration ? ((price - priceAtGeneration) / priceAtGeneration) * 100 : null
  const color = pct == null ? '#71717a' : pct >= 0 ? '#3fb950' : '#ff4444'
  return (
    <span className="text-[11px] font-mono text-zinc-400">
      {price.toFixed(2)}
      {pct != null && (
        <span style={{ color }} className="ml-1.5 font-semibold">
          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          <span className="text-zinc-600 font-normal"> depuis l&apos;analyse</span>
        </span>
      )}
    </span>
  )
}
