import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import BotTable from '@/components/BotTable'
import { mkBot } from '../fixtures/bots'
import type { FleetBot } from '@/lib/types'

// Lot 4 of the design audit (2026-09-25, conception §5.2 and §6.3): the table
// carries a 30-day sparkline per row when the row brings one, and no rank. On a
// phone a row is name · status · % · three metrics, never a « #1 ».
const stats = (total_trades: number, latest_capital = 1000) =>
  ({ total_trades, win_rate: 0.5, profit_factor: 1.2, max_drawdown: 0.05, latest_capital })
const spark = Array.from({ length: 12 }, (_, i) => 1000 + i * 2)
const withSpark: FleetBot = { ...mkBot({ name: 'Bot Étincelle', stats: { total_trades: 40, profit_factor: 1.3, win_rate: 0.5, max_drawdown: 0.08, latest_capital: 1022 } }), spark30: spark }
const withoutSpark: FleetBot = mkBot({ name: 'Bot Sans Courbe', stats: stats(25, 990) })

describe('BotTable', () => {
  it('draws a 30-day sparkline on the rows that carry one, in the colour of the gain', () => {
    render(<BotTable bots={[withSpark, withoutSpark]} showTf />)
    const cells = screen.getAllByTestId('bot-spark')
    expect(cells).toHaveLength(2)
    expect(cells[0].querySelector('svg')).not.toBeNull()
    expect(cells[0].className).toMatch(/text-positive/)
    expect(cells[1].querySelector('svg')).toBeNull()
  })

  it('heads the sparkline column « 30 j » and shows the timeframe column when asked', () => {
    render(<BotTable bots={[withSpark]} showTf />)
    const headers = screen.getAllByRole('columnheader').map(th => th.textContent)
    expect(headers).toContain('30 j')
    expect(headers).toContain('TF')
  })

  it('ranks nothing: no « #n » on any row', () => {
    const { container } = render(<BotTable bots={[withSpark, withoutSpark]} showTf />)
    expect(container.textContent).not.toMatch(/#\d/)
  })

  it('gives a phone row its three metrics after the status and the figure', () => {
    const { container } = render(<BotTable bots={[withSpark]} showTf />)
    const row = container.querySelector('.bot-table-mobile a[href="/strategies/bot/' + withSpark.slug + '"]')!
    // fmtDrawdown writes a narrow no-break space before %: compared on a plain space.
    const text = row.textContent!.replace(/\u202F/g, ' ')
    expect(text).toMatch(/40 trades/)
    expect(text).toMatch(/PF 1,30/)
    expect(text).toMatch(/DD 8,0 %/)
    // status word, then the percent figure, then the metrics
    expect(text.indexOf('Simulation')).toBeLessThan(text.indexOf('%'))
    expect(text.indexOf('%')).toBeLessThan(text.indexOf('trades'))
  })
})
