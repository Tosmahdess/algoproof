import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import Repli from '@/components/Repli'
import { CreuxDachat } from '@/components/CreuxDachat'
import InvestirListe from '@/components/InvestirListe'
import { DesLectures } from '@/components/DesLectures'
import { asOf, contexte, listeHorsPerimetre, listeInvestir, phraseListeHorsPerimetre } from '@/lib/investir'
import { SEPT_CONTROLES } from '@/lib/investir-controles'
import { INVESTIR_VOCAB } from '@/lib/investir-vocab'
import { frNumber } from '@/lib/display'
import { mediumDate } from '@/lib/format-date'

// Rendu statique. Le paquet est un fichier commité : la page ne dépend d'aucun
// service, et le contenu publié se relit dans l'historique du dépôt.
export const dynamic = 'force-static'

// Refonte « Le registre des décisions », pages Sociétés (2026-10-03). The page
// takes the fleet's grammar: the title and one lead, « Des lectures, pas des
// conseils » right under it (audit 2026-10, n° 52), three counts between two
// rules, then ONE register, searchable and filterable, in French alphabetical
// order. What explains it follows, each block opened by a rule, in the order
// the reader meets it: the DOM order IS the visual order (n° 50, WCAG 1.3.2;
// the method used to be moved to the end by `sm:order-last`).
//
// The method stays next to the intro, folded to one line on every screen (user,
// 2026-09-30: the intro speaks of « sept contrôles » and nothing near it said
// what they were). The lead links to it.
const SECTION = 'border-t border-border pt-8 sm:pt-9'
const H2 = 'text-2xl font-semibold tracking-tight'

export default function InvestirPage() {
  const lignes = listeInvestir()
  const dehors = listeHorsPerimetre()
  // What the client components need of them: no description crosses.
  const dehorsCourt = dehors.map(({ slug, name, ticker }) => ({ slug, name, ticker }))

  // Dérivés de l'index, jamais écrits à la main : un nombre recopié dans de la
  // copie devient faux tout seul, et celui-ci l'a déjà été une fois (l'onglet
  // du navigateur annonçait 599 sociétés pendant que la page en annonçait 741).
  const lus = lignes.map(l => l.n_lus).sort((a, b) => a - b)
  const medianeLus = lus.length ? lus[Math.floor(lus.length / 2)] : 0
  const avecAlerte = lignes.filter(l => l.alertes.length > 0).length

  // Aucun de ces trois chiffres ne compte les sociétés SANS alerte, et ce n'est
  // pas un oubli : un « N sociétés sans rien à signaler » est un blanc-seing,
  // et il porte plus loin qu'un adjectif parce qu'il a l'air d'une mesure. Ce
  // qui se compte ici, c'est ce que j'ai lu et ce que j'ai trouvé.
  const chiffres = [
    ['Sociétés lues', frNumber(lignes.length, 0)],
    ['Contrôles lus par fiche, en médiane', `${medianeLus} sur 7`],
    ['Fiches avec au moins une alerte', frNumber(avecAlerte, 0)],
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 pb-4">
      <header>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-[30ch]">
          Je lis le dernier rapport annuel de{' '}{frNumber(lignes.length, 0)}{' '}sociétés, et je te dis ce que j’y trouve.
        </h1>
        <p className="mt-4 max-w-[68ch] text-base sm:text-lg text-muted">
          Sept contrôles, lus dans un seul rapport annuel déposé auprès du régulateur américain.
          Chaque alerte dit le fait qui l’a déclenchée, et je dis ce que je n’ai pas pu lire.
        </p>
        <DesLectures className="mt-4" />
        <p className="mt-3 text-xs text-muted">
          Dernier calcul le{' '}{mediumDate(asOf)}.{' '}
          <a href="#methode" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Les sept contrôles et leurs limites
          </a>
        </p>
      </header>

      <dl data-testid="investir-chiffres" className="mt-6 grid grid-cols-3 border-y border-border">
        {chiffres.map(([label, valeur], i) => (
          <div key={label} className={`min-w-0 py-4 sm:py-5 ${i > 0 ? 'border-l border-border pl-3 sm:pl-6' : 'pr-3 sm:pr-6'}`}>
            <dt className="text-xs sm:text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-lg md:text-xl font-medium leading-tight tabular-nums">{valeur}</dd>
          </div>
        ))}
      </dl>

      <Repli
        id="methode"
        toujoursPliable
        titre="Ce que je contrôle, et ce que je ne sais pas"
        resume="La méthode, les sept contrôles et leurs limites"
        className="border-b border-border py-2"
        titreClassName="text-base font-semibold"
        corpsClassName="mt-3 pb-6"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="max-w-[68ch] space-y-3 text-sm leading-relaxed">
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
              Je ne classe pas une société en « solide » ou « fragile ». Je te donne les faits
              et le nombre de contrôles que les données ont permis de faire.
              Avec le même document, tu peux refaire mes contrôles en dix minutes.
            </p>
            <p>
              Un rapport annuel est une photographie du passé, déposée soixante à
              quatre-vingt-dix jours après la clôture. Qui le lit en novembre lit des comptes
              vieux de treize à quatorze mois. Rien dans cette page ne rattrape un
              avertissement sur résultat publié entre-temps.
            </p>
          </div>
          {/* Was a <pre>: on a phone overflow-x clipped every line
              (« 2 exercices en perte sur 3, ou un s… »). Items wrap instead. */}
          <div className="text-sm leading-relaxed">
            <ol aria-label="Les sept contrôles" className="border-t border-border">
              {SEPT_CONTROLES.map((c, i) => (
                <li key={c.cle} className="grid grid-cols-[1.5rem_minmax(0,1fr)] sm:grid-cols-[1.5rem_10rem_minmax(0,1fr)] gap-x-2 border-b border-border py-2">
                  <span className="text-muted tabular-nums">{i + 1}.</span>
                  <span className="font-semibold text-foreground">{c.nom}</span>
                  <span className="col-start-2 sm:col-start-auto text-muted">{c.regle}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-muted">
              Chaque contrôle est lu ou non lu, sur ses propres entrées. Aucun score, aucune
              moyenne, aucun adjectif.
            </p>
          </div>
        </div>
      </Repli>

      <section aria-labelledby="societes" className="pt-8 sm:pt-9">
        <h2 id="societes" className={`${H2} scroll-mt-24`}>Les sociétés</h2>
        <p className="mt-2 mb-4 max-w-[65ch] text-sm text-muted">
          Par ordre alphabétique. Je ne les classe pas par nombre d’alertes : dans un sens ce
          serait un palmarès, dans l’autre une liste à vendre.
        </p>
        <InvestirListe lignes={lignes} contexte={contexte} horsPerimetre={dehorsCourt} />
      </section>

      <div className="mt-12">
        <CreuxDachat index={lignes} horsPerimetre={dehorsCourt} />

        {/* The long explanatory blocks fold on a phone and stay open on a
            computer (Repli, user decision 2026-09-19). Each opens with a rule. */}
        <Repli
          id="mots-investir"
          titre="Les mots employés dans les fiches"
          resume={`${INVESTIR_VOCAB.length} termes`}
          className={`${SECTION} pb-8`}
          titreClassName={H2}
          corpsClassName="mt-3"
        >
          <p className="text-sm leading-relaxed mb-4 max-w-[68ch]">
            Je garde les mots des comptes, mais voici ce qu’ils veulent dire ici.
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t border-border">
            {INVESTIR_VOCAB.map(([terme, definition]) => (
              <div key={terme} className="border-b border-border py-3">
                <dt className="text-sm font-semibold text-foreground">{terme}</dt>
                <dd className="text-sm leading-relaxed mt-1 text-muted">{definition}</dd>
              </div>
            ))}
          </dl>
        </Repli>

        {/* Audit 2026-10, n° 14: « Elles ne déposent pas » was said of all of
            them, and false for the ones that file a 10-K or a 20-F. The counts
            per cause are computed from the fiches, never written by hand. */}
        {dehors.length > 0 && (
          <Repli
            id="hors-perimetre"
            titre={`${dehors.length} sociétés que je ne lis pas`}
            className={`${SECTION} pb-8`}
            titreClassName={H2}
            corpsClassName="mt-3"
          >
            <p className="text-sm text-muted leading-relaxed mb-3 max-w-[68ch]">
              Mes sept contrôles ne lisent pas leurs comptes. Sur ces{' '}{dehors.length}{' '}sociétés,{' '}
              {phraseListeHorsPerimetre(dehors)}{' '}Je les suis quand même, avec une analyse
              écrite à partir de données de marché que tu ne peux pas vérifier comme le reste.
              Chaque fiche dit pourquoi je ne la lis pas.
            </p>
            <ul className="flex flex-wrap gap-x-5 text-sm">
              {dehors.map(f => (
                <li key={f.slug}>
                  <Link href={`/investir/${f.slug}`} className={linkClass('inline', 'inline-flex min-h-11 items-center text-sm')}>
                    {f.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Repli>
        )}

        <Repli
          id="hors-liste"
          titre="Ce que cette liste ne contient pas, et pourquoi"
          className={`${SECTION} pb-8`}
          titreClassName={H2}
          corpsClassName="mt-3 space-y-2 max-w-[68ch] text-sm leading-relaxed"
        >
          <p>
            La règle ne lit que des rapports annuels déposés auprès du régulateur américain,
            la SEC. LVMH, Hermès, Kering, Roche, Nestlé, Nintendo, Rheinmetall, Thales ou
            BAE Systems n’y déposent ni 10-K ni 20-F : elles ne peuvent pas y figurer, et ce
            n’est pas un oubli. Les sociétés cotées aux États-Unis mais domiciliées ailleurs
            déposent un formulaire différent, le 20-F : j’en lis une partie, pas encore
            toutes.
          </p>
          <p>
            Il n’y a pas non plus de partie « momentum », alors qu’elle existe sur mes
            anciennes analyses. Elle est entièrement faite de cours de bourse, et je n’ai pas
            aujourd’hui de source de cours que j’aie le droit d’afficher publiquement. Je
            ne la publie donc pas.
          </p>
          {/* Ce paragraphe finissait sur un lien vers /wealth, supprimée depuis
              le 2026-09-09 et redirigée ici en 308 (audit 2026-09-09). */}
          <p className="text-muted">
            Mon travail d’analyse, publié en transparence. Ce n’est pas un conseil en
            investissement.
          </p>
        </Repli>
      </div>
    </div>
  )
}
