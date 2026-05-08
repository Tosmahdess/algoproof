import type { Badge } from '@/lib/types'

interface Props {
  badges: Badge[]
}

export default function BadgeRow({ badges }: Props) {
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {badges.map(b => (
        <span
          key={b.label}
          data-badge
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
          style={{
            color:           b.color,
            borderColor:     b.color,
            backgroundColor: `${b.color}18`,
          }}
        >
          {b.emoji} {b.label}
        </span>
      ))}
    </div>
  )
}
