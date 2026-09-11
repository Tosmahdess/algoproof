// src/lib/provenance.ts
// One line per bot saying where it came from. The same data, told in the right
// direction: "bot generated in bulk" becomes "bot that got through the filter".
//
// The distinction between an engine-born bot and a hand-deployed one is the
// provenance line, never the right to a page. Both are deployed, both are real,
// both are listed.
import type { Bot } from './types'
import { numericDate } from './format-date'

type ProvenanceBot = Pick<Bot,
  'origin' | 'found_at' | 'validated_at' | 'paper_since' | 'live_since' | 'status' | 'engine_unit_key'>

// One formatter for every date on a bot fiche. This used to format in UTC
// while PathToRealCard used numericDate (Europe/Paris), so a live_since at
// 23:30 UTC printed two different days on the same page.
function fr(iso: string | null): string | null {
  if (!iso) return null
  if (Number.isNaN(new Date(iso).getTime())) return null
  return numericDate(iso)
}

export function provenanceSentence(bot: ProvenanceBot): string {
  const parts: string[] = []

  if (bot.origin === 'engine') {
    const found = fr(bot.found_at)
    if (found) parts.push(`Trouvé par la recherche automatique le ${found}.`)
    // « Retenu », not « Validé » (audit 2026-09-10): the verdict behind this date was
    // produced by a simulator with three known execution defects and will be judged
    // again. The column keeps its name; the sentence says what happened.
    const validated = fr(bot.validated_at)
    if (validated) parts.push(`Retenu par le moteur le ${validated}.`)
  } else {
    const started = fr(bot.paper_since)
    parts.push(
      started
        ? `Déployé à la main le ${started}, avant la recherche automatique.`
        : 'Déployé à la main, avant la recherche automatique.',
    )
  }

  if (bot.origin === 'engine') {
    const paper = fr(bot.paper_since)
    if (paper) parts.push(`En paper depuis le ${paper}.`)
  }

  const live = fr(bot.live_since)
  if (bot.status === 'live' && live) parts.push(`En argent réel depuis le ${live}.`)

  return parts.join(' ')
}

/**
 * Link to the cockpit dossier, when there is one. The engine unit key is
 * `base|tf|dataset_version|kmax` — four pipe-delimited, non-empty segments,
 * written by the engine at promotion time. Gated on `origin === 'engine'`
 * too: migration 019 constrains an engine-born bot to carry a key, but not
 * the reverse, so a hand-deployed bot could in principle carry one, and
 * "Déployé à la main… / Voir le dossier de validation" side by side would be
 * a contradiction on the page.
 *
 * A key that isn't four non-empty segments means the producer's format
 * changed underneath this reader. That must surface as a missing link, not
 * a link built from a fragment that may not mean "base" any more.
 */
export function dossierHref(bot: ProvenanceBot): string | null {
  if (bot.origin !== 'engine' || !bot.engine_unit_key) return null
  const segments = bot.engine_unit_key.split('|')
  if (segments.length !== 4 || segments.some(s => s.trim() === '')) return null
  const base = segments[0].trim()
  return `https://lab.algoproof.fr/cockpit/dossier/${encodeURIComponent(base)}`
}
