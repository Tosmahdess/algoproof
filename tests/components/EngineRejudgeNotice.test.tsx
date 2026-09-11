// tests/components/EngineRejudgeNotice.test.tsx
//
// Audit 2026-09-10, C0: an audit of the engine's order simulator found three defects,
// and every verdict and count the site shows came out of that simulator. The notice
// says so, dated, on each surface that shows an engine output: the gauntlet explainer
// (/strategies) and the funnel counter (/ and /overview). One component, so the three
// surfaces cannot drift apart.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { ENGINE_REJUDGE_NOTICE } from '@/components/EngineRejudgeNotice'
import FunnelCounter from '@/components/FunnelCounter'
import GauntletExplainer from '@/components/GauntletExplainer'

const ROOT = path.resolve(__dirname, '../..')

describe('EngineRejudgeNotice copy', () => {
  it('is dated, says what was found and that the figures are provisional until re-judged', () => {
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/^Le 10 septembre 2026, un audit a trouvé trois défauts/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/simule les ordres/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/d’avant la correction/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/Je les rejuge/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/provisoires/)
  })

  it('promises no end date: the only date it carries is the audit day', () => {
    const dates = ENGINE_REJUDGE_NOTICE.match(/\d{1,2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}/g) ?? []
    expect(dates).toEqual(['10 septembre 2026'])
    // Deadline phrasings, not the word « avant » itself: « d’avant la correction »
    // dates the figures, it promises nothing.
    expect(ENGINE_REJUDGE_NOTICE).not.toMatch(/d’ici (le|fin|la fin)\b|avant le \d|jusqu’(au|à) \d|sous (\d+|quelques) (jours|semaines)/)
  })

  it('speaks in the first person singular, with no em or en dash', () => {
    expect(ENGINE_REJUDGE_NOTICE).not.toMatch(/\b(nous|notre|nos)\b/i)
    expect(ENGINE_REJUDGE_NOTICE).not.toMatch(/[—–]/)
  })
})

describe('EngineRejudgeNotice placement', () => {
  it('sits on the funnel counter', () => {
    render(<FunnelCounter counts={{ n_swept: 10, n_judged: 5, n_promoted: 3, n_live: 1 }} />)
    const counter = screen.getByTestId('funnel-counter')
    expect(counter.querySelectorAll('[data-testid="engine-rejudge-notice"]')).toHaveLength(1)
    expect(counter.textContent).toContain(ENGINE_REJUDGE_NOTICE)
  })

  it('sits on the gauntlet explainer', () => {
    render(<GauntletExplainer />)
    const explainer = screen.getByTestId('index-gauntlet')
    expect(explainer.querySelectorAll('[data-testid="engine-rejudge-notice"]')).toHaveLength(1)
  })

  it('the three pages still render the surfaces that carry it', () => {
    const src = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
    expect(src('src/app/page.tsx')).toMatch(/<FunnelCounter\b/)
    expect(src('src/app/overview/page.tsx')).toMatch(/<FunnelCounter\b/)
    expect(src('src/app/strategies/page.tsx')).toMatch(/<GauntletExplainer\b/)
  })
})
