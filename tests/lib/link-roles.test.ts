import { describe, it, expect } from 'vitest'
import { linkClass, LINK_ROLES } from '@/lib/link-roles'

// External review, 2026-09-23: "Tout les liens et autres phrases ne sont pas
// homogénéisé, certains sont en blanc, d'autres en violet, d'autres en vert,
// certains soutitrés, certains avec une flèche, d'autres soulignés, il faut
// changer ça, d'autres on ne sait même pas que c'est des liens cliquables".
//
// Measured by parsing the JSX of both apps: 245 links across 87 files, and
// 23 of them coloured `text-accent` with no underline and no hover at all —
// on a touch screen those carry no signal whatsoever that they are links.
describe('the four link roles', () => {
  it('is a closed set, so a role cannot be invented at a call site', () => {
    expect([...LINK_ROLES]).toEqual(['inline', 'nav', 'card', 'record', 'term'])
  })

  // `record` exists because the first migration proved four roles were not
  // enough: the catch-all sent an article title in an <h2>, a bot name in a
  // table cell and a venue name in a table to `inline`, which made whole
  // columns and every list heading indigo and underlined.
  //
  // It is NOT underlined, and that exception is deliberate. The rule that a
  // link must be underlined at rest comes from WCAG 1.4.1, whose concern is a
  // link inside a BLOCK OF TEXT, where colour alone would be the only thing
  // separating it from the prose around it. A record link is the sole
  // identifier of its row or card, and every one of its peers is a link too —
  // there is no surrounding non-link text to be distinguished from, and
  // underlining an entire column is noise, not an affordance.
  it('does not underline a record link, and that is on purpose', () => {
    expect(linkClass('record')).not.toMatch(/\bunderline\b/)
    expect(linkClass('record')).toMatch(/text-foreground/)
  })

  // The first migration lost this: the nav's current page fell back to
  // `text-muted` and was left distinguished by weight alone.
  //
  // It has to live in the role. Appending `text-foreground` at the call site
  // would leave `text-muted text-foreground` in one class attribute, and two
  // Tailwind utilities for the same property have equal specificity — the
  // order in the GENERATED CSS decides, not the order in the attribute. That
  // reads as working and is undefined.
  it('marks the current nav entry with a colour, not just a weight', () => {
    const idle = linkClass('nav')
    const active = linkClass('nav', undefined, { active: true })

    expect(idle).toMatch(/text-muted/)
    expect(active).toMatch(/text-foreground/)
    expect(active).not.toMatch(/text-muted/)
  })

  // The heart of the complaint. Hover is not a signal on a phone, and colour
  // alone fails both colour-blind readers and WCAG 1.4.1 ("Use of Color").
  it('underlines an inline link AT REST, not on hover', () => {
    const c = linkClass('inline')
    expect(c).toMatch(/\bunderline\b/)
    expect(c).not.toMatch(/hover:underline/)
  })

  it('never paints a link with the colour that means profit on these sites', () => {
    for (const role of LINK_ROLES) {
      expect(linkClass(role)).not.toMatch(/text-positive/)
    }
  })

  // A term opens a definition in place; it does not navigate. Dotted, and
  // inheriting its colour, so it cannot be mistaken for somewhere to go.
  it('marks a lexicon term as a definition, not a destination', () => {
    const c = linkClass('term')
    expect(c).toMatch(/decoration-dotted/)
    expect(c).not.toMatch(/text-accent/)
  })

  it('gives every role a visible keyboard focus', () => {
    for (const role of LINK_ROLES) {
      expect(linkClass(role)).toMatch(/focus-visible:/)
    }
  })

  it('appends call-site classes after the role, so layout stays local', () => {
    expect(linkClass('nav', 'mt-3 block')).toBe(`${linkClass('nav')} mt-3 block`)
  })

  it('returns the role alone when nothing is appended', () => {
    expect(linkClass('nav', undefined)).toBe(linkClass('nav'))
    expect(linkClass('nav', '')).toBe(linkClass('nav'))
  })
})
