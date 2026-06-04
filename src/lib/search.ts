export function normalize(s: string): string {
  // strip combining diacritical marks (U+0300–U+036F) after NFD decomposition
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matchesQuery(fields: string[], query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const hay = fields.map(normalize).join(' ')
  return q.split(/\s+/).every(tok => hay.includes(tok))
}
