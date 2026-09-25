'use client'

import { useId, useState, type ReactNode } from 'react'

/**
 * A filter bar that follows the reader down a long list.
 *
 * External review, 2026-09-23: "Sur la plupart des pages rendre les filtres
 * collant, surtout sur les grosses pages comme survivant, blog, etc." Scrolling
 * a long register and losing the controls that shaped it means scrolling all
 * the way back up to change one thing.
 *
 * Three decisions worth keeping:
 *
 * The offset is `--nav-h`, the nav's own height token, never a number copied
 * here. The nav is 44 px and changes height at the md breakpoint; a literal
 * would be correct until it isn't, and then the bar hides its own first line
 * under the nav.
 *
 * `z-40` against the nav's `z-50`. A sticky element that outranks the nav
 * covers it — the bar would win the scroll and lose the site's navigation. The
 * two numbers are a pair, and the test reads both files so that changing one
 * alone fails.
 *
 * NO horizontal bleed. It used to carry `-mx-6 px-6` to run edge to edge, which
 * silently assumed every container it is mounted in pads by exactly 24 px — and
 * the cockpit's does not (`p-4 lg:p-6`), so under `lg` the bar overhung its
 * column by 8 px each side and, with no `overflow-x` guard on body, gave the
 * page a horizontal scroll. On the one breakpoint this bar exists to serve.
 * Without the bleed it inherits whatever padding it is dropped into and cannot
 * overhang anything; nothing scrolls through it either, since the content it
 * covers lives inside that same padding.
 *
 * On a phone it is COLLAPSED, showing one line: how many filters are on, and a
 * way to clear them. A full filter bar pinned to the top of a phone eats a
 * third of the screen, so the cure for "I lose my filters" would have become "I
 * cannot see the list" — the next complaint, earned. Above `lg` there is room,
 * and the controls are simply always there.
 */
export default function StickyFilterBar(
  { activeCount, onReset, children }:
  { activeCount: number; onReset: () => void; children: ReactNode },
) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div
      data-testid="sticky-filters"
      className="sticky top-[var(--nav-h)] z-40 mb-6 border-b border-border bg-bg py-3"
    >
      {/* La ligne compacte : seule chose visible sur téléphone. */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground"
        >
          Filtres
          {activeCount > 0 && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
              {activeCount}
            </span>
          )}
          <svg
            className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 10 6" fill="currentColor" aria-hidden="true"
          >
            <path d="M0 0l5 6 5-6H0z" />
          </svg>
        </button>

        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="text-xs text-muted underline underline-offset-2 hover:text-foreground">
            Tout effacer
          </button>
        )}
      </div>

      <div
        id={panelId}
        data-testid="filter-controls"
        className={`${open ? 'mt-3' : 'hidden'} lg:mt-0 lg:block`}
      >
        {children}
      </div>
    </div>
  )
}
