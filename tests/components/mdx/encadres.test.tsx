// tests/components/mdx/encadres.test.tsx
//
// The article boxes (Callout, Verdict, DataCard, StatRow of Stat) carried the two
// habits the redesign refuses: a label in tracked capitals above the content
// (« INSIGHT », « SCOPE », « NO GO ») and a coloured border on one side only
// (finitions of the « registre des décisions » redesign, 2026-10-03).
//
// The rule: a box is told apart by a surface fill and a full 1 px rule. A label
// stays, in French and sentence case, as the bold first words of the content
// (« À retenir : … »). A verdict may keep its state colour on its own words.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Callout } from '@/components/mdx/Callout'
import { Verdict } from '@/components/mdx/Verdict'
import { DataCard } from '@/components/mdx/DataCard'
import { Stat, StatRow } from '@/components/mdx/Stat'

const BOXES = {
  Callout: () => <Callout type="insight" title="À retenir"><p>Le coût est un paramètre.</p></Callout>,
  CalloutUntitled: () => <Callout type="warning"><p>Une réserve.</p></Callout>,
  Verdict: () => <Verdict status="no-go" label="Décision finale"><p>Stratégie archivée.</p></Verdict>,
  DataCard: () => <DataCard label="Après 1 perte" sub="Toutes paires" metrics="n:359 | WR:34 % | P&L:−457" />,
  StatRow: () => <StatRow><Stat label="Trades fermés" value="10" subtext="depuis le 7 mai" /><Stat label="P&L" value="+52" /></StatRow>,
}

const classesOf = (root: HTMLElement) =>
  [root, ...root.querySelectorAll<HTMLElement>('*')].flatMap(e => (e.getAttribute('class') ?? '').split(/\s+/))

describe('article boxes: a surface and a full rule, no eyebrow, no side border', () => {
  it.each(Object.entries(BOXES))('%s has no tracked capitals and no one-sided border', (_name, Box) => {
    const { container } = render(<Box />)
    const classes = classesOf(container)
    expect(classes.filter(c => /^uppercase$|^tracking-/.test(c))).toEqual([])
    expect(classes.filter(c => /^border-[lrse](?:-|$)/.test(c))).toEqual([])
    expect(classes.filter(c => /^rounded-[lrse](?:-|$)/.test(c))).toEqual([])
  })

  it.each(Object.entries(BOXES))('%s is a surface with a full 1 px rule', (_name, Box) => {
    const { container } = render(<Box />)
    const box = container.firstElementChild as HTMLElement
    const own = (box.getAttribute('class') ?? '').split(/\s+/)
    expect(own).toContain('bg-card')
    expect(own).toContain('border')
    expect(own).toContain('border-border')
  })
})

describe('the label is the bold start of the content', () => {
  it('a Callout title opens its first paragraph', () => {
    const { container } = render(<BOXES.Callout />)
    const strong = container.querySelector('strong')!
    expect(strong.textContent).toBe('À retenir :')
    // Same block as the text: the label and the first paragraph share a parent,
    // and that paragraph flows inline after it.
    const p = strong.parentElement!.querySelector('p')!
    expect(p.textContent).toBe('Le coût est un paramètre.')
    expect(strong.parentElement!.className).toMatch(/\[&>p:first-of-type\]:inline/)
  })

  it('an untitled Callout gets a French default in sentence case', () => {
    const { container } = render(<BOXES.CalloutUntitled />)
    expect(container.querySelector('strong')!.textContent).toBe('Attention :')
    for (const type of ['info', 'warning', 'insight', 'note'] as const) {
      const { container: c, unmount } = render(<Callout type={type}><p>x</p></Callout>)
      expect(c.textContent).not.toMatch(/INFO|ATTENTION|INSIGHT|NOTE/)
      unmount()
    }
  })

  it('a Verdict names its state in words, sentence case, coloured on the words only', () => {
    const { container } = render(<BOXES.Verdict />)
    const lead = container.querySelector('strong')!
    expect(lead.textContent).toBe('Décision finale : rejet.')
    const state = container.querySelector('[data-verdict-state]')!
    expect(state.textContent).toBe('rejet')
    expect(state.className).toContain('text-negative')
    expect(container.textContent).not.toMatch(/NO GO|GO CONDITIONNEL|OVERFIT|EN ATTENTE/)
  })

  it('a Verdict without a label leads with « Verdict »', () => {
    const { container } = render(<Verdict status="go-cond"><p>À confirmer.</p></Verdict>)
    expect(container.querySelector('strong')!.textContent).toBe('Verdict : feu vert sous conditions.')
    expect(container.querySelector('[data-verdict-state]')!.className).toContain('text-warning')
  })

  it('a go verdict is written in ink, never in green', () => {
    const { container } = render(<Verdict status="go"><p>Retenu.</p></Verdict>)
    const state = container.querySelector('[data-verdict-state]')!
    expect(state.className).toContain('text-foreground')
    expect(container.innerHTML).not.toMatch(/positive|green|emerald/)
  })

  it('DataCard and Stat keep their figure labels, in sentence case', () => {
    const { getByText } = render(<BOXES.DataCard />)
    expect(getByText('WR').className).not.toMatch(/uppercase/)
    const { getByText: s } = render(<BOXES.StatRow />)
    expect(s('Trades fermés').className).not.toMatch(/uppercase/)
  })
})

describe('boxes in the page structure', () => {
  // Two Callouts in one article were two unnamed « complementary » landmarks (axe
  // landmark-unique on the walk-forward article). A box is a note in the text.
  it('a Callout and a Verdict are notes, not landmarks', () => {
    for (const Box of [BOXES.Callout, BOXES.Verdict]) {
      const { container, unmount } = render(<Box />)
      expect(container.firstElementChild!.getAttribute('role')).toBe('note')
      unmount()
    }
  })

  // `text-[0.85em]` of the boxes' 14 px set inline code at 11.9 px, under the 13 px floor.
  it('inline code inside a box stays at the 13 px floor', () => {
    const { container } = render(
      <Callout title="Code"><p>Le SL <code>orb_opposite</code>.</p></Callout>,
    )
    expect(container.querySelector('aside > div')!.className).toContain('[&_code]:text-xs')
    expect(container.innerHTML).not.toContain('0.85em')
    const { getByText } = render(<DataCard label="LONG en `btc_vs_ema`" metrics="n:1" />)
    expect(getByText('btc_vs_ema').className.split(' ')).toContain('text-xs')
  })
})
