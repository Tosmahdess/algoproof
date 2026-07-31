// « La flotte » — stage 0, the fleet-wide recent-trades feed.
//
// FIX (final review, I1+I2): restored content, not new content. The retired
// /overview page rendered « 20 derniers trades — tous bots » (OverviewClient
// :402-403 at 038cafb); when that component was deleted the feed existed on no
// page at all, and nobody decided to retire it. It is back here, in stage 0,
// because it is page-level and unfiltered — showing the newest trades of the
// whole fleet is exactly the kind of raw evidence the balance sheet above it
// summarises.
//
// Deliberately NOT `'use client'`: it takes rows in and returns markup, so it
// renders inside the server component tree and never enters the filter
// pipeline. The old version was filtered by the direction/asset pills; that
// coupling is gone on purpose.
import Link from 'next/link'
import type { TradeWithBot } from '@/lib/types'
import { fmtEur } from '@/lib/display'

export default function FleetRecentTrades({ trades }: { trades: TradeWithBot[] }) {
  if (trades.length === 0) return null

  return (
    <section data-testid="fleet-recent-trades" className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xs uppercase tracking-wider text-muted mb-4">
        Les {trades.length} derniers trades, tous bots
      </h2>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="text-muted uppercase tracking-wider border-b border-border">
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Bot</th>
              <th className="px-2 py-2 text-left hidden sm:table-cell">Actif</th>
              <th className="px-2 py-2 text-center">Sens</th>
              <th className="px-2 py-2 text-right">P&amp;L</th>
              <th className="px-2 py-2 text-left hidden md:table-cell">Raison</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id} className="border-b border-border/40">
                <td className="px-2 py-1.5 font-mono text-muted">
                  {new Date(t.closed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </td>
                <td className="px-2 py-1.5">
                  {t.bots ? (
                    <Link href={`/strategies/bot/${t.bots.slug}`} className="hover:text-accent transition-colors">
                      {t.bots.name}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-2 py-1.5 font-mono hidden sm:table-cell">{t.asset}</td>
                <td className="px-2 py-1.5 text-center text-muted">
                  {t.side === 'long' ? 'long' : t.side === 'short' ? 'short' : t.side}
                </td>
                <td className={`px-2 py-1.5 text-right font-mono ${t.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {fmtEur(t.pnl)}
                </td>
                <td className="px-2 py-1.5 text-muted hidden md:table-cell">{t.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-4">
        Tous bots confondus, argent réel et laboratoire mélangés dans la liste
        mais jamais dans un total. Les bots de portage, qui tournent des dizaines
        de fois par jour, sont exclus de ce flux pour ne pas le noyer.
      </p>
    </section>
  )
}
