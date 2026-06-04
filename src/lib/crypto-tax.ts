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
