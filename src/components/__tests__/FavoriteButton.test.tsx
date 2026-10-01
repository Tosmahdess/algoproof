// The favorite star on a bot page (chantier espace-direct, lot A). The page is
// static (ISR): the star is the only part that knows who is reading, so it
// asks the identity project for the session after hydration and the lab API
// for the state. A guest never reaches the API; a failure never flips the
// star; the public page never depends on any of it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FavoriteButton from '../FavoriteButton'

const getSession = vi.fn()
vi.mock('@/lib/supabase-auth-browser', () => ({
  createSupabaseAuthBrowser: () => ({ auth: { getSession } }),
}))

const fetchMock = vi.fn()
beforeEach(() => {
  getSession.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function signedIn(token = 'jwt-a') {
  getSession.mockResolvedValue({ data: { session: { access_token: token } } })
}

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

describe('FavoriteButton', () => {
  it('a guest gets a sign-in link that brings them back here, and no API call', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    render(<FavoriteButton slug="v1-hl" />)
    const link = await screen.findByRole('link', { name: /Garder en favori/ })
    expect(link).toHaveAttribute('href', '/compte?next=%2Fstrategies%2Fbot%2Fv1-hl')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the state with the session token, never with a cookie', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, { favorite: true, kind: 'bot', slug: 'v1-hl' }))
    render(<FavoriteButton slug="v1-hl" />)
    const btn = await screen.findByRole('button', { name: /Dans mes favoris/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api-lab.algoproof.fr/me/favorites/bot/v1-hl')
    expect(init.headers.Authorization).toBe('Bearer jwt-a')
    expect(init.credentials).toBe('omit')
  })

  it('starring puts the bot in the favorites and points to Mon espace', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, { favorite: false, kind: 'bot', slug: 'v1-hl' }))
      .mockReturnValueOnce(reply(200, { favorite: true, kind: 'bot', slug: 'v1-hl' }))
    render(<FavoriteButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Garder en favori/ }))
    expect(await screen.findByRole('button', { name: /Dans mes favoris/ })).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT')
    expect(screen.getByRole('link', { name: 'Mon espace' })).toHaveAttribute(
      'href', expect.stringMatching(/^https:\/\/lab\.algoproof\.fr\/espace\?ref=/))
  })

  it('unstarring removes it', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, { favorite: true }))
      .mockReturnValueOnce(reply(200, { favorite: false }))
    render(<FavoriteButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Dans mes favoris/ }))
    expect(await screen.findByRole('button', { name: /Garder en favori/ })).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
  })

  it('a failed write keeps the previous state and says so', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, { favorite: false }))
      .mockReturnValueOnce(reply(503, { detail: 'down' }))
    render(<FavoriteButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Garder en favori/ }))
    expect(await screen.findByText(/pas pu être enregistré/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Garder en favori/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('a network error on write keeps the previous state too', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(200, { favorite: true }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<FavoriteButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Dans mes favoris/ }))
    expect(await screen.findByText(/pas pu être enregistré/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dans mes favoris/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('an expired session offers to sign in again instead of a dead star', async () => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(401, { detail: 'invalid token' }))
    render(<FavoriteButton slug="v1-hl" />)
    const link = await screen.findByRole('link', { name: /Garder en favori/ })
    expect(link).toHaveAttribute('href', '/compte?next=%2Fstrategies%2Fbot%2Fv1-hl')
  })

  it('a click asks for the session again, so a token refreshed since the page opened is used', async () => {
    // An access token lives an hour; the page can stay open longer. getSession()
    // refreshes it, but only if it is called: a token kept from mount would
    // turn a signed-in reader into a « guest » after an hour.
    getSession
      .mockResolvedValueOnce({ data: { session: { access_token: 'jwt-old' } } })
      .mockResolvedValue({ data: { session: { access_token: 'jwt-new' } } })
    fetchMock
      .mockReturnValueOnce(reply(200, { favorite: false }))
      .mockReturnValueOnce(reply(200, { favorite: true }))
    render(<FavoriteButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Garder en favori/ }))
    await screen.findByRole('button', { name: /Dans mes favoris/ })
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer jwt-new')
  })

  it('an unreadable state leaves a star that still works', async () => {
    signedIn()
    fetchMock
      .mockReturnValueOnce(reply(503, {}))
      .mockReturnValueOnce(reply(200, { favorite: true }))
    render(<FavoriteButton slug="v1-hl" />)
    fireEvent.click(await screen.findByRole('button', { name: /Garder en favori/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Dans mes favoris/ })).toBeInTheDocument())
  })
})

describe('FavoriteButton on a strategy or a company page (lot C)', () => {
  it.each([
    ['strategy', 'ema-cross', '/strategies/ema-cross'],
    ['company', 'xiaomi', '/investir/xiaomi'],
  ] as const)('%s: reads its own kind and brings a guest back to its page', async (kind, slug, path) => {
    signedIn()
    fetchMock.mockReturnValueOnce(reply(200, { favorite: false }))
    const { unmount } = render(<FavoriteButton slug={slug} kind={kind} />)
    await screen.findByRole('button', { name: /Garder en favori/ })
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api-lab.algoproof.fr/me/favorites/${kind}/${slug}`)
    unmount()
    getSession.mockResolvedValue({ data: { session: null } })
    render(<FavoriteButton slug={slug} kind={kind} />)
    expect(await screen.findByRole('link', { name: /Garder en favori/ }))
      .toHaveAttribute('href', `/compte?next=${encodeURIComponent(path)}`)
  })
})
