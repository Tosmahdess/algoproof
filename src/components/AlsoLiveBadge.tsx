const ALSO_LIVE = new Set(['v1-spot'])

// status: hidden when the bot's own badge already says "live" (redundant otherwise)
export default function AlsoLiveBadge({ slug, status }: { slug: string; status?: string }) {
  if (status === 'live' || !ALSO_LIVE.has(slug)) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-negative/10 text-negative border-negative/30">
      <span className="w-1.5 h-1.5 rounded-full bg-negative animate-pulse" />
      aussi en réel
    </span>
  )
}
