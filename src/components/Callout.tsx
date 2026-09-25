import type { ReactNode } from 'react'

/**
 * The page-level callout (design audit §3.4, 2026-09-25): a 2 px left border and
 * one of three tones. `info` frames context, `warning` a weak sample or stale data,
 * `negative-result` a measurement that says no (the weather's fleet impact on
 * /intelligence). Red is a data colour on this site, and a negative result is data.
 *
 * Not the blog's MDX Callout (src/components/mdx/Callout.tsx), which carries a
 * spaced-capitals label the site no longer uses outside table headers (C9).
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
    <div data-tone={tone} className={`border-l-2 ${BORDER[tone]} pl-5 ${className}`}>
      {children}
    </div>
  )
}
