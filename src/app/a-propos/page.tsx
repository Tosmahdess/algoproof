import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos : AlgoProof, mon labo de trading en public',
  description: 'AlgoProof, c\'est quoi : un labo de trading algorithmique transparent, solo, en français. Pourquoi je montre tout, et comment les bots, le labo, le patrimoine et la météo du marché s\'articulent.',
}

const PIECES = [
  // FIX (final whole-branch review, label drift): « La flotte » everywhere,
  // matching Nav and Footer — /overview had two names across the site.
  { href: '/overview',     title: 'La flotte',  desc: 'Des bots qui tradent en conditions réelles. Chaque trade est public, gains comme pertes.' },
  { href: 'https://lab.algoproof.fr', title: 'Le labo',    desc: 'L\'outil pour tester tes propres stratégies : backtest, walk-forward, comparaisons.' },
  { href: '/wealth',       title: 'Investir',   desc: 'Mon accumulation long terme (DCA) sur la crypto, les ETF et les actions, en transparence.' },
  { href: '/intelligence', title: 'Météo du marché', desc: 'La météo du marché que je calcule chaque jour : risque ON ou OFF, en français.' },
  { href: '/blog',         title: 'Apprendre',  desc: 'Mon journal, ma méthode, la fiscalité et la conformité MiCA : tout est documenté.' },
]

export default function AProposPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">AlgoProof, c&apos;est quoi ?</h1>
        <p className="text-muted leading-relaxed">
          Un labo de trading algorithmique <strong>transparent</strong>, en français, que je mène en solo et en public.
          Je fais tourner des bots, je teste des stratégies, j&apos;investis sur le long terme, et j&apos;expose tout,
          gains comme pertes. Pas de promesse de gain, pas de faux screenshots : juste ma recherche, en clair.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Pourquoi en public</h2>
        <p className="text-muted leading-relaxed">
          La plupart des gens ne montrent que leurs réussites. Moi je montre aussi mes pertes, mes mauvaises semaines
          et les stratégies que je rejette. C&apos;est plus utile et plus honnête : une méthode qui tient se prouve
          dans la durée, pas avec une capture d&apos;écran. Ce site est mon laboratoire ouvert, pas une vitrine de gains.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Comment les pièces s&apos;articulent</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PIECES.map((p) => (
            <Link key={p.href} href={p.href} className="block bg-card border border-border rounded-lg p-4 hover:border-positive/30 transition-colors group">
              <h3 className="text-base font-semibold mb-1 group-hover:text-positive transition-colors">{p.title}</h3>
              <p className="text-sm text-muted">{p.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Paper ou argent réel ?</h2>
        <p className="text-muted leading-relaxed">
          La plupart de mes bots tournent en <strong>paper trading</strong> (simulation fidèle sur de vraies données,
          sans argent réel) : c&apos;est ainsi qu&apos;on valide une stratégie sans risque. Les bots qui passent en
          argent réel sont clairement marqués « live ». Le statut de chaque bot est toujours affiché. Pour le
          vocabulaire, vois le <Link href="/lexique" className="text-accent">lexique</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Gratuit ou payant ?</h2>
        <p className="text-muted leading-relaxed">
          Regarder est gratuit : trades, pertes, courbes, historique et cimetière. Le{' '}
          <a href="https://lab.algoproof.fr" className="text-accent">labo</a> s&apos;ouvre sans compte, et un compte
          gratuit permet de lancer des backtests avec des quotas. L&apos;adhésion à 29 € par mois lève ces quotas et
          ouvre la configuration exacte des bots et leur dossier de validation, jamais leurs résultats, qui restent
          publics et gratuits.{' '}
          <Link href="/preuve" className="text-accent">Où passera la ligne, en détail →</Link>
        </p>
      </section>
    </main>
  )
}
