import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Lot 8 of the design audit (2026-09-25): POST /api/hit writes one page_hits row
// with the service key (the table has no policy: anon can neither read nor write
// it). A crawler's hit is answered and dropped; a body that is not a hit is a
// 400; a missing service key is a silent 204, never a 500 on every page.
const insert = vi.fn(async (_row: Record<string, unknown>) => ({ error: null }))
const privileged = vi.fn((): unknown => ({ from: () => ({ insert }) }))
vi.mock('@/lib/supabase-privileged', () => ({ supabasePrivileged: () => privileged() }))

import { POST } from '@/app/api/hit/route'

function post(body: unknown, ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36') {
  return POST(new NextRequest('https://algoproof.fr/api/hit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': ua },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
}

beforeEach(() => {
  insert.mockClear()
  privileged.mockClear()
  privileged.mockImplementation(() => ({ from: () => ({ insert }) }))
})

describe('POST /api/hit', () => {
  it('writes the sanitised row and answers 204', async () => {
    const res = await post({ site: 'algoproof', path: '/overview', ref: 'Home-Hero', referrer_host: 'www.google.com' })
    expect(res.status).toBe(204)
    expect(insert).toHaveBeenCalledWith({ site: 'algoproof', path: '/overview', ref: 'home-hero', referrer_host: 'www.google.com' })
  })

  it('drops a crawler without writing, and still answers 204', async () => {
    const res = await post({ site: 'algoproof', path: '/overview' }, 'Mozilla/5.0 (compatible; Googlebot/2.1)')
    expect(res.status).toBe(204)
    expect(insert).not.toHaveBeenCalled()
  })

  it('refuses a body that is not a hit', async () => {
    expect((await post({ site: 'elsewhere', path: '/x' })).status).toBe(400)
    expect((await post('not json')).status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  it('answers 204 without writing when the service key is absent', async () => {
    privileged.mockImplementation(() => null)
    const res = await post({ site: 'lab', path: '/lab' })
    expect(res.status).toBe(204)
    expect(insert).not.toHaveBeenCalled()
  })

  it('never stores what the client did not declare: no IP, no user agent', async () => {
    await post({ site: 'algoproof', path: '/', extra: 'x', ip: '1.2.3.4' })
    const row = insert.mock.calls[0]![0]
    expect(Object.keys(row).sort()).toEqual(['path', 'ref', 'referrer_host', 'site'])
  })
})
