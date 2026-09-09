import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EquityDisclosure } from '@/components/EquityDisclosure'
import { CoursTradingView } from '@/components/CoursTradingView'
import {
  COMPTES, COULEUR_NOTE, LIBELLE_NOTE, RECIT, asOf, ficheParSlug, tousLesSlugs,
} from '@/lib/investir'
import { longDate } from '@/lib/format-date'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return tousLesSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fiche = ficheParSlug(slug)
  if (!fiche) return {}
  return {
    title: `${fiche.name} : ce que disent ses comptes`,
    description: `Ma note sur les comptes de ${fiche.name}, lue dans un seul rapport annuel déposé à la SEC. Aucun conseil en investissement.`,
  }
}

export default async function FicheInvestir({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fiche = ficheParSlug(slug)
  if (!fiche) notFound()

  // Composant serveur : seuls les champs rendus ci-dessous partent au
  // navigateur. Le paquet complet reste au build.
  // Trois groupes, et c'est tout le propos de cette page. Elle empilait neuf
  // sections de prose de même poids — près de huit cents mots où les faits et
  // le récit se lisaient pareil, et l'user a dit ce qu'il fallait en penser.
  //
  // Le RÉCIT tient la pleine largeur : ce que fait la société, ce que ses
  // chiffres veulent dire, ce qui peut mal tourner. C'est ce qu'on vient lire.
  // Les FAITS, eux, sont déterministes et se consultent : bandeau en haut,
  // détail replié en bas. Et la SOURCE ferme la page.
  const recit = RECIT.filter(b => fiche.blocs[b.cle])
  const comptes = COMPTES.filter(b => fiche.blocs[b.cle])
  const c = fiche.chiffres

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/investir" className="text-sm text-muted hover:text-foreground transition-colors">
        ← Toutes les sociétés
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight mt-6 mb-4">{fiche.name}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${COULEUR_NOTE[fiche.grade]}`}>
          {LIBELLE_NOTE[fiche.grade]}
        </span>
        {c.secteur && <span className="text-xs text-muted">{c.secteur}</span>}
        <span className="text-xs text-muted">
          {fiche.taxonomy === 'ifrs-full' ? 'comptes IFRS' : 'comptes US GAAP'}
          {fiche.currency ? ` · ${fiche.currency}` : ''}
        </span>
      </div>

      {fiche.blocs.verdict && (
        <p className="text-lg leading-relaxed border-l-2 border-border pl-4 mb-8">
          {fiche.blocs.verdict}
        </p>
      )}

      {/* Le bandeau de faits : quatre chiffres qui se lisent d'un coup d'œil,
          déjà rendus côté vault pour que rien ne soit arrondi ici. */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden mb-10">
        {([
          ["Chiffre d'affaires", c.ca],
          ['Résultat net', c.resultat],
          ['Marge nette', c.marge],
          // Le libellé ne promet une comparaison que quand elle existe : sans
          // ancre, « Valorisation · secteur » suivi d'un tiret annonce un
          // chiffre qu'on ne donne pas.
          [c.annees_de_valorisation && c.mediane_du_secteur
             ? 'Valorisation · son secteur' : 'Valorisation',
           c.annees_de_valorisation
             ? `${c.annees_de_valorisation} ans${c.mediane_du_secteur ? ` · ${c.mediane_du_secteur}` : ''}`
             : null],
        ] as const).map(([label, valeur]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
            <dd className="text-sm font-semibold font-mono mt-1">{valeur ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-8">
        {recit.map(({ cle, titre }) => (
          <section key={cle}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-2">
              {titre}
            </h2>
            <p className="text-foreground/80 leading-relaxed">{fiche.blocs[cle]}</p>
          </section>
        ))}
      </div>

      {fiche.ticker && (
        <section className="mt-10 rounded border border-border bg-card px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-3">
            Le cours du titre
          </h2>
          <CoursTradingView symbole={fiche.ticker} />
          <p className="mt-3 text-xs text-muted leading-relaxed">
            Ce cours ne vient pas du rapport annuel et n’entre dans aucune note :
            ma règle ne lit que les comptes. Il est là pour que tu n’aies pas à
            ouvrir un autre onglet.
          </p>
        </section>
      )}

      {comptes.length > 0 && (
        <details className="mt-10 rounded border border-border bg-card px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-muted">
            Les comptes en détail
          </summary>
          <div className="mt-5 space-y-5">
            {comptes.map(({ cle, titre }) => (
              <section key={cle}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  {titre}
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{fiche.blocs[cle]}</p>
              </section>
            ))}
          </div>
        </details>
      )}

      {fiche.blocs.source && (
        <details className="mt-4 rounded border border-border px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-muted">
            Refais-le toi-même
          </summary>
          <p className="mt-4 text-sm text-foreground/80 leading-relaxed">{fiche.blocs.source}</p>
        </details>
      )}

      {!fiche.blocs.activite && (
        <p className="mt-8 text-xs text-muted italic">
          Je n’ai pas encore rédigé la présentation de cette société. Les chiffres
          ci-dessus, eux, sortent directement de son rapport annuel.
        </p>
      )}

      <p className="mt-10 text-xs text-muted">
        Calcul du {longDate(asOf)}. Il est refait chaque mois, et à chaque nouveau
        rapport annuel.
      </p>

      <EquityDisclosure generatedAt={asOf} />
    </div>
  )
}
