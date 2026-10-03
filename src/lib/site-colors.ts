// src/lib/site-colors.ts
//
// The DESIGN.md tokens as literal values, for the documents that cannot use
// Tailwind: the embed card (an HTML string) and the images drawn by Satori (the
// share card, the social images). tests/lib/site-colors.test.ts compares every
// value with tailwind.config.ts, so a palette change made there fails here.
export const SITE_COLORS = {
  bg: '#101714',
  card: '#17211c',
  border: '#415449',
  borderStrong: '#82988a',
  text: '#edf1e8',
  muted: '#a8b6ab',
  accent: '#abc8ec',
  neg: '#ff9c90',
  /** The word « Proof » of the wordmark, nothing else. */
  brand: '#4ade80',
} as const
