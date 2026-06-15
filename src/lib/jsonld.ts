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
    sameAs: ['https://x.com/algoproof'],
  }
}
