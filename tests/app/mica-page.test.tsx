// /mica, refonte « Le registre des décisions » (2026-10-03). The page keeps its
// content and loses its template: no countdown pill, no four cards, no checkboxes,
// no accordion, no double button. What the audit of 2026-10 found on it is pinned
// here, finding by finding.
import { render, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import MicaPage, { metadata } from '@/app/mica/page'
import { MICA_EXCHANGES, MICA_EXCHANGES_READ_ON } from '@/lib/mica-exchanges'
import { longDate } from '@/lib/format-date'

const SRC = readFileSync(path.resolve(__dirname, '../../src/app/mica/page.tsx'), 'utf8')

function page() {
  const { container } = render(<MicaPage />)
  return { container, text: container.textContent!.replace(/\s+/g, ' ') }
}

describe('/mica', () => {
  // n° 57: « … | AlgoProof | AlgoProof ». The layout's template adds the suffix.
  it('leaves the « | AlgoProof » suffix to the layout', () => {
    expect(String(metadata.title)).not.toMatch(/AlgoProof/)
  })

  // n° 57: a countdown to a date three months past. A fixed, dated sentence instead.
  it('states the date MiCA took effect in France as fixed text, with no countdown', () => {
    const { text } = page()
    expect(text).toMatch(/1er juillet 2026/)
    expect(text).not.toMatch(/dans \d+ jours?/)
    expect(SRC).not.toMatch(/MicaCountdown/)
  })

  // n° 82: « Cette page présente… ».
  it('speaks in the first person', () => {
    const { text } = page()
    expect(text).not.toMatch(/Cette page présente/)
    expect(text).toMatch(/\bje\b|\bj’|\bj'/i)
  })

  // Owner's brief: the calculator is the first tool of the page.
  it('puts the calculator before the exchange register', () => {
    const { container } = page()
    const calc = container.querySelector('[role="status"]')!
    const register = container.querySelector('[data-testid="mica-register"]')!
    expect(calc).toBeTruthy()
    expect(register).toBeTruthy()
    expect(calc.compareDocumentPosition(register) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // n° 16: the « Bybit → » link paid me and said nothing.
  it('marks every affiliate link next to it, with rel="sponsored"', () => {
    const { container } = page()
    const rows = [...container.querySelectorAll('[data-testid="mica-row"]')]
    expect(rows).toHaveLength(MICA_EXCHANGES.length)
    for (const e of MICA_EXCHANGES) {
      const row = rows.find(r => r.getAttribute('data-name') === e.name)!
      const link = row.querySelector('a')
      if (!e.url) { expect(link, e.name).toBeNull(); continue }
      expect(link!.getAttribute('href')).toBe(e.url)
      const rel = link!.getAttribute('rel')!.split(/\s+/)
      expect(rel).toContain('noopener')
      if (e.affiliate) {
        expect(rel, e.name).toContain('sponsored')
        // the mention sits beside the link, in the same line of the row
        expect(link!.parentElement!.textContent, e.name).toMatch(/lien affilié/i)
      } else {
        expect(rel, e.name).not.toContain('sponsored')
        expect(row.textContent, e.name).not.toMatch(/lien affilié/i)
      }
    }
  })

  // n° 82 and n° 57: an undated « indicatif », and a link to the AMF's home page.
  it('dates the statuses and links the ESMA MiCA register directly', () => {
    const { container, text } = page()
    expect(text).toContain(`relevés le ${longDate(MICA_EXCHANGES_READ_ON)}`)
    const register = within(container as HTMLElement).getByRole('link', { name: /registre/i })
    const href = register.getAttribute('href')!
    expect(href).not.toMatch(/^https:\/\/www\.amf-france\.org\/?$/)
    expect(href).toMatch(/esma\.europa\.eu\/.+mica/i)
  })

  // Audit P1 n° 17 extended to /mica (§10): on a phone a table becomes a list, so
  // no horizontal scroll hides a column.
  it('writes the register as rows, with no horizontally scrolled table', () => {
    const { container } = page()
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
  })

  // Owner's brief: the FAQ in native <details>/<summary>.
  it('folds each question in a native <details>', () => {
    const { container } = page()
    const details = container.querySelectorAll('details')
    expect(details.length).toBeGreaterThanOrEqual(5)
    for (const d of details) expect(d.querySelector('summary')).toBeTruthy()
    expect(container.querySelector('button[aria-expanded]')).toBeNull()
  })

  // n° 55: « au 10 septembre » read as current on 3 October. The answer keeps what the
  // page knows and shows the day it was last read; it states no new regulatory fact.
  it('shows the day the Binance answer was last read', () => {
    const { container } = page()
    const binance = [...container.querySelectorAll('details')].find(d => /Binance/.test(d.textContent!))!
    const time = binance.querySelector('time')!
    expect(time.getAttribute('dateTime')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(binance.textContent).toMatch(/Relu le/)
    expect(time.textContent).toBe(longDate(time.getAttribute('dateTime')!))
    expect(binance.textContent).not.toMatch(/doit se prononcer/)
  })

  it('ends on one way forward, not a pair of buttons', () => {
    const { container } = page()
    const start = [...container.querySelectorAll('a[href="/start"]')]
    expect(start.length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('a[href="/strategies"]')).toBeNull()
  })
})
