import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EquityDisclosure } from '@/components/EquityDisclosure'
import {
  BLOCS, COULEUR_NOTE, LIBELLE_NOTE, asOf, ficheParSlug, tousLesSlugs,
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
  const blocs = BLOCS.filter(b => fiche.blocs[b.cle])

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
        {fiche.anchor !== 'mesuree' && (
          <span className="rounded border border-border text-muted px-3 py-1 text-xs uppercase tracking-wider">
            sans ancre de valorisation
          </span>
        )}
        <span className="text-xs text-muted">
          {fiche.taxonomy === 'ifrs-full' ? 'comptes IFRS' : 'comptes US GAAP'}
          {fiche.currency ? ` · ${fiche.currency}` : ''}
        </span>
      </div>

      {fiche.blocs.verdict && (
        <p className="text-lg leading-relaxed border-l-2 border-border pl-4 mb-10">
          {fiche.blocs.verdict}
        </p>
      )}

      <div className="space-y-8">
        {blocs.map(({ cle, titre }) => (
          <section key={cle}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-2">
              {titre}
            </h2>
            <p className="text-foreground/80 leading-relaxed">{fiche.blocs[cle]}</p>
          </section>
        ))}
      </div>

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
