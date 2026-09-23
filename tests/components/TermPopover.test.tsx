import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import TermPopover from '@/components/TermPopover'
import { GLOSSARY } from '@/lib/glossary'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...rest}>{children}</a>,
}))

// External review, 2026-09-23: "Sur la page flotte le lexique est cliquable et
// dirige sur une nouvelle page c'est chiant."
//
// The definition comes to the reader instead of the reader going to it. But the
// element stays a REAL <a href="/lexique#id">, for three reasons that a <button>
// would have thrown away: the page is meant to be crawled and those are internal
// links; without JavaScript the link still works; and ctrl/middle-click still
// opens the full lexicon in a tab, which is what a reader who wants more expects.
const PF = GLOSSARY.find(t => t.id === 'profit-factor')!

describe('a lexicon term in a sentence', () => {
  it('is a real link to its lexicon entry, not a button', () => {
    render(<TermPopover id="profit-factor">profit factor</TermPopover>)
    expect(screen.getByRole('link', { name: /profit factor/i }))
      .toHaveAttribute('href', '/lexique#profit-factor')
  })

  it('shows the definition in place on click, without navigating', () => {
    render(<TermPopover id="profit-factor">profit factor</TermPopover>)
    const click = fireEvent.click(screen.getByRole('link', { name: /profit factor/i }))

    // fireEvent returns false when a handler called preventDefault().
    expect(click, 'the click must be intercepted, not followed').toBe(false)
    expect(screen.getByRole('tooltip')).toHaveTextContent(PF.definition.slice(0, 40))
  })

  // The single source of truth: one definition, written once. Two copies drift
  // apart within months and nobody can say which one is right.
  it('reads its text from the glossary, not from a second copy', () => {
    render(<TermPopover id="drawdown">drawdown</TermPopover>)
    fireEvent.click(screen.getByRole('link', { name: /drawdown/i }))
    const dd = GLOSSARY.find(t => t.id === 'drawdown')!
    expect(screen.getByRole('tooltip')).toHaveTextContent(dd.definition.slice(0, 40))
  })

  it('still offers the full entry for a reader who wants more', () => {
    render(<TermPopover id="profit-factor">profit factor</TermPopover>)
    fireEvent.click(screen.getByRole('link', { name: /profit factor/i }))
    expect(within(screen.getByRole('tooltip')).getByRole('link'))
      .toHaveAttribute('href', '/lexique#profit-factor')
  })

  it('closes on Escape and gives the focus back to the term', () => {
    render(<TermPopover id="profit-factor">profit factor</TermPopover>)
    const term = screen.getByRole('link', { name: /profit factor/i })
    fireEvent.click(term)
    expect(screen.queryByRole('tooltip')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(term)
  })

  it('closes when the reader clicks anywhere else', () => {
    render(<>
      <TermPopover id="profit-factor">profit factor</TermPopover>
      <p data-testid="ailleurs">ailleurs</p>
    </>)
    fireEvent.click(screen.getByRole('link', { name: /profit factor/i }))
    fireEvent.mouseDown(screen.getByTestId('ailleurs'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  // A reader who ctrl-clicks or middle-clicks is asking for a tab. Swallowing
  // that would be the popover taking away a behaviour the plain link had.
  it('lets a ctrl-click through to the browser', () => {
    render(<TermPopover id="profit-factor">profit factor</TermPopover>)
    const click = fireEvent.click(
      screen.getByRole('link', { name: /profit factor/i }), { ctrlKey: true })

    expect(click, 'a ctrl-click must NOT be intercepted').toBe(true)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  // An id with no glossary entry must degrade to the plain link it always was,
  // never to a bubble that opens on an empty definition.
  it('stays an ordinary link when the term does not exist', () => {
    render(<TermPopover id="pas-un-terme">machin</TermPopover>)
    const click = fireEvent.click(screen.getByRole('link', { name: /machin/i }))

    expect(click, 'nothing to show, so nothing to intercept').toBe(true)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
