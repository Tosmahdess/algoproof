'use client'

interface Props {
  lastSyncAt: string | null
  className?: string
}

function ageMinutes(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 60_000
}

export default function SyncBadge({ lastSyncAt, className = '' }: Props) {
  if (!lastSyncAt) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-muted ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-muted" />
        Jamais synchro
      </span>
    )
  }

  const age = ageMinutes(lastSyncAt)

  let dot = 'bg-positive'
  let label: string

  if (age < 120) {
    dot = 'bg-positive'
    label = age < 2 ? 'Actif' : `il y a ${Math.round(age)}min`
  } else if (age < 720) {
    dot = 'bg-yellow-500'
    label = `Sync ${Math.round(age / 60)}h ago`
  } else {
    dot = 'bg-negative'
    label = `Inactif ${Math.round(age / 60)}h`
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] text-muted ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
