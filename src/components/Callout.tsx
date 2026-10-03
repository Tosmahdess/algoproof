import type { ReactNode } from 'react'

/**
 * The page-level callout (design audit §3.4, 2026-09-25): one of three tones.
 * `info` frames context, `warning` a weak sample or stale data, `negative-result` a
 * measurement that says no (the weather's fleet impact on /intelligence). Red is a
 * data colour on this site, and a negative result is data.
 *
 * Finitions (2026-10-03): a surface with a full 1 px rule, like every box of the
 * site, no longer a 2 px border on the left side only. The tone colours the whole
 * rule, as the verdict panel's does when a rule is crossed.
 *
 * Not the blog's MDX Callout (src/components/mdx/Callout.tsx), which opens its text
 * with a bold run-in label.
 */
export type CalloutTone = 'info' | 'warning' | 'negative-result'

const BORDER: Record<CalloutTone, string> = {
  info: 'border-border',
  warning: 'border-warning',
  'negative-result': 'border-negative',
}

export default function Callout({
  tone = 'info',
  className = '',
  children,
}: {
  tone?: CalloutTone
  className?: string
  children: ReactNode
}) {
  return (
    <div data-tone={tone} className={`rounded-lg border ${BORDER[tone]} bg-card p-4 sm:px-6 sm:py-5 ${className}`}>
      {children}
    </div>
  )
}
