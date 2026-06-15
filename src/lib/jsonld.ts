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
      'Labo de trading algorithmique transparent, en français. Chaque trade — gains et pertes — est public.',
    sameAs: ['https://x.com/AlgoProof'],
  }
}

export function definedTermSetJsonLd(terms: { id: string; term: string; definition: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Lexique du trading algorithmique — AlgoProof',
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': `https://algoproof.fr/lexique#${t.id}`,
      name: t.term,
      description: t.definition,
    })),
  }
}
