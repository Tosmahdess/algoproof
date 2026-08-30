import { describe, it, expect } from 'vitest'
import { gateFicheList } from '@/lib/gate-fiche-list'

const rows = [
  { ticker: 'AAA', asset_name: 'Alpha', category: 'tech', verdict: 'renforcer', verdict_reason: 'raison A', generated_at: '2026-08-01' },
  { ticker: 'ZZZ', asset_name: 'Zeta', category: 'tech', verdict: 'passer', verdict_reason: 'raison Z', generated_at: '2026-08-02' },
]

describe('gateFicheList', () => {
  it('strips the verdict outside the free five for a guest', () => {
    const out = gateFicheList(rows, 'guest', ['AAA'])
    expect(out[0].verdict).toBe('renforcer')
    expect(out[0].verdict_reason).toBe('raison A')
    expect(out[1].verdict).toBeNull()
    expect(out[1].verdict_reason).toBeNull()
  })

  it('treats a signed-in non-member exactly like a guest', () => {
    expect(gateFicheList(rows, 'free', ['AAA'])[1].verdict).toBeNull()
  })

  it('leaves everything in place for a member', () => {
    const out = gateFicheList(rows, 'paid', ['AAA'])
    expect(out[1].verdict).toBe('passer')
    expect(out[1].verdict_reason).toBe('raison Z')
  })

  it('keeps name, sector and freshness for everyone', () => {
    const out = gateFicheList(rows, 'guest', [])
    expect(out[1].asset_name).toBe('Zeta')
    expect(out[1].category).toBe('tech')
    expect(out[1].generated_at).toBe('2026-08-02')
  })

  it('does not mutate its input', () => {
    gateFicheList(rows, 'guest', [])
    expect(rows[1].verdict).toBe('passer')
  })
})
