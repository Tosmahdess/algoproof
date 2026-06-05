import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', () => ({
  default: {
    existsSync: () => true,
    readdirSync: () => ['2026-06-06-new.mdx', '2026-06-04-mica.mdx', 'notes.txt'],
    readFileSync: (p: string) =>
      p.includes('new')
        ? '---\ntitle: Nouveau\ndate: 2026-06-06\nsummary: frais\ntags: [a]\ncategory: guide\n---\nbody'
        : '---\ntitle: MiCA\ndate: 2026-06-04\nsummary: crypto\ntags: []\ncategory: guide\n---\nbody',
  },
}))

import { GET } from '@/app/api/blog/route'

describe('GET /api/blog', () => {
  it('returns published posts sorted by date desc with url', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.map((p: any) => p.slug)).toEqual(['2026-06-06-new', '2026-06-04-mica'])
    expect(body[0]).toMatchObject({
      slug: '2026-06-06-new', title: 'Nouveau', date: '2026-06-06',
      summary: 'frais', url: '/blog/2026-06-06-new',
    })
  })
})
