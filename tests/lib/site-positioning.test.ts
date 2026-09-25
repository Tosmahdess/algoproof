// tests/lib/site-positioning.test.ts
//
// The home headline announced ONE of the two things this site does («  Mon labo
// de trading algorithmique, en public. ») until 2026-09-20. Rewriting the hero
// fixes what a visitor reads on arrival, and nothing else: the browser tab, the
// link preview pushed into a chat, the search result and the footer of every
// page all carry their own copy of the positioning, and all four still said
// « labo de trading » alone.
//
// That is the shape of the D058 failure repeated: a promise retired in one
// place and left standing on every surface that repeats it. These guards hold
// the four MACHINE surfaces — the ones nobody re-reads because they are not
// rendered in the page body — to naming both activities.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

/** The two halves of what this site is. A positioning string must carry both:
 *  the trading side (bots, strategies) and the company-accounts side. */
const STRATEGIES = /strat[ée]gies?|bots?/i
const COMPTES = /soci[ée]t[ée]s?|comptes/i

/** JSX and TS escape an apostrophe several ways; never let a guard pass or fail
 *  on the encoding rather than the words. */
function collapse(s: string): string {
  return s.replace(/\\'/g, '’').replace(/&apos;|'/g, '’').replace(/\s+/g, ' ')
}

/** Extracts a single-quoted value for `key:` — the form all four surfaces use. */
function field(file: string, key: string): string {
  const m = collapse(read(file)).match(new RegExp(`${key}:\\s*’([^’]*(?:’[a-zA-ZÀ-ÿ][^’]*)*)’`))
  if (!m) throw new Error(`${file}: no ${key} found`)
  return m[1]
}

describe('the five machine surfaces name both activities', () => {
  it('the home <title> is not about the lab alone', () => {
    const title = field('src/app/page.tsx', 'title')
    expect(title, `home title: "${title}"`).toMatch(STRATEGIES)
    expect(title, `home title: "${title}"`).toMatch(COMPTES)
  })

  it('the home meta description names both', () => {
    const desc = field('src/app/page.tsx', 'description')
    expect(desc, desc).toMatch(STRATEGIES)
    expect(desc, desc).toMatch(COMPTES)
  })

  // Lot 7 (spec 5.7): /a-propos said « mon labo de trading en public » alone in
  // its <title> and its description until 2026-09-25. Same rule as the home.
  it('the /a-propos <title> and description name both', () => {
    const title = field('src/app/a-propos/page.tsx', 'title')
    const desc = field('src/app/a-propos/page.tsx', 'description')
    for (const s of [title, desc]) {
      expect(s, s).toMatch(STRATEGIES)
      expect(s, s).toMatch(COMPTES)
      expect(s, s).not.toMatch(/labo de trading/i)
    }
  })

  // The site-wide default: every page without its own description inherits it,
  // and it is what a link preview shows for those pages.
  it('the layout default description names both', () => {
    const desc = field('src/app/layout.tsx', 'description')
    expect(desc, desc).toMatch(STRATEGIES)
    expect(desc, desc).toMatch(COMPTES)
  })

  it('the Organization JSON-LD names both', () => {
    const desc = field('src/lib/jsonld.ts', 'description')
    expect(desc, desc).toMatch(STRATEGIES)
    expect(desc, desc).toMatch(COMPTES)
  })

  // The review found this one after the other four: it is the picture pushed
  // into a chat, a tweet or a Slack unfurl, and the header above claims to
  // cover exactly that. It said « Trading algo vérifié » alone.
  it('the OpenGraph card tagline names both', () => {
    const og = collapse(read('src/app/opengraph-image.tsx'))
    const m = og.match(/fontSize: .28px.[^>]*>\s*([^<]+?)\s*</)
    expect(m, 'the OG tagline').toBeTruthy()
    expect(m![1], m![1]).toMatch(STRATEGIES)
    expect(m![1], m![1]).toMatch(COMPTES)
  })

  it('the footer line on every page names both', () => {
    const footer = collapse(read('src/components/Footer.tsx'))
    const m = footer.match(/AlgoProof : [^<]*?\./)
    expect(m, 'the footer signature line').toBeTruthy()
    expect(m![0], m![0]).toMatch(STRATEGIES)
    expect(m![0], m![0]).toMatch(COMPTES)
  })

  // D058 travels with the positioning: a surface that gains « sociétés » must
  // not gain a grade along the way.
  it('no machine surface promises a grade or a verdict on a company', () => {
    for (const f of ['src/app/page.tsx', 'src/app/layout.tsx', 'src/lib/jsonld.ts', 'src/components/Footer.tsx', 'src/app/opengraph-image.tsx']) {
      const text = collapse(read(f))
      expect(text, `${f}: grades a company`).not.toMatch(/soci[ée]t[ée]s?[^.]{0,40}(not[ée]|note|verdict)/i)
    }
  })
})
