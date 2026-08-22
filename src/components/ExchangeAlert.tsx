import { BYBIT_AFFILIATE_URL, HL_AFFILIATE_URL } from '@/lib/affiliates'

export default function ExchangeAlert({ exchange }: { exchange: string }) {
  if (!exchange.includes('Binance Futures')) return null

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <span className="text-warning/80">
        🇫🇷 En France, Binance Futures n&apos;est pas accessible (AMF 2023).
      </span>
      <div className="flex flex-wrap gap-2">
        <a
          href={BYBIT_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-warning/50 bg-warning/20 px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/30"
        >
          Bybit ↗
        </a>
        <a
          href={HL_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-warning/30 px-3 py-1 text-xs font-medium text-warning/70 transition-colors hover:text-warning"
        >
          Hyperliquid ↗
        </a>
        <a
          href="/start"
          className="text-xs text-warning/70 underline underline-offset-2 hover:text-warning"
        >
          Guide complet →
        </a>
      </div>
    </div>
  )
}
