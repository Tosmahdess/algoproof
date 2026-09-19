import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('opens by itself when the URL targets its anchor, and when printed', () => {
    monter()

    const corps = screen.getByText('Le corps du bloc.').parentElement!
    expect(corps.className).toContain('peer-target:block')
    expect(corps.className).toContain('print:block')
    // The anchor stays on the heading, which is the `peer` the body reads.
    const titre = screen.getByRole('heading', { level: 2 })
    expect(titre.id).toBe('mots')
    expect(titre.className).toContain('peer')
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
