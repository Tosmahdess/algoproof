// scripts/seed.ts
// Run: npx tsx scripts/seed.ts
// NOTE: Requires SUPABASE_SERVICE_ROLE_KEY in .env.local to bypass RLS.
// The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is read-only and will fail with RLS errors.
// To seed: add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Supabase dashboard → Settings → API)
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BOTS = [
  {
    slug: 'v1-spot',
    name: 'Bot V1 Spot',
    strategy: 'EMA Cross H4 (21/55/200)',
    status: 'paper',
    exchange: 'Binance Spot',
    assets: ['BTC/USDT', 'SOL/USDT', 'LINK/USDT', 'DOGE/USDT', 'ADA/USDT'],
    timeframe: 'H4',
    description: 'EMA crossover strategy on 4H timeframe. Enters on EMA 21/55 cross confirmed by EMA 200 trend. Exit on reverse cross or ATR-based stop loss. Defense mesh with 4 risk layers.',
  },
  {
    slug: 'v1-hl',
    name: 'Bot V1-HL Perps',
    strategy: 'EMA Cross H4 (21/55/200) — Hyperliquid Perps',
    status: 'paper',
    exchange: 'Hyperliquid',
    assets: ['BTC-USDC', 'SOL-USDC', 'LINK-USDC', 'DOGE-USDC', 'ETH-USDC', 'XRP-USDC'],
    timeframe: 'H4',
    description: 'Same EMA H4 strategy as V1 but on Hyperliquid perpetuals. Lower fees (0.065%) and access to indices. Integrated Market Intelligence gate for macro filtering.',
  },
]

function generatePerf(botId: string, startCapital: number) {
  const rows = []
  let capital = startCapital
  const today = new Date()
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dailyReturn = (Math.random() - 0.42) * 0.02
    capital = capital * (1 + dailyReturn)
    rows.push({
      bot_id: botId,
      date: date.toISOString().split('T')[0],
      capital: Math.round(capital * 100) / 100,
      pnl_day: Math.round(capital * dailyReturn * 100) / 100,
      win_rate: 0.45 + Math.random() * 0.15,
      profit_factor: 1.1 + Math.random() * 0.8,
    })
  }
  return rows
}

function generateTrades(botId: string, assets: string[]) {
  const rows = []
  const today = new Date()
  const sides = ['long', 'short'] as const
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 89)
    const opened = new Date(today)
    opened.setDate(today.getDate() - daysAgo - 1)
    const closed = new Date(opened)
    closed.setHours(closed.getHours() + Math.floor(4 + Math.random() * 20))
    const pnl = Math.round(((Math.random() - 0.44) * 30) * 100) / 100
    rows.push({
      bot_id: botId,
      opened_at: opened.toISOString(),
      closed_at: closed.toISOString(),
      asset: assets[Math.floor(Math.random() * assets.length)],
      side: sides[Math.floor(Math.random() * 2)],
      pnl,
      reason: pnl > 0 ? 'EMA cross confirmed' : 'Stop loss hit',
      is_paper: true,
    })
  }
  return rows.sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime())
}

async function seed() {
  console.log('Seeding bots...')
  for (const bot of BOTS) {
    const { data, error } = await supabase
      .from('bots')
      .upsert(bot, { onConflict: 'slug' })
      .select('id')
      .single()
    if (error) { console.error('Bot error:', error.message); continue }

    console.log(`  Seeding perf for ${bot.slug}...`)
    const perf = generatePerf(data.id, 1000)
    const { error: perfErr } = await supabase
      .from('perf_daily')
      .upsert(perf, { onConflict: 'bot_id,date' })
    if (perfErr) console.error('Perf error:', perfErr.message)

    console.log(`  Seeding trades for ${bot.slug}...`)
    const trades = generateTrades(data.id, bot.assets)
    const { error: tradesErr } = await supabase
      .from('trades')
      .insert(trades)
    if (tradesErr) console.error('Trades error:', tradesErr.message)
  }
  console.log('Done.')
}

seed()
