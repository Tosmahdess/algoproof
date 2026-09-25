import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EquityDisclosure } from '@/components/EquityDisclosure'
import { CoursTradingView } from '@/components/CoursTradingView'
import { RecitInvestir } from '@/components/RecitInvestir'
import {
  COMPTES, RECIT, asOf, ficheParSlug,
  horsPerimetreParSlug, listeHorsPerimetre, tousLesSlugs,
  type FicheHorsPerimetre,
} from '@/lib/investir'
import { mediumDate } from '@/lib/format-date'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return [...tousLesSlugs(), ...listeHorsPerimetre().map(f => f.slug)]
    .map(slug => ({ slug }))
}

/**
 * Une société dont aucun rapport annuel n'est déposé au régulateur américain :
 * aucun contrôle ne tourne, pas de comptes, pas de bandeau de chiffres. Ce
 * qu'elle a, c'est une description et des risques
 * écrits à partir de données de marché — donc invérifiables, et la page
 * l'annonce avant tout le reste plutôt qu'en note de bas de page.
 */
function FicheHorsPerimetreVue({ fiche }: { fiche: FicheHorsPerimetre }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/investir" className={linkClass('nav', 'text-sm')}>
        ← Toutes les sociétés
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-6 mb-4">{fiche.name}</h1>

      <div className="rounded-lg border border-warning/40 bg-warning/5 px-5 py-4 mb-8">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Je ne lis pas les comptes de cette société.</strong> Elle ne
          dépose pas de rapport annuel auprès du régulateur américain, donc mes
          sept contrôles n’ont aucun document à lire. Ce qui suit vient d’une
          analyse écrite à partir de données de marché le {mediumDate(fiche.as_of)} :
          aucun de ses chiffres n’est adossé à un dépôt, et tu ne peux pas les
          vérifier comme sur les autres fiches.
        </p>
      </div>

      {fiche.description && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted mb-2">
            Ce que fait l’entreprise
          </h2>
          <p className="text-foreground leading-relaxed">{fiche.description}</p>
        </section>
      )}

      {/* horsPerimetre : ce que la table a pour cette société est servi à tout
          le monde, sans offre (décision user du 11/09/2026, temporaire). */}
      <RecitInvestir slug={fiche.slug} nom={fiche.name} horsPerimetre />

      <p className="mt-10 text-xs text-muted">
        Analyse du {mediumDate(fiche.as_of)}. Elle n’est pas recalculée chaque mois,
        contrairement aux sociétés dont je lis le rapport annuel.
      </p>
      <EquityDisclosure generatedAt={fiche.as_of} horsPerimetre />
    </div>
  )
}


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fiche = ficheParSlug(slug)
  if (!fiche) {
    const dehors = horsPerimetreParSlug(slug)
    return dehors ? { title: `${dehors.name} : ce que j’en sais`,
                      description: `Analyse de ${dehors.name}. Je ne lis pas ses comptes : elle ne dépose pas auprès du régulateur américain.` }
                  : {}
  }
  return {
    title: `${fiche.name} : ce que disent ses comptes`,
    description: `Sept contrôles sur les comptes de ${fiche.name}, lus dans un seul rapport annuel déposé à la SEC. Chaque alerte est nommée par le fait qui la déclenche. Aucun conseil en investissement.`,
  }
}

export default async function FicheInvestir({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fiche = ficheParSlug(slug)
  if (!fiche) {
    const dehors = horsPerimetreParSlug(slug)
    if (!dehors) notFound()
    return <FicheHorsPerimetreVue fiche={dehors} />
  }

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
      <Link href="/investir" className={linkClass('nav', 'text-sm')}>
        ← Toutes les sociétés
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight mt-6 mb-4">{fiche.name}</h1>

      {/* Le cartouche de note a été retiré ici le 2026-09-15. Il portait l'un
          des trois adjectifs du moteur d'avant, en vert, ambre ou rouge : un
          verdict posé au-dessus des faits, lu avant eux, et faux une fois sur
          quatre. Rien ne le remplace. Ce qui vient juste en dessous est le
          compte de ce que j'ai pu lire, avec son dénominateur. */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {c.secteur && <span className="text-xs text-muted">{c.secteur}</span>}
        <span className="text-xs text-muted">
          {fiche.taxonomy === 'ifrs-full' ? 'comptes IFRS' : 'comptes US GAAP'}
          {fiche.currency ? ` · ${fiche.currency}` : ''}
        </span>
      </div>

      {fiche.blocs.verdict && (
        <p className="text-lg leading-relaxed border-l-2 border-border pl-4 mb-4">
          {fiche.blocs.verdict}
        </p>
      )}

      {/* Les ALERTES, collées au compte qui les annonce : le lecteur doit
          retrouver dans ce bloc exactement le nombre que la ligne du dessus
          énonce. Le bloc mêle trois natures d'énoncé, et le moteur les sépare
          par leur amorce, jamais par un titre — l'alerte nue, la lecture qui
          la neutralise (« En regard, … », qui reste COLLÉE à son alerte parce
          qu'une perte se lit contre ce qui la finance), et le contrôle non lu
          (« Non lu : … », repoussé en fin de bloc).

          Le premier rendu les empilait sous un titre « Alertes » : CrowdStrike
          annonçait deux alertes au-dessus de quatre phrases, dont sa trésorerie
          qui RASSURE déguisée en alarme, et Amazon zéro alerte au-dessus d'un
          bloc non vide. */}
      {fiche.blocs.alertes && (
        <p className="text-base leading-relaxed border-l-2 border-border pl-4 mb-8 text-foreground">
          {fiche.blocs.alertes}
        </p>
      )}

      {/* La RÉSERVE, avant les chiffres et pas après : la société a publié un
          rapport annuel plus récent que celui d'où sortent les montants
          ci-dessous. Une réserve qu'il faut chercher sous le bilan ne sert à
          rien, et c'est le seul endroit où le lecteur apprend que ce ne sont
          pas les derniers comptes publiés. */}
      {fiche.blocs.reserve && (
        <p
          role="note"
          className="text-sm leading-relaxed border border-border rounded px-4 py-3 mb-8 text-foreground"
        >
          {fiche.blocs.reserve}
        </p>
      )}

      {/* Le bandeau de faits : trois chiffres qui se lisent d'un coup d'œil,
          déjà rendus côté vault pour que rien ne soit arrondi ici.

          Il en portait QUATRE. La dernière case était l'ancre de valorisation,
          retirée du moteur le 2026-09-14 : elle divisait un flottant hors
          initiés par le résultat du groupe entier, deux périmètres qui ne se
          divisent pas, et aucun flux de cours ne permettait d'en valider le
          seuil. Le champ survit dans le paquet, à `null` — donc la case
          affichait « Valorisation — » sur les 1 407 fiches. Un tiret se lit
          comme une donnée qui manque, pas comme une mesure qu'on a retirée.

          Le flottant, lui, n'a pas disparu : il reste un FAIT DATÉ, montant et
          date, dans le bloc « Ce qu'elle vaut, et à quelle date ». */}
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded overflow-hidden mb-10">
        {([
          ["Chiffre d'affaires", c.ca],
          ['Résultat net', c.resultat],
          ['Marge nette', c.marge],
        ] as const).map(([label, valeur]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className="text-sm font-semibold font-mono mt-1">{valeur ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-8">
        {recit.map(({ cle, titre }) => (
          <section key={cle}>
            <h2 className="text-sm font-semibold text-muted mb-2">
              {titre}
            </h2>
            <p className="text-foreground leading-relaxed">{fiche.blocs[cle]}</p>
          </section>
        ))}

        {/* Lot 6 (2026-09-25, conception §5.5 and §1 bis): the free proof
            comes BEFORE the paid reading. « Les comptes en détail » is what a
            reader can check against the filing; it used to sit under the
            price widget, two blocks after the offer. */}
        {comptes.length > 0 && (
          <details className="rounded-lg border border-border bg-card px-5 py-4">
            <summary className="cursor-pointer text-sm font-semibold text-muted py-2.5 -my-2.5">
              Les comptes en détail
            </summary>
            <div className="mt-5 space-y-5">
              {comptes.map(({ cle, titre }) => (
                <section key={cle}>
                  <h3 className="text-xs font-semibold text-muted mb-1">
                    {titre}
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed">{fiche.blocs[cle]}</p>
                </section>
              ))}
            </div>
          </details>
        )}

        {/* Les deux paragraphes que l'abonnement vend. Ils ne sont PAS dans
            cette page : elle est statique, donc son HTML est le même pour tout
            le monde. Le composant les demande à une route qui lit l'abonnement
            avant d'aller les chercher. Déplacé sous les comptes au lot 6, pas
            modifié : la route et l'abonnement ne bougent pas. */}
        <RecitInvestir slug={fiche.slug} nom={fiche.name} />
      </div>

      {fiche.blocs.source && (
        <details className="mt-8 rounded-lg border border-border px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted py-2.5 -my-2.5">
            Refais-le toi-même
          </summary>
          <p className="mt-4 text-sm text-foreground leading-relaxed">{fiche.blocs.source}</p>
        </details>
      )}

      {/* Last block (C8: no third-party dependency above the fold). The widget
          is a third party's, and it draws prices this page says it never reads. */}
      {fiche.ticker && (
        <section className="mt-8 rounded-lg border border-border bg-card px-5 py-4">
          <h2 className="text-sm font-semibold text-muted mb-3">
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

      {!fiche.blocs.activite && (
        <p className="mt-8 text-xs text-muted italic">
          Je n’ai pas encore rédigé la présentation de cette société. Les chiffres
          ci-dessus, eux, sortent directement de son rapport annuel.
        </p>
      )}

      <p className="mt-10 text-xs text-muted">
        {/* La page disait « refait chaque mois » alors que rien ne le refaisait :
            une promesse que personne ne tenait. Elle dit maintenant la date, qui
            est vérifiable, et l'intention, qui ne se déguise plus en garantie. */}
        Calcul du {mediumDate(asOf)}. Je le refais quand les comptes bougent, en
        visant une fois par mois.
      </p>

      <EquityDisclosure generatedAt={asOf} />
    </div>
  )
}
