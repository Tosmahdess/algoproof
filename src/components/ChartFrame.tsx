'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * A fixed-height box that only renders its chart after hydration.
 *
 * Recharts' ResponsiveContainer sizes itself by measuring its parent. During the
 * server render and the hydration pass that parent has no layout yet, so the
 * container mounts at 0x0 and the chart is invisible until something forces a
 * resize — which on the bot pages and /overview meant "no curve", on the pages
 * whose whole point is the curve.
 *
 * Rendering nothing until `mounted` removes that pass entirely. The box keeps
 * its height in both states, so the page below it does not jump when the chart
 * appears, and the placeholder is `aria-hidden` because an empty frame is not
 * information.
 *
 * One component rather than the same four lines in three files: the next chart
 * added should get this for free instead of rediscovering it.
 */
export default function ChartFrame({
  children,
  className = 'w-full h-64',
}: {
  children: ReactNode
  className?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className={className} aria-hidden />
  return <div className={className}>{children}</div>
}
