import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import ExplainerBox from '@/components/ExplainerBox'
import Repli from '@/components/Repli'
import { CreuxDachat } from '@/components/CreuxDachat'
import InvestirListe from '@/components/InvestirListe'
import { asOf, contexte, listeHorsPerimetre, listeInvestir } from '@/lib/investir'
import { INVESTIR_VOCAB } from '@/lib/investir-vocab'
import { longDate } from '@/lib/format-date'

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
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          Investir
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Je lis le dernier rapport annuel de {lignes.length} sociétés, et je te dis
          ce que j’y trouve.
        </h1>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Sept contrôles indépendants, tous lus dans un seul rapport annuel déposé auprès
          du régulateur américain. Chacun dit s’il a pu être lu, et s’il l’a été, il nomme
          le fait qui l’alerte. Il n’y a pas de mot au bout : je ne classe pas une société
          en « solide » ou « fragile », je te donne les faits et le compte de ce que j’ai
          pu lire. Ouvre le même document, tu refais mes contrôles en dix minutes.
        </p>
        <p className="text-sm text-muted max-w-2xl leading-relaxed mt-3">
          Ce n’est pas un conseil d’achat, et pas seulement pour la forme : je ne lis aucun
          cours de bourse, donc rien ici ne peut dire si un titre est cher aujourd’hui.
        </p>
        <p className="text-xs text-muted mt-3">
          Dernier calcul le {longDate(asOf)}.
        </p>
        {/* The list starts two screens below the fold on a computer, and
            further on a phone even with the explanations folded. */}
        <a href="#societes"
           className={linkClass('nav', 'inline-block mt-3 text-sm')}>
          Aller aux sociétés ↓
        </a>
      </div>

      {/* Aucune de ces trois cartes ne compte les sociétés SANS alerte, et ce
          n'est pas un oubli : un « N sociétés sans rien à signaler » en chiffre
          héros est un blanc-seing, et il porte plus loin qu'un adjectif parce
          qu'il a l'air d'une mesure. Ce qui se compte ici, c'est ce que j'ai lu
          et ce que j'ai trouvé — jamais ce que je n'ai rien trouvé à
          reprocher. */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          ['Sociétés lues', `${lignes.length}`],
          ['Contrôles lus par fiche, en médiane', `${medianeLus} sur 7`],
          ['Fiches portant au moins une alerte', `${avecAlerte}`],
        ] as const).map(([label, valeur]) => (
          <div key={label} className="rounded border border-border bg-card px-4 py-3">
            <p className="text-2xl font-semibold text-foreground">{valeur}</p>
            <p className="text-xs uppercase tracking-wider text-muted mt-1">{label}</p>
          </div>
        ))}
      </section>

      <CreuxDachat index={lignes} />

      {/* The four long explanatory blocks below fold on a phone and stay as
          they were on a computer (Repli, user decision 2026-09-19): on a 390 px
          phone the company search came after ~3 000 px of explanation. The
          hero, the counts and the recent dips stay open. */}
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
            <div key={terme} className="rounded border border-border bg-card px-4 py-3">
              <dt className="text-sm font-semibold text-foreground">{terme}</dt>
              <dd className="text-sm text-muted leading-relaxed mt-1">{definition}</dd>
            </div>
          ))}
        </dl>
      </Repli>

      {dehors.length > 0 && (
        <Repli
          id="hors-perimetre"
          titre={`${dehors.length} sociétés que je ne lis pas`}
          className="rounded-lg border border-border bg-card px-5 py-4"
          titreClassName="text-sm font-semibold uppercase tracking-widest text-muted"
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

      <section>
        <h2 id="societes" className="text-xl font-semibold mb-3 scroll-mt-20">Les sociétés</h2>
        <InvestirListe lignes={lignes} contexte={contexte} />
      </section>

      <Repli
        id="hors-liste"
        titre="Ce que cette liste ne contient pas, et pourquoi"
        className="rounded border border-border bg-card px-5 py-4 text-sm leading-relaxed"
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
