import Link from 'next/link'
import type { BotChangelog } from '@/lib/types'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function ComponentChangelog(
  { title, entries, href }: { title: string; entries: BotChangelog[]; href: string },
) {
  if (entries.length === 0) return null
  return (
    <section className="border border-border rounded-xl p-6 my-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link href={href} className="text-sm text-accent">Voir tout →</Link>
      </div>
      <div className="divide-y divide-border">
        {entries.map(e => (
          <div key={e.id} className="flex gap-3 items-baseline py-2">
            <span className="text-xs font-mono text-muted w-14 flex-shrink-0">{fmtDate(e.entry_date)}</span>
            <span className="text-sm text-foreground">{e.summary}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
