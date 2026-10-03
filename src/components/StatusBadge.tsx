import { BotStatus } from '@/lib/types'
import { RegimeMark } from '@/components/icons'

// The regime is a FORM and a WORD, never a colour (design review 2026-09-09,
// §3). Before: « Live » in the green that means « gain » on the same row, and
// « Paper trading » in the amber that means « warning » everywhere else — a
// traffic light applied to a distinction that is not a judgement. Now: a
// mark that survives greyscale (full disc / hollow circle / dotted circle),
// a full or dashed border, and the words of the site's own balance sheet
// (« Argent réel » / « Simulation »), so the table, the hero and /overview
// name one regime with one word.
//
// Finitions of 2026-10-03: the mark is drawn (src/components/icons.tsx), no
// longer the glyphs ● ○ ◌, and the real-money mark no longer pulses. The pulse
// said « en cours », which the word and the full disc already say; it was the
// only animation left on a row of the fleet. Pinned by
// tests/components/drawn-icons.test.tsx.
const config: Record<BotStatus, { label: string; classes: string }> = {
  paper:    { label: 'Simulation',  classes: 'bg-muted/10 text-muted border-muted/40 border-dashed' },
  live:     { label: 'Argent réel', classes: 'bg-foreground/10 text-foreground border-foreground/40' },
  backtest: { label: 'Backtest',    classes: 'bg-accent/10 text-accent border-accent/30 border-dotted' },
  frozen:   { label: 'Gelé',        classes: 'bg-muted/10 text-muted border-muted/30' },
  archived: { label: 'Archivé',     classes: 'bg-muted/10 text-muted border-muted/20' },
}

// Refonte « Le registre des décisions », lot 3 (2026-10-02): the bot fiche asks for the
// maquette's badge, `variant="registre"`: a plain contour in ink (dashed for a
// simulation), the same mark and word. Every other caller keeps the default above.
const REGISTRE: Record<BotStatus, string> = {
  paper:    'border-border-strong border-dashed text-foreground',
  live:     'border-border-strong text-foreground',
  backtest: 'border-border-strong border-dotted text-foreground',
  frozen:   'border-border-strong text-muted',
  archived: 'border-border-strong text-muted',
}

export default function StatusBadge({ status, variant = 'default' }: { status: BotStatus; variant?: 'default' | 'registre' }) {
  const { label, classes } = config[status]
  const shape = variant === 'registre' ? `rounded-sm ${REGISTRE[status]}` : `rounded ${classes}`
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${shape}`}>
      <RegimeMark status={status} />
      {label}
    </span>
  )
}
