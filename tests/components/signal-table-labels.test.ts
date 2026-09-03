import { describe, it, expect } from 'vitest'
import { categoryLabel } from '@/components/SignalTable'

/**
 * The category map is hand-written and the data is not. A category added
 * upstream used to reach the page as a raw key rendered as an H2 —
 * `pharma_biotech` in 24px, on the page the membership pays for.
 */
describe('categoryLabel', () => {
  it('uses the written label when there is one', () => {
    expect(categoryLabel('semiconductors')).toBe('Semiconducteurs')
    expect(categoryLabel('energy_oil')).toBe('Énergie, pétrole et gaz')
  })

  it('names the catch-all bucket', () => {
    expect(categoryLabel('other')).toBe('Autres')
  })

  it('never returns a snake_case key for an unknown category', () => {
    for (const key of ['pharma_biotech_x', 'space_launch', 'agri-tech', 'quantum_computing']) {
      const label = categoryLabel(key)
      expect(label).not.toContain('_')
      expect(label[0]).toBe(label[0].toUpperCase())
    }
  })

  it('makes an unknown key readable without inventing a translation', () => {
    expect(categoryLabel('space_launch')).toBe('Space launch')
  })

  it('does not crash on an empty or odd key', () => {
    expect(categoryLabel('')).toBe('')
    expect(categoryLabel('__')).toBe('')
  })
})
