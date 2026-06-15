import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ma méthode — pourquoi je montre chaque perte',
  description: 'Comment je valide une stratégie avant de la déployer : backtest sur 2 ans, 20 trades minimum, walk-forward, et rejet des overfits. La transparence comme méthode, pas comme argument.',
}

export default function PreuvePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Ma méthode</h1>
        <p className="text-muted leading-relaxed">
          Un backtest qui gagne ne prouve rien. Ce qui compte, c&apos;est ce qui tient en réel. Voici comment je
          travaille — et pourquoi je montre aussi ce qui échoue.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-3">Comment je valide une stratégie</h2>
        <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc pl-5">
          <li>Backtest sur <strong>au moins 2 ans</strong> de données et <strong>20 trades minimum</strong> — en dessous, ce n&apos;est pas significatif.</li>
          <li><strong>Walk-forward</strong> : la stratégie doit tenir sur des périodes qu&apos;elle n&apos;a jamais vues. Sinon, c&apos;est de l&apos;<a href="/lexique#overfit" className="text-accent">overfit</a> — je la rejette.</li>
          <li>Coûts réalistes (frais, slippage, spread) inclus dès le backtest.</li>
          <li>Déploiement d&apos;abord en <a href="/lexique#paper-trading" className="text-accent">paper trading</a>, puis en argent réel seulement si ça tient.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Pourquoi je montre chaque perte</h2>
        <p className="text-muted leading-relaxed">
          Montrer uniquement ses gains, c&apos;est facile et ça ne prouve rien. J&apos;expose les drawdowns, les
          mauvaises semaines et les stratégies abandonnées parce que c&apos;est la seule façon honnête de juger une
          méthode. La transparence n&apos;est pas un argument marketing : c&apos;est l&apos;outil qui me force à rester
          rigoureux.
        </p>
      </section>

      <section>
        <p className="text-sm">
          <Link href="/blog" className="text-accent">Lis mes autopsies de stratégies sur le blog →</Link>
        </p>
      </section>
    </main>
  )
}
