'use client'

import { useEffect, useState } from 'react'
import BotParamsSection from '@/components/BotParams'
import { linkClass } from '@/lib/link-roles'
import { toBotParams, type BotRecipe } from '@/lib/recipe-params'

type Answer = {
  entitlement?: 'guest' | 'free' | 'paid'
  recipe?: BotRecipe
  indisponible?: boolean
}

/**
 * The Technique tab of a wave bot. The fiche is static, so it only knows the
 * slug; the recipe is asked for here, after load, and /api/bot/[slug]/recipe
 * returns it to a paying member only. Anyone else — and any failure — keeps
 * the members-only sentence and the link to the labo dossier.
 */
export default function RecipeGate({ slug, dossierBase }: { slug: string; dossierBase: string }) {
  const [answer, setAnswer] = useState<Answer | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/bot/${encodeURIComponent(slug)}/recipe`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => { if (alive) setAnswer(j ?? { entitlement: 'guest' }) })
      .catch(() => { if (alive) setAnswer({ entitlement: 'guest' }) })
    return () => { alive = false }
  }, [slug])

  if (!answer) {
    return <p className="text-sm text-muted">Chargement…</p>
  }

  if (answer.entitlement === 'paid' && answer.recipe) {
    return <BotParamsSection params={toBotParams(answer.recipe)} />
  }

  if (answer.entitlement === 'paid' && answer.indisponible) {
    return <p className="text-sm text-muted">La recette est momentanément indisponible.</p>
  }

  return (
    <div className="text-sm space-y-2">
      <p className="text-muted mb-2">
        La configuration exacte de ce bot (valeurs des paramètres et combinaison
        de filtres retenues par le gantelet) est réservée aux membres du labo.
      </p>
      <a href={`https://lab.algoproof.fr/cockpit/dossier/${dossierBase}`}
         className={linkClass('inline')}>
        Voir le dossier de la stratégie
      </a>
    </div>
  )
}
