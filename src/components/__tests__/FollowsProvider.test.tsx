// The bell on the fleet table (espace-direct lot H): ONE request for the whole
// table, a bell only on bots with a qualified producer, and only for a Direct
// account until the sale opens (lot J). Switching it off never asks for Direct.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const sale = vi.hoisted(() => ({ open: false }))
vi.mock('@/lib/direct-sale', () => ({ get DIRECT_SALE_OPEN() { return sale.open } }))

const getSession = vi.fn()
vi.mock('@/lib/supabase-auth-browser', () => ({
  createSupabaseAuthBrowser: () => ({ auth: { getSession } }),
}))

import { FollowsProvider, FollowBell } from '../FollowsProvider'

const fetchMock = vi.fn()
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))
const signedIn = () => getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })

beforeEach(() => {
  sale.open = false
  getSession.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const slugs = (n: number) => Array.from({ length: n }, (_, i) => `b${i}`)
const Rows = ({ n = 3 }: { n?: number }) => (
  <FollowsProvider slugs={slugs(n)}>
    {slugs(n).map((s, i) => <FollowBell key={s} slug={s} name={`Bot ${i}`} />)}
  </FollowsProvider>
)
const board = (direct: boolean | null, items: Record<string, unknown>) => ({ direct_access: direct, items })
const followable = (follow: unknown = null) => ({ followable: true, follow })
const off = { followable: false, follow: null }

describe('FollowsProvider + FollowBell', () => {
  it('asks the board once for 120 rows', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(true, { b1: followable() })))
    render(<Rows n={120} />)
    expect(await screen.findByRole('button', { name: 'Recevoir Bot 1 en direct' })).toHaveAttribute('aria-pressed', 'false')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/me\/follows\/board$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).slugs).toHaveLength(120)
    expect(init.headers.Authorization).toBe('Bearer t')
    expect(init.credentials).toBe('omit')
  })

  it('splits a table longer than 200 rows into bounded requests', async () => {
    signedIn()
    fetchMock.mockImplementation(() => reply(200, board(true, {})))
    render(<Rows n={450} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock.mock.calls.map(c => JSON.parse(c[1].body).slugs.length)).toEqual([200, 200, 50])
  })

  it('a bot without producer has no bell', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(true, { b0: off, b1: followable() })))
    render(<Rows n={2} />)
    await screen.findByRole('button', { name: 'Recevoir Bot 1 en direct' })
    expect(screen.queryByRole('button', { name: /Bot 0/ })).toBeNull()
  })

  it('a guest gets no bell and no request', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const { container } = render(<Rows />)
    await waitFor(() => expect(getSession).toHaveBeenCalled())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.textContent).toBe('')
  })

  it('an account without Direct sees no bell while the sale is closed', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(false, { b0: followable() })))
    const { container } = render(<Rows n={1} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(container.querySelector('button, a')).toBeNull()
  })

  it('once the sale opens, an account without Direct is pointed at the offer', async () => {
    sale.open = true
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(false, { b0: followable() })))
    render(<Rows n={1} />)
    const link = await screen.findByRole('link', { name: 'Recevoir Bot 0 en direct : offre Direct' })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/lab\.algoproof\.fr\/membre\?ref=/)
  })

  it('an outage of the capabilities shows the bell disabled, not hidden', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, board(null, { b0: followable() })))
    render(<Rows n={1} />)
    const bell = await screen.findByRole('button', { name: 'Recevoir Bot 0 en direct' })
    expect(bell).toBeDisabled()
  })

  it('a click switches the bell on with revision 0', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { b0: followable() })))
      .mockReturnValueOnce(reply(200, { slug: 'b0', follow: { enabled: true, noise: 'all', revision: 1 } }))
    render(<Rows n={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir Bot 0 en direct' }))
    expect(await screen.findByRole('button', { name: 'Ne plus recevoir Bot 0' })).toHaveAttribute('aria-pressed', 'true')
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toMatch(/\/me\/follows\/bot\/b0$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ enabled: true, expected_revision: 0 })
  })

  it('switching off sends the revision it holds', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { b0: followable({ enabled: true, noise: 'daily', revision: 4 }) })))
      .mockReturnValueOnce(reply(200, { slug: 'b0', follow: { enabled: false, noise: 'daily', revision: 5 } }))
    render(<Rows n={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ne plus recevoir Bot 0' }))
    await screen.findByRole('button', { name: 'Recevoir Bot 0 en direct' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ enabled: false, expected_revision: 4 })
  })

  it('a stale revision takes the row the server holds', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { b0: followable() })))
      .mockReturnValueOnce(reply(409, { detail: { current: { enabled: true, noise: 'all', revision: 2 } } }))
    render(<Rows n={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir Bot 0 en direct' }))
    expect(await screen.findByRole('button', { name: 'Ne plus recevoir Bot 0' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('a failed click leaves the bell as it was', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { b0: followable() })))
      .mockReturnValueOnce(reply(503, {}))
    render(<Rows n={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir Bot 0 en direct' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Recevoir Bot 0 en direct' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('never touches a favorite', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, board(true, { b0: followable() })))
      .mockReturnValueOnce(reply(200, { slug: 'b0', follow: { enabled: true, noise: 'all', revision: 1 } }))
    render(<Rows n={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir Bot 0 en direct' }))
    await screen.findByRole('button', { name: 'Ne plus recevoir Bot 0' })
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('/favorites'))).toBe(false)
  })

  it('outside a provider, a bell renders nothing', () => {
    const { container } = render(<FollowBell slug="b0" name="Bot 0" />)
    expect(container.textContent).toBe('')
  })
})
