import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import ExplainerBox from '@/components/ExplainerBox'
import Repli from '@/components/Repli'
import { CreuxDachat } from '@/components/CreuxDachat'
import InvestirListe from '@/components/InvestirListe'
import { asOf, contexte, listeHorsPerimetre, listeInvestir } from '@/lib/investir'
import { INVESTIR_VOCAB } from '@/lib/investir-vocab'
import { frNumber } from '@/lib/display'
import { mediumDate } from '@/lib/format-date'

// Rendu statique. Le paquet est un fichier commité : la page ne dépend d'aucun
// service, et le contenu publié se relit dans l'historique du dépôt.
export const dynamic = 'force-static'

// The seven controls, as the engine applies them. Kept word for word from the
// <pre> they replace.
const SEPT_CONTROLES = [
  ['pertes', '2 exercices en perte sur 3, ou un seul'],
  ["chiffre d'affaires", "sous son niveau d'il y a deux ans"],
  ['résultat', "sous son niveau d'il y a deux ans"],
  ['dilution', 'actions +10 % en deux ans'],
  ['capitaux propres', 'négatifs'],
  ['dette long terme', 'nette de la trésorerie, au-dessus du double de la médiane de son secteur'],
  ['trésorerie', 'face aux pertes du dernier exercice'],
] as const

// Lot 6 of the design audit (2026-09-25, conception §5.5): the page is a
// search product. Title and short intro, the three counts beside them on a
// computer (7/5 grid, C12 hub template) and under them on a phone, then the
// search and its facets AT ONCE — they sat 2 326 px down on a computer and
// 1 764 px down on a phone. The list is paged (50 rows). The price-based dips
// go under the list, under a title that no longer contradicts « je ne lis
// aucun cours » in the same screen. The four folds close the page.
export default function InvestirPage() {
  const lignes = listeInvestir()
  const dehors = listeHorsPerimetre()

  // Dérivés de l'index, jamais écrits à la main : un nombre recopié dans de la
  // copie devient faux tout seul, et celui-ci l'a déjà été une fois (l'onglet
  // du navigateur annonçait 599 sociétés pendant que la page en annonçait 741).
  const lus = lignes.map(l => l.n_lus).sort((a, b) => a - b)
  const medianeLus = lus.length ? lus[Math.floor(lus.length / 2)] : 0
  const avecAlerte = lignes.filter(l => l.alertes.length > 0).length

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 space-y-8 sm:space-y-12">
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="text-xs font-medium text-muted mb-2">
            Sociétés
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">
            Je lis le dernier rapport annuel de {frNumber(lignes.length, 0)} sociétés,
            et je te dis ce que j’y trouve.
          </h1>
          <p className="text-sm text-muted max-w-[68ch] leading-relaxed">
            Sept contrôles, lus dans un seul rapport annuel déposé auprès du régulateur
            américain, et pas de mot au bout : chaque contrôle nomme le fait qui l’alerte.
            La méthode et ses limites sont sous la liste.
          </p>
          <p className="text-sm max-w-[68ch] leading-relaxed mt-3">
            Ce n’est pas un conseil d’achat : je ne lis aucun cours de bourse, donc rien
            ici ne dit si un titre est cher aujourd’hui.
          </p>
          <p className="text-xs text-muted mt-3">
            Dernier calcul le {mediumDate(asOf)}.
          </p>
        </div>

        {/* Aucune de ces trois tuiles ne compte les sociétés SANS alerte, et ce
            n'est pas un oubli : un « N sociétés sans rien à signaler » en chiffre
            héros est un blanc-seing, et il porte plus loin qu'un adjectif parce
            qu'il a l'air d'une mesure. Ce qui se compte ici, c'est ce que j'ai lu
            et ce que j'ai trouvé — jamais ce que je n'ai rien trouvé à
            reprocher. */}
        {/* On a phone the three tiles are one row each (value, then label on
            the same line): stacked as cards they pushed the search field to
            840 px, under the fold of a 844 px screen. */}
        <section
          aria-label="Ce que j’ai lu"
          className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-3 self-start"
        >
          {([
            ['Sociétés lues', frNumber(lignes.length, 0)],
            ['Contrôles lus par fiche, en médiane', `${medianeLus} sur 7`],
            ['Fiches portant au moins une alerte', frNumber(avecAlerte, 0)],
          ] as const).map(([label, valeur]) => (
            <div key={label} className="rounded-lg border border-border bg-card px-4 py-2 lg:py-3 flex items-baseline gap-3 sm:block">
              <p className="font-mono text-xl font-medium text-foreground shrink-0">{valeur}</p>
              <p className="text-xs text-muted sm:mt-1">{label}</p>
            </div>
          ))}
        </section>
      </header>

      <section>
        {/* The heading structures the page for assistive tech and keeps the
            /investir#societes anchor; the title and the count line above the
            list already say it, so it is not drawn. */}
        <h2 id="societes" className="sr-only scroll-mt-20">Les sociétés</h2>
        <InvestirListe lignes={lignes} contexte={contexte} />
      </section>

      <CreuxDachat index={lignes} />

      {/* The four long explanatory blocks fold on a phone and stay as they
          were on a computer (Repli, user decision 2026-09-19). */}
      <Repli
        id="mots-investir"
        titre="Les mots employés dans les fiches"
        resume={`${INVESTIR_VOCAB.length} termes`}
        corpsClassName="mt-2"
      >
        <p className="text-sm leading-relaxed mb-4">
          Je garde les mots des comptes, mais voici ce qu’ils veulent dire ici.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INVESTIR_VOCAB.map(([terme, definition]) => (
            <div key={terme} className="rounded-lg border border-border bg-card px-4 py-3">
              <dt className="text-sm font-semibold text-foreground">{terme}</dt>
              <dd className="text-sm leading-relaxed mt-1">{definition}</dd>
            </div>
          ))}
        </dl>
      </Repli>

      {dehors.length > 0 && (
        <Repli
          id="hors-perimetre"
          titre={`${dehors.length} sociétés que je ne lis pas`}
          className="rounded-lg border border-border bg-card px-5 py-4"
          titreClassName="text-sm font-semibold text-muted"
          corpsClassName="mt-2"
        >
          <p className="text-xs text-muted leading-relaxed mb-3">
            Elles ne déposent pas de rapport annuel auprès du régulateur
            américain, donc ma règle n’a aucun document à lire. Je les suis
            quand même, avec une analyse écrite à partir de données de marché
            que tu ne peux pas vérifier comme le reste. C’est dit sur chaque
            fiche.
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {dehors.map(f => (
              <Link key={f.slug} href={`/investir/${f.slug}`}
                    className={linkClass('inline', 'text-sm')}>
                {f.name}
              </Link>
            ))}
          </div>
        </Repli>
      )}

      <Repli
        id="methode"
        titre="Ce que je contrôle, et ce que je ne sais pas"
        resume="La méthode, les sept contrôles et leurs limites"
      >
        <ExplainerBox
          stacked
          functional={
            <div className="space-y-2">
              <p>
                Je lis les séries dans <strong>un seul</strong> rapport annuel, jamais dans
                plusieurs. C’est ce qui empêche une division d’actions ou un retraitement
                comptable de déclencher une alerte alors que les comptes de la société
                n’ont pas bougé : à l’intérieur d’un même document, l’entreprise a déjà
                recalculé ses propres comparatifs.
              </p>
              <p>
                Les sept contrôles sont indépendants. Chacun lit ses propres entrées, et
                quand elles manquent, il le dit au lieu de faire comme si de rien n’était.
                C’est pour ça que le compte s’affiche toujours avec son dénominateur :
                une fiche sans alerte sur cinq contrôles lus n’est pas meilleure qu’une
                fiche avec une alerte sur sept. Elle est moins lue, c’est tout.
              </p>
              <p>
                Il n’y a pas de mot au bout : je ne classe pas une société en « solide »
                ou « fragile », je te donne les faits et le compte de ce que j’ai pu lire.
                Ouvre le même document, tu refais mes contrôles en dix minutes.
              </p>
              <p>
                Un point que je préfère dire ici plutôt que le laisser découvrir. Un
                rapport annuel est une photographie du passé, déposée soixante à quatre-
                vingt-dix jours après la clôture. Qui le lit en novembre lit des comptes
                vieux de treize à quatorze mois. Rien dans cette page ne rattrape un
                avertissement sur résultat publié entre-temps.
              </p>
            </div>
          }
          technical={
            // Was a <pre>: on a phone overflow-x clipped every line
            // (« 2 exercices en perte sur 3, ou un s… »). Items wrap instead.
            <div className="text-sm leading-relaxed space-y-3">
              <ol aria-label="Les sept contrôles" className="space-y-1.5">
                {SEPT_CONTROLES.map(([nom, regle], i) => (
                  <li key={nom} className="grid grid-cols-[1.25rem_1fr] sm:grid-cols-[1.25rem_9.5rem_1fr] gap-x-2">
                    <span className="text-muted font-mono">{i + 1}.</span>
                    <span className="font-semibold text-foreground">{nom}</span>
                    <span className="col-start-2 sm:col-start-auto text-muted">{regle}</span>
                  </li>
                ))}
              </ol>
              <p>
                lu / non lu par contrôle, sur ses propres entrées
                <br />
                aucun score, aucune moyenne, aucun adjectif
              </p>
            </div>
          }
        />
      </Repli>

      <Repli
        id="hors-liste"
        titre="Ce que cette liste ne contient pas, et pourquoi"
        className="rounded-lg border border-border bg-card px-5 py-4 text-sm leading-relaxed"
        titreClassName="text-base font-semibold text-foreground"
        corpsClassName="mt-2 space-y-2"
      >
        <p>
          La règle ne lit que des rapports annuels déposés auprès du régulateur américain,
          la SEC. LVMH, Hermès, Kering, Roche, Nestlé, Nintendo, Rheinmetall, Thales ou
          BAE Systems n’y déposent rien : elles ne peuvent pas y figurer, et ce n’est pas
          un oubli. Les sociétés cotées aux États-Unis mais domiciliées ailleurs déposent
          un formulaire différent, que je suis en train d’ajouter.
        </p>
        <p>
          Il n’y a pas non plus de partie « momentum », alors qu’elle existe sur mes
          anciennes analyses. Elle est entièrement faite de cours de bourse, et je n’ai pas
          aujourd’hui de source de cours que j’aie le droit d’afficher publiquement. Je
          préfère un trou nommé à un chiffre dont je ne peux pas répondre.
        </p>
        {/* Ce paragraphe finissait sur « Mes analyses long terme et mon
            allocation », un lien vers /wealth. /wealth est supprimée depuis le
            2026-09-09 et redirige ici en 308 : le lien ramenait sur la page
            même, et il n'y a plus de page d'allocation à promettre (audit
            2026-09-09). */}
        <p className="text-xs">
          Mon travail d’analyse, publié en transparence. Ce n’est pas un conseil en
          investissement.
        </p>
      </Repli>
    </main>
  )
}
