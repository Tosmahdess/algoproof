'use client'

import { useEffect, useState } from 'react'

type Props = { tickerYf: string; priceAtGeneration: number | null; fallbackPrice: number | null }

export function LivePerf({ tickerYf, priceAtGeneration, fallbackPrice }: Props) {
  const [price, setPrice] = useState<number | null>(null)
  const [deferred, setDeferred] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/quote/${encodeURIComponent(tickerYf)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((q) => { if (alive) { setPrice(q.price); setDeferred(false) } })
      .catch(() => { if (alive) { setPrice(fallbackPrice); setDeferred(true) } })
    return () => { alive = false }
  }, [tickerYf, fallbackPrice])

  if (price == null) return <span className="text-foreground/50">cours…</span>

  const pct = priceAtGeneration ? ((price - priceAtGeneration) / priceAtGeneration) * 100 : null
  const sign = pct != null && pct >= 0 ? '+' : ''
  const color = pct == null ? '#8b949e' : pct >= 0 ? '#3fb950' : '#ff4444'

  return (
    <span>
      <span className="font-mono">{price.toFixed(2)}</span>
      {pct != null && (
        <span style={{ color }} className="ml-2 font-semibold">
          {sign}{pct.toFixed(1)}% depuis l&apos;analyse
        </span>
      )}
      {deferred && <span className="ml-2 text-xs text-foreground/40">(cours différé)</span>}
    </span>
  )
}
