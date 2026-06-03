import type { ScopeType } from '@/lib/types'
import { SCOPE_META } from '@/lib/changelog'

export default function ScopeBadge({ scope, label }: { scope: ScopeType; label?: string }) {
  const meta = SCOPE_META[scope]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: meta.color }}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: meta.color }} />
      {label ?? meta.label}
    </span>
  )
}
