import { describe, it, expect, vi, beforeEach } from 'vitest'

const createServerClient = vi.fn((..._args: unknown[]) => ({ auth: {} }))
const createBrowserClient = vi.fn((..._args: unknown[]) => ({ auth: {} }))
vi.mock('@supabase/ssr', () => ({ createServerClient, createBrowserClient }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))

describe('identity client', () => {
  beforeEach(() => {
    vi.resetModules()
    createServerClient.mockClear()
    createBrowserClient.mockClear()
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL = 'https://identity.example'
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY = 'identity-anon'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://content.example'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'content-anon'
  })

  it('uses the identity project, never the content project', async () => {
    const { createSupabaseAuthServer } = await import('@/lib/supabase-auth')
    await createSupabaseAuthServer()
    const [url, key] = createServerClient.mock.calls[0]
    expect(url).toBe('https://identity.example')
    expect(key).toBe('identity-anon')
  })

  it('names the cookie so it cannot collide with the lab cookie', async () => {
    const { createSupabaseAuthServer } = await import('@/lib/supabase-auth')
    await createSupabaseAuthServer()
    const opts = createServerClient.mock.calls[0][2] as { cookieOptions: { name: string } }
    expect(opts.cookieOptions.name).toBe('sb-algoproof-auth')
  })

  it('the browser client uses the identity project and the same cookie name', async () => {
    const { createSupabaseAuthBrowser } = await import('@/lib/supabase-auth-browser')
    createSupabaseAuthBrowser()
    const [url, key, opts] = createBrowserClient.mock.calls[0]
    expect(url).toBe('https://identity.example')
    expect(key).toBe('identity-anon')
    expect((opts as { cookieOptions: { name: string } }).cookieOptions.name).toBe('sb-algoproof-auth')
  })
})
