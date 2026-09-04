import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

/**
 * The four prose columns are the analysis a member pays for, and they were
 * readable by anyone holding the anon key: `equity_fiches` carries
 * `FOR SELECT USING (true)` and the paywall lived only in the Next page.
 *
 * The rollout has an order. This client ships first and FALLS BACK to the anon
 * client, so nothing breaks while the service-role key is still absent from
 * Vercel; migration 041 revokes the columns afterwards. Getting that order
 * wrong empties the paid analyses for the people who are paying.
 */
describe('supabasePrivileged', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns a client when the service-role key is configured', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    const { supabasePrivileged } = await import('@/lib/supabase-privileged')
    expect(supabasePrivileged()).not.toBeNull()
  })

  it('returns null and says why when the key is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { supabasePrivileged } = await import('@/lib/supabase-privileged')
    expect(supabasePrivileged()).toBeNull()
    expect(String(error.mock.calls[0][0])).toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('names the consequence, not just the variable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { supabasePrivileged } = await import('@/lib/supabase-privileged')
    supabasePrivileged()
    expect(String(error.mock.calls[0][0])).toMatch(/anon key/)
  })

  it('returns null when the url is missing too, rather than building half a client', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    const { supabasePrivileged } = await import('@/lib/supabase-privileged')
    expect(supabasePrivileged()).toBeNull()
  })

  it('decides once, so the log is not repeated on every render', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { supabasePrivileged } = await import('@/lib/supabase-privileged')
    supabasePrivileged()
    supabasePrivileged()
    supabasePrivileged()
    expect(error).toHaveBeenCalledOnce()
  })
})
