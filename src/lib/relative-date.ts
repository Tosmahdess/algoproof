// Relative FR date for fiche freshness. Pure, testable.
export function relativeDaysFr(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return "analysé aujourd'hui"
  if (days === 1) return 'analysé hier'
  if (days < 30) return `il y a ${days} j`
  return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}
