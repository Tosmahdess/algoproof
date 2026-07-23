// src/components/tv/TVMiniChart.tsx
'use client'
import { useEffect, useRef } from 'react'

interface TVMiniChartProps {
  symbol: string
}

export default function TVMiniChart({ symbol }: TVMiniChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    s.async = true
    s.innerHTML = JSON.stringify({
      symbol,
      colorTheme: 'dark',
      locale: 'fr',
      dateRange: '3M',
      isTransparent: true,
    })
    ref.current.appendChild(s)
    const node = ref.current
    return () => { node.innerHTML = '' }
  }, [symbol])
  return <div className="tradingview-widget-container" ref={ref} />
}
