'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { FicheIndex } from '@/lib/investir'

type Alerte = {
  ticker: string
  asset_name: string | null
  drawdown_pct: number
  signal_level: string
  alerted_at: string
}

const COULEUR: Record<string, string> = {
  crash: 'text-negative',
  major: 'text-severe',
  minor: 'text-warning',
}

// Quinze jours. Au-delà, un creux repéré n'est plus un fait sur le présent : la
// plus ancienne alerte de la base remonte à trois mois, et l'afficher sans
// distinction ferait passer un recul de juin pour l'état d'aujourd'hui.
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
export function CreuxDachat({ index }: { index: FicheIndex[] }) {
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
  const parSymbole = new Map(index.filter(l => l.symbole).map(l => [l.symbole!, l]))
  const recents = alertes
    .filter(a => new Date(a.alerted_at).getTime() >= limite)
    .sort((a, b) => a.drawdown_pct - b.drawdown_pct)
    .slice(0, 8)

  if (recents.length === 0) return null

  return (
    <section className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-1">
        Creux repérés ces {FRAICHEUR_JOURS} derniers jours
      </h2>
      <p className="text-xs text-muted leading-relaxed mb-3">
        Un recul marqué depuis le plus haut des six derniers mois. Ça vient des
        cours, pas des comptes : ça n’entre dans aucune note, et ça ne dit pas
        qu’une société va mieux ou moins bien.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {recents.map(a => {
          const fiche = parSymbole.get(a.ticker)
          const nom = fiche?.name ?? a.asset_name ?? a.ticker
          const contenu = (
            <>
              <span className="truncate">{nom}</span>
              <span className={`font-mono text-xs ${COULEUR[a.signal_level] ?? 'text-muted'}`}>
                {a.drawdown_pct.toFixed(0).replace('-', '−')} %
              </span>
            </>
          )
          return (
            <li key={a.ticker} className="flex items-baseline justify-between gap-3 text-sm py-0.5">
              {fiche ? (
                <Link href={`/investir/${fiche.slug}`}
                      className="flex items-baseline justify-between gap-3 w-full hover:text-foreground transition-colors text-muted">
                  {contenu}
                </Link>
              ) : (
                <span className="flex items-baseline justify-between gap-3 w-full text-muted">{contenu}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
