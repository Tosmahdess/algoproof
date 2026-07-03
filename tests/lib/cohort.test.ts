import { describe, it, expect } from 'vitest'
import { excludeArchived, splitCohorts } from '@/lib/cohort'
import type { BotStatus } from '@/lib/types'

const b = (status: BotStatus) => ({ slug: status, status })

describe('excludeArchived', () => {
  it('removes archived bots and keeps paper/live/backtest', () => {
    const out = excludeArchived([b('paper'), b('archived'), b('live'), b('backtest')])
    expect(out.map(x => x.status)).toEqual(['paper', 'live', 'backtest'])
  })

  it('returns the list unchanged when no bot is archived', () => {
    const out = excludeArchived([b('paper'), b('live')])
    expect(out).toHaveLength(2)
  })

  it('returns an empty array when every bot is archived', () => {
    expect(excludeArchived([b('archived'), b('archived')])).toEqual([])
  })
})

describe('splitCohorts', () => {
  it('buckets live, paper, and archived bots separately', () => {
    const out = splitCohorts([b('paper'), b('archived'), b('live'), b('backtest'), b('frozen')])
    expect(out.live.map(x => x.status)).toEqual(['live'])
    expect(out.paper.map(x => x.status)).toEqual(['paper', 'backtest', 'frozen'])
    expect(out.archived.map(x => x.status)).toEqual(['archived'])
  })

  it('returns empty buckets for an empty input', () => {
    const out = splitCohorts([])
    expect(out).toEqual({ live: [], paper: [], archived: [] })
  })
})
