import { describe, it, expect } from 'vitest'
import { faqJsonLd, organizationJsonLd } from '@/lib/jsonld'

describe('faqJsonLd', () => {
  it('builds a FAQPage with mapped questions', () => {
    const out = faqJsonLd([{ question: 'Q1', answer: 'A1' }])
    expect(out['@type']).toBe('FAQPage')
    expect(out.mainEntity).toHaveLength(1)
    expect(out.mainEntity[0]['@type']).toBe('Question')
    expect(out.mainEntity[0].name).toBe('Q1')
    expect(out.mainEntity[0].acceptedAnswer.text).toBe('A1')
  })
})

describe('organizationJsonLd', () => {
  it('describes the AlgoProof entity', () => {
    const out = organizationJsonLd()
    expect(out['@type']).toBe('Organization')
    expect(out.name).toBe('AlgoProof')
    expect(out.url).toBe('https://algoproof.fr')
  })
})
