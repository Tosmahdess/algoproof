// src/app/page.tsx
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import TrackedLink from '@/components/TrackedLink'
import StatusBadge from '@/components/StatusBadge'
import TVTickerTapeIsland from '@/components/TVTickerTapeIsland'
import FunnelCounter from '@/components/FunnelCounter'
import { getAllBotsWithStats } from '@/lib/queries'
import { getFunnelCounts } from '@/lib/funnel'
import { familyColor, familyLabel } from '@/lib/families'
import { excludeArchived, splitCohorts } from '@/lib/cohort'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample, isCarryFamily, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss, CARRY_METRIC_TOOLTIP } from '@/lib/display'
import { sortFleet } from '@/lib/fleet-sort'

export const revalidate = 1800

export const metadata: Metadata = {
  // 2026-09-20: the hero now names both activities; these two strings are what
  // a browser tab, a search result and a link preview show, and they said
  // « labo » alone. Guarded by tests/lib/site-positioning.test.ts.
  title: 'AlgoProof : stratégies testées, comptes de sociétés examinés',
  description: 'Je fais tourner des bots de trading et j\'expose chaque trade, gains comme pertes. Je passe aussi les rapports annuels de sociétés cotées à travers sept contrôles.',
}

// FIX (final review, C1 follow-on): these were two local five-entry maps with
// `?? '#888'` / `?? '—'` fallbacks, so a momentum, price-action, stat-arb or
// event bot rendered its family as a grey dash — and this page said « Marché
// neutre » where families.ts says « Neutre au marché », the exact divergence
// C1 called out on /strategies. Both now come from the taxonomy itself.

export default async function HomePage() {
  // Archived bots stay listed on /strategies (with a badge) but are excluded from
  // the homepage headline counts and ranking.
  const [allBots, funnel] = await Promise.all([getAllBotsWithStats(), getFunnelCounts()])
  const bots = excludeArchived(allBots)
  // Live = real money (status 'live': v1-spot, v1-hl, orb-bf25) ; the rest is simulation
  // (the word « laboratoire » was retired for a bot STATUS on 2026-09-20 — « le labo » is the tool).
  // Keep these counts apart so the hero never implies the whole fleet is real capital.
  const { live: liveBots, paper: paperBots } = splitCohorts(bots)
  // Ordered by track record, not by profit — the same default /overview uses,
  // and for the reasons written at the top of lib/fleet-sort.ts: the top of a
  // performance ranking is mechanically populated by small-sample luck, and this
  // site exists to demonstrate exactly that. Ordering the FIRST screen by P&L
  // contradicted the product on the most visible page there is, and put bots
  // with three trades in the first rows.
  const preview = sortFleet(bots, 'proven', 'desc').slice(0, 10)

  return (
    /* pt-8 sur téléphone au lieu de py-20 : 80 px de vide au-dessus du hero
       sur un écran de 664 px, c'est un huitième de l'écran dépensé avant le
       premier mot. Ces 48 px repris financent la marque ajoutée au-dessus du
       titre sans repousser la première carte sous le pli — voir la mesure dans
       le commentaire du hero. Le bas de page ne change pas. */
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-20 sm:py-20">

      {/* Hero — deux entrées (user 2026-09-20).
          Le message d'accueil ne nommait qu'une des deux activités : la page
          s'ouvrait sur « Mon labo de trading algorithmique, en public. » et le
          mot « Investir » n'arrivait qu'à 1 686 px sur un téléphone de 390 px
          (mesure en production, 20/09). Le titre et le paragraphe ci-dessous
          sont le texte de l'user, arbitré tel quel ; les deux entrées en sont
          les deux moitiés. Pastille retirée : elle annonçait un site
          mono-activité juste au-dessus d'un titre qui en annonce deux. */}
      <div data-testid="home-hero" className="text-center mb-16">
        {/* La marque, au-dessus du titre (user 2026-09-20). `alt` est vide
            DÉLIBÉRÉMENT : la nav porte déjà « ALGOPROOF » en texte, dans un
            lien ; un lecteur d'écran qui annoncerait la marque une seconde fois
            à 100 px d'intervalle la lirait comme deux éléments distincts. Le
            glyphe est ici décoratif, le nom est dans la nav.
            Jusqu'à ce jour le dépôt n'avait AUCUN logo : `public/` ne contenait
            que les SVG d'exemple de Next, et l'onglet servait le favicon par
            défaut de Create Next App. */}
        {/* Taille par palier, et c'est une contrainte MESURÉE, pas un goût :
            à 44 px + mb-5 sur téléphone la marque coûtait 64 px et poussait le
            bouton de la première carte de 618 à 682 px, donc sous le pli d'un
            écran de 664 — exactement ce que D059 venait de réparer. 36 px + mb-3
            ici, plus les 48 px repris au padding du conteneur, rendent la
            position d'avant AU PIXEL : carte à 433, bouton 618 -> 658, dans
            l'écran. Mesuré sur le build de production servi en local, 390x664 ;
            un garde ne peut pas tenir ça, seule une remesure le peut. */}
        <img src="/logo.svg" alt="" width={44} height={44} className="mx-auto mb-3 sm:mb-5 w-9 h-9 sm:w-11 sm:h-11" />
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4 sm:mb-6">
          Des stratégies testées.<br />
          <span className="text-positive">Des comptes de sociétés examinés.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto mb-6 sm:mb-10">
          Je teste des stratégies de trading et je publie les résultats de mes bots, gains
          comme pertes. Je passe aussi les rapports annuels de sociétés cotées à travers sept
          contrôles, avec les chiffres et les sources pour que tu puisses vérifier.
        </p>

        {/* Les deux entrées, directement sous le message.
            Elles ne sont pas symétriques et c'est assumé : à gauche il y a un
            outil que le visiteur peut lancer, à droite il y a des lectures que
            j'ai faites. Forcer deux verbes d'action aurait laissé croire à un
            « examinateur de sociétés » qui n'existe pas, et c'est la première
            marche vers la note que D058 a retirée du site. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">

          <div data-testid="entry-strategies" className="bg-card border border-border rounded-lg p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-3">Les stratégies</h2>
            {/* « fragile, et pourquoi » n'est pas une image : c'est le mot que rend
                globalVerdict() dans algolab (fragile | solide | data-dépendante), et la
                raison vient de plainVerdict(). Les deux lisent RunDiagnostics, servi par
                le diagnostics.json d'un run, qui ne porte AUCUN softwall — donc la phrase
                décrit ce qu'un visiteur SANS COMPTE reçoit vraiment. Le verdict PBO/DSR
                est une autre fonction sur un payload derrière require_paid ; ne pas le
                promettre ici. Vérifié le 04/09. */}
            <p className="text-sm leading-relaxed">
              Mes bots tournent en simulation et en argent réel, chaque trade publié. Le labo
              où je teste mes stratégies est ouvert. Tu y passes la tienne, il la rejoue sur
              l&apos;historique et te dit si elle est fragile, et pourquoi.
            </p>
            <div className="mt-auto pt-5">
              {/* `event` inchangé : la série analytique du CTA ne doit pas se couper.
                  Destination changée le 2026-09-20 (user) : `/lab`, le backtester,
                  et non plus la racine de lab.algoproof.fr, qui est la landing-pitch.
                  Le libellé promet « Tester ta stratégie » depuis toujours et
                  envoyait sur une page de présentation : le libellé et la
                  destination étaient déjà en désaccord. Amende D051 et D053 — la
                  landing reste le pitch du trafic FROID (Reddit, SEO, URL tapée),
                  elle n'est plus l'antichambre du trafic qui a déjà lu le pitch
                  ici. « sans compte » reste vrai : middleware.ts de algolab garde
                  /lab hors de WALLED_PATHS (seuls /runs et /compare sont murés),
                  vérifié le 2026-09-20. */}
              <TrackedLink href="https://lab.algoproof.fr/lab" event="cta_lab" location="home-hero" className="inline-block px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors text-sm">
                Tester ta stratégie, sans compte →
              </TrackedLink>
              <Link href="/overview" className={linkClass('inline', 'block mt-3 text-sm')}>
                Voir les résultats de mes bots
              </Link>
              {/* La réassurance est au moment du clic, pas trois écrans plus bas,
                  et à côté du seul lien qui soulève la question. */}
              <p className="mt-3 text-xs text-muted">
                Un backtester, pas un broker. Rien à déposer, aucune clé à donner.
              </p>
            </div>
          </div>

          <div data-testid="entry-companies" className="bg-card border border-border rounded-lg p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-3">Les sociétés</h2>
            {/* D058 (19/09) : plus aucune page ne promet de note ni de verdict de
                société. Cette entrée est celle qui envoie du trafic neuf vers
                /investir, donc elle le dit elle-même plutôt que de le laisser
                découvrir. « que je lis » porte la limite de couverture : une
                société absente n'est pas une société sans alerte. */}
            <p className="text-sm leading-relaxed">
              Pour chaque société cotée que je lis, je passe son dernier rapport annuel à
              travers sept contrôles. Je publie les alertes qu&apos;ils lèvent et les chiffres,
              avec la page du rapport pour refaire le calcul. Pas de note, pas de verdict.
            </p>
            <div className="mt-auto pt-5">
              {/* Same shape as the lab CTA opposite: the primary action of each
                  entry carries an event, the secondary link does not. Without it
                  the half of the home that exists to give Investir visibility
                  could not be measured at all.
                  Bouton passé en vert plein le 2026-09-20 (user). Le contour
                  sombre défendait une hiérarchie primaire/secondaire, mais cette
                  hiérarchie n'a de sens qu'À L'INTÉRIEUR d'une carte : entre deux
                  entrées annoncées comme les deux moitiés du site (D059), deux
                  poids visuels différents se lisent « celle de droite compte
                  moins ». Ce que le contour protégeait — ne pas laisser croire à
                  un examinateur de sociétés qui n'existe pas — vit dans le
                  LIBELLÉ, qui ne bouge pas : « Voir les sociétés que je lis »
                  reste une lecture, jamais un verbe d'outil. */}
              <TrackedLink href="/investir" event="cta_investir" location="home-hero" className="inline-block px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors text-sm">
                Voir les sociétés que je lis →
              </TrackedLink>
              <Link href="/investir#methode" className={linkClass('inline', 'block mt-3 text-sm')}>
                Les sept contrôles, expliqués
              </Link>
              {/* La contrepartie de la phrase d'en face, même position, même gris.
                  L'user voulait retirer celle de gauche pour aligner les deux bas
                  de carte ; l'aligner par SYMÉTRIE donne la même ligne droite sans
                  rendre la réassurance — qui pèse plus lourd depuis que le bouton
                  d'en face ouvre directement un outil. Et la carte sociétés gagne
                  celle qui manquait : depuis D058 (15/09) aucune fiche ne conclut
                  plus par un mot de synthèse, et rien sur cette page ne disait
                  encore que ce n'est pas du conseil pour autant.
                  Formulation contrainte : no-grade-sitewide.test.ts balaie le
                  TEXTE de tout src/, commentaires compris — y réécrire le couple
                  de mots retirés, même pour raconter qu'il est retiré, rougit. */}
              <p className="mt-3 text-xs text-muted">
                Des lectures, pas des conseils. Aucune recommandation d&apos;achat ou de vente.
              </p>
            </div>
          </div>

        </div>

        {/* Un SEUL compteur de bots sur cette page, et il montre ses parts.
            Avant : « 3 bots en argent réel · 89 en laboratoire » ici, puis
            « 92 bots en service » dans l'entonnoir 120 px plus bas. 89 + 3 = 92,
            donc rien n'était faux, mais deux populations emboîtées nommées dans
            deux vocabulaires se lisent comme une contradiction, et c'est ce que
            l'user a lu. Le total est maintenant écrit AVEC ses deux parts, et
            l'entonnoir ne compte plus de bots. */}
        <div data-testid="fleet-counters" className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted border border-border rounded-lg px-5 py-3">
          <span><strong className="text-foreground font-mono">{liveBots.length + paperBots.length}</strong> bots en service</span>
          <span className="text-border">·</span>
          <span><strong className="text-foreground font-mono">{liveBots.length}</strong> en argent réel</span>
          <span className="text-border">·</span>
          {/* « simulation », pas « laboratoire » : c'est déjà le mot de
              StatusBadge, et ça laisse « le labo » désigner l'outil seul. */}
          <span><strong className="text-foreground font-mono">{paperBots.length}</strong> en simulation</span>
          <span className="text-border">·</span>
          <span>données mises à jour chaque heure</span>
          <span className="text-border">·</span>
          <a
            href="https://lab.algoproof.fr/cockpit/cimetiere"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass('inline')}
          >
            et un registre public de mes verdicts, recalés compris
          </a>
        </div>
        <div className="mt-4 max-w-xl mx-auto text-left">
          <FunnelCounter counts={funnel} showFleet={false} />
        </div>

        {/* Ce qui reste de la grille des 4 portes. La flotte et Investir y
            faisaient doublon avec les deux entrées ci-dessus. Les deux autres
            destinations restent dans le hero, en texte, mais PAS dans le premier
            écran : mesuré à 1 421 px sur un téléphone de 390x664, contre 1 896 px
            (Météo) et 2 086 px (Apprendre) pour leurs anciennes cartes. Elles y
            gagnent, elles n'y sont pas immédiates — ne pas l'écrire autrement. */}
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
          <Link href="/intelligence" className={linkClass('inline')}>Météo du marché</Link>
          <span className="text-border">·</span>
          <Link href="/strategies" className={linkClass('inline')}>
            La bibliothèque des {STRATEGY_FICHES.length} stratégies
          </Link>
          <span className="text-border">·</span>
          <Link href="/preuve" className={linkClass('inline')}>Pourquoi je montre chaque trade perdant</Link>
        </p>
      </div>

      {/* Ambiance ticker — live crypto prices, purely decorative (no trading signal) */}
      <div className="mb-16">
        <TVTickerTapeIsland />
      </div>

      {/* Manifeste transparence (absorbs /preuve intent) */}
      <div className="border border-border rounded-lg p-8 mb-16 text-center bg-card/40">
        <h2 className="text-xl font-semibold mb-3">Pourquoi je montre chaque trade perdant</h2>
        <p className="text-sm leading-relaxed max-w-2xl mx-auto mb-4">
          Un backtest qui gagne ne prouve rien. Ce qui compte, c&apos;est ce qui tient en réel : drawdowns, mauvaises semaines et erreurs compris. Alors j&apos;expose tout, sans filtre.
        </p>
        <Link href="/preuve" className={linkClass('inline', 'text-sm')}>Lire le manifeste →</Link>
      </div>

      {/* L'IA genere. AlgoLab verifie. */}
      <div className="border border-border rounded-lg p-8 mb-16 bg-card/40">
        <h2 className="text-xl font-semibold mb-3 text-center">Faire vérifier une stratégie écrite par une IA</h2>
        <p className="text-sm leading-relaxed max-w-2xl mx-auto mb-5 text-center">
          {/* La phrase disait qu'aucune des dix ne restait profitable ; la table
              de l'article donne l'Ichimoku à PF 1,02. Le chiffre ci-dessous est
              celui que l'article porte (dix euros, cinq trades), pas un arrondi
              de la conclusion (audit 2026-09-09, §2.1). */}
          Demande dix stratégies de trading à une IA, tu les as en dix secondes. J&apos;ai passé
          ces dix-là au bulletin anti-overfit du labo : neuf perdent une fois les vrais frais
          payés ; la dixième gagne dix euros en deux ans, portés par cinq trades. Ton
          agent IA peut faire passer les siennes au même contrôle, gratuitement.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/blog/2026-07-11-10-strategies-ia-au-bulletin" className="px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors text-sm">
            Lire le test des 10 stratégies
          </Link>
          <a href="https://lab.algoproof.fr/agents" className="px-5 py-2.5 border border-border text-foreground font-semibold rounded-lg hover:border-muted transition-colors text-sm">
            Connecter son agent (MCP)
          </a>
        </div>
      </div>

      {/* Tableau comparatif — top 10 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Stratégies actives</h2>
          <p className="text-sm text-muted mt-0.5">
            {bots.length} expériences actives, {bots.filter(b => b.stats.total_trades > 0).length} avec des trades.
            Les dix ci-dessous sont celles qui ont le plus d&apos;historique, pas celles qui gagnent le plus.
          </p>
        </div>
        <Link href="/overview" className={linkClass('inline', 'text-sm')}>Voir tout →</Link>
      </div>

      {/* Mobile : liste classement rapide */}
      <div className="md:hidden rounded border border-border overflow-hidden divide-y divide-border mb-6">
        {preview.map((bot) => {
          const hasData = bot.stats.total_trades > 0
          const eur     = pnlEur(bot.stats.latest_capital, bot.start_capital)
          const pct     = pnlPct(bot.stats.latest_capital, bot.start_capital)
          return (
            <Link key={bot.id} href={`/strategies/bot/${bot.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{bot.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold uppercase" style={{ color: familyColor(bot.family) }}>
                    {familyLabel(bot.family)}
                  </span>
                  {hasData && <span className="text-xs text-muted">{bot.stats.total_trades} trades</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {/* The regime BEFORE the figure, on every row. This list showed
                    ten coloured P&L without a word of status while the FAQ said
                    « Le statut est toujours affiché » (audit 2026-09-09, P1). */}
                <div className="flex justify-end mb-1">
                  <StatusBadge status={bot.status} />
                </div>
                {hasData ? (
                  <>
                    <p className={`text-sm font-bold font-mono ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(eur)}</p>
                    <p className={`text-xs font-mono ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pct)}</p>
                  </>
                ) : <span className="text-xs text-muted">—</span>}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop : table complète */}
      <div className="hidden md:block rounded border border-border overflow-hidden mb-6">
        <table className="w-full text-xs">
          <thead className="bg-card">
            <tr className="text-muted text-xs font-semibold uppercase tracking-widest border-b border-border">
              <th className="px-4 py-3 text-left">Stratégie</th>
              <th className="px-4 py-3 text-left">Famille</th>
              <th className="px-4 py-3 text-right">Trades</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">T. gain</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">F. profit</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Drawdown</th>
              <th className="px-4 py-3 text-right font-bold">P&amp;L (€)</th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {preview.map(bot => {
              const hasData = bot.stats.total_trades > 0
              return (
                <tr key={bot.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record')}>{bot.name}</Link>
                    <p className="text-muted text-xs mt-0.5">{bot.exchange} · {bot.timeframe}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: familyColor(bot.family) }}>
                      {familyLabel(bot.family)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {hasData ? (
                      <span className={isLowSample(bot.stats.total_trades) ? 'text-warning/90' : ''}
                        title={isLowSample(bot.stats.total_trades) ? 'Échantillon faible (<20 trades) : métriques peu fiables' : undefined}>
                        {bot.stats.total_trades}{isLowSample(bot.stats.total_trades) && ' ⚠'}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono hidden lg:table-cell"
                    title={hasData && isCarryFamily(bot.family) ? CARRY_METRIC_TOOLTIP : undefined}
                  >
                    {hasData ? fmtWinRateDisplay(bot.family, bot.stats.total_trades, bot.stats.win_rate) : <span className="text-muted">—</span>}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono hidden lg:table-cell ${hasData && !isCarryFamily(bot.family) ? (bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative') : ''}`}
                    title={hasData && isCarryFamily(bot.family) ? CARRY_METRIC_TOOLTIP : undefined}
                  >
                    {hasData ? fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor) : <span className="text-muted">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono hidden lg:table-cell ${hasData && drawdownIsLoss(bot.stats.max_drawdown) ? 'text-negative' : ''}`}>
                    {hasData ? fmtDrawdown(bot.stats.max_drawdown) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasData ? (
                      <div>
                        <span className={`font-mono font-bold ${pnlEur(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(pnlEur(bot.stats.latest_capital, bot.start_capital))}</span>
                        <span className={`block text-xs font-mono ${pnlPct(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pnlPct(bot.stats.latest_capital, bot.start_capital))}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={bot.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-center mb-16">
        <Link href="/overview" className="inline-flex items-center gap-2 text-sm border border-border text-foreground hover:border-muted transition-colors rounded-lg px-4 py-2">
          Voir les {bots.length} bots complets →
        </Link>
      </div>

      {/* Teaser Apprendre + Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <Link href="/blog" className={linkClass('card', 'bg-card p-8 text-center')}>
          <h2 className="text-xl font-semibold mb-3 group-hover:text-accent transition-colors">Apprendre</h2>
          <p className="text-muted text-sm">Journal de bord, revues hebdo, autopsies de stratégies, fiscalité et MiCA. Tout est documenté.</p>
          <span className="inline-block mt-4 text-sm text-muted group-hover:text-foreground">Lire les articles →</span>
        </Link>
        <Link href="/overview" className={linkClass('card', 'bg-card p-8 text-center')}>
          <h2 className="text-xl font-semibold mb-3 group-hover:text-accent transition-colors">La flotte</h2>
          <p className="text-muted text-sm">Ce qui tourne, avec quel argent, et le bilan brut.</p>
          <span className="inline-block mt-4 text-sm text-muted group-hover:text-foreground">Voir les résultats →</span>
        </Link>
      </div>

      <div className="mb-12">
      </div>

      {/* CTA final — distinct from hero (onboarding, not the lab) */}
      <div className="text-center">
        <a href="/start" className="inline-flex items-center gap-2 px-6 py-3 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
          Où trader en règle depuis la France →
        </a>
        {/* « Commence ici » promettait un début et menait à l'ouverture d'un
            compte exchange : deux intentions différentes. Le libellé dit
            maintenant la destination, le sous-titre porte la raison. */}
        {/* Daté, pas définitif : Binance vise un retour par un nouveau dépôt
            MiCA et l'AMF doit se prononcer avant le 1er octobre 2026. Même
            phrase que le labo ; sources et rendez-vous de relecture sur /start
            (audit 2026-09-09, §10). */}
        <p className="text-xs text-muted mt-3">
          Binance a cessé de servir les résidents français le 1er juillet 2026, faute d&apos;agrément
          MiCA. Au 10 septembre 2026, rien n&apos;a repris : Binance vise un retour par un nouveau
          dépôt auprès de l&apos;AMF, qui doit se prononcer avant le 1er octobre. Les plateformes qui
          restent, comparées.
        </p>
      </div>

    </div>
  )
}
