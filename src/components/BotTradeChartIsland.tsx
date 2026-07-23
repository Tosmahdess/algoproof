'use client'
// Thin client wrapper: the fiche page (src/app/strategies/[slug]/page.tsx) is a Server
// Component, and next/dynamic(..., { ssr: false }) is not allowed there directly in
// Next 15/16 — it throws at build time. This island owns the dynamic import + ssr:false
// so the page itself stays server-rendered.
import dynamic from 'next/dynamic'
import type { Trade } from '@/lib/types'

const BotTradeChart = dynamic(() => import('@/components/BotTradeChart'), { ssr: false })

export default function BotTradeChartIsland({
  asset, timeframe, trades,
}: { asset: string; timeframe: string; trades: Trade[] }) {
  return <BotTradeChart asset={asset} timeframe={timeframe} trades={trades} />
}
