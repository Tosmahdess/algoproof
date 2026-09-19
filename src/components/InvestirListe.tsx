'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Contexte, FicheIndex } from '@/lib/investir'
import { compteParAlerte, compteParCouverture, residuDe } from '@/lib/investir'

// Ne reçoit que l'index : nom, alertes, couverture. Aucune prose ne transite
// par ce composant, et c'est délibéré — un composant client livre tout ce
// qu'il reçoit dans la charge envoyée au navigateur, qu'il l'affiche ou non.
//
// Il coupait sur `grade`. Le moteur n'émet plus que `lu` ou `non note`, et la
// porte de publication refuse les `non note` : le champ était devenu constant
// sur les 1 407 lignes. Les trois puces auraient rendu zéro ligne chacune.
//
// Ce qui coupe maintenant, c'est le crible : une puce par ALERTE nommée par le
// fait, et un groupe « Couverture » qui rend l'opacité visible.
//
// ⚠️ Il n'y a PAS de puce « sans alerte », et ce n'est pas un oubli. Deux
// raisons, la seconde étant la vraie :
//
//  1. « aucune alerte » est plus facile à obtenir là où moins de séries ont pu
//     être lues — une fiche à 5 contrôles lus et 0 alerte n'est pas meilleure
//     qu'une fiche à 7 contrôles lus et 1 alerte. Un filtre dessus
//     sur-sélectionnerait les fiches les moins couvertes.
//  2. Filtrer par ABSENCE de signal rend une liste de sociétés que le site n'a
//     rien trouvé à reprocher : un blanc-seing implicite. MAR art. 3(1)(35)
//     vise l'opinion sur la valeur d'un titre « explicitement OU
//     IMPLICITEMENT », sans besoin de chiffre ni d'adjectif — et un « 0 sur
//     7 » a l'air d'une mesure, donc porte plus loin que l'ancien « Comptes
//     solides ». Filtrer par alerte POSITIVE est de l'autre côté de la ligne :
//     c'est une phrase du dépôt, sourcée, réfutable, et défavorable.
//
// Pour la même raison il n'y a aucun TRI par nombre d'alertes : ascendant,
// c'est un palmarès ; descendant, c'est une liste à vendre.

export default function InvestirListe({
  lignes,
  contexte,
}: {
  lignes: FicheIndex[]
  contexte: Contexte
}) {
  const [recherche, setRecherche] = useState('')
  const [alertes, setAlertes] = useState<Set<string>>(new Set())
  const [couverture, setCouverture] = useState<Set<number>>(new Set())
  const [grandes, setGrandes] = useState(false)
  const [famille, setFamille] = useState('')

  // Les familles présentes, les plus peuplées d'abord : à 1 407 lignes, un
  // ordre alphabétique de 58 entrées ne sert personne.
  const familles = useMemo(() => {
    const compte = new Map<string, number>()
    for (const l of lignes) if (l.famille) compte.set(l.famille, (compte.get(l.famille) ?? 0) + 1)
    return [...compte.entries()].sort((a, b) => b[1] - a[1])
  }, [lignes])

  // Dérivées des lignes, jamais d'une liste figée : une puce sans ligne
  // derrière se viderait au clic sans que le lecteur sache pourquoi.
  const puces = useMemo(() => compteParAlerte(lignes), [lignes])
  const paliers = useMemo(() => compteParCouverture(lignes), [lignes])

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return lignes.filter(l => {
      if (q && !l.name.toLowerCase().includes(q)) return false
      // OU au sein du groupe : cocher deux alertes élargit, comme le lecteur
      // s'y attend d'une liste de signaux.
      if (alertes.size && !l.alertes.some(a => alertes.has(a))) return false
      if (couverture.size && !couverture.has(l.n_lus)) return false
      if (grandes && !l.core) return false
      if (famille && l.famille !== famille) return false
      return true
    })
  }, [lignes, recherche, alertes, couverture, grandes, famille])

  function bascule<T>(valeur: T, courant: Set<T>, poser: (s: Set<T>) => void) {
    const suivant = new Set(courant)
    if (suivant.has(valeur)) suivant.delete(valeur)
    else suivant.add(valeur)
    poser(suivant)
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
      </div>

      {/* Folded on every screen (user decision 2026-09-19): eight chips with
          long labels took 400 px on a phone before the list. UNCONTROLLED on
          purpose — an `open` driven by the selection would fold the block
          under the finger when its last chip is released. Folded, the summary
          names the active alerts in clear, in chip order: it counts motifs,
          never companies, so it cannot turn into a tally. Coverage stays
          outside, open: it is what shows how much each filing let me read. */}
      <details className="mb-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted mb-2">
          Alerte relevée dans le dépôt · {puces.length} motif{puces.length > 1 ? 's' : ''}
          {alertes.size > 0 && (
            <span className="text-accent">
              {' · '}
              {puces.filter(([motif]) => alertes.has(motif))
                .map(([motif]) => contexte.libelles[motif] ?? motif).join(' · ')}
            </span>
          )}
        </summary>
        <fieldset className="border-0 p-0 m-0">
          <legend className="sr-only">Alerte relevée dans le dépôt</legend>
          <div className="flex flex-wrap gap-2">
            {puces.map(([motif, n]) => (
              <button
                key={motif}
                onClick={() => bascule(motif, alertes, setAlertes)}
                aria-pressed={alertes.has(motif)}
                className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                  alertes.has(motif)
                    ? 'text-accent border-accent/40 bg-accent/10'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {contexte.libelles[motif] ?? motif} ({n})
              </button>
            ))}
          </div>
        </fieldset>
      </details>

      <fieldset className="mb-4 border-0 p-0 m-0">
        <legend className="text-xs font-semibold text-muted mb-2">
          Couverture — combien des sept contrôles ce dépôt a permis de lire
        </legend>
        <div className="flex flex-wrap gap-2">
          {paliers.map(([lus, n]) => (
            <button
              key={lus}
              onClick={() => bascule(lus, couverture, setCouverture)}
              aria-pressed={couverture.has(lus)}
              className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
                couverture.has(lus)
                  ? 'text-accent border-accent/40 bg-accent/10'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {lus} contrôles lus ({n})
            </button>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted mb-3">
        {visibles.length} société{visibles.length > 1 ? 's' : ''} sur {lignes.length}
      </p>

      <ul className="divide-y divide-border border-y border-border">
        {visibles.map(l => (
          <li key={l.cik}>
            <Link
              href={`/investir/${l.slug}`}
              className="flex flex-col gap-1 px-1 py-3 hover:bg-card/60 transition-colors"
            >
              <span className="font-medium">{l.name}</span>
              {/* La phrase du MOTEUR, pas une phrase d'ici : le compte ne se
                  montre jamais sans son dénominateur, et deux formulations
                  dériveraient (le pluriel d'« alerte » suffit à les séparer). */}
              <span className="text-xs text-muted">{residuDe(l, contexte.residus)}</span>
              {l.alertes.length > 0 && (
                <span className="text-xs text-foreground/80">
                  {l.alertes.map(a => contexte.libelles[a] ?? a).join(' · ')}
                </span>
              )}
              {l.non_lus.length > 0 && (
                <span className="text-xs text-muted">
                  Non lu : {l.non_lus.map(n => contexte.libelles_non_lus[n] ?? n).join(', ')}
                </span>
              )}
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
