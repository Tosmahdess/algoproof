// src/lib/crypto-tax.ts
// FR crypto capital-gains tax (occasional-investor regime). Rates 2026.
// Source: art. 150 VH bis CGI ; flat tax PFU = 12,8% IR + 18,6% prélèvements
// sociaux (CSG capital 9,2->10,6% au 01/01/2026) = 31,4%. Verify on impots.gouv.fr.
export const PFU_FLAT_RATE = 0.314
export const SOCIAL_RATE = 0.186
export const EXEMPTION_CESSION_EUR = 305
export const TMI_BRACKETS = [0, 0.11, 0.3, 0.41, 0.45] as const

export function capitalGain(invested: number, sold: number): number {
  return Math.max(0, sold - invested)
}

export function isExempt(sold: number): boolean {
  return sold > 0 && sold <= EXEMPTION_CESSION_EUR
}

export function flatTax(gain: number): number {
  return gain * PFU_FLAT_RATE
}

export function baremeTax(gain: number, tmi: number): number {
  return gain * (tmi + SOCIAL_RATE)
}

export interface TaxComparison {
  gain: number
  exempt: boolean
  flat: number
  bareme: number
  best: 'flat' | 'bareme' | 'equal'
  taxDue: number
}

export function compare(invested: number, sold: number, tmi: number): TaxComparison {
  const gain = capitalGain(invested, sold)
  const exempt = isExempt(sold)
  const flat = flatTax(gain)
  const bareme = baremeTax(gain, tmi)
  const best = flat < bareme ? 'flat' : flat > bareme ? 'bareme' : 'equal'
  const taxDue = exempt ? 0 : Math.min(flat, bareme)
  return { gain, exempt, flat, bareme, best, taxDue }
}

export type ParsedAmount =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'negative' | 'invalid' }

/**
 * Reads an amount the way a French reader types it (audit 2026-10, n° 1 and 18):
 * « 15 000 », « 15 000,50 », « 15.000 », with plain, no-break (U+00A0) or narrow
 * no-break (U+202F) spaces. `parseFloat("15 000")` read 15, so the calculator
 * showed 0 € of tax on a 5 000 € gain; it also read « abc » as 0 in silence.
 * Anything that is not a positive number is refused, never guessed at.
 */
export function parseAmount(raw: string): ParsedAmount {
  const s = raw.replace(/[\s  ]/g, '').replace(/€$/, '')
  if (s === '') return { ok: false, reason: 'empty' }
  if (/^[-−]/.test(s)) {
    return parseAmount(s.slice(1)).ok ? { ok: false, reason: 'negative' } : { ok: false, reason: 'invalid' }
  }
  let normalized: string
  if (/^\d\d?\d?(\.\d{3})+(,\d+)?$/.test(s)) normalized = s.replace(/\./g, '').replace(',', '.') // 15.000,50
  else if (/^\d+(,\d+)?$/.test(s)) normalized = s.replace(',', '.')                              // 15000,50
  else if (/^\d+\.\d+$/.test(s)) normalized = s                                                  // 1500.5
  else return { ok: false, reason: 'invalid' }
  const value = Number(normalized)
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, reason: 'invalid' }
}
