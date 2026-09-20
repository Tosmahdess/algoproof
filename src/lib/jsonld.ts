export interface FaqItem {
  question: string
  answer: string
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AlgoProof',
    url: 'https://algoproof.fr',
    description:
      'Je publie les résultats de mes bots de trading, gains comme pertes, et je passe les rapports annuels de sociétés cotées à travers sept contrôles.',
    sameAs: ['https://x.com/AlgoProof'],
  }
}

export function definedTermSetJsonLd(terms: { id: string; term: string; definition: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Lexique du trading algorithmique : AlgoProof',
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': `https://algoproof.fr/lexique#${t.id}`,
      name: t.term,
      description: t.definition,
    })),
  }
}
