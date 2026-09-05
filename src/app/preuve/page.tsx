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
          Montrer uniquement ses gains, c&apos;est facile et ça ne prouve rien. J&apos;expose donc les drawdowns,
          les mauvaises semaines et les stratégies que j&apos;ai abandonnées. Accessoirement, ça me sert autant
          qu&apos;à toi : quand je sais qu&apos;une perte sera publiée, je me discipline mieux que quand elle reste
          dans un fichier chez moi.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Ce qui est gratuit, ce qui le reste, et ce qui ne l&apos;est pas</h2>
        {/* Cette section disait « je ne donnerai pas mes réglages : c'est la seule
            chose que je vendrai » pendant que les CGV du labo, elles, ne vendaient
            que l'outil et que l'écran de paiement ne nommait aucun dossier. Deux
            offres, un prix, et c'est le document contractuel qui l'emportait.
            L'adhésion couvre le labo en entier. La frontière est la même partout :
            ce que je produis est gratuit, comment je l'ai produit se paie. */}
        <p className="text-sm mb-3">
          Tout ce que mes bots font restera public, gratuitement, pour toujours :
          leurs trades, leurs pertes, leur historique, et le cimetière des
          stratégies que j&apos;ai tuées. Tu pourras toujours les voir tourner, avec
          leurs chiffres. Même chose pour mes analyses par société : le verdict et
          la raison qui va avec tiennent en deux lignes, ils sont ouverts, et ils le
          resteront.
        </p>
        <p className="text-sm mb-3">
          Ce qui se paie, c&apos;est comment j&apos;y suis arrivé. Pour un bot :
          la configuration exacte, les paramètres, les filtres, et la preuve étape par
          étape de la façon dont cette configuration a été retenue contre les milliers
          de voisines qui sont mortes. Pour une société : les quatre parties qui
          expliquent d&apos;où sort le verdict, au lieu de te demander de me croire
          sur parole. Et le labo lui-même, l&apos;outil avec lequel je produis tout
          ça, sans quota journalier et avec ses grilles.
        </p>
        <p className="text-sm mb-3">
          Dit autrement :{' '}
          <strong>ce que je fais reste gratuit, comment je l&apos;ai fait se paie.</strong>
        </p>
        <p className="text-sm mb-3">
          Le labo s&apos;ouvre sans compte, et un compte gratuit permet de lancer des
          backtests avec des quotas. Un dossier de validation, celui de l&apos;EMA cross,
          est ouvert en entier à tout le monde : va voir à quoi ça ressemble avant de
          payer quoi que ce soit.
        </p>
        <p className="text-sm mb-3">
          Je ne cacherai aucun résultat. Le cimetière restera ouvert à tout le
          monde : les stratégies qui meurent sont la partie la plus utile de ce
          site, et personne ne devrait avoir à payer pour savoir ce qui ne marche
          pas.
        </p>
        <p className="text-sm">
          L&apos;adhésion donne accès à de la recherche et à un outil. Elle ne
          promet aucun gain, ne donne aucun conseil, et ne s&apos;occupe
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
