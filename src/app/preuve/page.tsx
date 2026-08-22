import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ma méthode : pourquoi je montre chaque perte',
  description: 'Comment je valide une stratégie avant de la déployer : backtest sur 2 ans, 20 trades minimum, walk-forward, et rejet des overfits. La transparence comme méthode, pas comme argument.',
}

export default function PreuvePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Ma méthode</h1>
        <p className="text-muted leading-relaxed">
          Un backtest qui gagne ne prouve rien. Ce qui compte, c&apos;est ce qui tient en réel. Voici comment je
          travaille, et pourquoi je montre aussi ce qui échoue.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Comment je valide une stratégie</h2>
        <ul className="space-y-2 text-sm text-muted leading-relaxed list-disc pl-5">
          <li>Backtest sur <strong>au moins 2 ans</strong> de données et <strong>20 trades minimum</strong> : en dessous, ce n&apos;est pas significatif.</li>
          <li><strong>Walk-forward</strong> : la stratégie doit tenir sur des périodes qu&apos;elle n&apos;a jamais vues. Sinon, c&apos;est de l&apos;<a href="/lexique#overfit" className="text-accent">overfit</a> : je la rejette.</li>
          <li>Coûts réalistes (frais, slippage, spread) inclus dès le backtest.</li>
          <li>Déploiement d&apos;abord en <a href="/lexique#paper-trading" className="text-accent">paper trading</a>, puis en argent réel seulement si ça tient.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Pourquoi je montre chaque perte</h2>
        <p className="text-muted leading-relaxed">
          Montrer uniquement ses gains, c&apos;est facile et ça ne prouve rien. J&apos;expose les drawdowns, les
          mauvaises semaines et les stratégies abandonnées parce que c&apos;est la seule façon honnête de juger une
          méthode. La transparence n&apos;est pas un argument marketing : c&apos;est l&apos;outil qui me force à rester
          rigoureux.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Ce qui est gratuit, ce qui le restera, et ce qui ne le sera pas</h2>
        <p className="text-sm mb-3">
          Le labo est gratuit aujourd&apos;hui, sans compte. Seule la recette exacte
          des bots sortis du moteur (valeurs des paramètres et filtres) est réservée
          aux membres. Il passera au payant un jour, et je préfère dire tout de suite
          où passera la ligne plutôt que de te le faire découvrir le jour où ça change.
        </p>
        <p className="text-sm mb-3">
          Tout ce que mes bots font restera public, gratuitement, pour toujours :
          leurs trades, leurs pertes, leur historique, et le cimetière des
          stratégies que j&apos;ai tuées. Tu pourras toujours les voir tourner, avec
          leurs chiffres.
        </p>
        <p className="text-sm mb-3">
          Ce qui deviendra payant, c&apos;est la configuration exacte d&apos;un bot
          et son dossier de validation complet : les paramètres, les filtres, et la
          preuve étape par étape de la façon dont cette configuration a été retenue
          contre les milliers de voisines qui sont mortes. Dit autrement :{' '}
          <strong>ce que mes bots font restera gratuit, comment ils ont gagné le
          droit de tourner se paiera</strong>.
        </p>
        <p className="text-sm mb-3">
          Je ne cacherai aucun résultat. Je ne donnerai pas mes réglages : c&apos;est
          la seule chose que je vendrai. Le cimetière, lui, restera ouvert à tout le
          monde : les stratégies qui meurent sont la partie la plus utile de ce
          site, et personne ne devrait avoir à payer pour savoir ce qui ne marche
          pas.
        </p>
        <p className="text-sm">
          Un abonnement donnera accès à de la recherche et à un outil. Il ne
          promettra aucun gain, ne donnera aucun conseil, et ne s&apos;occupera
          jamais de l&apos;argent de qui que ce soit.
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
