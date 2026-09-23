import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const pending = { value: false }
vi.mock('next/link', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useLinkStatus: () => ({ pending: pending.value }),
}))

const { default: LinkPending } = await import('@/components/LinkPending')

// Next's own docs warn that an inline pending indicator "can easily introduce
// layout shifts" and to "prefer a fixed-size, always-rendered hint element and
// toggle its opacity". A hint that mounts on click would push the nav label
// sideways at the exact moment the visitor is reading it — the cure making the
// complaint worse.
describe('the nav pending hint', () => {
  it('occupies its space before anything is pending, so the label never moves', () => {
    pending.value = false
    const { container } = render(<LinkPending />)
    const hint = container.querySelector('[data-testid="link-pending"]')
    expect(hint).not.toBeNull()
    expect(hint!.className).toContain('opacity-0')
  })

  it('becomes visible while the navigation is pending', () => {
    pending.value = true
    const { container } = render(<LinkPending />)
    const hint = container.querySelector('[data-testid="link-pending"]')!
    expect(hint.className).not.toContain('opacity-0')
  })

  it('announces the wait rather than being a silent dot', () => {
    pending.value = true
    render(<LinkPending />)
    expect(screen.getByRole('status')).toHaveAccessibleName(/chargement/i)
  })

  it('says nothing to assistive tech while idle', () => {
    pending.value = false
    render(<LinkPending />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
