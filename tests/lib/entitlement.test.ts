import { describe, it, expect, vi } from 'vitest'
import { getEntitlement } from '@/lib/entitlement'

type Row = { status: string } | null

function client(user: { id: string } | null, row: Row, limitSpy = vi.fn()) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    limit: (n: number) => { limitSpy(n); return chain },
    maybeSingle: async () => ({ data: row }),
  }
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => chain,
  } as never
}

describe('getEntitlement', () => {
  it('guest when there is no session', async () => {
    expect(await getEntitlement(client(null, null))).toBe('guest')
  })
  it('free when signed in without an active subscription', async () => {
    expect(await getEntitlement(client({ id: 'u1' }, null))).toBe('free')
  })
  it('paid when a subscription row comes back', async () => {
    expect(await getEntitlement(client({ id: 'u1' }, { status: 'active' }))).toBe('paid')
  })
  it('paid on a 7-day trial', async () => {
    expect(await getEntitlement(client({ id: 'u1' }, { status: 'trialing' }))).toBe('paid')
  })
  it('limits to one row, so a re-subscriber with two rows is not read as free', async () => {
    const limitSpy = vi.fn()
    await getEntitlement(client({ id: 'u1' }, { status: 'active' }, limitSpy))
    expect(limitSpy).toHaveBeenCalledWith(1)
  })
})
