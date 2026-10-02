// tests/app/faq-no-refund.test.tsx
//
// « je le rembourse intégralement sur simple demande dans les 14 jours »: a
// promise withdrawn (D-ALG-RESIL-1), contradicted by the lab's terms, and served
// to search engines in the FAQ's JSON-LD (audit 2026-10, n° 10). Checked on the
// rendered page, the visible answers and the structured data alike.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FaqPage from '@/app/faq/page'

function jsonLdOf(html: string): string {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  expect(m, 'the FAQ page carries its JSON-LD').toBeTruthy()
  return m![1]
}

describe('/faq', () => {
  const html = renderToStaticMarkup(<FaqPage />)

  it('promises no refund, in the page or in its JSON-LD', () => {
    expect(html).not.toMatch(/rembours/i)
    expect(jsonLdOf(html)).not.toMatch(/rembours/i)
  })

  it('still says there is no trial and when the first payment is taken', () => {
    const answer = (JSON.parse(jsonLdOf(html)).mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>)
      .find(q => q.name === 'Est-ce payant ?')!.acceptedAnswer.text
    expect(answer).toMatch(/Pas de période d'essai : le premier paiement est prélevé à la souscription\.$/)
  })
})
