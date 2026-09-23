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
  it('has exactly four, so a fifth cannot be invented at a call site', () => {
    expect([...LINK_ROLES]).toEqual(['inline', 'nav', 'card', 'term'])
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
