import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import BotTable from '@/components/BotTable'
import { mkBot } from '../fixtures/bots'
import type { ListBot } from '@/lib/types'

// Lot 4 of the design audit (2026-09-25, conception §5.2 and §6.3): the table
// carries a 30-day sparkline per row when the row brings one, and no rank. On a
// phone a row is name · status · % · three metrics, never a « #1 ».
const stats = (total_trades: number, latest_capital = 1000) =>
  ({ total_trades, win_rate: 0.5, profit_factor: 1.2, max_drawdown: 0.05, latest_capital })
const spark = Array.from({ length: 12 }, (_, i) => 1000 + i * 2)
const withSpark: ListBot = { ...mkBot({ name: 'Bot Étincelle', stats: { total_trades: 40, profit_factor: 1.3, win_rate: 0.5, max_drawdown: 0.08, latest_capital: 1022 } }), spark30: spark }
const withoutSpark: ListBot = mkBot({ name: 'Bot Sans Courbe', stats: stats(25, 990) })

describe('BotTable', () => {
  // Refonte « registre », lot 4 (2026-10-02): the line was drawn in the colour of
  // the result since the start, a figure it does not show (audit 2026-10, n° 6
  // and 8). It is drawn in the note colour now, and not at all without a trade.
  it('draws a 30-day sparkline on the rows that carry one, in the note colour, never the result’s', () => {
    const untraded: ListBot = { ...mkBot({ name: 'Bot Muet', stats: stats(0, 1000) }), spark30: spark }
    const losing: ListBot = { ...mkBot({ name: 'Bot Perdant', stats: stats(30, 900) }), spark30: spark }
    render(<BotTable bots={[withSpark, withoutSpark, untraded, losing]} showTf />)
    const cells = screen.getAllByTestId('bot-spark')
    expect(cells).toHaveLength(4)
    expect(cells[0].querySelector('svg')).not.toBeNull()
    for (const cell of cells) expect(cell.className).not.toMatch(/text-positive|text-negative/)
    expect(cells[1].querySelector('svg')).toBeNull()
    expect(cells[2].querySelector('svg')).toBeNull()
    expect(cells[3].querySelector('svg')).not.toBeNull()
  })

  it('writes « 1 trade », not « 1 trades », on a phone row', () => {
    const { container } = render(<BotTable bots={[mkBot({ name: 'Bot Un', stats: stats(1, 1010) })]} showTf={false} />)
    const row = container.querySelector('.bot-table-mobile')!
    expect(row.textContent).toMatch(/· 1 trade ·/)
    expect(row.textContent).not.toMatch(/1 trades/)
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
