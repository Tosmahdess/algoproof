/**
 * A deployed bot with zero trades keeps its page (spec §6.5). Several trend bots
 * have not traded since April, and the site publicly defends that as correct
 * behaviour in a non-trending regime. Hiding them would delete the demonstration
 * at the moment it is most useful.
 */
export default function SampleNote({
  totalTrades, dormancyNote,
}: { totalTrades: number; dormancyNote?: string | null }) {
  if (totalTrades === 0) {
    return (
      <p data-testid="sample-note" className="text-xs text-muted">
        Ce bot tourne mais il attend son signal. Il n&apos;a encore rien tradé.
        {dormancyNote ? ` ${dormancyNote}` : ''}
      </p>
    )
  }
  // A small sample is NOT said here (user, 2026-09-29): MetricsRow prints « Échantillon
  // faible (N trades, moins de 20) » under the figures, a few lines down.
  return null
}
