'use client'

import Link from 'next/link'
import { useId, useMemo, useState, type ReactNode } from 'react'
import type { Contexte, FicheIndex } from '@/lib/investir'
import { compteParAlerte, compteParCouverture, residuDe } from '@/lib/investir'
import { frNumber } from '@/lib/display'

// Lot 6 (2026-09-25, conception §5.5): 50 rows reach the DOM at a time. The
// page stays force-static and the whole index still travels (it did already);
// what is bounded is the rendered list — 1 406 rows made a 138 313 px page on
// a computer and 148 723 px on a phone. « Afficher 50 de plus » extends it.
const PAGE = 50

// Field, lists and buttons: 40 px high at least (§6 rule 2), on every screen —
// the same class everywhere so the guard of the tests can read it. The field
// and the lists are 16 px on a phone: under that, iOS zooms the page on focus.
const CIBLE = 'min-h-10'
const LISTE = `w-full min-w-0 rounded-md border border-border bg-card px-2 ${CIBLE} text-base sm:text-sm
               text-foreground focus:outline-none focus:border-accent`
const ACTIF = 'text-accent border-accent/40 bg-accent/10'
const REPOS = 'border-border text-muted hover:text-foreground'

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

// Ne reçoit que l'index : nom, alertes, couverture. Aucune prose ne transite
// par ce composant, et c'est délibéré — un composant client livre tout ce
// qu'il reçoit dans la charge envoyée au navigateur, qu'il l'affiche ou non.
//
// Il coupait sur `grade`. Le moteur n'émet plus que `lu` ou `non note`, et la
// porte de publication refuse les `non note` : le champ était devenu constant
// sur les 1 407 lignes. Les trois puces auraient rendu zéro ligne chacune.
//
// Ce qui coupe maintenant, c'est le crible : une option par ALERTE nommée par
// le fait, et une liste « Contrôles possibles » qui rend l'opacité visible.
//
// 2026-09-30 (user, au téléphone) : la recherche se perdait au milieu des
// filtres, et « Alerte relevée dans le dépôt » ne se lisait pas comme cliquable.
// La recherche est seule sur sa ligne ; les filtres sont des LISTES derrière UN
// bouton « Filtres » sur téléphone (toujours visibles dès lg), et la barre reste
// collée sous la nav pendant qu'on descend dans la liste. Une liste choisit UNE
// alerte : le OU entre plusieurs puces a disparu avec les puces.
//
// ⚠️ Il n'y a PAS d'option « sans alerte », et ce n'est pas un oubli. Deux
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
  const [alerte, setAlerte] = useState('')
  const [couverture, setCouverture] = useState('')
  const [grandes, setGrandes] = useState(false)
  const [famille, setFamille] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const panneau = useId()

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
      // Name OR ticker (C3.1 of the arbitration): « Apple » and « AAPL » find
      // the same page. The ticker is compared whole-string, lower-cased, like
      // the name; 142 rows have none and are searched by name only.
      if (q && !l.name.toLowerCase().includes(q) && !(l.symbole ?? '').toLowerCase().includes(q)) return false
      if (alerte && !l.alertes.includes(alerte)) return false
      if (couverture && l.n_lus !== Number(couverture)) return false
      if (grandes && !l.core) return false
      if (famille && l.famille !== famille) return false
      return true
    })
  }, [lignes, recherche, alerte, couverture, grandes, famille])

  // How many rows are shown, keyed by the filter state that opened them: any
  // change of a filter brings the reader back to the first page, also on the
  // way back to a state already seen (a filter released after two pages
  // opened must not restore a hundred rows). Reset during the render, the
  // pattern React documents for state derived from a previous render.
  const cleFiltres = JSON.stringify([recherche, alerte, couverture, grandes, famille])
  const [pages, setPages] = useState({ cle: cleFiltres, n: PAGE })
  if (pages.cle !== cleFiltres) setPages({ cle: cleFiltres, n: PAGE })
  const limite = pages.cle === cleFiltres ? pages.n : PAGE
  const rendues = visibles.slice(0, limite)

  // The search is not a filter: it has its own field, always in view.
  const actifs = (famille ? 1 : 0) + (alerte ? 1 : 0) + (couverture ? 1 : 0) + (grandes ? 1 : 0)
  function effacer() {
    setFamille(''); setAlerte(''); setCouverture(''); setGrandes(false)
  }

  return (
    <div>
      {/* One bar, stuck under the nav (--nav-h, z-40 under the nav's z-50, the
          pair StickyFilterBar documents): the field on its own line, then the
          lists, folded behind « Filtres » on a phone only. */}
      <div
        data-testid="investir-filtres"
        className="sticky top-[var(--nav-h)] z-40 mb-3 border-b border-border bg-bg py-3"
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Société ou ticker…"
              aria-label="Chercher une société ou un ticker"
              className={`w-full rounded-md border border-border-strong bg-card pl-9 pr-3 ${CIBLE} h-12 text-base
                         placeholder:text-muted focus:outline-none focus:border-accent`}
            />
          </div>
          <button
            type="button"
            onClick={() => setOuvert(v => !v)}
            aria-expanded={ouvert}
            aria-controls={panneau}
            className={`lg:hidden inline-flex shrink-0 items-center gap-2 rounded-md border px-3 ${CIBLE} h-12
                        text-sm font-semibold ${actifs > 0 ? ACTIF : REPOS}`}
          >
            Filtres
            {actifs > 0 && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">{actifs}</span>
            )}
            <svg
              className={`h-2.5 w-2.5 transition-transform ${ouvert ? 'rotate-180' : ''}`}
              viewBox="0 0 10 6" fill="currentColor" aria-hidden="true"
            >
              <path d="M0 0l5 6 5-6H0z" />
            </svg>
          </button>
        </div>

        <div id={panneau} className={`${ouvert ? 'mt-3' : 'hidden'} lg:mt-3 lg:block`}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_auto] lg:items-end">
            <Champ label="Secteur">
              <select value={famille} onChange={e => setFamille(e.target.value)} className={LISTE}>
                <option value="">Tous les secteurs</option>
                {familles.map(([nom, n]) => (
                  <option key={nom} value={nom}>{nom} ({n})</option>
                ))}
              </select>
            </Champ>
            {/* No « sans alerte » option (header). « Toutes les sociétés »
                is the absence of this filter, not a verdict. */}
            <Champ label="Alerte relevée dans le dépôt">
              <select value={alerte} onChange={e => setAlerte(e.target.value)} className={LISTE}>
                <option value="">Toutes les sociétés</option>
                {puces.map(([motif, n]) => (
                  <option key={motif} value={motif}>{contexte.libelles[motif] ?? motif} ({n})</option>
                ))}
              </select>
            </Champ>
            <Champ label="Contrôles possibles sur 7">
              <select value={couverture} onChange={e => setCouverture(e.target.value)} className={LISTE}>
                <option value="">Tous</option>
                {paliers.map(([lus, n]) => (
                  <option key={lus} value={String(lus)}>{lus} contrôles lus ({n})</option>
                ))}
              </select>
            </Champ>
            <button
              type="button"
              onClick={() => setGrandes(!grandes)}
              aria-pressed={grandes}
              title="Flottant d'au moins deux milliards de dollars, ou chiffre d'affaires d'au moins trois milliards"
              className={`self-end rounded-md border px-3 ${CIBLE} text-sm font-semibold transition-colors ${grandes ? ACTIF : REPOS}`}
            >
              Grandes sociétés
            </button>
          </div>
          {actifs > 0 && (
            <button
              type="button"
              onClick={effacer}
              className={`mt-2 rounded-md ${CIBLE} px-1 text-sm text-accent underline underline-offset-2`}
            >
              Tout effacer
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted mb-2">
        {frNumber(visibles.length, 0)} société{visibles.length > 1 ? 's' : ''} sur {frNumber(lignes.length, 0)}
      </p>

      <ul className="divide-y divide-border border-y border-border">
        {rendues.map(l => (
          <li key={l.cik}>
            <Link
              href={`/investir/${l.slug}`}
              className="flex flex-col gap-0.5 px-1 py-2 hover:bg-card/60 transition-colors"
            >
              <span className="font-medium">{l.name}</span>
              {/* La phrase du MOTEUR, pas une phrase d'ici : le compte ne se
                  montre jamais sans son dénominateur, et deux formulations
                  dériveraient (le pluriel d'« alerte » suffit à les séparer). */}
              <span className="text-xs text-muted">{residuDe(l, contexte.residus)}</span>
              {l.alertes.length > 0 && (
                <span className="text-xs text-foreground">
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

      {visibles.length > limite && (
        <button
          type="button"
          onClick={() => setPages({ cle: cleFiltres, n: limite + PAGE })}
          className={`mt-4 w-full sm:w-auto rounded-md border border-border px-4 ${CIBLE} text-sm
                      font-semibold text-foreground hover:border-muted transition-colors`}
        >
          Afficher 50 de plus
        </button>
      )}
    </div>
  )
}
