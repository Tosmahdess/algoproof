import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const path = { value: '/' }
vi.mock('next/navigation', () => ({ usePathname: () => path.value }))
vi.mock('@/lib/analytics', () => ({ trackCtaLab: vi.fn(), trackOutboundExchange: vi.fn() }))

const { default: Nav } = await import('@/components/Nav')

// Review finding, 2026-09-23. The mobile menu closed itself inside the link's
// own onClick, and the menu is rendered behind `{mobileOpen && …}` — so the
// <Link> and the LinkPending inside it were UNMOUNTED by the click, before
// `pending` could ever become true.
//
// The spinner was therefore impossible to see on a phone: the one device where
// the wait is long enough to matter, and the reason the feature exists. The
// existing Nav test asserted the hint was PRESENT, which it was; presence is
// not visibility, and that test passed over a dead feature.
//
// The menu now closes when the navigation actually commits (the pathname
// changes), so the link stays mounted for the whole pending window.
describe('the mobile menu during a navigation', () => {
  beforeEach(() => { path.value = '/' })

  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /menu/i }))

  // Scoped to the mobile panel on purpose: « La flotte » also exists in the
  // desktop dropdown, which is always mounted. An unscoped query would have
  // found the desktop copy and reported the mobile one as still present.
  const menu = () => screen.queryByTestId('mobile-menu')
  const entry = () => {
    const m = menu()
    return m ? within(m).queryByRole('link', { name: /la flotte/i }) : null
  }

  it('keeps the clicked link mounted, so its spinner can be shown', () => {
    render(<Nav />)
    openMenu()
    const link = entry()
    expect(link).not.toBeNull()

    fireEvent.click(link!)

    // Still there: the hint inside it is what tells the reader the tap landed.
    expect(entry()).not.toBeNull()
    expect(entry()!.querySelector('[data-testid="link-pending"]')).not.toBeNull()
  })

  it('closes once the navigation has actually landed', () => {
    const { rerender } = render(<Nav />)
    openMenu()
    fireEvent.click(entry()!)

    path.value = '/overview'
    rerender(<Nav />)

    expect(menu()).toBeNull()
  })

  // link-roles.ts documents the nav role as "marked by aria-current='page' plus
  // text-foreground, never by colour alone". The colour half was implemented;
  // the aria half was a sentence in a comment and nowhere else, so a screen
  // reader read the nav as a row of identical links.
  it('announces which nav entry is the current page', () => {
    path.value = '/blog'
    render(<Nav />)

    const current = screen.getAllByRole('link', { name: /apprendre/i })
      .find(a => a.getAttribute('href') === '/blog')!
    const other = screen.getAllByRole('link', { name: /investir/i })
      .find(a => a.getAttribute('href') === '/investir')!

    expect(current).toHaveAttribute('aria-current', 'page')
    expect(other).not.toHaveAttribute('aria-current')
  })

  // An external entry leaves the site: no pathname change will ever come, so
  // the menu has to close on the click or it stays open behind the new tab.
  it('still closes on an entry that leaves the site', () => {
    render(<Nav />)
    openMenu()
    const external = within(menu()!).getByRole('link', { name: /ouvrir le labo/i })

    fireEvent.click(external)

    expect(menu()).toBeNull()
  })
})
