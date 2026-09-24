// src/lib/hero-ratio.ts
// Its own module, not in funnel.ts: page tests mock '@/lib/funnel' wholesale,
// and a pure formatter must survive that mock.
/**
 * « 1 sur N jugées », N rounded to one significant digit's magnitude — or null
 * when there is nothing to state. The candidate count never renders without
 * this denominator: « 3 368 » alone reads as « 3 368 winners ».
 *
 * Twin of algolab web/lib/engine-aggregate.ts::heroRatio (the cockpit's
 * fourth KPI card). Duplicated for the same reason as selectNewestPerPair.
 */
export function heroRatio(go: number, judged: number): number | null {
  if (go <= 0 || judged <= 0) return null
  const n = judged / go
  if (n >= 1000) {
    const mag = 10 ** Math.floor(Math.log10(n))
    return Math.round(n / mag) * mag
  }
  if (n >= 100) return Math.round(n / 100) * 100
  if (n >= 10) return Math.round(n / 10) * 10
  return Math.round(n)
}
