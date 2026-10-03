'use client'

import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { FicheIndex } from '@/lib/investir'
import { NARROW_NBSP } from '@/lib/display'

type Alerte = {
  ticker: string
  asset_name: string | null
  drawdown_pct: number
  signal_level: string
  alerted_at: string
}

// Aucune couleur sur un recul (audit 2026-10, n° 51) : « −65 % » s'affichait en
// rouge ou en orange selon le palier du pipeline, sur une page qui dit ne lire
// aucun cours. Un rouge range la société sur une échelle avant qu'on ait lu la
// moindre phrase ; le signe « − » et le mot « recul » suffisent. Le palier
// (`signal_level`) n'est plus affiché du tout.

// Quinze jours de FRAÎCHEUR DU REPÉRAGE, à ne pas confondre avec la durée du
// recul. La plus ancienne alerte de la base remonte à trois mois, et les
// afficher sans distinction ferait passer un creux de juin pour l'état
// d'aujourd'hui.
//
// Les deux se sont trouvées côte à côte dans une première version — « creux
// repérés ces 15 derniers jours » au-dessus de « −63 % » — et un lecteur
// combine : il lit que la société a perdu 63 % en deux semaines. Elle est à
// 63 % sous son plus haut de SIX MOIS, et l'alerte a été levée récemment. Deux
// faits vrais, une phrase fausse.
const FRAICHEUR_JOURS = 15

/**
 * Les creux d'achat repérés récemment, adossés aux fiches.
 *
 * D'OÙ ILS VIENNENT. Un pipeline indépendant surveille les reculs sur une liste
 * de sociétés suivies et écrit une alerte quand l'un d'eux franchit un seuil.
 * Il n'a rien à voir avec la note : la note lit des comptes déposés, ceci lit
 * des cours. Le bandeau le dit, parce que deux mesures qui se touchent sur une
 * page finissent par être lues comme une seule.
 *
 * CE QU'ON AFFICHE. Le RECUL, jamais le prix. Un pourcentage décrit une
 * trajectoire ; un cours est une donnée de marché qu'on n'a pas le droit de
 * rediffuser, et le site a cessé de le faire le 2026-09-08.
 */
export function CreuxDachat({ index, horsPerimetre = [] }: {
  index: FicheIndex[]
  /** The companies I do not read have a fiche too (AeroVironment, Rheinmetall…):
   *  a dip on one of them links it as well (audit 2026-10, n° 51). */
  horsPerimetre?: { slug: string; name: string; ticker: string | null }[]
}) {
  const [alertes, setAlertes] = useState<Alerte[] | null>(null)

  useEffect(() => {
    let vivant = true
    fetch('/api/growth-alerts')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => { if (vivant) setAlertes(j) })
      .catch(() => { if (vivant) setAlertes([]) })
    return () => { vivant = false }
  }, [])

  if (!alertes || alertes.length === 0) return null

  const limite = Date.now() - FRAICHEUR_JOURS * 86_400_000
  const parSymbole = new Map<string, { slug: string; name: string }>([
    ...horsPerimetre.filter(h => h.ticker).map(h => [h.ticker!, h] as const),
    ...index.filter(l => l.symbole).map(l => [l.symbole!, l] as const),
  ])
  const recents = alertes
    .filter(a => new Date(a.alerted_at).getTime() >= limite)
    .sort((a, b) => a.drawdown_pct - b.drawdown_pct)
    .slice(0, 8)

  if (recents.length === 0) return null

  return (
    <section aria-labelledby="creux-titre" data-testid="creux" className="border-t border-border pt-8 sm:pt-9 pb-8">
      {/* Lot 6 (2026-09-25): under the list, and the title says what this
          block is made of. « Creux repérés récemment » sat in the first screen
          right under « je ne lis aucun cours de bourse », a contradiction
          the reader met before the list. */}
      <h2 id="creux-titre" className="text-2xl font-semibold tracking-tight">
        Ce que les cours disent, et que mes contrôles ne lisent pas
      </h2>
      <p className="mt-2 max-w-[68ch] text-sm text-muted leading-relaxed">
        Le pourcentage est le recul <strong className="font-semibold text-foreground">depuis le plus haut des six derniers
        mois</strong>, pas la baisse des dernières semaines. La date est celle
        du repérage. Ça vient des cours, pas des comptes : ça n’entre dans
        aucun contrôle, et ça ne dit pas qu’une société va mieux ou moins bien.
      </p>
      <div aria-hidden="true" className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_4.5rem] gap-x-4 border-b border-border pb-2 text-xs text-muted">
        <span>Société</span>
        <span>Repérage</span>
        <span className="text-right">Recul</span>
      </div>
      <ul>
        {recents.map(a => {
          const fiche = parSymbole.get(a.ticker)
          const nom = fiche?.name ?? a.asset_name ?? a.ticker
          return (
            <li key={a.ticker} className="grid grid-cols-[minmax(0,1fr)_auto_4.5rem] items-baseline gap-x-4 border-b border-border text-sm">
              {/* Every company cited links its fiche when it has one (n° 51);
                  a name the index does not know stays plain. */}
              {fiche ? (
                <Link href={`/investir/${fiche.slug}`} className={linkClass('record', 'inline-flex min-h-11 min-w-0 items-center truncate font-semibold')}>
                  {nom}
                </Link>
              ) : (
                <span className="flex min-h-11 min-w-0 items-center truncate">{nom}</span>
              )}
              <span className="text-xs text-muted">
                {new Date(a.alerted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-right tabular-nums">
                {a.drawdown_pct.toFixed(0).replace('-', '−')}{NARROW_NBSP}%
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
