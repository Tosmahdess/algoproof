// src/components/mdx/box.tsx
//
// The one look of an article box (Callout, Verdict, DataCard, StatRow): a surface
// fill and a full 1 px rule, 8 px corners, no shadow, no coloured side border
// (DESIGN.md, « Cards / Containers »; finitions of 2026-10-03).
import type { ReactNode } from 'react'

export const BOX = 'not-prose rounded-lg border border-border bg-card px-4 py-3 sm:px-5 sm:py-4'

/** The text of a Callout or a Verdict. The first paragraph flows inline after the
 *  run-in label, so « À retenir : » opens the sentence instead of sitting above it. */
export const BOX_TEXT = 'text-sm text-foreground leading-relaxed [&>p:first-of-type]:inline '
  + '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_code]:font-mono [&_code]:text-xs '
  + '[&_code]:bg-card-2 [&_code]:text-foreground [&_strong]:text-foreground [&_strong]:font-semibold'

/** A label as the bold first words of a box: « À retenir : ». */
export function RunIn({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}{' :'}</strong>
}
