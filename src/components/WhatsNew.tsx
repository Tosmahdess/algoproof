import Link from 'next/link'
import type { BotChangelog, ScopeType } from '@/lib/types'
import { SCOPE_META, scopeLabel } from '@/lib/changelog'

const ORDER: ScopeType[] = ['fleet', 'mi', 'wealth', 'bot']

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function WhatsNew({ latest }: { latest: Record<ScopeType, BotChangelog | null> }) {
  const cards = ORDER.map(s => latest[s]).filter((e): e is BotChangelog => e !== null)
  if (cards.length === 0) return null

  return (
    <section className="border border-border rounded-xl p-6 my-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold">Quoi de neuf</h2>
        <Link href="/journal" className="text-sm text-accent">Voir tout le journal →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(entry => {
          const meta = SCOPE_META[entry.scope_type]
          return (
            <div
              key={entry.id}
              className="bg-card border border-border rounded-lg p-3.5 flex flex-col gap-1.5"
              style={{ borderTop: `3px solid ${meta.color}` }}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                  {scopeLabel(entry)}
                </span>
                <span className="text-[10px] font-mono text-muted">{fmtDate(entry.entry_date)}</span>
              </div>
              <span className="text-sm text-foreground">{entry.summary}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
