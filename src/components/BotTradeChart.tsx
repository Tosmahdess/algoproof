'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart, CandlestickSeries, LineSeries, ColorType,
} from 'lightweight-charts'
import type { UTCTimestamp } from 'lightweight-charts'
import type { Trade } from '@/lib/types'
import { assetToBinanceSymbol, timeframeToInterval } from '@/lib/tv-symbol'

type Kline = { time: UTCTimestamp; open: number; high: number; low: number; close: number }

async function fetchKlines(symbol: string, interval: string): Promise<Kline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`klines ${res.status}`)
  const raw: unknown[] = await res.json()
  return (raw as number[][]).map(k => ({
    time: Math.floor(k[0] / 1000) as UTCTimestamp, // LWC uses seconds
    open: +k[1], high: +k[2], low: +k[3], close: +k[4],
  }))
}

export default function BotTradeChart({
  asset, timeframe, trades,
}: { asset: string; timeframe: string; trades: Trade[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const symbol = assetToBinanceSymbol(asset)
    if (!symbol || !ref.current) { setFailed(true); return }
    let chart: ReturnType<typeof createChart> | null = null
    let cancelled = false

    fetchKlines(symbol, timeframeToInterval(timeframe)).then(candles => {
      if (cancelled || !ref.current) return
      chart = createChart(ref.current, {
        autoSize: true,
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
        grid: { vertLines: { visible: false }, horzLines: { color: '#1f2937' } },
        timeScale: { timeVisible: true },
      })
      const candleSeries = chart.addSeries(CandlestickSeries, {})
      candleSeries.setData(candles)

      // One entry->exit segment per priced trade, colored by pnl.
      const first = candles[0]?.time ?? (0 as UTCTimestamp)
      for (const t of trades) {
        const o = Math.floor(new Date(t.opened_at).getTime() / 1000) as UTCTimestamp
        const c = Math.floor(new Date(t.closed_at).getTime() / 1000) as UTCTimestamp
        if (o < first) continue                       // outside the visible window
        if (t.entry_price == null || t.exit_price == null) continue  // degrade: no segment
        const color = t.pnl >= 0 ? '#22c55e' : '#ef4444'
        const seg = chart.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
        seg.setData([
          { time: o, value: t.entry_price },
          { time: c, value: t.exit_price },
        ])
      }
      chart.timeScale().fitContent()
    }).catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true; chart?.remove() }
  }, [asset, timeframe, trades])

  if (failed) return null   // fiche keeps its Recharts equity curve as fallback
  return (
    <div>
      <div ref={ref} className="w-full h-[360px]" />
      <p className="text-xs text-gray-500 mt-1">
        Graphique <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="underline">TradingView</a> · bougies Binance · trades réels tracés à leur prix d&apos;exécution
      </p>
    </div>
  )
}
