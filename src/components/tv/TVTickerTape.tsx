// src/components/tv/TVTickerTape.tsx
'use client'
import { useEffect, useRef } from 'react'

export default function TVTickerTape() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    s.async = true
    s.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'BINANCE:BTCUSDT', title: 'BTC' },
        { proName: 'BINANCE:ETHUSDT', title: 'ETH' },
        { proName: 'BINANCE:SOLUSDT', title: 'SOL' },
      ],
      colorTheme: 'dark', isTransparent: true, displayMode: 'adaptive', locale: 'fr',
    })
    ref.current.appendChild(s)
    const node = ref.current
    return () => { node.innerHTML = '' }
  }, [])
  return <div className="tradingview-widget-container" ref={ref} />
}
