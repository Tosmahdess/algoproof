// How the cockpit's KPI cards state "X of everything judged".
//
// Two rules, both load-bearing:
//
// 1. FLOOR, never round. A card that says "86 %" must never be a 85,6 % rounded
//    up: the page's whole claim is that it does not flatter its own numbers, and
//    a share is the one figure a visitor will quote back. Floor also removes the
//    false 100 % that lib/judged-share.ts has to special-case.
//
// 2. INTEGER ONLY. cockpit-public-leak.test.tsx forbids any decimal in a public
//    render, because on this site a decimal is what a leaked metric looks like
//    (pf 1,42 formatted fr-FR). That guard is worth more than one tenth of a
//    point, so the tenth goes.
//
// The cost of both rules lands on the small shares: 0,21 % floors to 0 %, which
// would read as "none". Those never use this function — `heroRatio` states them
// as "1 sur 480 jugées", which is both guard-clean and more informative. See
// EngineKpiCards.tsx.

/** Floored whole-percent share of `total`, or null when there is no denominator. */
export function floorSharePct(part: number, total: number): number | null {
  if (!(total > 0) || !(part >= 0)) return null
  return Math.floor((100 * part) / total)
}

/** "86 % des jugées" — or null when the share would floor to zero and mislead. */
export function shareOfJudged(part: number, total: number): string | null {
  const pct = floorSharePct(part, total)
  if (pct === null || pct === 0) return null
  return `${pct} % des jugées`
}
