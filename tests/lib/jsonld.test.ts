import { describe, it, expect } from 'vitest'
import { faqJsonLd, organizationJsonLd, definedTermSetJsonLd } from '@/lib/jsonld'

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

describe('definedTermSetJsonLd', () => {
  it('builds a DefinedTermSet with mapped terms', () => {
    const out = definedTermSetJsonLd([{ id: 'pf', term: 'Profit factor', definition: 'gains / pertes' }])
    expect(out['@type']).toBe('DefinedTermSet')
    expect(out.hasDefinedTerm).toHaveLength(1)
    expect(out.hasDefinedTerm[0]['@type']).toBe('DefinedTerm')
    expect(out.hasDefinedTerm[0].name).toBe('Profit factor')
    expect(out.hasDefinedTerm[0]['@id']).toBe('https://algoproof.fr/lexique#pf')
  })
})
