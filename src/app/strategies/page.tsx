import Link from 'next/link'
import { fichesByFamily } from '@/lib/strategy-library'
import { familyLabel, familyDescription } from '@/lib/families'
import { getAllBotsWithStats } from '@/lib/queries'
import { incarnationsOf } from '@/lib/incarnations'

export const revalidate = 300

export const metadata = {
  title: 'Les stratégies de trading, expliquées et testées',
  description:
    'Chaque stratégie que je teste, expliquée en français simple : comment elle marche, quand elle marche, quand elle meurt, et quels bots la font tourner chez moi.',
  openGraph: { url: 'https://algoproof.fr/strategies' },
}

export default async function StrategiesIndexPage() {
  const bots = await getAllBotsWithStats()
  const groups = fichesByFamily()

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl mb-2">Les stratégies</h1>
      <p className="text-sm text-muted mb-8">
        Comment marche chaque stratégie que je teste, et lesquelles tournent
        vraiment chez moi. Pour voir les bots en direct, va sur{' '}
        <Link href="/overview" className="text-accent">La flotte</Link>.
      </p>

      {groups.map(({ family, fiches }) => (
        <section key={family} className="mb-10">
          <h2 className="text-xs uppercase tracking-wider text-muted mb-3">
            {familyLabel(family)}
          </h2>
          <p className="text-xs text-muted mb-4 max-w-2xl">{familyDescription(family)}</p>
          <ul className="space-y-2">
            {fiches.map(f => {
              const n = incarnationsOf(f, bots).length
              return (
                <li key={f.slug}>
                  <Link
                    href={`/strategies/${f.slug}`}
                    className="block bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm">{f.title}</span>
                      <span className="text-xs text-muted font-mono">
                        {n === 0 ? 'aucun bot' : `${n} bot${n > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">{f.oneLiner}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
