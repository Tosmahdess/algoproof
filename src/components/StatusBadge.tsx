import { BotStatus } from '@/lib/types'

const config: Record<BotStatus, { label: string; classes: string }> = {
  paper:    { label: 'Paper trading', classes: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50' },
  live:     { label: 'Live',           classes: 'bg-positive/10 text-positive border-positive/30' },
  backtest: { label: 'Backtest',      classes: 'bg-accent/10 text-accent border-accent/30' },
  frozen:   { label: 'Gelé',          classes: 'bg-muted/10 text-muted border-muted/30' },
}

export default function StatusBadge({ status }: { status: BotStatus }) {
  const { label, classes } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${classes}`}>
      {status === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-positive mr-1.5 animate-pulse" />
      )}
      {label}
    </span>
  )
}
