export default function PromotedBadge({ promoted }: { promoted: boolean }) {
  if (!promoted) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-accent/10 text-accent border-accent/30">
      Promu
    </span>
  )
}
