'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Reponse = {
  entitlement: 'guest' | 'free' | 'paid'
  blocs?: { lecture: string | null; risques: string | null }
  indisponible?: boolean
}

const TITRES: Record<string, string> = {
  lecture: 'Ce que j’en retiens',
  risques: 'Ce qui peut mal tourner',
}

/**
 * Les deux paragraphes que l'abonnement vend, ou ce qu'ils contiennent.
 *
 * LA PORTE EST LA ROUTE, PAS CE COMPOSANT. Rien n'arrive ici tant que le
 * serveur n'a pas lu l'abonnement : un visiteur sans compte reçoit un objet
 * sans texte. Rendre le récit puis le masquer en CSS le livrerait quand même
 * dans la charge servie au navigateur, ce que ce dépôt a déjà payé une fois.
 *
 * Ce qui s'affiche à sa place n'est pas un mur : la page dit ce que ces deux
 * paragraphes contiennent, sur cette société précise, parce qu'un lecteur qui
 * ne voit rien n'a aucune raison de payer pour le voir.
 */
export function RecitInvestir({ slug, nom }: { slug: string; nom: string }) {
  const [reponse, setReponse] = useState<Reponse | null>(null)

  useEffect(() => {
    let vivant = true
    fetch(`/api/investir/${encodeURIComponent(slug)}/recit`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => { if (vivant) setReponse(j) })
      .catch(() => { if (vivant) setReponse({ entitlement: 'guest' }) })
    return () => { vivant = false }
  }, [slug])

  if (!reponse) {
    return <p className="text-sm text-muted">Chargement de l’analyse…</p>
  }

  const blocs = reponse.blocs
  if (reponse.entitlement === 'paid' && blocs) {
    return (
      <div className="space-y-8">
        {(['lecture', 'risques'] as const).map(cle =>
          blocs[cle] ? (
            <section key={cle}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-2">
                {TITRES[cle]}
              </h2>
              <p className="text-foreground/80 leading-relaxed">{blocs[cle]}</p>
            </section>
          ) : null,
        )}
      </div>
    )
  }

  if (reponse.indisponible) {
    return (
      <p className="text-sm text-muted">
        L’analyse est momentanément indisponible. Les chiffres ci-dessus, eux,
        sortent directement du rapport annuel.
      </p>
    )
  }

  return (
    <section className="rounded-lg border border-accent/30 bg-accent/5 px-5 py-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-3">
        Ce que j’en retiens
      </h2>
      {/* La même phrase que /preuve, la FAQ et la page d'abonnement du labo :
          une seule description de l'offre, sur toutes les surfaces (audit
          2026-09-09). Le contenu de la phrase ne se réécrit pas ici. */}
      <p className="text-sm text-foreground/80 leading-relaxed">
        Ce que les membres lisent en plus, ce sont deux paragraphes d’analyse par
        société : ce que ses chiffres veulent dire pour son métier, et ce qui peut
        mal tourner. Pour {nom}, ça veut dire lire sa marge et son bilan avec les
        yeux de son secteur (dix pour cent de marge ne se lisent pas pareil chez un
        constructeur automobile et chez un éditeur de logiciels), puis nommer ce qui
        peut lui arriver à elle, pas la liste des risques de n’importe quelle
        entreprise.
      </p>
      <p className="text-xs text-muted mt-3 leading-relaxed">
        Tout ce qui est au-dessus reste ouvert à tout le monde, pour toujours :
        la note, les trois séries, le bilan, la valorisation face à son secteur,
        et le document pour tout refaire toi-même. Ce qui s’achète, c’est la
        lecture.
      </p>
      {/* Une seule page d'abonnement, un seul endroit pour se connecter.
          `text-bg`, pas `text-background` : ce dernier n'est pas un jeton de
          tailwind.config.ts, Tailwind n'émettait aucune règle, et le seul
          bouton payant du site héritait du blanc cassé sur l'accent (2,74:1
          mesuré, audit 2026-09-09). Sombre sur accent : 6,64:1. */}
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="https://lab.algoproof.fr/membre"
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 transition-opacity"
        >
          Voir l’abonnement
        </a>
        {reponse.entitlement === 'guest' && (
          <Link href="/compte" className="rounded border border-border px-4 py-2 text-sm hover:bg-card transition-colors">
            J’ai déjà un compte
          </Link>
        )}
      </div>
    </section>
  )
}
