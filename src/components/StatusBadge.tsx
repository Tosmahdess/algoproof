import { BotStatus } from '@/lib/types'

// The regime is a FORM and a WORD, never a colour (design review 2026-09-09,
// §3). Before: « Live » in the green that means « gain » on the same row, and
// « Paper trading » in the amber that means « warning » everywhere else — a
// traffic light applied to a distinction that is not a judgement. Now: a
// glyph that survives greyscale (● full disc / ○ hollow circle / ◌ dotted),
// a full or dashed border, and the words of the site's own balance sheet
// (« Argent réel » / « Simulation »), so the table, the hero and /overview
// name one regime with one word.
//
// The pulsing dot stays on the real-money badge: it says « en cours », which
// is true, without the green, which said « gagnant », which was not.
const config: Record<BotStatus, { glyph: string | null; label: string; classes: string }> = {
  paper:    { glyph: '○', label: 'Simulation',  classes: 'bg-muted/10 text-muted border-muted/40 border-dashed' },
  live:     { glyph: '●', label: 'Argent réel', classes: 'bg-foreground/10 text-foreground border-foreground/40' },
  backtest: { glyph: '◌', label: 'Backtest',    classes: 'bg-accent/10 text-accent border-accent/30' },
  frozen:   { glyph: null, label: 'Gelé',       classes: 'bg-muted/10 text-muted border-muted/30' },
  archived: { glyph: null, label: 'Archivé',    classes: 'bg-muted/10 text-muted border-muted/20' },
}

// Refonte « Le registre des décisions », lot 3 (2026-10-02): the bot fiche asks for the
// maquette's badge, `variant="registre"`: a plain contour in ink (dashed for a
// simulation), the same glyph and word, no pulse (the maquette has no animation). Every
// other caller keeps the default above, unchanged.
const REGISTRE: Record<BotStatus, string> = {
  paper:    'border-border-strong border-dashed text-foreground',
  live:     'border-border-strong text-foreground',
  backtest: 'border-border-strong border-dotted text-foreground',
  frozen:   'border-border-strong text-muted',
  archived: 'border-border-strong text-muted',
}

export default function StatusBadge({ status, variant = 'default' }: { status: BotStatus; variant?: 'default' | 'registre' }) {
  const { glyph, label, classes } = config[status]
  if (variant === 'registre') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium border whitespace-nowrap ${REGISTRE[status]}`}>
        {glyph && <span aria-hidden="true">{glyph}</span>}
        {label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${classes}`}>
      {glyph && (
        <span aria-hidden="true" className={status === 'live' ? 'animate-pulse motion-reduce:animate-none' : undefined}>{glyph}</span>
      )}
      {label}
    </span>
  )
}
