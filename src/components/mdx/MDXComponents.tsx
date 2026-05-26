// src/components/mdx/MDXComponents.tsx
//
// Custom MDX components for blog posts.
// Designed to match algoproof.fr terminal/editorial aesthetic:
//  - Sharp borders, mono font for numerical data
//  - Auto-coloring of cells starting with + (positive) or − / - (negative)
//  - Generous spacing, refined typographic hierarchy
//
// Used by src/app/blog/[slug]/page.tsx via <MDXRemote components={...} />.

import type { ReactNode, HTMLAttributes } from 'react'

// ---------- helpers ----------

/** Extract the plain-text content from a React node (cell children). */
function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    // @ts-expect-error - children access on React element
    return extractText(node.props.children)
  }
  return ''
}

/** Decide if a string represents a numerical value worth styling.
 *  Looks for digits with optional sign or units (%, USDT, etc.). */
function isNumeric(s: string): boolean {
  return /[+\-−]?\s*\d/.test(s.trim())
}

/** Detect sign for color coding.
 *  Returns 'positive' if starts with + or contains "+XX" pattern;
 *  'negative' if starts with − / - / – (any dash variant);
 *  'neutral' otherwise. */
function detectSign(s: string): 'positive' | 'negative' | 'neutral' {
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'positive'
  if (/^[−–-]\s*\d/.test(trimmed)) return 'negative'
  // Search for an embedded explicit sign like "Δ +120" or "Δ −80"
  const match = trimmed.match(/[Δδ]\s*([+−–-])/)
  if (match) return match[1] === '+' ? 'positive' : 'negative'
  return 'neutral'
}

// ---------- table primitives ----------

function MDXTable(props: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="my-8 -mx-4 sm:mx-0 overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="border border-border rounded-md overflow-hidden bg-card/40">
          <table
            {...props}
            className="min-w-full text-xs sm:text-sm border-collapse"
          />
        </div>
      </div>
    </div>
  )
}

function MDXThead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      {...props}
      className="bg-card border-b border-border"
    />
  )
}

function MDXTbody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className="divide-y divide-border/60" />
}

function MDXTr(props: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className="hover:bg-card/70 transition-colors"
    />
  )
}

function MDXTh(props: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-[10px] sm:text-xs text-muted whitespace-nowrap"
    />
  )
}

function MDXTd(props: HTMLAttributes<HTMLTableCellElement>) {
  const text = extractText(props.children as ReactNode)
  const numeric = isNumeric(text)
  const sign = detectSign(text)

  const base = 'px-3 py-2.5 align-top'
  const fontClass = numeric ? 'font-mono tabular-nums' : ''
  const colorClass =
    sign === 'positive'
      ? 'text-positive'
      : sign === 'negative'
        ? 'text-negative'
        : 'text-foreground/90'
  const alignClass = numeric ? 'text-right whitespace-nowrap' : 'text-left'

  return (
    <td
      {...props}
      className={`${base} ${fontClass} ${alignClass} ${colorClass}`}
    />
  )
}

// ---------- inline code & headings ----------

function MDXInlineCode(props: HTMLAttributes<HTMLElement>) {
  return (
    <code
      {...props}
      className="font-mono text-[0.85em] bg-card border border-border/80 rounded px-1.5 py-0.5 text-accent/90 before:content-none after:content-none"
    />
  )
}

function MDXH2(props: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      {...props}
      className="mt-14 mb-5 text-xl sm:text-2xl font-semibold tracking-tight border-l-2 border-accent/70 pl-3"
    />
  )
}

function MDXH3(props: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      {...props}
      className="mt-10 mb-3 text-base sm:text-lg font-semibold tracking-tight text-foreground/95"
    />
  )
}

function MDXBlockquote(props: HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      {...props}
      className="my-6 border-l-2 border-muted/60 pl-4 italic text-foreground/80 not-prose"
    />
  )
}

function MDXStrong(props: HTMLAttributes<HTMLElement>) {
  return <strong {...props} className="text-foreground font-semibold" />
}

// ---------- exported map ----------

export const mdxComponents = {
  table: MDXTable,
  thead: MDXThead,
  tbody: MDXTbody,
  tr: MDXTr,
  th: MDXTh,
  td: MDXTd,
  code: MDXInlineCode,
  h2: MDXH2,
  h3: MDXH3,
  blockquote: MDXBlockquote,
  strong: MDXStrong,
}
