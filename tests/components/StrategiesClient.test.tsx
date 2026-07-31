import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StrategiesClient from '@/components/StrategiesClient'
import type { BotWithStats } from '@/lib/types'
import { FAMILY_ORDER, familyLabel } from '@/lib/families'

vi.mock('@/components/BotCard', () => ({
  default: ({ bot }: { bot: BotWithStats }) => (
    <div data-testid={`bot-${bot.slug}`} data-status={bot.status} data-family={bot.family}>
      {bot.name}
    </div>
  ),
}))

const makeBot = (overrides: Partial<BotWithStats>): BotWithStats => ({
  id: '1', slug: 'test', name: 'Test Bot', strategy: 'EMA', status: 'paper',
  family: 'trend', exchange: 'Binance', venue: 'binance-spot', assets: [], timeframe: 'H4',
  description: null, created_at: '2026-01-01', last_sync_at: null,
  start_capital: 1000,
  origin: 'engine', found_at: null, validated_at: null, paper_since: null, live_since: null,
  frozen_at: null, archived_at: null, engine_unit_key: null, rejudge_status: 'not_needed',
  stats: { win_rate: 0.6, profit_factor: 2.0, max_drawdown: 0.05, total_trades: 10, latest_capital: 1050 },
  perf_daily: [], recent_trades: [], all_trades: [],
  ...overrides,
})

const liveTrend    = makeBot({ id: '1', slug: 'v1-spot', name: 'V1 Spot', status: 'live', family: 'trend' })
const paperTrend   = makeBot({ id: '2', slug: 'ema-cross', name: 'EMA Cross', status: 'paper', family: 'trend' })
const paperBreakout = makeBot({ id: '3', slug: 'keltner', name: 'Keltner', status: 'paper', family: 'breakout' })
const bots = [liveTrend, paperTrend, paperBreakout]

describe('StrategiesClient', () => {
  it('shows live section when live bots exist', () => {
    render(<StrategiesClient bots={bots} />)
    expect(screen.getByText(/En direct/i)).toBeDefined()
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
  })

  it('family filter shows only matching bots (AND logic)', () => {
    render(<StrategiesClient bots={bots} />)
    fireEvent.click(screen.getByRole('button', { name: /cassure/i }))
    expect(screen.getByTestId('bot-keltner')).toBeDefined()
    expect(screen.queryByTestId('bot-ema-cross')).toBeNull()
    // live bot is trend family, not breakout — hidden by AND logic
    expect(screen.queryByTestId('bot-v1-spot')).toBeNull()
  })

  it('status live filter shows only live bots', () => {
    render(<StrategiesClient bots={bots} />)
    fireEvent.click(screen.getByRole('button', { name: /^live$/i }))
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
    expect(screen.queryByTestId('bot-ema-cross')).toBeNull()
    expect(screen.queryByTestId('bot-keltner')).toBeNull()
  })

  // FIX (final review, C1): the FAMILIES list was hand-written and held five of
  // the nine canonical families. A paper bot only renders INSIDE a family
  // section, so a momentum / price-action / stat-arb / event bot was counted in
  // the header and rendered nowhere. This test walks the taxonomy itself, so it
  // fails the day a family is added to families.ts and forgotten here.
  it('renders a section, a filter pill and the bot itself for EVERY canonical family', () => {
    const oneBotPerFamily = FAMILY_ORDER.map((family, i) =>
      makeBot({ id: `f${i}`, slug: `bot-${family}`, name: `Bot ${family}`, status: 'paper', family }),
    )
    render(<StrategiesClient bots={oneBotPerFamily} />)

    for (const family of FAMILY_ORDER) {
      // the section exists and is anchored on the family slug
      expect(document.getElementById(family)).not.toBeNull()
      // its label comes from families.ts, not from a second local copy
      expect(screen.getAllByText(familyLabel(family)).length).toBeGreaterThan(0)
      // and the bot of that family is actually rendered by that section
      expect(screen.getByTestId(`bot-bot-${family}`)).toBeDefined()
    }
  })

  it('shows as many bots as the header counts (no family renders nowhere)', () => {
    const oneBotPerFamily = FAMILY_ORDER.map((family, i) =>
      makeBot({ id: `f${i}`, slug: `bot-${family}`, name: `Bot ${family}`, status: 'paper', family }),
    )
    render(<StrategiesClient bots={oneBotPerFamily} />)
    expect(screen.getByText(new RegExp(`${FAMILY_ORDER.length} bots actifs`))).toBeDefined()
    expect(screen.getAllByTestId(/^bot-bot-/)).toHaveLength(FAMILY_ORDER.length)
  })

  // FIX (re-review, residual 1): the empty-section guard only fired under a
  // family filter, so clicking « Live » — which empties the paper cohort while
  // familyFilter stays null — rendered all nine families as empty boxes reading
  // « Bientôt disponible — bots en développement ou en phase de backtest », a
  // claim a visitor cannot check now that C3 delisted the backtest cohort. An
  // empty family section must not render, whatever the filter.
  it('renders no empty family box, and no "Bientôt disponible", under the Live filter', () => {
    render(<StrategiesClient bots={bots} />)
    fireEvent.click(screen.getByRole('button', { name: /^live$/i }))
    expect(screen.queryByText(/Bientôt disponible/)).toBeNull()
    // the live bot is still there; only the empty paper sections are gone
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
    for (const family of FAMILY_ORDER) {
      expect(document.getElementById(family)).toBeNull()
    }
  })

  it('never renders "Bientôt disponible" for a family that has only live bots', () => {
    // trend's only bot is live: its family section would otherwise print the
    // placeholder directly under that very bot in the « En direct » section.
    render(<StrategiesClient bots={[liveTrend, paperBreakout]} />)
    expect(screen.queryByText(/Bientôt disponible/)).toBeNull()
    expect(document.getElementById('trend')).toBeNull()
    expect(document.getElementById('breakout')).not.toBeNull()
  })

  it('labels market-neutral exactly as families.ts does, on every page', () => {
    render(<StrategiesClient bots={[makeBot({ slug: 'xsec', family: 'market-neutral' })]} />)
    expect(screen.getAllByText('Neutre au marché').length).toBeGreaterThan(0)
    expect(screen.queryByText('Marché neutre')).toBeNull()
  })

  it('reset button clears both filters and shows all bots', () => {
    render(<StrategiesClient bots={bots} />)
    // live + cassure = 0 bots → triggers empty state with reset button
    fireEvent.click(screen.getByRole('button', { name: /^live$/i }))
    fireEvent.click(screen.getByRole('button', { name: /cassure/i }))
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
    expect(screen.getByTestId('bot-ema-cross')).toBeDefined()
    expect(screen.getByTestId('bot-keltner')).toBeDefined()
  })
})
