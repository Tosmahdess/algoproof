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
