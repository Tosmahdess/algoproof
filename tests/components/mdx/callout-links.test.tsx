// tests/components/mdx/callout-links.test.tsx
//
// Callout and Verdict are `not-prose`, which switches off the article's link
// styling: a link inside one took the colour of the text, without underline.
// Five articles had such invisible links, « Lance le piège ici » and the
// sources among them (audit 2026-10, n° 12).
//
// Every article is compiled with the components the blog page passes to
// MDXRemote, and every link inside an <aside> (Callout and Verdict render one)
// must carry the inline link role.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileMDX } from 'next-mdx-remote/rsc'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { linkClass } from '@/lib/link-roles'

const DIR = path.resolve(__dirname, '../../../content/blog')
const ARTICLES = fs.readdirSync(DIR).filter(f => f.endsWith('.mdx'))
const INLINE = linkClass('inline').split(' ')

async function render(source: string): Promise<Document> {
  const { content } = await compileMDX({ source, components: mdxComponents })
  return new DOMParser().parseFromString(renderToStaticMarkup(content), 'text/html')
}

describe('links inside an article callout are visible', () => {
  it('styles a markdown link inside a Callout and a Verdict with the inline role', async () => {
    const doc = await render([
      '<Callout type="info">Voir [la flotte](/overview).</Callout>',
      '',
      '<Verdict status="no-go">Voir [la fiche](/strategies/bot/v1-spot).</Verdict>',
    ].join('\n'))
    const links = [...doc.querySelectorAll('aside a')]
    expect(links).toHaveLength(2)
    for (const a of links) expect(a.className.split(' ')).toEqual(expect.arrayContaining(INLINE))
  })

  it.each(ARTICLES)('%s: every link in a Callout or Verdict carries the inline role', async file => {
    const { content } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'))
    const doc = await render(content)
    for (const a of doc.querySelectorAll('aside a')) {
      expect(a.className.split(' '), `${file}: ${a.textContent}`).toEqual(expect.arrayContaining(INLINE))
    }
  })

  it('the sweep reaches the articles the audit named (else it is vacuous)', async () => {
    let total = 0
    for (const file of ARTICLES) {
      const { content } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'))
      total += (await render(content)).querySelectorAll('aside a').length
    }
    expect(total).toBeGreaterThanOrEqual(5)
  })
})
