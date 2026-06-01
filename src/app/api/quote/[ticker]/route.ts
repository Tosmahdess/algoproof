import { NextResponse } from 'next/server'
import { getQuote } from '@/lib/quote-provider'

export const runtime = 'nodejs'
export const revalidate = 300 // 5-min cache

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const quote = await getQuote(ticker)
  if (!quote) return NextResponse.json({ error: 'quote unavailable' }, { status: 404 })
  return NextResponse.json(quote, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
