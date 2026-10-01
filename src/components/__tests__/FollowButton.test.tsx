// The bell on a bot page (espace-direct lot H). Same rules as the table's:
// Direct only while the sale is closed, disabled during an outage, revision sent.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const sale = vi.hoisted(() => ({ open: false }))
vi.mock('@/lib/direct-sale', () => ({ get DIRECT_SALE_OPEN() { return sale.open } }))

const getSession = vi.fn()
vi.mock('@/lib/supabase-auth-browser', () => ({
  createSupabaseAuthBrowser: () => ({ auth: { getSession } }),
}))

import FollowButton from '../FollowButton'

const fetchMock = vi.fn()
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))
const signedIn = () => getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
const board = (direct: boolean | null, item: unknown) => ({ direct_access: direct, items: { 'v1-hl': item } })

beforeEach(() => {
  sale.open = false
  getSession.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('FollowButton', () => {
  it('a Direct member follows the bot from its page', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { followable: true, follow: null })))
      .mockReturnValueOnce(reply(200, { slug: 'v1-hl', follow: { enabled: true, noise: 'all', revision: 1 } }))
    render(<FollowButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Suivre en direct/ }))
    expect(await screen.findByRole('button', { name: /Suivi en direct/ })).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ slugs: ['v1-hl'] })
    expect(screen.getByRole('link', { name: 'Régler' }).getAttribute('href')).toMatch(/^https:\/\/lab\.algoproof\.fr\/espace\?ref=.*#suivis$/)
  })

  it('renders nothing for a guest', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const { container } = render(<FollowButton slug="v1-hl" />)
    await waitFor(() => expect(getSession).toHaveBeenCalled())
    expect(container.textContent).toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renders nothing for a bot without producer', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(true, { followable: false, follow: null })))
    const { container } = render(<FollowButton slug="v1-hl" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(container.querySelector('button, a')).toBeNull()
  })

  it('renders nothing without Direct while the sale is closed', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(false, { followable: true, follow: null })))
    const { container } = render(<FollowButton slug="v1-hl" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(container.querySelector('button, a')).toBeNull()
  })

  it('points at the offer once the sale opens', async () => {
    sale.open = true
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(false, { followable: true, follow: null })))
    render(<FollowButton slug="v1-hl" />)
    expect((await screen.findByRole('link', { name: /Suivre en direct/ })).getAttribute('href')).toMatch(/\/membre\?ref=/)
  })

  it('is disabled during an outage', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(null, { followable: true, follow: null })))
    render(<FollowButton slug="v1-hl" />)
    expect(await screen.findByRole('button', { name: /Suivre en direct/ })).toBeDisabled()
  })

  it('a refused write says so and keeps the state', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { followable: true, follow: null })))
      .mockReturnValueOnce(reply(503, {}))
    render(<FollowButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Suivre en direct/ }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Suivre en direct/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
