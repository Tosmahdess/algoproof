// D073 (Astra audit, 29/09): a list shows an engine bot's simulation since the freeze on a
// 1 000 EUR base while its fiche shows it on the curve's own level. The list says so, once,
// under the table, and only when it holds an engine bot.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BotTable from '@/components/BotTable'
import type { ListBot } from '@/lib/types'

const bot = (slug: string) => ({
  slug, name: slug, status: 'paper', family: 'trend', timeframe: 'H4', start_capital: 1000,
  stats: { win_rate: 0.5, profit_factor: 1.2, max_drawdown: 0.01, total_trades: 4, latest_capital: 1010 },
  all_trades: [],
}) as unknown as ListBot

const text = (bots: ListBot[], fleetTotalAbove = false) =>
  render(<BotTable bots={bots} showTf fleetTotalAbove={fleetTotalAbove} />)
    .container.textContent!.replace(/\s+/g, ' ')

describe('BotTable note on engine bots', () => {
  it('names the base of an engine bot figures', () => {
    const t = text([bot('arm-x-h4-head00')])
    expect(t).toMatch(/pour 1 000 € de départ/)
    expect(t).toMatch(/trades rejoués/)
    expect(t).not.toMatch(/total/)
  })

  it('says what the fleet total above counts, on the register only', () => {
    expect(text([bot('arm-x-h4-head00')], true)).toMatch(/depuis le lancement/)
  })

  it('stays silent on a list without an engine bot', () => {
    expect(text([bot('v1-spot')])).not.toMatch(/Bots moteur/)
  })
})
