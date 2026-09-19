'use client'

import { useState, type ReactNode } from 'react'

/**
 * A long explanatory block that folds on a phone and stays exactly as it was
 * on a computer (user decision 2026-09-19: on a 390 px phone, /investir put
 * ~3 000 px of explanation before its company search).
 *
 * WHY CSS DECIDES THE FIRST PAINT. The pages using this are force-static: the
 * HTML is the same for every screen. A matchMedia hook would render one state
 * and flip to the other on mount — a layout jump on every phone visit. Here
 * the body is always in the HTML (search engines, print, no-JS computers) and
 * `max-sm:hidden` hides it below `sm` from the first paint. JavaScript only
 * toggles it.
 *
 * WHY NOT <details>. On a computer the block must have no toggle at all. A
 * <summary> stays clickable whatever CSS says, and flips `open` with no
 * visible effect: an incoherent state. A checkbox `peer` would be announced
 * as a checkbox on a section title. The disclosure pattern — a button with
 * aria-expanded inside the heading — is the standard one.
 *
 * - `peer-target:block`: a link to the heading's id (#mots-investir) opens
 *   the block instead of landing on a folded title.
 * - `print:block`: printing a page shows all of it.
 * - Known limit: the browser's find-in-page does not see a folded body on a
 *   phone (display: none).
 */
export default function Repli({
  id,
  titre,
  resume,
  className,
  titreClassName = 'text-xl font-semibold',
  corpsClassName = 'mt-3',
  children,
}: {
  /** Anchor of the heading. The body reads it through `peer-target`. */
  id: string
  titre: ReactNode
  /** One short line under the title in the phone button, e.g. « 7 termes ». */
  resume?: ReactNode
  /** Classes of the wrapping <section> (a card, for instance). */
  className?: string
  titreClassName?: string
  corpsClassName?: string
  children: ReactNode
}) {
  const [ouvert, setOuvert] = useState(false)
  const corpsId = `${id}-corps`

  return (
    <section className={className}>
      <h2 id={id} className={`peer scroll-mt-20 ${titreClassName}`}>
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls={corpsId}
          onClick={() => setOuvert(o => !o)}
          className="sm:hidden flex w-full items-start justify-between gap-3 text-left"
        >
          <span>
            {titre}
            {resume && (
              <span className="block mt-1 text-xs font-normal normal-case tracking-normal text-muted">
                {resume}
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-muted transition-transform ${ouvert ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>
        <span className="hidden sm:inline">{titre}</span>
      </h2>
      <div
        id={corpsId}
        className={`${corpsClassName} ${ouvert ? '' : 'max-sm:hidden peer-target:block print:block'}`}
      >
        {children}
      </div>
    </section>
  )
}
