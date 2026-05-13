import { BYBIT_AFFILIATE_URL } from '@/lib/affiliates'

const HL_URL    = 'https://app.hyperliquid.xyz'

export default function ExchangeAlert({ exchange }: { exchange: string }) {
  if (!exchange.includes('Binance Futures')) return null

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-yellow-800/40 bg-yellow-950/30 px-4 py-3 text-sm">
      <span className="text-yellow-200/80">
        🇫🇷 En France, Binance Futures n&apos;est pas accessible (AMF 2023).
      </span>
      <div className="flex flex-wrap gap-2">
        <a
          href={BYBIT_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-yellow-700/50 bg-yellow-900/40 px-3 py-1 text-xs font-medium text-yellow-200 transition-colors hover:bg-yellow-800/50"
        >
          Bybit ↗
        </a>
        <a
          href={HL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-yellow-700/30 px-3 py-1 text-xs font-medium text-yellow-200/70 transition-colors hover:text-yellow-200"
        >
          Hyperliquid ↗
        </a>
        <a
          href="/start"
          className="text-xs text-yellow-400/70 underline underline-offset-2 hover:text-yellow-400"
        >
          Guide complet →
        </a>
      </div>
    </div>
  )
}
