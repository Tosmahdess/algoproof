'use client'

import { useEffect, useState, type ReactNode } from 'react'

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
 * - Anchors: a URL or an in-page link aiming at the heading's id
 *   (#mots-investir) opens the block, from JavaScript. Not a CSS `:target`
 *   rule: that kept the body visible whatever the button said, so after
 *   arriving through the anchor the block could never be folded back and
 *   aria-expanded lied (final review 2026-09-19).
 * - `print:block`: printing a page shows all of it.
 * - Known limit: the browser's find-in-page does not see a folded body on a
 *   phone (display: none).
 */
export default function Repli({
  id,
  titre,
  resume,
  resumeClassName = 'text-xs font-normal text-muted',
  className,
  testId,
  aside,
  asideClassName = 'flex items-center justify-between gap-3 flex-wrap',
  entete,
  ouvertParDefaut = false,
  titreClassName = 'text-xl font-semibold',
  corpsClassName = 'mt-3',
  children,
}: {
  /** Anchor of the heading; a URL aiming at it opens the block. */
  id: string
  titre: ReactNode
  /** One short line under the title in the phone button, e.g. « 7 termes ». */
  resume?: ReactNode
  /** Style of that line. Muted by default; a page whose title is already
   *  small and muted (/strategies) sets it at body size so the tap target reads. */
  resumeClassName?: string
  /** Classes of the wrapping <section> (a card, for instance). */
  className?: string
  /** data-testid of the wrapping <section>. */
  testId?: string
  /** Shown beside the title on every screen, outside the button (a status
   *  badge). The title and the aside then share a row styled by asideClassName. */
  aside?: ReactNode
  asideClassName?: string
  /** Shown under the title on every screen, never folded: what a folded
   *  block must still say (ConformityCard: its verdict sentence, so a folded
   *  card never shows a bare status badge). */
  entete?: ReactNode
  /** Start open, on a phone too. For a block whose visible lead points INTO
   *  its body (ConformityCard in breach: « écrit sous la règle concernée »). */
  ouvertParDefaut?: boolean
  titreClassName?: string
  corpsClassName?: string
  children: ReactNode
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut)
  const corpsId = `${id}-corps`

  useEffect(() => {
    const surAncre = () => { if (window.location.hash === `#${id}`) setOuvert(true) }
    surAncre()
    window.addEventListener('hashchange', surAncre)
    return () => window.removeEventListener('hashchange', surAncre)
  }, [id])

  const titreH2 = (
      <h2 id={id} className={`scroll-mt-24 ${aside ? 'flex-1 min-w-0 ' : ''}${titreClassName}`}>
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls={corpsId}
          onClick={() => setOuvert(o => !o)}
          className="sm:hidden flex w-full items-start justify-between gap-3 text-left [text-transform:inherit]"
        >
          <span>
            {titre}
            {resume && (
              <span className={`block mt-1 normal-case tracking-normal ${resumeClassName}`}>
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
  )

  return (
    <section aria-labelledby={id} className={className} data-testid={testId}>
      {aside ? <div className={asideClassName}>{titreH2}{aside}</div> : titreH2}
      {entete}
      <div
        id={corpsId}
        className={`${corpsClassName} ${ouvert ? '' : 'max-sm:hidden print:block'}`}
      >
        {children}
      </div>
    </section>
  )
}
