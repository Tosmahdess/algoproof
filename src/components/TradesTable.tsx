import { Trade } from '@/lib/types'

export default function TradesTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return <p className="text-muted text-sm py-6 text-center">Aucun trade pour le moment.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Date</th>
            <th className="text-left py-2 pr-4">Actif</th>
            <th className="text-left py-2 pr-4">Direction</th>
            <th className="text-right py-2 pr-4">P&amp;L</th>
            <th className="text-left py-2">Raison</th>
          </tr>
        </thead>
        <tbody>
          {trades.map(t => (
            <tr key={t.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
              <td className="py-2 pr-4 text-muted font-mono text-xs">
                {new Date(t.closed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </td>
              <td className="py-2 pr-4 font-mono">{t.asset}</td>
              <td className="py-2 pr-4">
                <span className={`text-xs px-1.5 py-0.5 rounded ${t.side === 'long' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                  {t.side}
                </span>
              </td>
              <td className={`py-2 pr-4 text-right font-mono font-semibold ${t.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
              </td>
              <td className="py-2 text-muted text-xs">{t.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
