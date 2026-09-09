import Link from 'next/link'
import ExplainerBox from '@/components/ExplainerBox'
import InvestirListe from '@/components/InvestirListe'
import { asOf, compteParNote, contexte, decimalFr, listeHorsPerimetre, listeInvestir } from '@/lib/investir'
import { longDate } from '@/lib/format-date'

// Rendu statique. Le paquet est un fichier commité : la page ne dépend d'aucun
// service, et le contenu publié se relit dans l'historique du dépôt.
export const dynamic = 'force-static'

export default function InvestirPage() {
  const lignes = listeInvestir()
  const notes = compteParNote()
  const dehors = listeHorsPerimetre()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          Investir
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Je note les comptes de {contexte.societes_notees} sociétés, avec une règle
          que tu peux refaire toi-même.
        </h1>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Chaque note sort de trois colonnes d’un seul rapport annuel déposé auprès du
          régulateur américain : chiffre d’affaires, résultat net, nombre d’actions, sur
          trois exercices. Cinq comparaisons, deux nombres ronds. Ouvre le même document,
          et tu retombes sur ma note en dix minutes. Ce n’est pas un conseil d’achat :
          je ne lis aucun cours de bourse.
        </p>
        <p className="text-xs text-muted/70 mt-3">
          Dernier calcul le {longDate(asOf)}.
        </p>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['Comptes solides', notes['solide'], 'text-positive'],
          ['À surveiller', notes['a surveiller'], 'text-warning'],
          ['Fragile', notes['fragile'], 'text-negative'],
          ['Médiane de valorisation', `${decimalFr(contexte.mediane_annees)} ans`, 'text-muted'],
        ] as const).map(([label, valeur, couleur]) => (
          <div key={label} className="rounded border border-border bg-card px-4 py-3">
            <p className={`text-2xl font-semibold ${couleur}`}>{valeur}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted mt-1">{label}</p>
          </div>
        ))}
      </section>

      {dehors.length > 0 && (
        <section className="rounded-lg border border-border bg-card px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-2">
            {dehors.length} sociétés que je ne note pas
          </h2>
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
                    className="text-muted hover:text-foreground transition-colors">
                {f.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Comment la note est décidée</h2>
        <ExplainerBox
          stacked
          functional={
            <div className="space-y-2">
              <p>
                Je lis trois séries dans <strong>un seul</strong> rapport annuel, jamais
                dans plusieurs. C’est ce qui empêche une division d’actions ou un
                retraitement comptable de déplacer une note alors que les comptes de la
                société n’ont pas bougé : à l’intérieur d’un même document, l’entreprise a
                déjà recalculé ses propres comparatifs.
              </p>
              <p>
                Les notes décrivent <strong>les comptes</strong>, pas ce qu’il faut faire du
                titre. La règle ne lit aucun cours, donc elle ne peut pas dire si une
                société vaut la peine d’être payée à son prix du jour. À côté de la note,
                je publie un rapport daté entre ce que vaut sa part flottante en bourse et
                ce qu’elle gagne. Il ne peut que rétrograder une note, jamais en créer une
                bonne.
              </p>
            </div>
          }
          technical={
            <pre className="text-[11px] leading-relaxed overflow-x-auto">
{`2 exercices en perte sur 3             → fragile
1 exercice en perte                    → à surveiller
CA ou résultat sous leur niveau de N-2 → à surveiller
actions +10 % en deux ans              → à surveiller
flottant > 40 années de résultat       → à surveiller
sinon                                  → comptes solides`}
            </pre>
          }
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Les sociétés</h2>
        <InvestirListe lignes={lignes} />
      </section>

      <section className="rounded border border-border bg-card px-5 py-4 space-y-2 text-sm text-muted leading-relaxed">
        <h2 className="text-base font-semibold text-foreground">
          Ce que cette liste ne contient pas, et pourquoi
        </h2>
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
        <p className="text-xs">
          Mon travail d’analyse, publié en transparence. Ce n’est pas un conseil en
          investissement.{' '}
          <Link href="/wealth" className="text-accent hover:underline">
            Mes analyses long terme et mon allocation
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
