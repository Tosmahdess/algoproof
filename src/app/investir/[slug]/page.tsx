import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { EquityDisclosure } from '@/components/EquityDisclosure'
import { CoursTradingView } from '@/components/CoursTradingView'
import { RecitInvestir } from '@/components/RecitInvestir'
import FavoriteButton from '@/components/FavoriteButton'
import ConstatsLecture from '@/components/ConstatsLecture'
import { DesLectures } from '@/components/DesLectures'
import {
  COMPTES, RECIT, asOf, contexte, ficheParSlug,
  horsPerimetreParSlug, listeHorsPerimetre, residuDe, tousLesSlugs,
  type FicheHorsPerimetre,
} from '@/lib/investir'
import { capitale, lireControles } from '@/lib/investir-controles'
import { mediumDate } from '@/lib/format-date'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return [...tousLesSlugs(), ...listeHorsPerimetre().map(f => f.slug)]
    .map(slug => ({ slug }))
}

// Refonte « Le registre des décisions », pages Sociétés (2026-10-03). The bot
// fiche's grammar, for a company: the way back, the name, « Des lectures, pas
// des conseils » right under it (audit 2026-10, n° 52), then ONE framed panel,
// the reading of the seven controls (n° 53), then the figures, and the rest
// opened by rules: what the company does, the accounts, the source and
// « Refais-le toi-même », the members' reading, the quote, who writes this.
const SECTION = 'border-t border-border py-8 sm:py-9 scroll-mt-24'
const H2 = 'text-2xl font-semibold tracking-tight mb-4'
// break-words: the source names XBRL tags of 47 letters in one word, which ran
// 8 px past a 390 px screen.
const PROSE = 'max-w-[68ch] leading-relaxed break-words'

function FilAriane({ nom }: { nom: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2">
        <li><Link href="/" className={linkClass('nav', 'inline-flex min-h-11 items-center')}>Accueil</Link></li>
        <li aria-hidden="true" className="text-muted">/</li>
        <li><Link href="/investir" className={linkClass('nav', 'inline-flex min-h-11 items-center')}>Sociétés</Link></li>
        <li aria-hidden="true" className="text-muted">/</li>
        <li aria-current="page" className="text-foreground">{nom}</li>
      </ol>
    </nav>
  )
}

/** Name, what identifies it, the disclaimer: the same head on both kinds of fiche. */
function Entete({ nom, meta, horsPerimetre = false }: { nom: string; meta: ReactNode; horsPerimetre?: boolean }) {
  return (
    <header className="pt-2">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 max-w-[850px]">{nom}</h1>
      {meta && <p data-testid="fiche-meta" className="mt-2 text-sm text-muted">{meta}</p>}
      <DesLectures className="mt-4" horsPerimetre={horsPerimetre} />
    </header>
  )
}

/**
 * Une société dont aucun rapport annuel n'est lu par la règle : aucun contrôle
 * ne tourne, pas de comptes, pas de chiffres. Ce qu'elle a, c'est une
 * description écrite à partir de données de marché, donc invérifiable, et la
 * page l'annonce dans son panneau, avant tout le reste.
 *
 * Le texte de ce panneau et la description sont le constat n° 14 de l'audit
 * 2026-10 (« Elle ne dépose pas » est faux pour plusieurs d'entre elles, et les
 * descriptions jugent) : une correction de données, laissée à son propre
 * chantier. La refonte ne touche qu'à la mise en page.
 */
function FicheHorsPerimetreVue({ fiche }: { fiche: FicheHorsPerimetre }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
      <FilAriane nom={fiche.name} />
      <Entete nom={fiche.name} meta={fiche.ticker} horsPerimetre />

      <section
        data-testid="constats"
        aria-labelledby="constats-titre"
        className="mt-6 rounded-lg border border-border bg-card p-4 sm:px-6 sm:py-5"
      >
        <h2 id="constats-titre" className="text-2xl font-semibold leading-tight">Je ne lis pas les comptes de cette société</h2>
        <p className={`mt-1.5 text-base ${PROSE}`}>
          Elle ne dépose pas de rapport annuel auprès du régulateur américain, donc mes
          sept contrôles n’ont aucun document à lire. Ce qui suit vient d’une analyse
          écrite à partir de données de marché le{' '}{mediumDate(fiche.as_of)}{' '}: aucun de ses
          chiffres n’est adossé à un dépôt, et tu ne peux pas les vérifier comme sur les
          autres fiches.
        </p>
      </section>

      {/* Keeps the page in Mon espace; it opens nothing the page does not
          already show (espace-direct lot C). After the panel, as on a bot fiche:
          the reading comes before the button. */}
      <div className="mt-5">
        <FavoriteButton slug={fiche.slug} kind="company" appearance="registre" />
      </div>

      {fiche.description && (
        <section aria-labelledby="activite-titre" className={`${SECTION} mt-8`}>
          <h2 id="activite-titre" className={H2}>Ce que fait l’entreprise</h2>
          <p className={`text-foreground ${PROSE}`}>{fiche.description}</p>
        </section>
      )}

      {/* horsPerimetre : ce que la table a pour cette société est servi à tout
          le monde, sans offre (décision user du 11/09/2026, temporaire). Rien
          rendu, rien tracé : la section n'a de filet que si elle a un texte. */}
      <RecitInvestir slug={fiche.slug} nom={fiche.name} horsPerimetre className={SECTION} />

      <p className="border-t border-border pt-6 text-sm text-muted">
        Analyse du{' '}{mediumDate(fiche.as_of)}. Elle n’est pas recalculée chaque mois,
        contrairement aux sociétés dont je lis le rapport annuel.
      </p>
      <div className="mt-8">
        <EquityDisclosure generatedAt={fiche.as_of} horsPerimetre />
      </div>
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
  const recit = RECIT.filter(b => fiche.blocs[b.cle])
  const comptes = COMPTES.filter(b => fiche.blocs[b.cle])
  const c = fiche.chiffres

  // The panel: the engine's sentence, without « (sur 7) » — the seven controls
  // are listed right under it (audit 2026-10, n° 80) — and the seven, each
  // with its state, from the engine's identifiers and sentences.
  const resume = (fiche.blocs.verdict ?? residuDe(fiche, contexte.residus)).replace(/\s*\(sur 7\)/, '')
  const controles = lireControles(fiche, fiche.blocs.alertes, contexte.libelles)

  // Separated, never glued (n° 80: « les foncières cotéescomptes US GAAP »).
  const meta = [
    fiche.ticker,
    c.secteur ? capitale(c.secteur) : null,
    fiche.taxonomy === 'ifrs-full' ? 'comptes IFRS' : 'comptes US GAAP',
    fiche.currency,
  ].filter(Boolean).join(' · ')

  // The filing itself, on EDGAR: its folder is the CIK and the accession number
  // without dashes. The source text names both; this opens them.
  const depot = fiche.filing_accn
    ? `https://www.sec.gov/Archives/edgar/data/${fiche.cik}/${fiche.filing_accn.replace(/-/g, '')}/`
    : null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
      <FilAriane nom={fiche.name} />
      <Entete nom={fiche.name} meta={meta} />

      {/* Le cartouche de note a été retiré le 2026-09-15 : un verdict posé
          au-dessus des faits, lu avant eux, et faux une fois sur quatre. Rien
          ne le remplace. Ce qui vient sous le titre est le compte de ce que j'ai
          pu lire, avec ses sept lignes. */}
      <ConstatsLecture className="mt-6" resume={resume} controles={controles} reserve={fiche.blocs.reserve ?? null} />

      {/* Trois chiffres qui se lisent d'un coup d'œil, déjà rendus par le
          moteur pour que rien ne soit arrondi ici. Une donnée absente : « — »,
          sans couleur. Aucun montant ne prend de couleur : ce sont des comptes,
          pas un résultat de trading. */}
      <div data-testid="fiche-chiffres" className="mt-6">
        <dl className="grid grid-cols-3 gap-3 sm:gap-5 border-b border-border pb-4">
          {([
            ["Chiffre d'affaires", c.ca],
            ['Résultat net', c.resultat],
            ['Marge nette', c.marge],
          ] as const).map(([label, valeur]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-lg sm:text-2xl tabular-nums leading-tight">
                {valeur ?? <><span aria-hidden="true" className="text-muted">—</span><span className="sr-only">Non publié</span></>}
              </dd>
            </div>
          ))}
        </dl>
        {/* La page disait « refait chaque mois » alors que rien ne le refaisait :
            elle dit la date, vérifiable, et l'intention, qui ne se déguise pas
            en garantie. */}
        <p className="mt-2 text-xs text-muted">
          {fiche.filed && <>Dernier exercice, lu dans le rapport annuel déposé le{' '}{mediumDate(fiche.filed)}.{' '}</>}
          Calcul du{' '}{mediumDate(asOf)}. Je le refais quand les comptes bougent, en visant une fois par mois.
        </p>
      </div>

      {/* Keeps the page in Mon espace (espace-direct lot C); under the figures,
          as on a bot fiche: the reading comes before the button. */}
      <div className="mt-5">
        <FavoriteButton slug={fiche.slug} kind="company" appearance="registre" />
      </div>

      <nav aria-label="Dans cette fiche" className="mt-6 border-t border-border">
        <ul className="flex flex-wrap gap-x-6 text-sm">
          {comptes.length > 0 && (
            <li><a href="#comptes" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Les comptes</a></li>
          )}
          {fiche.blocs.source && (
            <li><a href="#refais" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Refais-le toi-même</a></li>
          )}
          <li><Link href="/investir#methode" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>Les sept contrôles</Link></li>
        </ul>
      </nav>

      {recit.length > 0 ? recit.map(({ cle, titre }) => (
        <section key={cle} aria-labelledby={`${cle}-titre`} className={SECTION}>
          <h2 id={`${cle}-titre`} className={H2}>{titre}</h2>
          <p className={`text-foreground ${PROSE}`}>{fiche.blocs[cle]}</p>
        </section>
      )) : (
        <p className={`${SECTION} text-sm text-muted`}>
          Je n’ai pas encore rédigé la présentation de cette société. Les chiffres
          ci-dessus, eux, sortent directement de son rapport annuel.
        </p>
      )}

      {/* Lot 6 (2026-09-25): the free proof comes BEFORE the paid reading.
          Refonte « registre »: open, not in a fold, each block under its own
          title; it is what a reader checks against the filing. */}
      {comptes.length > 0 && (
        <section id="comptes" aria-labelledby="comptes-titre" className={SECTION}>
          <h2 id="comptes-titre" className={H2}>Les comptes</h2>
          <div className="space-y-6">
            {comptes.map(({ cle, titre }) => (
              <section key={cle} aria-labelledby={`${cle}-titre`}>
                <h3 id={`${cle}-titre`} className="text-base font-semibold mb-1">{titre}</h3>
                <p className={`text-foreground ${PROSE}`}>{fiche.blocs[cle]}</p>
              </section>
            ))}
          </div>
        </section>
      )}

      {fiche.blocs.source && (
        <section id="refais" aria-labelledby="refais-titre" className={SECTION}>
          <h2 id="refais-titre" className={H2}>Refais-le toi-même</h2>
          <p className={`text-foreground ${PROSE}`}>{fiche.blocs.source}</p>
          {depot && (
            <p className="mt-2 text-sm">
              <a href={depot} target="_blank" rel="noopener noreferrer" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
                Ouvrir ce dépôt sur sec.gov<span className="sr-only">{' '}(nouvel onglet)</span>
              </a>
            </p>
          )}
        </section>
      )}

      {/* Les deux paragraphes que l'abonnement vend. Ils ne sont PAS dans
          cette page : elle est statique, donc son HTML est le même pour tout
          le monde. Le composant les demande à une route qui lit l'abonnement
          avant d'aller les chercher. */}
      <RecitInvestir slug={fiche.slug} nom={fiche.name} className={SECTION} />

      {/* Last block before who writes this (C8: no third-party dependency
          above the fold). The widget is a third party's, and it draws prices
          this page says it never reads. */}
      {fiche.ticker && (
        <section aria-labelledby="cours-titre" className={SECTION}>
          <h2 id="cours-titre" className={H2}>Le cours du titre</h2>
          <CoursTradingView symbole={fiche.ticker} />
          <p className="mt-3 max-w-[68ch] text-sm text-muted leading-relaxed">
            Ce cours ne vient pas du rapport annuel et n’entre dans aucun contrôle :
            ma règle ne lit que les comptes. Il est là pour que tu n’aies pas à
            ouvrir un autre onglet.
          </p>
        </section>
      )}

      <EquityDisclosure generatedAt={asOf} />
    </div>
  )
}
