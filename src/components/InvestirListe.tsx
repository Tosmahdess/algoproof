'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { FicheIndex, Grade } from '@/lib/investir'
import { COULEUR_NOTE, LIBELLE_NOTE } from '@/lib/investir'

// Ne reçoit que l'index : nom, note, porte. Aucune prose ne transite par ce
// composant, et c'est délibéré — un composant client livre tout ce qu'il reçoit
// dans la charge envoyée au navigateur, qu'il l'affiche ou non.

const NOTES: Grade[] = ['solide', 'a surveiller', 'fragile']

export default function InvestirListe({ lignes }: { lignes: FicheIndex[] }) {
  const [recherche, setRecherche] = useState('')
  const [notes, setNotes] = useState<Set<Grade>>(new Set())
  const [sansAncre, setSansAncre] = useState(false)
  const [grandes, setGrandes] = useState(false)
  const [famille, setFamille] = useState('')

  // Les familles présentes, les plus peuplées d'abord : à 1 407 lignes, un
  // ordre alphabétique de 58 entrées ne sert personne.
  const familles = useMemo(() => {
    const compte = new Map<string, number>()
    for (const l of lignes) if (l.famille) compte.set(l.famille, (compte.get(l.famille) ?? 0) + 1)
    return [...compte.entries()].sort((a, b) => b[1] - a[1])
  }, [lignes])

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return lignes.filter(l => {
      if (q && !l.name.toLowerCase().includes(q)) return false
      if (notes.size && !notes.has(l.grade)) return false
      if (sansAncre && l.anchor === 'mesuree') return false
      if (grandes && !l.core) return false
      if (famille && l.famille !== famille) return false
      return true
    })
  }, [lignes, recherche, notes, sansAncre, grandes, famille])

  const bascule = (note: Grade) => {
    const suivant = new Set(notes)
    if (suivant.has(note)) suivant.delete(note)
    else suivant.add(note)
    setNotes(suivant)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="search"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder="Chercher une société…"
          aria-label="Chercher une société"
          className="flex-1 min-w-56 rounded border border-border bg-card px-3 py-2 text-sm
                     placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <select
          value={famille}
          onChange={e => setFamille(e.target.value)}
          aria-label="Filtrer par secteur"
          className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold
                     text-muted focus:outline-none focus:border-accent max-w-56"
        >
          <option value="">Tous les secteurs</option>
          {familles.map(([nom, n]) => (
            <option key={nom} value={nom}>{nom} ({n})</option>
          ))}
        </select>
        {NOTES.map(note => (
          <button
            key={note}
            onClick={() => bascule(note)}
            aria-pressed={notes.has(note)}
            className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
              notes.has(note) ? COULEUR_NOTE[note] : 'border-border text-muted hover:text-foreground'
            }`}
          >
            {LIBELLE_NOTE[note]}
          </button>
        ))}
        <button
          onClick={() => setGrandes(!grandes)}
          aria-pressed={grandes}
          title="Flottant d'au moins deux milliards de dollars, ou chiffre d'affaires d'au moins trois milliards"
          className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
            grandes ? 'text-accent border-accent/40 bg-accent/10' : 'border-border text-muted hover:text-foreground'
          }`}
        >
          Grandes sociétés
        </button>
        <button
          onClick={() => setSansAncre(!sansAncre)}
          aria-pressed={sansAncre}
          title="Les sociétés dont je n'ai pas pu calculer le rapport entre le flottant et le résultat"
          className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
            sansAncre ? 'text-accent border-accent/40 bg-accent/10' : 'border-border text-muted hover:text-foreground'
          }`}
        >
          Sans ancre
        </button>
      </div>

      <p className="text-xs text-muted mb-3">
        {visibles.length} société{visibles.length > 1 ? 's' : ''} sur {lignes.length}
      </p>

      <ul className="divide-y divide-border border-y border-border">
        {visibles.map(l => (
          <li key={l.cik}>
            <Link
              href={`/investir/${l.slug}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 py-3 hover:bg-card/60 transition-colors"
            >
              <span className="font-medium">{l.name}</span>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${COULEUR_NOTE[l.grade]}`}>
                {LIBELLE_NOTE[l.grade]}
              </span>
              {l.anchor !== 'mesuree' && (
                <span className="text-[10px] uppercase tracking-wider text-muted border border-border rounded px-2 py-0.5">
                  sans ancre
                </span>
              )}
              {l.gate && <span className="text-xs text-muted">{l.gate}</span>}
            </Link>
          </li>
        ))}
      </ul>

      {visibles.length === 0 && (
        <p className="text-sm text-muted py-8 text-center">
          Aucune société ne correspond. Retire un filtre.
        </p>
      )}
    </div>
  )
}
