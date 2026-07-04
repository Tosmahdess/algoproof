import type { TriggerData } from '@/lib/types'

const PF_TARGET     = 1.15
const TRADES_TARGET = 30

interface Props { data: TriggerData | null }

export default function TriggerCounter({ data }: Props) {
  if (!data || !data.isLive) return null

  const pfMet     = data.profitFactor >= PF_TARGET
  const tradesMet = data.totalTrades  >= TRADES_TARGET
  const allMet    = pfMet && tradesMet

  const pfWidth     = Math.min((data.profitFactor / PF_TARGET) * 100, 100)
  const tradesWidth = Math.min((data.totalTrades  / TRADES_TARGET) * 100, 100)

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xl">{allMet ? '🔓' : '🔒'}</span>
        <div>
          <p className="font-semibold text-sm">EMA Cross H4 Kraken Spot — en argent réel</p>
          <p className="text-xs text-muted">
            {allMet ? 'Preuve en réel : critères atteints' : 'Preuve en réel : en construction'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted">Profit Factor ≥ {PF_TARGET}</span>
            <span className={`font-mono font-semibold ${pfMet ? 'text-positive' : ''}`}>
              {data.profitFactor.toFixed(2)}{pfMet ? ' ✓' : ''}
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              data-testid="pf-bar"
              className={`h-full rounded-full transition-all ${pfMet ? 'bg-positive' : 'bg-[#ff6b35]'}`}
              style={{ width: `${pfWidth}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted">Trades live ≥ {TRADES_TARGET}</span>
            <span className={`font-mono font-semibold ${tradesMet ? 'text-positive' : ''}`}>
              {data.totalTrades} / {TRADES_TARGET}{tradesMet ? ' ✓' : ''}
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              data-testid="trades-bar"
              className={`h-full rounded-full transition-all ${tradesMet ? 'bg-positive' : 'bg-[#ff6b35]'}`}
              style={{ width: `${tradesWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
