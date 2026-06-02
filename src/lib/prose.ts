/**
 * Nettoie le texte des fiches : retire les tirets cadratin/demi-cadratin (—, –)
 * que les LLM adorent et qui trahissent une rédaction automatique. On les
 * remplace par une ponctuation simple (virgule), puis on lisse les artefacts.
 * Idempotent — sûr à appliquer à l'affichage de n'importe quel texte.
 */
export function sanitizeProse(text: string | null | undefined): string {
  if (!text) return ''
  return text
    // tiret cadratin / demi-cadratin (espacé ou non) → virgule
    .replace(/\s*[—–]\s*/g, ', ')
    // ", ." → "." (un tiret en fin de proposition devenu virgule + point)
    .replace(/,\s*\./g, '.')
    // virgules redondantes
    .replace(/,\s*,/g, ',')
    // espace parasite avant virgule / point
    .replace(/\s+([,.])/g, '$1')
    // espaces multiples
    .replace(/\s{2,}/g, ' ')
    .trim()
}
