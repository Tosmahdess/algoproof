import { describe, it, expect, vi } from 'vitest'
import { getEntitlement } from '@/lib/entitlement'

type Row = { status: string } | null

// A real filter, not a conveyor belt: eq/in record what they were called with,
// and maybeSingle only returns the seeded row if the recorded filters would
// actually have selected it. This is what makes a wrong query (e.g. dropping
// 'trialing', or filtering the wrong user_id) show up as a failing test instead
// of silently passing.
function client(
  user: { id: string } | null,
  row: Row,
  limitSpy = vi.fn(),
) {
  const recorded: { eq: Record<string, unknown>; in: Record<string, unknown[]> } = {
    eq: {},
    in: {},
  }
  const chain = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      recorded.eq[column] = value
      return chain
    },
    in: (column: string, values: unknown[]) => {
      recorded.in[column] = values
      return chain
    },
    limit: (n: number) => {
      limitSpy(n)
      return chain
    },
    maybeSingle: async () => {
      if (!row) return { data: null }
      const userIdMatches = user !== null && recorded.eq['user_id'] === user.id
      const statusValues = recorded.in['status']
      const statusMatches = Array.isArray(statusValues) && statusValues.includes(row.status)
      return { data: userIdMatches && statusMatches ? row : null }
    },
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
  it('queries the status filter with exactly active and trialing', async () => {
    let recordedStatusValues: unknown[] | undefined
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: (_column: string, values: unknown[]) => {
        recordedStatusValues = values
        return chain
      },
      limit: () => chain,
      maybeSingle: async () => ({ data: null }),
    }
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => chain,
    } as never
    await getEntitlement(supabase)
    expect(recordedStatusValues).toEqual(['active', 'trialing'])
  })
  it('queries the user filter with the signed-in user id', async () => {
    let recordedUserIdValue: unknown
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        if (column === 'user_id') recordedUserIdValue = value
        return chain
      },
      in: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null }),
    }
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: 'u42' } } }) },
      from: () => chain,
    } as never
    await getEntitlement(supabase)
    expect(recordedUserIdValue).toBe('u42')
  })
  it('free when the only row has a status outside active/trialing', async () => {
    expect(await getEntitlement(client({ id: 'u1' }, { status: 'canceled' }))).toBe('free')
  })
})
