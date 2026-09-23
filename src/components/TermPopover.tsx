'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { GLOSSARY } from '@/lib/glossary'
import { linkClass } from '@/lib/link-roles'

/**
 * A lexicon term inside a sentence: the definition comes to the reader.
 *
 * External review, 2026-09-23: "le lexique est cliquable et dirige sur une
 * nouvelle page c'est chiant". Four of these sat in a single paragraph of
 * « La flotte », and clicking any of them threw the reader off the page they
 * had come to read.
 *
 * It stays a REAL `<a href="/lexique#id">`, and a <button> would have thrown
 * away three things at once: these are internal links on a page whose whole
 * point is being crawled; without JavaScript the link still works; and
 * ctrl/middle-click still opens the full lexicon in a tab, which is exactly
 * what a reader who wants the long version does. The popover is an
 * enhancement layered on a link that already worked.
 *
 * The text comes from GLOSSARY — the same array /lexique renders. A second
 * copy of a definition drifts from the first within months and nobody can say
 * which one is right.
 *
 * Hover is not a trigger. It does not exist on a phone, and a bubble that
 * appears under a moving finger is worse than the navigation it replaces.
 * One interaction, the same everywhere: click, or Enter from the keyboard.
 */
export default function TermPopover({ id, children }: { id: string; children: ReactNode }) {
  const entry = GLOSSARY.find(t => t.id === id)
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLAnchorElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      // Focus goes back to the term, not to the top of the document: a
      // keyboard reader closing a definition is still in the middle of the
      // sentence they were reading.
      trigger.current?.focus()
    }
    const onOutside = (e: MouseEvent) => {
      if (!anchor.current?.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [open])

  // No entry for this id: the component degrades to the plain link it is
  // wrapping. Opening an empty bubble would be worse than navigating.
  if (!entry) {
    return <Link href={`/lexique#${id}`} className={linkClass('inline')}>{children}</Link>
  }

  return (
    <span ref={anchor} className="relative inline-block">
      <Link
        ref={trigger}
        href={`/lexique#${id}`}
        className={linkClass('term')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={e => {
          // A modified click is the reader asking the BROWSER for something —
          // a new tab, a new window, a download. Intercepting it would take
          // away a behaviour the plain link had.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          setOpen(v => !v)
        }}
      >
        {children}
      </Link>

      {open && (
        <span
          id={panelId}
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-2 block w-72 max-w-[calc(100vw-3rem)] rounded-lg border border-border bg-card p-3 text-left shadow-lg"
        >
          <span className="block text-xs font-semibold text-foreground">{entry.term}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">{entry.definition}</span>
          <Link
            href={`/lexique#${id}`}
            className={linkClass('inline', 'mt-2 inline-block text-xs')}
            onClick={() => setOpen(false)}
          >
            La fiche complète →
          </Link>
        </span>
      )}
    </span>
  )
}
