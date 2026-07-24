'use client'
// Thin client wrapper: src/app/page.tsx is a Server Component, and
// next/dynamic(..., { ssr: false }) is not allowed there directly in Next 15/16 —
// it throws at build time. This island owns the dynamic import + ssr:false so the
// page itself stays server-rendered.
import dynamic from 'next/dynamic'

const TVTickerTape = dynamic(() => import('@/components/tv/TVTickerTape'), { ssr: false })

export default function TVTickerTapeIsland() {
  return <TVTickerTape />
}
