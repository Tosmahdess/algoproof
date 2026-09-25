import TermPopover from '@/components/TermPopover'
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ma méthode : pourquoi je montre chaque perte',
  // ~150 characters: Google cuts a description around 155, and the walk-forward clause is the
  // half that has to survive, since it is the claim this round corrected.
  description: 'Backtest sur 2 ans, 20 trades minimum, et un walk-forward qui regarde le pire trimestre, pas un test hors échantillon. Ma méthode, pertes comprises.',
}

export default function PreuvePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Ma méthode</h1>
        <p className="text-base text-muted leading-relaxed">
          Ce qui compte, c&apos;est ce qui tient en réel. Voici comment je travaille, et pourquoi je
          montre aussi ce qui échoue.
        </p>
      </header>

      <section id="validation" className="scroll-mt-24">
        <h2 className="text-xl font-semibold mb-3">Un backtest gagnant ne prouve rien</h2>
        {/* Which rule applies to which bots: the list below is my own gate, and the
            engine-born bots pass its gauntlet on top of it (Fable review 2026-09-12).
            2026-09-19: the intro said « the bots I deployed by hand » while two
            of the four points spoke of the engine. Author's answer: one rule
            for every bot, so the intro says so and the points drop « moteur ». */}
        <p className="text-base leading-relaxed mb-3">
          Tout ce que je déploie suit la règle ci-dessous. Les bots qui
          sortent de mon moteur passent en plus les quatre épreuves de son gantelet,
          expliquées sur <Link href="/strategies" className={linkClass('inline')}>la page des stratégies</Link>.
        </p>
        <ul className="space-y-2 text-sm leading-relaxed list-disc pl-5">
          <li>Backtest sur <strong>au moins 2 ans</strong> de données et <strong>20 trades minimum</strong> : en dessous, ce n&apos;est pas significatif.</li>
          {/* Audit 2026-09-10: the engine's « walk-forward » is the worst calendar quarter
              of the history the strategy was selected on (validation/walkforward.py), and
              failing it alone gives « en sursis », published, not a rejection. Its costs are
              fees plus a fixed slippage and a flat, unsigned funding, with no spread
              (config.py Costs, validation/costs.py). */}
          <li><strong>Walk-forward</strong> : chez moi, ce n&apos;est pas un test hors échantillon. Je regarde le pire trimestre de l&apos;historique qui a servi à choisir la stratégie. S&apos;il est trop faible, elle est recalée, ou mise en sursis si c&apos;est la seule épreuve qu&apos;elle rate.</li>
          <li>Coûts inclus dès le backtest : frais et slippage fixes, plus un funding forfaitaire de 0,03 % par jour, compté comme un coût quel que soit le sens de la position. Le spread n&apos;est pas modélisé.</li>
          <li>Déploiement d&apos;abord en <TermPopover id="paper-trading">paper trading</TermPopover>, puis en argent réel seulement si ça tient.</li>
        </ul>
      </section>

      <section id="pertes" className="scroll-mt-24">
        <h2 className="text-xl font-semibold mb-3">Pourquoi je montre chaque perte</h2>
        <p className="text-base leading-relaxed">
          Montrer uniquement ses gains, c&apos;est facile et ça ne prouve rien. J&apos;expose donc les drawdowns,
          les mauvaises semaines et les stratégies que j&apos;ai abandonnées. Accessoirement, ça me sert autant
          qu&apos;à toi : quand je sais qu&apos;une perte sera publiée, je me discipline mieux que quand elle reste
          dans un fichier chez moi.
        </p>
      </section>

      <section id="gratuit" className="scroll-mt-24">
        <h2 className="text-xl font-semibold mb-3">Ce qui est gratuit, ce qui le reste, et ce qui ne l&apos;est pas</h2>
        {/* Cette section disait « je ne donnerai pas mes réglages : c'est la seule
            chose que je vendrai » pendant que les CGV du labo, elles, ne vendaient
            que l'outil et que l'écran de paiement ne nommait aucun dossier. Deux
            offres, un prix, et c'est le document contractuel qui l'emportait.
            L'adhésion couvre le labo en entier. La frontière est la même partout :
            ce que je produis est gratuit, comment je l'ai produit se paie. */}
        <p className="text-base leading-relaxed mb-3">
          Tout ce que mes bots font restera public, gratuitement, pour toujours :
          leurs trades, leurs pertes, leur historique, et le cimetière des
          stratégies que j&apos;ai tuées. Tu pourras toujours les voir tourner, avec
          leurs chiffres. Même chose sur les sociétés dont je lis les comptes : les
          sept contrôles et leurs alertes, les chiffres et le rapport annuel
          sont ouverts, et ils le resteront.
        </p>
        <p className="text-base leading-relaxed mb-3">
          Ce qui se paie, c&apos;est comment j&apos;y suis arrivé. Pour un bot :
          la configuration exacte, les paramètres, les filtres, et la preuve étape par
          étape de la façon dont cette configuration a été retenue contre les milliers
          de voisines qui sont mortes. Sur les sociétés dont je lis les comptes, deux paragraphes
          d&apos;analyse par société : ce que ses chiffres veulent dire pour son métier,
          et ce qui peut mal tourner. Et le labo lui-même, l&apos;outil avec lequel je produis tout
          ça, sans quota journalier et avec ses grilles.
        </p>
        <p className="text-base leading-relaxed mb-3">
          Dit autrement :{' '}
          <strong>ce que je fais reste gratuit, comment je l&apos;ai fait se paie.</strong>
        </p>
        <p className="text-base leading-relaxed mb-3">
          Le labo s&apos;ouvre sans compte, et un compte gratuit permet de lancer des
          backtests avec des quotas. Un dossier de validation, celui de l&apos;EMA cross,
          est ouvert en entier à tout le monde : va voir à quoi ça ressemble avant de
          payer quoi que ce soit.
        </p>
        <p className="text-base leading-relaxed mb-3">
          Je ne cacherai aucun résultat. Le cimetière restera ouvert à tout le
          monde : les stratégies qui meurent sont la partie la plus utile de ce
          site, et personne ne devrait avoir à payer pour savoir ce qui ne marche
          pas.
        </p>
        <p className="text-base leading-relaxed">
          L&apos;adhésion donne accès à de la recherche et à un outil. Elle ne
          promet aucun gain, ne donne aucun conseil, et ne s&apos;occupe
          jamais de l&apos;argent de qui que ce soit.
        </p>
      </section>

      <section>
        <p className="text-sm">
          <Link href="/blog" className={linkClass('inline')}>Lis mes autopsies de stratégies sur le blog →</Link>
        </p>
      </section>
    </main>
  )
}
