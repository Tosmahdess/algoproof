import { describe, it, expect } from 'vitest'
import { groupByStrategy } from '@/lib/fleet-grouping'
import { mkBot } from '../fixtures/bots'

describe('groupByStrategy', () => {
  it('collapses incarnations of the same strategy into one group', () => {
    const groups = groupByStrategy([
      mkBot({ slug: 'a', strategy: 'ORB' }),
      mkBot({ slug: 'b', strategy: 'ORB' }),
      mkBot({ slug: 'c', strategy: 'EMA Cross' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find(g => g.label === 'ORB')!.bots).toHaveLength(2)
  })

  it('counts promoted bots separately from the group total', () => {
    const groups = groupByStrategy([
      mkBot({ strategy: 'ORB', status: 'live' }),
      mkBot({ strategy: 'ORB', status: 'paper' }),
      mkBot({ strategy: 'ORB', status: 'archived' }),
    ])
    expect(groups[0].bots).toHaveLength(3)
    expect(groups[0].promotedCount).toBe(2)
  })

  it('orders groups by size descending, then by label, so the order is stable', () => {
    const groups = groupByStrategy([
      mkBot({ strategy: 'Zeta' }),
      mkBot({ strategy: 'Alpha' }),
      mkBot({ strategy: 'Alpha' }),
    ])
    expect(groups.map(g => g.label)).toEqual(['Alpha', 'Zeta'])
  })

  it('is case- and whitespace-insensitive on the key but keeps the first label seen', () => {
    const groups = groupByStrategy([
      mkBot({ strategy: 'EMA Cross' }),
      mkBot({ strategy: '  ema cross ' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('EMA Cross')
  })

  it('buckets a bot with an empty strategy rather than dropping it', () => {
    const groups = groupByStrategy([mkBot({ strategy: '' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].bots).toHaveLength(1)
  })
})
