import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// One mutable state object drives the mocked Supabase client, so each test says
// what production would have returned rather than rebuilding a chainable mock.
const db = {
  count: 0 as number | null,
  countError: null as { message: string } | null,
  insertError: null as { message: string; code?: string } | null,
  inserted: [] as unknown[],
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => ({
      select: () => ({
        gte: async () => ({ count: db.count, error: db.countError }),
      }),
      insert: async (row: unknown) => {
        db.inserted.push(row)
        return { error: db.insertError }
      },
    }),
  },
}))

const fakeRequest = (body: unknown, origin?: string) =>
  ({
    json: async () => body,
    headers: { get: (k: string) => (k.toLowerCase() === 'origin' ? (origin ?? null) : null) },
  }) as never

const COMMENT = { bot_slug: 'v1-spot', pseudo: 'kura', message: 'salut' }
const SUB = { email: 'a@b.fr', source: 'home' }

let telegramCalls = 0

beforeEach(() => {
  db.count = 0
  db.countError = null
  db.insertError = null
  db.inserted = []
  telegramCalls = 0
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'tok')
  vi.stubEnv('TELEGRAM_COMMENTS_CHAT_ID', 'chat')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      telegramCalls += 1
      return new Response('{}')
    }),
  )
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('POST /api/comments — burst guard', () => {
  it('accepts and inserts while the window is under the ceiling', async () => {
    db.count = 29
    const { POST } = await import('@/app/api/comments/route')
    const res = await POST(fakeRequest(COMMENT))
    expect(res.status).toBe(201)
    expect(db.inserted).toHaveLength(1)
  })

  it('refuses with 429 at the ceiling and inserts nothing', async () => {
    db.count = 30
    const { POST } = await import('@/app/api/comments/route')
    const res = await POST(fakeRequest(COMMENT))
    expect(res.status).toBe(429)
    expect(db.inserted).toHaveLength(0)
    expect(telegramCalls).toBe(0)
  })

  it('fails CLOSED when the window cannot be counted — a comment is published on insert', async () => {
    db.count = null
    db.countError = { message: 'connection reset' }
    const { POST } = await import('@/app/api/comments/route')
    const res = await POST(fakeRequest(COMMENT))
    expect(res.status).toBe(429)
    expect(db.inserted).toHaveLength(0)
  })

  it('answers in French, so the message can be shown as-is', async () => {
    db.count = 30
    const { POST } = await import('@/app/api/comments/route')
    const body = await (await POST(fakeRequest(COMMENT))).json()
    expect(body.error).toMatch(/Réessaie dans quelques minutes/)
  })
})

describe('POST /api/subscribe — burst guard', () => {
  it('accepts, inserts and notifies while under the ceiling', async () => {
    db.count = 0
    const { POST } = await import('@/app/api/subscribe/route')
    const res = await POST(fakeRequest(SUB, 'https://algoproof.fr'))
    expect(res.status).toBe(201)
    expect(db.inserted).toHaveLength(1)
    expect(telegramCalls).toBe(1)
  })

  it('refuses with 429 at the ceiling and inserts nothing', async () => {
    db.count = 30
    const { POST } = await import('@/app/api/subscribe/route')
    const res = await POST(fakeRequest(SUB, 'https://algoproof.fr'))
    expect(res.status).toBe(429)
    expect(db.inserted).toHaveLength(0)
    expect(telegramCalls).toBe(0)
  })

  it('fails OPEN on an uncountable window but suppresses the notification', async () => {
    db.count = null
    db.countError = { message: 'connection reset' }
    const { POST } = await import('@/app/api/subscribe/route')
    const res = await POST(fakeRequest(SUB, 'https://algoproof.fr'))
    expect(res.status).toBe(201)
    expect(db.inserted).toHaveLength(1)
    expect(telegramCalls).toBe(0)
  })

  it('still short-circuits the honeypot before touching the database', async () => {
    db.count = 30
    const { POST } = await import('@/app/api/subscribe/route')
    const res = await POST(fakeRequest({ ...SUB, website: 'spam' }, 'https://algoproof.fr'))
    expect(res.status).toBe(201)
    expect(db.inserted).toHaveLength(0)
  })
})
