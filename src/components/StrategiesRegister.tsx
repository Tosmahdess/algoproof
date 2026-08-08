'use client'
// The fiche register of /strategies, with its search box. 22 fiches across 7
// families, and the engine keeps promoting bots — a visitor must be able to
// reach one fiche by typing instead of scanning every family section.
//
// Receives plain serializable groups from the server page (this component's
// initial render still happens server-side, so the full list stays in the
// served HTML for crawlers — the search only ever narrows it after hydration).
import { useMemo, useState } from 'react'
import Link from 'next/link'
import SearchInput from '@/components/SearchInput'

export interface FicheRow {
  slug: string
  title: string
  oneLiner: string
  botCount: number
}

export interface FicheGroup {
  family: string
  label: string
  description: string
  fiches: FicheRow[]
}

// Accent- and case-insensitive haystack. NFD splits a base letter from its
// combining accent; stripping the combining range makes « CROISÉMENT » match
// « croisement ».
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function StrategiesRegister({ groups }: { groups: FicheGroup[] }) {
  const [query, setQuery] = useState('')

  const totalCount = useMemo(
    () => groups.reduce((n, g) => n + g.fiches.length, 0),
    [groups],
  )

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return groups
    return groups
      .map(g => ({
        ...g,
        fiches: g.fiches.filter(f =>
          normalize(`${f.title} ${f.oneLiner} ${g.label}`).includes(q)),
      }))
      .filter(g => g.fiches.length > 0)
  }, [groups, query])

  const resultCount = visible.reduce((n, g) => n + g.fiches.length, 0)

  return (
    <div data-testid="strategies-register">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Rechercher une stratégie…"
        resultCount={resultCount}
        totalCount={totalCount}
      />

      {visible.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-sm">
          <p>Aucune stratégie ne correspond à « {query.trim()} ».</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 text-xs text-accent underline"
          >
            Tout réafficher
          </button>
        </div>
      ) : (
        visible.map(g => (
          <section key={g.family} className="mb-10">
            <h2 className="text-xs uppercase tracking-wider text-muted mb-3">{g.label}</h2>
            <p className="text-xs text-muted mb-4 max-w-2xl">{g.description}</p>
            <ul className="space-y-2">
              {g.fiches.map(f => (
                <li key={f.slug}>
                  <Link
                    href={`/strategies/${f.slug}`}
                    className="block bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm">{f.title}</span>
                      <span className="text-xs text-muted font-mono">
                        {f.botCount === 0 ? 'aucun bot' : `${f.botCount} bot${f.botCount > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">{f.oneLiner}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
