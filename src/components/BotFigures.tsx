// The three figures under the verdict panel (refonte « Le registre des décisions »,
// lot 3, 2026-10-02). A base, a result, their sum; the sum underlined twice like the
// foot of a ledger. Real money reads on the comparison base of 1 000 €, with no
// sentence explaining it (owner, 02/10). A simulation leads with its own result; when
// its curve starts with a backtest, the result since 1 January and the backtest's share
// are a grey line apart (audit 2026-10, constat 4). Without a trade: « — », no colour
// (constat 6).
import { fmtEur, fmtPct, frNumber, NARROW_NBSP } from '@/lib/display'

export interface FiguresProps {
  baseLabel: string
  base: number
  resultLabel: string
  /** Null when there is no trade to measure. */
  result: number | null
  /** The result against the base, in percent. */
  resultPct: number | null
  totalLabel: string
  /** A grey line apart, the backtest's share, or null. */
  apart?: string | null
}

interface Props extends FiguresProps {
  /** « 2 octobre 2026 »: the day the figures were read (refonte finition, 2026-10-02). */
  reading?: string | null
}

const money = (n: number) => `${frNumber(n, 2)}${NARROW_NBSP}€`

export default function BotFigures({ baseLabel, base, resultLabel, result, resultPct, totalLabel, apart = null, reading = null }: Props) {
  const tone = result === null ? 'text-muted' : result < 0 ? 'text-negative' : 'text-foreground'
  return (
    <div data-testid="bot-figures" className="mt-6">
      <dl className="grid grid-cols-3 gap-3 sm:gap-5 border-b border-border pb-4">
        <div>
          <dt className="text-xs text-muted min-h-9 sm:min-h-0">{baseLabel}</dt>
          <dd className="text-xl sm:text-3xl tabular-nums leading-tight mt-1 whitespace-nowrap">{money(base)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted min-h-9 sm:min-h-0">{resultLabel}</dt>
          <dd className={`text-xl sm:text-3xl tabular-nums leading-tight mt-1 whitespace-nowrap ${tone}`}>
            {result === null ? '—' : fmtEur(result)}
          </dd>
          {result !== null && resultPct !== null && (
            <dd className={`text-xs tabular-nums mt-0.5 ${tone}`}>{fmtPct(resultPct)}</dd>
          )}
        </div>
        <div>
          <dt className="text-xs text-muted min-h-9 sm:min-h-0">{totalLabel}</dt>
          <dd className="text-xl sm:text-3xl tabular-nums leading-tight mt-1 whitespace-nowrap">
            {result === null ? '—' : (
              <span className="underline decoration-double decoration-1 underline-offset-[6px]">{money(base + result)}</span>
            )}
          </dd>
        </div>
      </dl>
      {reading && <p data-testid="figures-reading" className="text-xs text-muted mt-2">{`Relevé du ${reading}.`}</p>}
      {apart && <p data-testid="figures-apart" className="text-sm text-muted mt-2">{apart}</p>}
    </div>
  )
}
