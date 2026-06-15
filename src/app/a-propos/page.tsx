import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos — AlgoProof, mon labo de trading en public',
  description: 'AlgoProof, c\'est quoi : un labo de trading algorithmique transparent, solo, en français. Pourquoi je montre tout, et comment les bots, le labo, le patrimoine et la météo du marché s\'articulent.',
}

const PIECES = [
  { href: '/overview',     title: 'Mes bots',   desc: 'Des bots qui tradent en conditions réelles. Chaque trade est public, gains comme pertes.' },
  { href: '/labo',         title: 'Le labo',    desc: 'L\'outil pour tester tes propres stratégies : backtest, walk-forward, comparaisons.' },
  { href: '/wealth',       title: 'Investir',   desc: 'Mon accumulation long terme (DCA) sur la crypto, les ETF et les actions, en transparence.' },
  { href: '/intelligence', title: 'Le marché',  desc: 'La météo du marché que je calcule chaque jour : risque ON ou OFF, en français.' },
  { href: '/blog',         title: 'Apprendre',  desc: 'Mon journal, ma méthode, la fiscalité et la conformité MiCA — tout est documenté.' },
]

export default function AProposPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-3">AlgoProof, c&apos;est quoi ?</h1>
        <p className="text-muted leading-relaxed">
          Un labo de trading algorithmique <strong>transparent</strong>, en français, que je mène en solo et en public.
          Je fais tourner des bots, je teste des stratégies, j&apos;investis sur le long terme — et j&apos;expose tout,
          gains comme pertes. Pas de promesse de gain, pas de faux screenshots : juste ma recherche, en clair.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-3">Pourquoi en public</h2>
        <p className="text-muted leading-relaxed">
          La plupart des gens ne montrent que leurs réussites. Moi je montre aussi mes pertes, mes mauvaises semaines
          et les stratégies que je rejette. C&apos;est plus utile et plus honnête : une méthode qui tient se prouve
          dans la durée, pas avec une capture d&apos;écran. Ce site est mon laboratoire ouvert, pas une vitrine de gains.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Comment les pièces s&apos;articulent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PIECES.map((p) => (
            <Link key={p.href} href={p.href} className="block bg-card border border-border rounded-xl p-4 hover:border-positive/30 transition-colors group">
              <h3 className="font-bold mb-1 group-hover:text-positive transition-colors">{p.title}</h3>
              <p className="text-sm text-muted">{p.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Paper ou argent réel ?</h2>
        <p className="text-muted leading-relaxed">
          La plupart de mes bots tournent en <strong>paper trading</strong> (simulation fidèle sur de vraies données,
          sans argent réel) — c&apos;est ainsi qu&apos;on valide une stratégie sans risque. Les bots qui passent en
          argent réel sont clairement marqués « live ». Le statut de chaque bot est toujours affiché. Pour le
          vocabulaire, vois le <Link href="/lexique" className="text-accent">lexique</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Gratuit ou payant ?</h2>
        <p className="text-muted leading-relaxed">
          Tout ce que tu vois ici est en accès libre. <Link href="/labo" className="text-accent">Le labo</Link> sera
          l&apos;espace où tu pourras tester tes propres stratégies ; il demandera un compte pour sauvegarder ton
          travail, mais l&apos;exploration restera ouverte. Rien de tout ça n&apos;est un conseil financier.
        </p>
      </section>
    </main>
  )
}
