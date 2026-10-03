import { describe, it, expect } from 'vitest'
import { MICA_EXCHANGES, MICA_EXCHANGES_READ_ON } from '@/lib/mica-exchanges'
import { BYBIT_AFFILIATE_URL } from '@/lib/affiliates'

// Audit 2026-10, n° 16: on /mica the « Bybit » link was an affiliate link with no
// mention anywhere on the page. Each row now says whether its link pays me, and the
// page writes the mention next to the link from that flag.
describe('MICA_EXCHANGES', () => {
  it('flags the Bybit referral link as an affiliate link', () => {
    const bybit = MICA_EXCHANGES.find(e => e.name === 'Bybit')!
    expect(bybit.url).toBe(BYBIT_AFFILIATE_URL)
    expect(bybit.affiliate).toBe(true)
  })

  it('never flags a row without a link, and never links an exchange that no longer serves France', () => {
    for (const e of MICA_EXCHANGES) if (e.url === null) expect(e.affiliate, e.name).toBe(false)
    for (const e of MICA_EXCHANGES) if (e.franceOk === 'Non') expect(e.url, e.name).toBeNull()
  })

  // Audit 2026-10, n° 82: « Statut indicatif » had no date. The day the rows were
  // last revised is data, shown as « relevés le … ».
  it('carries the day its statuses were last read, as an ISO date in the past', () => {
    expect(MICA_EXCHANGES_READ_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Date.parse(MICA_EXCHANGES_READ_ON)).toBeLessThan(Date.now())
  })
})
