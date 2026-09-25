// The daily macro report (`macro_reports.content`) is generated upstream by a model
// and ends with a section titled « 4. Biais recommandé » that reads as an investment
// recommendation (« NEUTRE à légèrement SHORT sur ETH et SOL », served 2026-09-25) on a
// site whose home says « Aucune recommandation d'achat ou de vente ». Audit 2026-09-25,
// P0-1. The generator lives on the VPS: the site strips the section at render time so
// the page stays right whatever tomorrow's report writes.
//
// Rule: from a markdown heading whose text starts with « Biais recommandé » (any
// number, case or accent) up to the next heading of the same or higher level, or the
// end of the document. Everything before is returned untouched.

import { REGIME_LABEL_FR, SENTIMENT_LABEL_FR, TREND_LABEL_FR } from './regime-labels'

const HEADING = /^(#{1,6})\s+(?:\d+\s*[.)]\s*)?biais\s+recommand[ée]/i

export function withoutRecommendation(markdown: string): string {
  const lines = markdown.split('\n')
  const out: string[] = []
  let skippingLevel: number | null = null
  for (const line of lines) {
    const heading = /^(#{1,6})\s+\S/.exec(line)
    if (skippingLevel !== null) {
      if (heading && heading[1].length <= skippingLevel) skippingLevel = null
      else continue
    }
    const hit = HEADING.exec(line)
    if (hit) {
      skippingLevel = hit[1].length
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

// The same generator writes its regimes as the machine enums (« Régime : NEUTRAL »,
// « tendance BULL ») and two of them survived lot 7 of the design audit in the
// served text of /intelligence (2026-09-25). Translated here with the maps the
// rest of the site renders from (regime-labels.ts): whole upper-case words only,
// so tickers, prose and the English words in lower case stay untouched.
const ENUM_FR: Record<string, string> = { ...REGIME_LABEL_FR, ...SENTIMENT_LABEL_FR, ...TREND_LABEL_FR }
const ENUM_RE = new RegExp(`\\b(${Object.keys(ENUM_FR).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g')

export function withFrenchRegimes(markdown: string): string {
  return markdown.replace(ENUM_RE, (w) => ENUM_FR[w] ?? w)
}
