import { afterEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import Repli from '@/components/Repli'

/**
 * A long explanatory block folds on a phone and stays exactly as it was on a
 * computer. The fold is decided by CSS at first paint (no matchMedia, no
 * layout jump on a force-static page); JavaScript only toggles it.
 *
 * jsdom applies no media query, so these tests pin the CONTRACT (classes,
 * ARIA, content present in the HTML). The rendering itself is checked with
 * real screenshots at 390 px and 1440 px.
 */

const monter = () =>
  render(
    <Repli id="mots" titre="Les mots employés" resume="7 termes">
      <p>Le corps du bloc.</p>
    </Repli>,
  )

describe('Repli', () => {
  it('keeps the body in the HTML, so search engines and print still see it', () => {
    monter()

    expect(screen.getByText('Le corps du bloc.')).toBeTruthy()
  })

  it('folds on a phone only: the body is hidden below sm, and nowhere else', () => {
    monter()

    const corps = screen.getByText('Le corps du bloc.').parentElement!
    expect(corps.className).toContain('max-sm:hidden')
    // Not `hidden`: a computer must never see a folded block.
    expect(corps.className.split(/\s+/)).not.toContain('hidden')
  })

  it('opens when printed, and keeps the anchor on its heading', () => {
    monter()

    const corps = screen.getByText('Le corps du bloc.').parentElement!
    expect(corps.className).toContain('print:block')
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('mots')
    // Clears the sticky nav AND a card's top padding when landed on.
    expect(screen.getByRole('heading', { level: 2 }).className).toContain('scroll-mt-24')
  })

  it('passes a test id to its section, and lets a page set the summary style', () => {
    const { container } = render(
      <Repli id="m" titre="T" resume="R" testId="bloc" resumeClassName="text-sm text-foreground">
        <p>x</p>
      </Repli>,
    )

    expect(container.querySelector('section')!.getAttribute('data-testid')).toBe('bloc')
    const resume = screen.getByText('R')
    expect(resume.className).toContain('text-sm')
    expect(resume.className).not.toContain('text-muted')
  })

  it('keeps an aside next to the title and a lead under it visible on every screen', () => {
    // ConformityCard (2026-09-19): the status badge sits beside the title and
    // the verdict sentence stays readable when the card is folded, so the
    // badge is never the only thing a folded card says.
    render(
      <Repli id="c" titre="Conformité" aside={<span>Badge</span>} entete={<p>Le verdict.</p>}>
        <p>Le tableau.</p>
      </Repli>,
    )

    const badge = screen.getByText('Badge')
    const verdict = screen.getByText('Le verdict.')
    expect(screen.getByRole('button').contains(badge)).toBe(false)
    expect(screen.getByRole('heading', { level: 2 }).contains(badge)).toBe(false)
    const corps = screen.getByText('Le tableau.').parentElement!
    expect(corps.contains(verdict)).toBe(false)
    expect(verdict.closest('.max-sm\\:hidden')).toBeNull()
    expect(badge.closest('.max-sm\\:hidden')).toBeNull()
    // Reading order: title, badge, verdict, then the folded body.
    expect(badge.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(verdict.compareDocumentPosition(corps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('names its section after its heading', () => {
    const { container } = monter()

    expect(container.querySelector('section')!.getAttribute('aria-labelledby')).toBe('mots')
  })

  describe('arriving through the anchor', () => {
    afterEach(() => window.history.replaceState(null, '', '/'))

    it('opens, and says so, when the page is loaded on its anchor', () => {
      window.history.replaceState(null, '', '/#mots')
      monter()

      const bouton = screen.getByRole('button')
      expect(bouton.getAttribute('aria-expanded')).toBe('true')
      expect(screen.getByText('Le corps du bloc.').parentElement!.className).not.toContain('max-sm:hidden')
    })

    it('can still be folded after arriving through the anchor', () => {
      // With a CSS `:target` rule the body stayed visible whatever the
      // button said: a second tap could never fold it back.
      window.history.replaceState(null, '', '/#mots')
      monter()

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
      const corps = screen.getByText('Le corps du bloc.').parentElement!
      expect(corps.className).toContain('max-sm:hidden')
      expect(corps.className).not.toContain('peer-target')
    })

    it('opens when an in-page link points at it later', () => {
      monter()

      act(() => {
        window.history.replaceState(null, '', '/#mots')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })

      expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
    })
  })

  it('offers a disclosure button on a phone, and a plain title on a computer', () => {
    monter()

    const bouton = screen.getByRole('button', { name: /Les mots employés/ })
    expect(bouton.className).toContain('sm:hidden')
    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    const corps = screen.getByText('Le corps du bloc.').parentElement!
    expect(bouton.getAttribute('aria-controls')).toBe(corps.id)

    const titreFixe = screen.getByText('Les mots employés', { selector: 'span.sm\\:inline' })
    expect(titreFixe.className).toContain('hidden')
  })

  it('lets the phone button inherit the title case', () => {
    // Tailwind's preflight sets `text-transform: none` on buttons: an
    // uppercase card title (/strategies, /investir) read in lower case on a
    // phone and in capitals on a computer.
    monter()

    expect(screen.getByRole('button').className).toContain('[text-transform:inherit]')
  })

  it('shows the summary line inside the phone button only', () => {
    monter()

    const bouton = screen.getByRole('button')
    expect(bouton.textContent).toContain('7 termes')
    expect(screen.getAllByText('7 termes').length).toBe(1)
  })

  it('unfolds and folds back on tap', () => {
    monter()

    const bouton = screen.getByRole('button')
    const corps = () => screen.getByText('Le corps du bloc.').parentElement!

    fireEvent.click(bouton)
    expect(bouton.getAttribute('aria-expanded')).toBe('true')
    expect(corps().className).not.toContain('max-sm:hidden')

    fireEvent.click(bouton)
    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    expect(corps().className).toContain('max-sm:hidden')
  })
})
