import { describe, it, expect } from 'vitest'
import { getBotParams } from '@/lib/bot-params'

describe('getBotParams', () => {
  it('returns technicalArticle for v1-spot', () => {
    const params = getBotParams('v1-spot')
    expect(params?.technicalArticle).toBeDefined()
    expect(Array.isArray(params?.technicalArticle)).toBe(true)
    expect(params!.technicalArticle!.length).toBeGreaterThan(0)
  })

  it('v1-spot technicalArticle sections have title and body', () => {
    const params = getBotParams('v1-spot')
    const sections = params!.technicalArticle!
    sections.forEach(section => {
      expect(typeof section.title).toBe('string')
      expect(section.title.length).toBeGreaterThan(0)
      expect(typeof section.body).toBe('string')
      expect(section.body.length).toBeGreaterThan(50)
    })
  })

  it('returns technicalArticle for v1-hl', () => {
    const params = getBotParams('v1-hl')
    expect(params?.technicalArticle).toBeDefined()
    expect(Array.isArray(params?.technicalArticle)).toBe(true)
  })

  it('returns null for unknown slug', () => {
    expect(getBotParams('unknown-bot')).toBeNull()
  })
})
