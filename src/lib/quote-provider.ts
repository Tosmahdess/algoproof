export type Quote = { price: number; currency: string; asOf: string }

// Default provider: Yahoo Finance chart endpoint (keyless). Provider-agnostic seam —
// swap the body of getQuote for Finnhub/FMP later without touching callers.
export async function getQuote(tickerYf: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(tickerYf)}?range=1d&interval=1d`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    if (typeof price !== 'number') return null
    return { price, currency: meta?.currency ?? 'USD', asOf: new Date().toISOString() }
  } catch {
    return null
  }
}
