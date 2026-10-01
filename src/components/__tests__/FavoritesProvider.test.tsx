// The fleet page lists ~120 bots: one star per row, but ONE request for the
// whole page (espace-direct lot C). A star outside a provider renders nothing,
// so a table reused elsewhere never fires a request per row.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FavoritesProvider, FavoriteStar } from '../FavoritesProvider'

const getSession = vi.fn()
vi.mock('@/lib/supabase-auth-browser', () => ({
  createSupabaseAuthBrowser: () => ({ auth: { getSession } }),
}))

const fetchMock = vi.fn()
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  window.history.replaceState({}, '', '/overview')
  getSession.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const Rows = ({ n = 3 }: { n?: number }) => (
  <FavoritesProvider kind="bot">
    {Array.from({ length: n }, (_, i) => <FavoriteStar key={i} kind="bot" slug={`b${i}`} name={`Bot ${i}`} />)}
  </FavoritesProvider>
)

describe('FavoritesProvider + FavoriteStar', () => {
  it('reads every favorite in one request, whatever the number of rows', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    fetchMock.mockReturnValueOnce(reply(200, { items: [{ slug: 'b1' }], total: 1, next_cursor: null }))
    render(<Rows n={40} />)
    expect(await screen.findByRole('button', { name: 'Retirer Bot 1 de mes favoris' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Garder Bot 0 en favori' })).toHaveAttribute('aria-pressed', 'false')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/me\/favorites\?kind=bot/)
  })

  it('a click stars one row and leaves the others alone', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    fetchMock
      .mockReturnValueOnce(reply(200, { items: [], total: 0, next_cursor: null }))
      .mockReturnValueOnce(reply(200, { favorite: true }))
    render(<Rows />)
    fireEvent.click(await screen.findByRole('button', { name: 'Garder Bot 2 en favori' }))
    expect(await screen.findByRole('button', { name: 'Retirer Bot 2 de mes favoris' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/me\/favorites\/bot\/b2$/)
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT')
    expect(screen.getByRole('button', { name: 'Garder Bot 0 en favori' })).toBeInTheDocument()
  })

  it('a failed click keeps the star as it was', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    fetchMock
      .mockReturnValueOnce(reply(200, { items: [], total: 0, next_cursor: null }))
      .mockReturnValueOnce(reply(503, {}))
    render(<Rows />)
    fireEvent.click(await screen.findByRole('button', { name: 'Garder Bot 0 en favori' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Garder Bot 0 en favori' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('a guest gets sign-in links back to this page, and no request', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    render(<Rows />)
    const link = await screen.findByRole('link', { name: 'Garder Bot 0 en favori' })
    expect(link).toHaveAttribute('href', '/compte?next=%2Foverview')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('outside a provider, a star renders nothing and asks nothing', () => {
    const { container } = render(<FavoriteStar kind="bot" slug="b0" name="Bot 0" />)
    expect(container.textContent).toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
