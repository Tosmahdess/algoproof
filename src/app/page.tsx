// src/app/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { getAllBotsWithStats } from '@/lib/queries'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'AlgoProof — Trading algo vérifié',
  description: 'On montre chaque trade — gains et pertes. Zéro faux screenshot. Données paper trading réelles mises à jour toutes les heures.',
}

const FAMILY_COLOR: Record<string, string> = {
  'trend':           '#ff6b35',
  'breakout':        '#3fb950',
  'mean-reversion':  '#7c3aed',
  'carry':           '#f6c90e',
}

const FAMILY_LABEL: Record<string, string> = {
  'trend':           'Suivi de tendance',
  'breakout':        'Cassure',
  'mean-reversion':  'Retour à la moyenne',
  'carry':           'Portage',
}

export default async function HomePage() {
  const bots = await getAllBotsWithStats()
  // Sort by realized P&L (€), not absolute capital — bots have different start capitals.
  const sorted = [...bots].sort((a, b) =>
    (b.stats.latest_capital - b.start_capital) - (a.stats.latest_capital - a.start_capital)
  )
  const preview = sorted.slice(0, 10)

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">

      {/* Hero */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-positive/10 border border-positive/20 text-positive text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          Open Lab FR — recherche live, résultats en clair
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          La preuve par les chiffres.<br />
          <span className="text-positive">Chaque trade. Chaque perte.</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
          Le premier labo de trading algo 100% transparent, en français. J&apos;expose ma recherche en temps réel —
          gains, pertes, drawdowns — et la communauté suit, challenge, contribue.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/overview" className="px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
            VUE D&apos;ENSEMBLE →
          </Link>
          <Link href="/strategies" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            STRATÉGIES
          </Link>
          <Link href="/wealth" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            PATRIMOINE
          </Link>
          <Link href="/intelligence" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            INTELLIGENCE
          </Link>
          <Link href="/performance" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            PERFORMANCE
          </Link>
          <Link href="/blog" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            BLOG
          </Link>
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20 border-y border-border py-10">
        {[
          { label: 'Zéro faux screenshots', desc: 'Dashboard live mis à jour toutes les heures depuis les données réelles des bots' },
          { label: 'Chaque perte affichée', desc: 'Drawdowns, mauvaises semaines, périodes plates — rien n\'est caché' },
          { label: 'Communauté active', desc: 'Posez vos questions directement sur chaque stratégie. La commu challenge les résultats.' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="font-semibold mb-1">{s.label}</div>
            <div className="text-sm text-muted">{s.desc}</div>
          </div>
        ))}
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
                    {hasData ? bot.stats.total_trades : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                    {hasData ? `${(bot.stats.win_rate * 100).toFixed(1)}%` : <span className="text-muted">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono hidden lg:table-cell ${hasData ? (bot.stats.profit_factor >= 1 ? 'text-positive' : 'text-negative') : ''}`}>
                    {hasData ? bot.stats.profit_factor.toFixed(2) : <span className="text-muted">—</span>}
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

      {/* CTA Blog + Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/performance" className="bg-card border border-border rounded-xl p-8 text-center hover:border-positive/30 transition-colors group">
          <h2 className="text-xl font-bold mb-2">Performance</h2>
          <p className="text-muted text-sm">P&L journalier filtrable — direction, famille, période. Les chiffres bruts, sans filtre.</p>
          <span className="inline-block mt-4 text-sm text-positive group-hover:underline">Voir les résultats →</span>
        </Link>
        <Link href="/blog" className="bg-card border border-border rounded-xl p-8 text-center hover:border-accent/30 transition-colors group">
          <h2 className="text-xl font-bold mb-2">Blog</h2>
          <p className="text-muted text-sm">Journal de bord quotidien, revues hebdo, autopsies de stratégies. Tout est documenté.</p>
          <span className="inline-block mt-4 text-sm text-accent group-hover:underline">Lire les articles →</span>
        </Link>
      </div>

    </div>
  )
}
