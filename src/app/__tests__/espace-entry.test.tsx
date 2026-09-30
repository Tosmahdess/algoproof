// Mon espace from algoproof.fr (chantier espace-direct, lot A): the space
// lives on the lab, so the site only redirects there, and the star on a bot
// page brings a guest back to that page after the magic link.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'

const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`) })
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return { ...actual, redirect: (url: string) => redirect(url) }
})

let entitlement = 'guest'
vi.mock('@/lib/supabase-auth', () => ({ createSupabaseAuthServer: async () => ({}) }))
vi.mock('@/lib/entitlement', () => ({ getEntitlement: async () => entitlement }))
vi.mock('@/components/MagicLinkForm', () => ({
  MagicLinkForm: ({ redirectTo }: { redirectTo: string }) => <p data-testid="magic">{redirectTo}</p>,
}))
vi.mock('@/components/FavoriteButton', () => ({
  default: ({ slug }: { slug: string }) => <p data-testid="star">{slug}</p>,
}))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => mkBot({ slug: 'v1-hl' }),
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', () => ({ getProvenanceForBot: async () => null }))

beforeEach(() => {
  redirect.mockClear()
  entitlement = 'guest'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

describe('/espace on the site', () => {
  it('redirects to the lab without carrying anything but a ref', async () => {
    const { default: EspacePage } = await import('@/app/espace/page')
    expect(() => EspacePage()).toThrow('REDIRECT https://lab.algoproof.fr/espace?ref=site-espace')
  })
})

describe('/compte brings a guest back where they came from', () => {
  it('passes a relative next to the magic link', async () => {
    const { default: ComptePage } = await import('@/app/compte/page')
    render(await ComptePage({ searchParams: Promise.resolve({ next: '/strategies/bot/v1-hl' }) }))
    expect(screen.getByTestId('magic')).toHaveTextContent('/strategies/bot/v1-hl')
  })

  it('refuses an absolute next and keeps the old landing page', async () => {
    const { default: ComptePage } = await import('@/app/compte/page')
    render(await ComptePage({ searchParams: Promise.resolve({ next: 'https://evil.example/x' }) }))
    expect(screen.getByTestId('magic')).toHaveTextContent(/^\/investir$/)
  })

  it('a reader already signed in is sent straight back to next', async () => {
    entitlement = 'free'
    const { default: ComptePage } = await import('@/app/compte/page')
    await expect(ComptePage({ searchParams: Promise.resolve({ next: '/strategies/bot/v1-hl' }) }))
      .rejects.toThrow('REDIRECT /strategies/bot/v1-hl')
  })

  it('a signed-in reader without next stays on the account page', async () => {
    entitlement = 'free'
    const { default: ComptePage } = await import('@/app/compte/page')
    render(await ComptePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/Tu es connecté/)).toBeInTheDocument()
  })

  it('without next, lands on /investir as before', async () => {
    const { default: ComptePage } = await import('@/app/compte/page')
    render(await ComptePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('magic')).toHaveTextContent(/^\/investir$/)
  })
})

describe('the bot page carries the star', () => {
  it('in its header, for this bot', async () => {
    const { default: StrategyPage } = await import('@/app/strategies/bot/[slug]/page')
    render(await StrategyPage({ params: Promise.resolve({ slug: 'v1-hl' }) }))
    const header = screen.getByTestId('bot-header')
    expect(header).toContainElement(screen.getByTestId('star'))
    expect(screen.getByTestId('star')).toHaveTextContent('v1-hl')
  }, 60_000)  // the first import of the bot page transforms its whole tree
})
