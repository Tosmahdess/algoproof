// The four things a link can be on this site, and nothing else.
//
// External review, 2026-09-23: links were white, indigo, green, some
// underlined, some not, some with an arrow — and a reader could not tell the
// bare `text-accent` ones were links at all. Parsing the JSX of both apps
// found 245 links across 87 files and no rule anyone could have followed.
//
// The rule is the role, not the colour. A call site picks what the link IS,
// and the treatment follows; that is what makes a system hold instead of
// drifting again. A guard (tests/lib/link-roles-guard.test.ts) fails the build
// when a link is dressed by hand instead.
//
// This file is duplicated verbatim in the algolab repo. Two apps, one visual
// language, and a 40-line module is not worth a shared package — but the two
// copies must stay byte-identical, which a test on each side asserts.

export const LINK_ROLES = ['inline', 'nav', 'card', 'term'] as const

export type LinkRole = (typeof LINK_ROLES)[number]

/** Focus ring shared by every role. Keyboard users had nothing on most of
 *  these links: `focus:outline-none` with no replacement is the single most
 *  common way a redesign locks them out. */
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm'

const ROLE_CLASS: Record<LinkRole, string> = {
  /** A link inside a sentence.
   *
   *  UNDERLINED AT REST, and that is the whole point: hover does not exist on
   *  a touch screen, and colour alone is not a signal (WCAG 1.4.1, and it
   *  fails outright for a colour-blind reader). The underline starts faint and
   *  firms up on hover, so the page is not a field of heavy rules while the
   *  affordance is still unconditional. */
  inline: `text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent transition-colors ${FOCUS}`,

  /** A link in the page's chrome: nav, footer, tabs, sidebar, breadcrumb.
   *
   *  No underline and no accent — a navigation bar underlined throughout is
   *  noise, and its position already says what it is. The current page is
   *  marked by `aria-current="page"` plus `text-foreground`, never by colour
   *  alone. Never use this inside a sentence. */
  nav: `text-muted hover:text-foreground transition-colors ${FOCUS}`,

  /** The whole card is the link: a bot tile, an article, a survivor family.
   *
   *  The text inside carries no link colour at all; the border answers on
   *  hover and the title picks up the accent through `group-hover`. A coloured
   *  title inside a clickable card reads as a second, nested link. */
  card: `block group border border-border rounded-lg hover:border-accent/30 transition-colors ${FOCUS}`,

  /** A lexicon term. Opens a definition in place — it does NOT navigate.
   *
   *  Dotted, and it inherits the surrounding colour on purpose: it must not
   *  look like somewhere to go, because it is not. */
  term: `underline decoration-dotted decoration-muted underline-offset-4 cursor-help ${FOCUS}`,
}

/**
 * The classes for a link of this role, plus whatever layout the call site adds.
 *
 * `extra` is for position and spacing (`mt-3`, `block`, `flex-1`) — never for
 * colour or decoration. Passing `text-positive` here would defeat the point:
 * green means profit on these two sites, and a green link reads as a gain.
 */
export function linkClass(role: LinkRole, extra?: string): string {
  const base = ROLE_CLASS[role]
  return extra ? `${base} ${extra}` : base
}
