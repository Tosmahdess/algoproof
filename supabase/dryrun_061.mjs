// supabase/dryrun_061.mjs -- run migration 061 inside a transaction, read the views, ROLLBACK.
// Nothing persists. Run with: node --env-file=.env.local supabase/dryrun_061.mjs
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const sql = readFileSync(new URL('./migrations/061_library_views.sql', import.meta.url), 'utf8')
const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query('begin')
  await client.query(sql)
  // Give the not-yet-published backtest rows a PF so the percentiles are exercised.
  await client.query(`update public.bots set pf_backtest = 1.0 + (idea_rank % 7) / 10.0,
    n_trades_backtest = 50 where status = 'backtest'`)
  let t = Date.now()
  const ideas = (await client.query(`select * from public.library_ideas order by n_variants desc`)).rows
  const msIdeas = Date.now() - t
  t = Date.now()
  const variants = (await client.query(`select * from public.library_variants where idea_key = $1
    order by idea_rank nulls first`, [ideas[0].idea_key])).rows
  const msVar = Date.now() - t
  console.log(`ideas: ${ideas.length} rows in ${msIdeas} ms; variants of ${ideas[0].idea_key}: ${variants.length} in ${msVar} ms`)
  const sum = (k) => ideas.reduce((a, r) => a + Number(r[k]), 0)
  console.log(`totals: variants ${sum('n_variants')}, backtest ${sum('n_backtest')}, running ${sum('n_running')},` +
    ` awaiting ${sum('n_awaiting')}, trailing ${sum('n_trailing')}, sim up/down/young ${sum('n_sim_up')}/${sum('n_sim_down')}/${sum('n_sim_young')}`)
  for (const r of ideas.slice(0, 3)) console.log(JSON.stringify(r))
  const withRunning = ideas.filter((r) => Number(r.n_running) > 0)
  console.log(`ideas with running bots: ${withRunning.length}`, JSON.stringify(withRunning[0]))
  await client.query('set local role anon')
  const anon = (await client.query('select count(*)::int n from public.library_ideas')).rows[0].n
  console.log(`anon reads library_ideas: ${anon} rows`)
} finally {
  await client.query('rollback')
  await client.end()
  console.log('ROLLED BACK')
}
