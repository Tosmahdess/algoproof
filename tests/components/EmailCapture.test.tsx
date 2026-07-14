import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EmailCapture from '@/components/EmailCapture'
import { trackEmailSubscribe } from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({ trackEmailSubscribe: vi.fn() }))

describe('EmailCapture', () => {
  beforeEach(() => {
    vi.mocked(trackEmailSubscribe).mockClear()
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
    ))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the email input and submit button', () => {
    render(<EmailCapture source="home" />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /me prévenir/i })).toBeInTheDocument()
  })

  it('posts the email with the source and shows the success state', async () => {
    render(<EmailCapture source="blog" />)
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /me prévenir/i }))

    await waitFor(() => {
      expect(screen.getByText(/c'est noté/i)).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenCalledWith('/api/subscribe', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', source: 'blog', website: '' }),
    }))
  })

  it('shows an error message when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'nope' }) })
    ))
    render(<EmailCapture source="home" />)
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /me prévenir/i }))

    await waitFor(() => {
      expect(screen.getByText(/réessaie/i)).toBeInTheDocument()
    })
  })

  it('does not submit an empty email', () => {
    render(<EmailCapture source="home" />)
    fireEvent.click(screen.getByRole('button', { name: /me prévenir/i }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fires email_subscribe with the source on success', async () => {
    render(<EmailCapture source="formation-waitlist" />)
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /me prévenir/i }))

    await waitFor(() => {
      expect(trackEmailSubscribe).toHaveBeenCalledWith('formation-waitlist')
    })
  })

  it('does not fire email_subscribe when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'nope' }) })
    ))
    render(<EmailCapture source="home" />)
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /me prévenir/i }))

    await waitFor(() => {
      expect(screen.getByText(/réessaie/i)).toBeInTheDocument()
    })
    expect(trackEmailSubscribe).not.toHaveBeenCalled()
  })
})
