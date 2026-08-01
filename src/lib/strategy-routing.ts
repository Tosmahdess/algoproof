// src/lib/strategy-routing.ts
// The disambiguation logic behind /strategies/[concept], extracted so it can
// be tested without a Next.js request (fix round 1, finding 4).
//
// A real collision exists in the tree today: `fvg-multi` is both a fiche slug
// (strategy-library.ts) and a bot slug (tests/fixtures/bots.ts). Fiche wins —
// the concept page renders, not a redirect to the bot fiche — because concept
// URLs are the SEO surface this plan exists to protect; a bot slug that
// happens to collide with a fiche slug is still reachable at
// /strategies/bot/<slug>, and every internal link already points there.
export type StrategyRoute =
  | { kind: 'concept' }
  | { kind: 'redirect'; to: string }
  | { kind: 'notFound' }

export function resolveStrategyRoute(
  slug: string,
  ficheSlugs: string[],
  botSlugs: string[],
): StrategyRoute {
  if (ficheSlugs.includes(slug)) return { kind: 'concept' }
  if (botSlugs.includes(slug)) return { kind: 'redirect', to: `/strategies/bot/${slug}` }
  return { kind: 'notFound' }
}
