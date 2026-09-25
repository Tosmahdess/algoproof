import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import { membershipPrice } from '@/lib/launch-offer'
import { AuthorIdentity } from '@/components/AuthorIdentity'
import { getFleetImpact, verdictPhrase } from '@/lib/mi-fleet-impact'
import { listeHorsPerimetre } from '@/lib/investir'
import { getBotExpectations } from '@/lib/bot-expectations'
import { longDate } from '@/lib/format-date'
import { frNumber } from '@/lib/display'

export const metadata: Metadata = {
  title: 'À propos : mes bots de trading et les comptes de sociétés, en public',
  description: 'AlgoProof, c\'est quoi : des bots de trading en simulation et en argent réel, chaque trade publié, et les comptes de sociétés cotées lus par sept contrôles. Qui est derrière, comment c\'est financé, ce que je ne sais pas.',
}

// The weekly fleet-impact row moves once a week; the page follows /intelligence.
export const revalidate = 1800

// Lot 7 of the design audit (spec 5.7, audit §6.3, 2026-09-25): five sections,
// the prose template, both activities named, the navigation cards gone. Every
// number in « Ce que je ne sais pas » is read from data: the measured window of
// the weather, the count of out-of-scope companies, the last ORB decision. A
// number typed by hand in copy goes false on its own.
export default async function AProposPage() {
  const impact = await getFleetImpact()
  const horsPerimetre = listeHorsPerimetre().length
  const orb = getBotExpectations('orb-bf25')?.decisions?.at(-1) ?? null

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      <h1 className="text-3xl font-semibold tracking-tight">À propos</h1>

      <section>
        <h2 className="text-xl font-semibold mb-3">AlgoProof, c&apos;est quoi</h2>
        <p className="text-base leading-relaxed">
          Le 30 juin 2026, j&apos;ai déplacé mon bot en argent réel de Binance vers Kraken, la veille
          du jour où Binance cessait de servir les résidents français. AlgoProof, c&apos;est ce que je
          publie autour de ça : des <Link href="/overview" className={linkClass('inline')}>bots</Link> qui
          tradent en simulation sur données réelles, frais et slippage compris, ou avec mon argent,
          chaque trade en ligne, gains comme pertes ; et les <Link href="/investir" className={linkClass('inline')}>comptes
          de sociétés cotées</Link>, lus par sept contrôles que tu peux refaire toi-même, rapport
          annuel en main. Pas de promesse de gain et pas de chiffre inventé : ce que je vois, et
          plus bas, ce que je ne sais pas.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Pourquoi je publie tout</h2>
        <p className="text-base leading-relaxed">
          La plupart des gens ne montrent que leurs réussites. Moi je montre aussi mes pertes, mes
          mauvaises semaines et les stratégies que je rejette. C&apos;est plus utile et plus honnête :
          une méthode qui tient se prouve dans la durée, pas avec une capture d&apos;écran. Et quand je
          sais qu&apos;une perte sera publiée, je tiens mieux ma règle que quand elle reste dans un
          fichier chez moi. Les bots qui tradent mon argent portent la mention « Argent réel » ;
          les autres sont en simulation, et le statut est écrit à côté de chaque bot.
        </p>
      </section>

      <section className="text-base leading-relaxed space-y-3">
        <h2 className="text-xl font-semibold">Qui est derrière</h2>
        <AuthorIdentity />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Comment c&apos;est financé</h2>
        <p className="text-base leading-relaxed">
          Deux choses me rapportent de l&apos;argent ici, et rien d&apos;autre. L&apos;abonnement au{' '}
          <a href="https://lab.algoproof.fr" className={linkClass('inline')}>labo</a>, à {membershipPrice()}{' '}:
          il lève les quotas de backtest et ouvre la configuration exacte des bots, deux paragraphes
          d&apos;analyse par société et les fonctions de calcul du labo. Et un lien d&apos;affiliation vers
          Bybit sur <Link href="/start" className={linkClass('inline')}>la page Démarrer</Link> : si tu
          ouvres un compte en passant par lui, je touche une commission, sans surcoût pour toi. Pas de
          pub, et aucune société citée ne me paie. Regarder reste gratuit : trades, pertes, courbes,
          historique, cimetière. Sur les sociétés dont je lis les comptes, les sept contrôles et
          leurs alertes, les chiffres et le rapport annuel le sont aussi.{' '}
          <Link href="/preuve#gratuit" className={linkClass('inline')}>Où passera la ligne, en détail →</Link>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Ce que je ne sais pas</h2>
        <ul className="list-disc pl-5 space-y-3 text-base leading-relaxed">
          <li>
            {impact
              ? verdictPhrase(impact)
              : 'Ma météo du marché n’est pas prouvée : je ne sais pas te montrer que son timing sert à quelque chose.'}{' '}
            Je la garde quand même, et je republie chaque semaine la mesure qui la met en cause,{' '}
            <Link href="/intelligence" className={linkClass('inline')}>sur la page Météo</Link>.
          </li>
          <li>
            Mon walk-forward n&apos;est pas un test hors échantillon : je regarde le pire trimestre de
            l&apos;historique qui a servi à choisir la stratégie. Une stratégie peut passer ça, puis se
            casser sur des données qu&apos;elle n&apos;a jamais vues.
          </li>
          <li>
            {/* {' '} after the interpolation: RSC drops the ambient space that follows
                an expression in mixed text (« 27sociétés » on the dev build). */}
            {frNumber(horsPerimetre, 0)}{' '}sociétés de ma liste sont hors du périmètre de mes contrôles,
            la plupart parce qu&apos;elles ne sont pas cotées aux États-Unis et ne déposent donc rien que je
            puisse lire. Leur fiche le dit, et ne porte ni chiffre ni contrôle.
          </li>
          {orb && (
            <li>
              Mon bot ORB (cassure du range d&apos;ouverture, en argent réel) a franchi sa règle d&apos;arrêt,
              et je l&apos;ai gardé le {longDate(orb.date)}, hors enveloppe, sans motif chiffré.
              {orb.reviewBy ? <> Je le rejuge le {longDate(orb.reviewBy)}.</> : null}{' '}
              <Link href="/strategies/bot/orb-bf25" className={linkClass('inline')}>La décision est sur sa fiche</Link>.
            </li>
          )}
        </ul>
      </section>
    </main>
  )
}
