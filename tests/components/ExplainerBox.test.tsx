import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExplainerBox from '@/components/ExplainerBox'

// Refonte lot 3 (2026-10-02, audit 2026-10 constats 33 and 34): the two buttons are real
// tabs (role tab, aria-selected), and a panel stays mounted once opened, hidden when not
// selected, so the queries below ask for tabs and for visibility.
describe('ExplainerBox', () => {
  it('renders the Fonctionnel tab button', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    expect(screen.getByRole('tab', { name: /comment il fonctionne/i })).toBeDefined()
  })

  it('renders the Technique tab button', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    expect(screen.getByRole('tab', { name: /technique/i })).toBeDefined()
  })

  it('shows functional content by default', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    expect(screen.getByText('Plain text.')).toBeDefined()
    expect(screen.queryByText('Tech detail.')).toBeNull()
  })

  it('shows technical content after clicking Technique tab', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    fireEvent.click(screen.getByRole('tab', { name: /technique/i }))
    expect(screen.getByText('Tech detail.')).toBeVisible()
    expect(screen.queryByText('Plain text.')).not.toBeVisible()
  })

  it('clicking Fonctionnel tab after Technique shows functional again', () => {
    render(<ExplainerBox functional="Plain text." technical="Tech detail." />)
    fireEvent.click(screen.getByRole('tab', { name: /technique/i }))
    fireEvent.click(screen.getByRole('tab', { name: /comment il fonctionne/i }))
    expect(screen.getByText('Plain text.')).toBeVisible()
    expect(screen.queryByText('Tech detail.')).not.toBeVisible()
  })

  it('accepts ReactNode in technical prop and renders after tab click', () => {
    render(
      <ExplainerBox
        functional="Overview"
        technical={<span data-testid="custom-node">Custom</span>}
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: /technique/i }))
    expect(screen.getByTestId('custom-node')).toBeDefined()
  })
})

// The « 📋 Historique » tab was removed on 2026-08-08. Guarded rather than merely deleted: the
// tab was driven by an optional prop, so re-adding one at a call site would silently bring the
// whole surface back. There is no prop that can produce it now, and this asserts the absence.
describe('ExplainerBox — no changelog tab', () => {
  it('never renders an Historique tab', () => {
    render(<ExplainerBox functional="F" technical="T" />)
    expect(screen.queryByRole('tab', { name: /historique/i })).toBeNull()
  })
})

// The Discussion tab went with the public comments on 2026-09-26 (bot sheets carry a
// private question form). No prop can bring it back; this asserts the absence.
describe('ExplainerBox — no discussion tab', () => {
  it('never renders a Discussion tab', () => {
    render(<ExplainerBox functional="F" technical="T" />)
    expect(screen.queryByRole('tab', { name: /discussion/i })).toBeNull()
  })
})

describe('ExplainerBox — tabs for assistive technology', () => {
  it('marks the selected tab and links each tab to its panel', () => {
    render(<ExplainerBox functional="F" technical="T" />)
    const tabs = screen.getAllByRole('tab')
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(tabs.map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false'])
    const panel = document.getElementById(tabs[0].getAttribute('aria-controls')!)!
    expect(panel.getAttribute('role')).toBe('tabpanel')
  })

  it('moves between tabs with the arrow keys', () => {
    render(<ExplainerBox functional="F" technical="T" />)
    fireEvent.keyDown(screen.getByRole('tab', { name: /comment il fonctionne/i }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /technique/i }).getAttribute('aria-selected')).toBe('true')
  })

  it('carries no emoji in a tab label', () => {
    render(<ExplainerBox functional="F" technical="T" />)
    for (const t of screen.getAllByRole('tab')) expect(t.textContent).not.toMatch(/[☀-➿\u{1F300}-\u{1FAFF}]/u)
  })
})
