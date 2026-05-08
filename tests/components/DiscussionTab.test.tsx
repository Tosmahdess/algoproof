import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DiscussionTab from '@/components/DiscussionTab'

describe('DiscussionTab', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })

  it('shows loading state immediately', () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
    render(<DiscussionTab slug="v1-spot" />)
    expect(screen.getByText('Chargement...')).toBeDefined()
  })

  it('shows empty state when no comments', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
    render(<DiscussionTab slug="v1-spot" />)
    await waitFor(() => expect(screen.getByText(/aucune discussion/i)).toBeDefined())
  })

  it('renders fetched comments', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', pseudo: 'Alice', message: 'Super bot!', created_at: '2026-05-08T10:00:00Z' }],
    } as Response)
    render(<DiscussionTab slug="v1-spot" />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())
    expect(screen.getByText('Super bot!')).toBeDefined()
  })

  it('renders pseudo input and message textarea after loading', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
    render(<DiscussionTab slug="v1-spot" />)
    await waitFor(() => expect(screen.getByPlaceholderText('Pseudo')).toBeDefined())
    expect(screen.getByPlaceholderText('Votre question ou commentaire...')).toBeDefined()
  })

  it('submit button is disabled when fields are empty', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
    render(<DiscussionTab slug="v1-spot" />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /envoyer/i })
      expect(btn.getAttribute('disabled')).not.toBeNull()
    })
  })
})
