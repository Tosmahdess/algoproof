// tests/app/home-wave-generation.test.tsx
//
// « Le 21 août, N stratégies sorties de mon moteur sont entrées en simulation »
// sat on the homepage while the cockpit said « aucune n'est encore branchée ».
// Both were true, about two different generations of the engine, and neither
// said so. The homepage sentence now names its generation: the August engine,
// corrected since, which will judge these strategies again.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../fixtures/bots'

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => [
    mkBot({ slug: 'arm-a-h4-head00', origin: 'engine', engine_unit_key: 'HMAcross|H4|data_20260802|3' }),
    mkBot({ slug: 'arm-b-d1-head00', origin: 'engine', engine_unit_key: 'KeltnerBreak|D1|data_20260802|3' }),
    mkBot({ slug: 'v1-spot', origin: 'manual', engine_unit_key: null }),
  ],
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => null,
}))

import HomePage from '@/app/page'

describe('/ — the wave-1 sentence names its engine generation', () => {
  it('says the wave came from the August engine, corrected since', async () => {
    render(await HomePage())
    const card = screen.getByRole('heading', { name: 'Les derniers arrivés' }).closest('a')!
    expect(card).toHaveTextContent(/Le 21 août, 2 stratégies/)
    expect(card).toHaveTextContent(/version d.août de mon moteur/)
    expect(card).toHaveTextContent(/corrigé/)
    expect(card).toHaveTextContent(/rejuger/)
  })
})
