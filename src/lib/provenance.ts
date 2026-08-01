// src/lib/provenance.ts
// One line per bot saying where it came from. The same data, told in the right
// direction: "bot generated in bulk" becomes "bot that got through the filter".
//
// The distinction between an engine-born bot and a hand-deployed one is the
// provenance line, never the right to a page. Both are deployed, both are real,
// both are listed.
import type { Bot } from './types'

type ProvenanceBot = Pick<Bot,
  'origin' | 'found_at' | 'validated_at' | 'paper_since' | 'live_since' | 'status' | 'engine_unit_key'>

function fr(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

export function provenanceSentence(bot: ProvenanceBot): string {
  const parts: string[] = []

  if (bot.origin === 'engine') {
    const found = fr(bot.found_at)
    if (found) parts.push(`Trouvé par la recherche automatique le ${found}.`)
    const validated = fr(bot.validated_at)
    if (validated) parts.push(`Validé le ${validated}.`)
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
 * `base|tf|dataset_version|kmax`; the dossier is addressed by base alone.
 */
export function dossierHref(bot: ProvenanceBot): string | null {
  if (!bot.engine_unit_key) return null
  const base = bot.engine_unit_key.split('|')[0]?.trim()
  if (!base) return null
  return `https://lab.algoproof.fr/cockpit/dossier/${encodeURIComponent(base)}`
}
