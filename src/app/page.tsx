// src/app/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import TrackedLink from '@/components/TrackedLink'
import StatusBadge from '@/components/StatusBadge'
import EmailCapture from '@/components/EmailCapture'
import { getAllBotsWithStats } from '@/lib/queries'
import { excludeArchived, splitCohorts } from '@/lib/cohort'
import { pnlEur, pnlPct, fmtEur, fmtPct, isLowSample, isCarryFamily, fmtPfDisplay, fmtWinRateDisplay, CARRY_METRIC_TOOLTIP } from '@/lib/display'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'AlgoProof — Mon labo de trading algorithmique, en public',
  description: 'Je fais tourner des bots de trading en réel et j\'expose chaque trade — gains et pertes. Résultats vérifiables, mis à jour chaque heure. Labo de recherche transparent, en français.',
}

const FAMILY_COLOR: Record<string, string> = {
  'trend':           '#ff6b35',
  'breakout':        '#3fb950',
  'mean-reversion':  '#7c3aed',
  'carry':           '#f6c90e',
  'market-neutral':  '#14b8a6',
}

const FAMILY_LABEL: Record<string, string> = {
  'trend':           'Suivi de tendance',
  'breakout':        'Cassure',
  'mean-reversion':  'Retour à la moyenne',
  'carry':           'Portage',
  'market-neutral':  'Marché neutre',
}

export default async function HomePage() {
  // Archived bots stay listed on /strategies (with a badge) but are excluded from
  // the homepage headline counts and ranking.
  const bots = excludeArchived(await getAllBotsWithStats())
  // Live = real money (v1-spot, orb-bf25) ; the rest is the laboratoire (simulation).
  // Keep these counts apart so the hero never implies the whole fleet is real capital.
  const { live: liveBots, paper: paperBots } = splitCohorts(bots)
  // Sort by realized P&L (€), not absolute capital — bots have different start capitals.
  const sorted = [...bots].sort((a, b) =>
    (b.stats.latest_capital - b.start_capital) - (a.stats.latest_capital - a.start_capital)
  )
  const preview = sorted.slice(0, 10)

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">

      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-positive/10 border border-positive/20 text-positive text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          Labo de trading algo transparent, en français
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Mon labo de trading<br />
          <span className="text-positive">algorithmique, en public.</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
          Je fais tourner {liveBots.length} bots en argent réel et le reste en laboratoire (simulation). J&apos;expose chaque trade, gains comme pertes, et je te donne les outils pour tester par toi-même.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <TrackedLink href="https://lab.algoproof.fr" event="cta_lab" location="home-hero" className="px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
            Ouvrir le labo →
          </TrackedLink>
          <Link href="/overview" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            Voir mes bots en direct
          </Link>
        </div>
        {/* Live proof strip */}
        <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted border border-border rounded-lg px-5 py-3">
          <span><strong className="text-white font-mono">{liveBots.length}</strong> bots en argent réel</span>
          <span className="text-border">·</span>
          <span><strong className="text-white font-mono">{paperBots.length}</strong> en laboratoire (simulation)</span>
          <span className="text-border">·</span>
          <span>données mises à jour chaque heure</span>
          <span className="text-border">·</span>
          <a
            href="https://lab.algoproof.fr/galerie"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            et un cimetière public de stratégies rejetées
          </a>
        </div>
      </div>

      {/* Les 4 portes — router by interest, not by skill level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {[
          { href: '/overview',     emoji: '🤖', title: 'Mes bots',  desc: 'Regarde mes bots trader en vrai, chaque trade horodaté.' },
          { href: '/wealth',       emoji: '💰', title: 'Investir',  desc: 'Ma watchlist long terme et mes points d\'entrée.' },
          { href: '/intelligence', emoji: '🌤️', title: 'Météo du marché', desc: 'La météo du marché, en français, chaque jour.' },
          { href: 'https://lab.algoproof.fr/apprendre', emoji: '📚', title: 'Apprendre', desc: 'Tutoriels pas à pas dans le labo, bibliothèque des 22 stratégies, et les guides du blog.' },
        ].map(p => (
          <Link key={p.href} href={p.href} className="bg-card border border-border rounded-xl p-6 hover:border-positive/30 transition-colors group">
            <div className="text-2xl mb-3">{p.emoji}</div>
            <h2 className="font-bold mb-1 group-hover:text-positive transition-colors">{p.title}</h2>
            <p className="text-sm text-muted">{p.desc}</p>
          </Link>
        ))}
      </div>

      {/* Manifeste transparence (absorbs /preuve intent) */}
      <div className="border border-border rounded-xl p-8 mb-16 text-center bg-card/40">
        <h2 className="text-xl font-bold mb-2">Pourquoi je montre chaque trade perdant</h2>
        <p className="text-muted text-sm max-w-2xl mx-auto mb-4">
          Un backtest qui gagne ne prouve rien. Ce qui compte, c&apos;est ce qui tient en réel — drawdowns, mauvaises semaines et erreurs compris. Alors j&apos;expose tout, sans filtre.
        </p>
        <Link href="/preuve" className="text-sm text-positive hover:underline">Lire le manifeste →</Link>
      </div>

      {/* L'IA genere. AlgoLab verifie. */}
      <div className="border border-border rounded-xl p-8 mb-16 bg-card/40">
        <h2 className="text-xl font-bold mb-2 text-center">L&apos;IA génère. AlgoLab vérifie.</h2>
        <p className="text-muted text-sm max-w-2xl mx-auto mb-5 text-center">
          Les IA produisent des stratégies de trading en dix secondes, et la plupart sont des
          illusions statistiques. Le labo fait le travail que personne ne fait : la vérification.
          J&apos;ai passé 10 stratégies générées par un LLM au bulletin anti-overfit : zéro
          profitable aux frais réels. Ton agent IA peut faire pareil avec les siennes, gratuitement.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/blog/2026-07-11-10-strategies-ia-au-bulletin" className="px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors text-sm">
            Lire le test des 10 stratégies
          </Link>
          <a href="https://lab.algoproof.fr/agents" className="px-5 py-2.5 border border-border font-semibold rounded-lg hover:bg-card transition-colors text-sm">
            Connecter son agent (MCP)
          </a>
        </div>
      </div>

      {/* Ce qui travaille en ce moment */}
      <div className="mb-16">
        <h2 className="text-xl font-bold mb-6">Ce qui travaille en ce moment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/strategies/orb-bf25" className="bg-card border border-border rounded-xl p-8 text-center hover:border-positive/30 transition-colors group">
            <h3 className="text-lg font-bold mb-2">En argent réel</h3>
            <p className="text-muted text-sm">ORB H1 tourne sur Hyperliquid avec mon capital. Chaque trade, chaque perte, publié à l&apos;heure.</p>
            <span className="inline-block mt-4 text-sm text-positive group-hover:underline">Voir le bot →</span>
          </Link>
          <Link href="/strategies/funding-rev-long" className="bg-card border border-border rounded-xl p-8 text-center hover:border-accent/30 transition-colors group">
            <h3 className="text-lg font-bold mb-2">Le dernier arrivé</h3>
            <p className="text-muted text-sm">Funding Reversal a passé mon gate de validation le 30 juin : contrarien sur les extrêmes de funding, long only. En paper : 40 trades exigés avant le moindre euro réel.</p>
            <span className="inline-block mt-4 text-sm text-accent group-hover:underline">Voir le bot →</span>
          </Link>
          <Link href="/blog/2026-07-02-pourquoi-mes-bots-ne-tradent-pas" className="bg-card border border-border rounded-xl p-8 text-center hover:border-muted/50 transition-colors group">
            <h3 className="text-lg font-bold mb-2">Ceux qui dorment</h3>
            <p className="text-muted text-sm">Mes bots de tendance n&apos;ont presque pas tradé depuis deux mois. C&apos;est voulu : pas de tendance, pas de trade. J&apos;ai vérifié, les forcer serait perdant.</p>
            <span className="inline-block mt-4 text-sm text-white group-hover:underline">Lire l&apos;enquête →</span>
          </Link>
        </div>
      </div>

      {/* Tableau comparatif — top 10 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Stratégies actives</h2>
          <p className="text-sm text-muted mt-0.5">{bots.length} expériences actives — {bots.filter(b => b.stats.total_trades > 0).length} avec des trades</p>
        </div>
        <Link href="/overview" className="text-sm text-muted hover:text-white transition-colors">Voir tout →</Link>
      </div>

      {/* Mobile : liste classement rapide */}
      <div className="md:hidden rounded border border-border overflow-hidden divide-y divide-border mb-6">
        {preview.map((bot, i) => {
          const hasData = bot.stats.total_trades > 0
          const eur     = pnlEur(bot.stats.latest_capital, bot.start_capital)
          const pct     = pnlPct(bot.stats.latest_capital, bot.start_capital)
          return (
            <Link key={bot.id} href={`/strategies/${bot.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card/40 transition-colors">
              <span className="text-xs text-muted font-mono w-6 flex-shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{bot.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: FAMILY_COLOR[bot.family ?? ''] ?? '#888' }}>
                    {FAMILY_LABEL[bot.family ?? ''] ?? '—'}
                  </span>
                  {hasData && <span className="text-[10px] text-muted">{bot.stats.total_trades} trades</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {hasData ? (
                  <>
                    <p className={`text-sm font-bold font-mono ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(eur)}</p>
                    <p className={`text-[10px] font-mono ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pct)}</p>
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
            <tr className="text-muted text-[10px] uppercase tracking-widest border-b border-border">
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
                    <Link href={`/strategies/${bot.slug}`} className="font-medium hover:text-positive transition-colors">{bot.name}</Link>
                    <p className="text-muted text-[10px] mt-0.5">{bot.exchange} · {bot.timeframe}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: FAMILY_COLOR[bot.family ?? ''] ?? '#888' }}>
                      {FAMILY_LABEL[bot.family ?? ''] ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {hasData ? (
                      <span className={isLowSample(bot.stats.total_trades) ? 'text-yellow-400/90' : ''}
                        title={isLowSample(bot.stats.total_trades) ? 'Échantillon faible (<20 trades) — métriques peu fiables' : undefined}>
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
                  <td className="px-4 py-3 text-right font-mono text-negative hidden lg:table-cell">
                    {hasData ? `${(bot.stats.max_drawdown * 100).toFixed(1)}%` : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasData ? (
                      <div>
                        <span className={`font-mono font-bold ${pnlEur(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(pnlEur(bot.stats.latest_capital, bot.start_capital))}</span>
                        <span className={`block text-[10px] font-mono ${pnlPct(bot.stats.latest_capital, bot.start_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pnlPct(bot.stats.latest_capital, bot.start_capital))}</span>
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
        <Link href="/overview" className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors border border-border rounded-lg px-4 py-2 hover:border-muted/50">
          Voir les {bots.length} bots complets →
        </Link>
      </div>

      {/* Teaser Apprendre + Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <Link href="/blog" className="bg-card border border-border rounded-xl p-8 text-center hover:border-accent/30 transition-colors group">
          <h2 className="text-xl font-bold mb-2">Apprendre</h2>
          <p className="text-muted text-sm">Journal de bord, revues hebdo, autopsies de stratégies, fiscalité et MiCA. Tout est documenté.</p>
          <span className="inline-block mt-4 text-sm text-accent group-hover:underline">Lire les articles →</span>
        </Link>
        <Link href="/performance" className="bg-card border border-border rounded-xl p-8 text-center hover:border-positive/30 transition-colors group">
          <h2 className="text-xl font-bold mb-2">Performance</h2>
          <p className="text-muted text-sm">P&amp;L journalier filtrable — direction, famille, période. Les chiffres bruts, sans filtre.</p>
          <span className="inline-block mt-4 text-sm text-positive group-hover:underline">Voir les résultats →</span>
        </Link>
      </div>

      <div className="mb-12">
        <EmailCapture source="home" />
      </div>

      {/* CTA final — distinct from hero (onboarding, not the lab) */}
      <div className="text-center">
        <a href="/start" className="inline-flex items-center gap-2 px-6 py-3 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
          Commence ici →
        </a>
        <p className="text-xs text-muted mt-3">Où trader en règle quand on est en France.</p>
      </div>

    </div>
  )
}
