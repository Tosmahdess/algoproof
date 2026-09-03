/**
 * Dates rendered identically on the server and in the browser.
 *
 * Every call site passed an explicit `'fr-FR'` locale and none passed a
 * `timeZone`. That is the whole bug: Vercel renders in UTC, the visitor's
 * browser renders in their own zone, and a trade closed at 23:30 UTC is
 * "3 sept." on the server and "4 sept." in Paris. React sees two different
 * trees, throws hydration error #418, and discards the server HTML for the
 * whole subtree — which is why the charts inside those subtrees remounted into
 * a container that had not been laid out yet and measured 0x0.
 *
 * Pinning the zone fixes both at once, and Europe/Paris is the right zone to
 * pin: the audience is French and the bots' own days are counted there.
 */

export const SITE_TIME_ZONE = 'Europe/Paris'

const withZone = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions => ({
  timeZone: SITE_TIME_ZONE,
  ...options,
})

/** "3 sept." — a trade or comment row. */
export function shortDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('fr-FR', withZone({ day: 'numeric', month: 'short' }))
}

/** "03 sept." — same, zero-padded, for columns that must align. */
export function shortDatePadded(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('fr-FR', withZone({ day: '2-digit', month: 'short' }))
}

/** "3 septembre 2026" — an article or a fiche. */
export function longDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString(
    'fr-FR',
    withZone({ day: 'numeric', month: 'long', year: 'numeric' }),
  )
}

/** "03/09/2026" — a date the reader may want to copy. */
export function numericDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString(
    'fr-FR',
    withZone({ day: '2-digit', month: '2-digit', year: 'numeric' }),
  )
}

/** Any other shape, with the zone already pinned. */
export function formatDate(
  iso: string | number | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(iso).toLocaleDateString('fr-FR', withZone(options))
}
