'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Contexte, FicheIndex } from '@/lib/investir'
import {
  compteParAlerte, compteParCouverture, correspond, messageVide, normaliser, residuDe, trierParNom,
} from '@/lib/investir-liste'
import { capitale } from '@/lib/investir-controles'
import { frNumber } from '@/lib/display'
import { linkClass } from '@/lib/link-roles'

// Lot 6 (2026-09-25, conception §5.5): 50 rows reach the DOM at a time. The
// page stays force-static and the whole index still travels (it did already);
// what is bounded is the rendered list — 1 406 rows made a 138 313 px page on
// a computer and 148 723 px on a phone. « Voir les 50 suivantes » extends it.
const PAGE = 50

// Refonte « registre » (2026-10-03): every control is a 44 px target, like the
// rest of the site (DESIGN.md, Layout), the same class everywhere so the guard
// of the tests can read it. The field and the lists are 16 px on a phone: under
// that, iOS zooms the page on focus.
const CIBLE = 'min-h-11'
const LISTE = `w-full min-w-0 rounded-md border border-border-strong bg-bg px-2 ${CIBLE} text-base sm:text-sm
               text-foreground focus:border-accent`
// A selected control: the lit surface and the link-blue contour, with
// aria-pressed (DESIGN.md, control-selected). At rest, the lichen contour.
const ACTIF = 'bg-card-2 border-accent text-foreground'
const REPOS = 'border-border-strong text-foreground hover:bg-card-2'
const BOUTON = `inline-flex ${CIBLE} items-center rounded-md border border-border-strong px-4 text-sm font-semibold text-foreground hover:bg-card-2`

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}

/** An out-of-scope company, as the search needs it: no prose crosses here. */
export type SocieteHorsPerimetre = { slug: string; name: string; ticker: string | null }

// Ne reçoit que l'index : nom, alertes, couverture. Aucune prose ne transite
// par ce composant, et c'est délibéré — un composant client livre tout ce
// qu'il reçoit dans la charge envoyée au navigateur, qu'il l'affiche ou non.
// Et il n'importe RIEN de `lib/investir` à l'exécution : ce module importe le
// paquet entier, qui partait dans le bundle de toutes les pages (audit
// 2026-10, n° 20). Ses fonctions vivent dans `lib/investir-liste`.
//
// Ce qui coupe la liste, c'est le crible : une option par ALERTE nommée par le
// fait, et une liste « Contrôles lus » qui rend l'opacité visible.
//
// 2026-09-30 (user, au téléphone) : la recherche est seule sur sa ligne ; les
// filtres sont des LISTES derrière UN bouton « Filtres » sur téléphone
// (toujours visibles dès lg), et la barre reste collée sous la nav.
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
//     IMPLICITEMENT », sans besoin de chiffre ni d'adjectif. Filtrer par
//     alerte POSITIVE est de l'autre côté de la ligne : c'est une phrase du
//     dépôt, sourcée, réfutable, et défavorable.
//
// Pour la même raison il n'y a aucun TRI par nombre d'alertes : ascendant,
// c'est un palmarès ; descendant, c'est une liste à vendre. L'ordre est
// alphabétique, à la française (audit 2026-10, n° 49).

export default function InvestirListe({
  lignes,
  contexte,
  horsPerimetre = [],
}: {
  lignes: FicheIndex[]
  contexte: Contexte
  /** Searched too (audit 2026-10, n° 13): « LVMH » found nothing while its fiche exists. */
  horsPerimetre?: SocieteHorsPerimetre[]
}) {
  const [recherche, setRecherche] = useState('')
  const [alerte, setAlerte] = useState('')
  const [couverture, setCouverture] = useState('')
  const [grandes, setGrandes] = useState(false)
  const [famille, setFamille] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const panneau = useId()
  const champ = useRef<HTMLInputElement>(null)
  const listeRef = useRef<HTMLUListElement>(null)
  const focusLigne = useRef<number | null>(null)

  const triees = useMemo(() => trierParNom(lignes), [lignes])

  // Les familles présentes, les plus peuplées d'abord : à 1 406 lignes, un
  // ordre alphabétique de 58 entrées ne sert personne.
  const familles = useMemo(() => {
    const compte = new Map<string, number>()
    for (const l of lignes) if (l.famille) compte.set(l.famille, (compte.get(l.famille) ?? 0) + 1)
    return [...compte.entries()].sort((a, b) => b[1] - a[1])
  }, [lignes])

  // Dérivées des lignes, jamais d'une liste figée : une option sans ligne
  // derrière viderait la liste sans que le lecteur sache pourquoi.
  const puces = useMemo(() => compteParAlerte(lignes), [lignes])
  const paliers = useMemo(() => compteParCouverture(lignes), [lignes])

  const q = normaliser(recherche)
  const visibles = useMemo(() => triees.filter(l => {
    // Name OR ticker (C3.1 of the arbitration): « Apple » and « AAPL » find
    // the same page; case and accents do not matter.
    if (!correspond(l, q)) return false
    if (alerte && !l.alertes.includes(alerte)) return false
    if (couverture && l.n_lus !== Number(couverture)) return false
    if (grandes && !l.core) return false
    if (famille && l.famille !== famille) return false
    return true
  }), [triees, q, alerte, couverture, grandes, famille])

  // The out-of-scope companies answer a search only: they carry no alert, no
  // count of controls and no sector, so no filter can keep them.
  const dehors = useMemo(
    () => (q ? trierParNom(horsPerimetre.filter(h => correspond(h, q))) : []),
    [horsPerimetre, q],
  )

  // How many rows are shown, keyed by the filter state that opened them: any
  // change of a filter brings the reader back to the first page, also on the
  // way back to a state already seen. Reset during the render, the pattern
  // React documents for state derived from a previous render.
  const cleFiltres = JSON.stringify([q, alerte, couverture, grandes, famille])
  const [pages, setPages] = useState({ cle: cleFiltres, n: PAGE })
  if (pages.cle !== cleFiltres) setPages({ cle: cleFiltres, n: PAGE })
  const limite = pages.cle === cleFiltres ? pages.n : PAGE
  const rendues = visibles.slice(0, limite)
  const reste = visibles.length - rendues.length
  const suivantes = Math.min(PAGE, reste)

  // After « Voir les N suivantes », the first new row takes the focus, so a
  // keyboard reader goes on from where the list grew (the fleet's pattern).
  useEffect(() => {
    if (focusLigne.current === null) return
    const lien = listeRef.current?.querySelectorAll<HTMLAnchorElement>('[data-ligne-nom]')[focusLigne.current]
    focusLigne.current = null
    lien?.focus()
  }, [limite])

  // The search is not a filter: it has its own field, always in view.
  const actifs = (famille ? 1 : 0) + (alerte ? 1 : 0) + (couverture ? 1 : 0) + (grandes ? 1 : 0)
  function retirerFiltres() {
    setFamille(''); setAlerte(''); setCouverture(''); setGrandes(false)
  }
  function effacerRecherche() {
    setRecherche('')
    champ.current?.focus()
  }
  const vide = visibles.length === 0

  return (
    <div>
      {/* One bar, stuck under the nav (--nav-h, z-40 under the nav's z-50, the
          pair StickyFilterBar documents): the field on its own line, then the
          lists, folded behind « Filtres » on a phone only. */}
      <div
        data-testid="investir-filtres"
        className="sticky top-[var(--nav-h)] z-40 mb-4 border-b border-border bg-bg py-3"
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
              ref={champ}
              type="search"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Société ou ticker…"
              aria-label="Chercher une société ou un ticker"
              className={`w-full rounded-md border border-border-strong bg-bg pl-9 pr-3 ${CIBLE} h-12 text-base
                         placeholder:text-muted focus:border-accent`}
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
              <span className="rounded-sm border border-border-strong px-1.5 text-xs tabular-nums">{actifs}</span>
            )}
            <svg
              className={`h-4 w-4 text-muted transition-transform motion-reduce:transition-none ${ouvert ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div id={panneau} className={`${ouvert ? 'mt-3' : 'hidden'} lg:mt-3 lg:block`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_auto] lg:items-end">
            <Champ label="Secteur">
              <select value={famille} onChange={e => setFamille(e.target.value)} className={LISTE}>
                <option value="">Tous les secteurs</option>
                {familles.map(([nom, n]) => (
                  <option key={nom} value={nom}>{capitale(nom)} ({n})</option>
                ))}
              </select>
            </Champ>
            {/* No « sans alerte » option (header). « Toutes les sociétés »
                is the absence of this filter, not a verdict. */}
            <Champ label="Alerte relevée dans le dépôt">
              <select value={alerte} onChange={e => setAlerte(e.target.value)} className={LISTE}>
                <option value="">Toutes les sociétés</option>
                {puces.map(([motif, n]) => (
                  <option key={motif} value={motif}>{capitale(contexte.libelles[motif] ?? motif)} ({n})</option>
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
              className={`self-end rounded-md border px-4 ${CIBLE} text-sm font-semibold transition-colors ${grandes ? ACTIF : REPOS}`}
            >
              Grandes sociétés
            </button>
          </div>
          {/* In the empty state the list's own buttons are the way out: the bar
              drops its reset (the fleet's rule, audit n° 75, two reset buttons). */}
          {actifs > 0 && !vide && (
            <button
              type="button"
              onClick={retirerFiltres}
              className={`mt-2 rounded-md ${CIBLE} px-1 text-sm text-accent underline underline-offset-2 hover:decoration-2`}
            >
              Tout effacer
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted mb-2 tabular-nums" aria-live="polite">
        {`${frNumber(visibles.length, 0)} société${visibles.length > 1 ? 's' : ''} sur ${frNumber(lignes.length, 0)}`}
      </p>

      {vide ? (
        <div data-testid="investir-vide" role="status" className="border-t border-border pt-5">
          <p className="text-base">
            {messageVide({ recherche, filtres: actifs, total: lignes.length })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {q && (
              <button type="button" onClick={effacerRecherche} className={BOUTON}>
                Effacer la recherche
              </button>
            )}
            {actifs > 0 && (
              <button type="button" onClick={retirerFiltres} className={BOUTON}>
                Retirer les filtres
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Column heads on a computer, the ledger's grammar; each row says
              the same on its own, so they are not read twice. */}
          <div aria-hidden="true" className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-6 border-b border-border pb-2.5 text-xs text-muted">
            <span>Société et secteur</span>
            <span>Ce que j’ai relevé dans son dernier rapport annuel</span>
          </div>
          <ul ref={listeRef} data-testid="investir-registre" className="max-md:border-t max-md:border-border">
            {rendues.map(l => (
              <li key={l.cik} className="grid gap-x-6 gap-y-1.5 border-b border-border py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="min-w-0">
                  <Link
                    href={`/investir/${l.slug}`}
                    data-ligne-nom=""
                    className={linkClass('record', '-my-2 inline-flex min-h-11 items-center text-base font-semibold leading-snug')}
                  >
                    {l.name}
                  </Link>
                  {(l.symbole || l.famille) && (
                    <p className="text-xs text-muted">
                      {[l.symbole, l.famille ? capitale(l.famille) : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="min-w-0 text-sm">
                  {/* La phrase du MOTEUR, pas une phrase d'ici : le compte ne se
                      montre jamais sans son dénominateur, et deux formulations
                      dériveraient (le pluriel d'« alerte » suffit à les séparer). */}
                  <p>{residuDe(l, contexte.residus)}</p>
                  {l.alertes.length > 0 && (
                    <p className="mt-0.5">
                      {l.alertes.map(a => capitale(contexte.libelles[a] ?? a)).join(' · ')}
                    </p>
                  )}
                  {l.non_lus.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      Non lu : {l.non_lus.map(n => contexte.libelles_non_lus[n] ?? n).join(', ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {reste > 0 && (
        <button
          type="button"
          onClick={() => {
            focusLigne.current = rendues.length
            setPages({ cle: cleFiltres, n: limite + PAGE })
          }}
          className={`mt-5 ${BOUTON}`}
        >
          {suivantes > 1 ? `Voir les ${frNumber(suivantes, 0)} suivantes` : 'Voir la dernière'}
        </button>
      )}

      {dehors.length > 0 && (
        <div data-testid="investir-hors-perimetre-resultats" className="mt-8 border-t border-border pt-5">
          <h3 className="text-base font-semibold">
            {dehors.length > 1
              ? `${frNumber(dehors.length, 0)} sociétés hors de mon périmètre portent ce nom`
              : 'Une société hors de mon périmètre porte ce nom'}
          </h3>
          <p className="mt-1 max-w-[65ch] text-sm text-muted">
            Je ne lis pas leurs comptes avec mes sept contrôles. Leur fiche dit pourquoi, et d’où vient ce qu’elle contient.
          </p>
          <ul className="mt-2">
            {dehors.map(h => (
              <li key={h.slug} className="flex flex-wrap items-baseline gap-x-3 border-b border-border">
                <Link href={`/investir/${h.slug}`} className={linkClass('record', 'inline-flex min-h-11 items-center font-semibold')}>
                  {h.name}
                </Link>
                {h.ticker && <span className="text-xs text-muted">{h.ticker}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
