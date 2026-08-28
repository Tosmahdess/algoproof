import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MagicLinkForm } from '@/components/MagicLinkForm'

const signInWithOtp = vi.fn((..._args: unknown[]) => Promise.resolve({ error: null as { message: string } | null }))
vi.mock('@/lib/supabase-auth-browser', () => ({
  createSupabaseAuthBrowser: () => ({ auth: { signInWithOtp } }),
}))

describe('MagicLinkForm', () => {
  beforeEach(() => signInWithOtp.mockClear())

  it('sends the link and confirms it, in the first person', async () => {
    render(<MagicLinkForm redirectTo="/wealth" />)
    fireEvent.change(screen.getByPlaceholderText('ton@email.com'), {
      target: { value: 'lecteur@example.com' },
    })
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalled())
    const arg = signInWithOtp.mock.calls[0][0] as {
      email: string
      options: { emailRedirectTo: string }
    }
    expect(arg.email).toBe('lecteur@example.com')
    expect(arg.options.emailRedirectTo).toContain('/auth/callback?next=%2Fwealth')
    expect(await screen.findByText(/je t/i)).toBeTruthy()
  })

  it('says so when the link cannot be sent', async () => {
    signInWithOtp.mockResolvedValueOnce({ error: { message: 'boom' } })
    render(<MagicLinkForm redirectTo="/wealth" />)
    fireEvent.change(screen.getByPlaceholderText('ton@email.com'), {
      target: { value: 'lecteur@example.com' },
    })
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText(/pas pu/i)).toBeTruthy()
  })
})
