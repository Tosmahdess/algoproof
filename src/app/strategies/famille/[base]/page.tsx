// src/app/strategies/famille/[base]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStrategyDossier, isDossierUnlocked, TF_ORDER } from '@/lib/screening'
import ScreeningDossier from '@/components/ScreeningDossier'

export const revalidate = 300

export async function generateMetadata(
  { params }: { params: Promise<{ base: string }> },
): Promise<Metadata> {
  const { base } = await params
  return {
    title: `${base} — ce que le gantelet en dit, timeframe par timeframe`,
    description: `Toutes les configurations de ${base} que j'ai testées, celles que j'ai rejetées, et les rares qui tiennent encore.`,
  }
}

export default async function StrategyFamilyPage(
  { params }: { params: Promise<{ base: string }> },
) {
  const { base } = await params
  const { campaigns, candidates, events } = await getStrategyDossier(base)
  if (campaigns.length === 0) notFound()

  const ordered = [...campaigns].sort(
    (a, b) => TF_ORDER.indexOf(a.tf as (typeof TF_ORDER)[number]) -
      TF_ORDER.indexOf(b.tf as (typeof TF_ORDER)[number]),
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{base}</h1>
        <p className="text-sm text-muted">
          Je passe cette stratégie au gantelet, timeframe par timeframe. Rien ici ne réagit au
          marché d&apos;aujourd&apos;hui : ce qui bouge, c&apos;est la mesure, pas le marché.
        </p>
      </header>

      {ordered.map((c) =>
        c.state === 'judged' && isDossierUnlocked(c.base, c.tf) ? (
          <ScreeningDossier key={c.tf} campaign={c} candidates={candidates[c.id!] ?? []} />
        ) : null,
      )}

      {events.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
            Journal des verdicts
          </h2>
          <ul className="space-y-1 text-sm">
            {events.map((e, i) => (
              <li key={i}>
                <span className="font-mono text-muted">{e.happened_on}</span>{' '}
                <span className="font-mono text-muted">{e.tf}</span> · {e.summary}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
