import { describe, it, expect } from 'vitest'
import { getBotParams } from '@/lib/bot-params'

describe('getBotParams', () => {
  it('returns codeSnippet for v1-spot', () => {
    const params = getBotParams('v1-spot')
    expect(params?.codeSnippet).toBeDefined()
    expect(typeof params?.codeSnippet).toBe('string')
    expect(params!.codeSnippet!.length).toBeGreaterThan(50)
  })

  it('returns codeSnippet for v1-hl', () => {
    const params = getBotParams('v1-hl')
    expect(params?.codeSnippet).toBeDefined()
    expect(typeof params?.codeSnippet).toBe('string')
  })

  it('returns null for unknown slug', () => {
    expect(getBotParams('unknown-bot')).toBeNull()
  })
})
