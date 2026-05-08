// src/app/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { getAllBotsWithStats, getTriggerData } from '@/lib/queries'
import TriggerCounter from '@/components/TriggerCounter'
import { DISCORD_URL } from '@/lib/constants'
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'AlgoProof — Trading algo vérifié',
  description: 'On montre chaque trade — gains et pertes. Zéro faux screenshot. Données paper trading réelles mises à jour toutes les heures.',
}

const FAMILY_COLOR: Record<string, string> = {
  'trend':        '#ff6b35',
  'breakout':     '#3fb950',
  'multi-signal': '#d29922',
  'multi-asset':  '#40c4ff',
  'leveraged':    '#ff4444',
}

const FAMILY_LABEL: Record<string, string> = {
  'trend':        'Suivi de tendance',
  'breakout':     'Cassure de niveaux',
  'multi-signal': 'Multi-signaux',
  'multi-asset':  'Multi-actifs',
  'leveraged':    'Avec levier',
}

export default async function HomePage() {
  const [bots, triggerData] = await Promise.all([
    getAllBotsWithStats(),
    getTriggerData('v1-spot'),
  ])
  const sorted = [...bots].sort((a, b) => b.stats.latest_capital - a.stats.latest_capital)
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
          Le premier labo de trading algo 100% transparent, en français. On expose notre recherche en temps réel —
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
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
             className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            Discord
          </a>
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
          const eur     = pnlEur(bot.stats.latest_capital)
          const pct     = pnlPct(bot.stats.latest_capital)
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
                        <span className={`font-mono font-bold ${pnlEur(bot.stats.latest_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtEur(pnlEur(bot.stats.latest_capital))}</span>
                        <span className={`block text-[10px] font-mono ${pnlPct(bot.stats.latest_capital) >= 0 ? 'text-positive' : 'text-negative'}`}>{fmtPct(pnlPct(bot.stats.latest_capital))}</span>
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

      {/* CTA Discord */}
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Rejoindre le labo</h2>
        <p className="text-muted mb-6">Discussions sur les stratégies, nouveaux trades en temps réel, analyses hebdo. Gratuit, sans paywall.</p>
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
           className="inline-flex px-6 py-2.5 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors font-medium">
          Rejoindre Discord
        </a>
      </div>

      {/* Trigger counter — code sale progress */}
      {triggerData && (
        <div className="mt-12 max-w-md mx-auto">
          <p className="text-xs text-muted uppercase tracking-widest text-center mb-3">
            Ouverture des ventes
          </p>
          <TriggerCounter data={triggerData} />
        </div>
      )}

    </div>
  )
}
