// supabase/verify_060.mjs -- read-only check of migration 060 (library identity on bots).
// Run with: node --env-file=.env.local supabase/verify_060.mjs
// Prints PASS/FAIL per property and the row count per status (to compare before/after
// the catalog publication). Exits 1 on any FAIL. Never writes.

import { Client } from 'pg'

const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
const q = async (sql) => (await client.query(sql)).rows
const fails = []
const check = (label, ok, detail = '') => {
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(60)} ${String(detail).slice(0, 140)}`)
  if (!ok) fails.push(label)
}

const cols = new Set((await q(`select column_name from information_schema.columns
  where table_schema='public' and table_name='bots'`)).map((r) => r.column_name))
for (const c of ['idea_key', 'idea_rank', 'survivor_id', 'wait_reason', 'last_seen_generation', 'filter_keys', 'mtf_caveat']) {
  check(`bots.${c} exists`, cols.has(c))
}
const cons = new Map((await q(`select conname, pg_get_constraintdef(oid) d from pg_constraint
  where conrelid = 'public.bots'::regclass`)).map((r) => [r.conname, r.d]))
check('wait_reason only on backtest rows', (cons.get('bots_wait_reason_check') || '').includes("'backtest'"), cons.get('bots_wait_reason_check'))
check('(idea_key, idea_rank) unique', /UNIQUE \(idea_key, idea_rank\)/.test(cons.get('bots_idea_rank_key') || ''), cons.get('bots_idea_rank_key'))
const pol = await q(`select policyname, cmd from pg_policies where schemaname='public' and tablename='bots'`)
check('policies unchanged (SELECT only)', pol.every((p) => p.cmd === 'SELECT'), JSON.stringify(pol))

console.log('ROWS BY STATUS')
// Counted with or without the new columns, so the same script gives the BEFORE figure.
const extra = cols.has('wait_reason') && cols.has('idea_key')
  ? ', count(wait_reason)::int with_reason, count(idea_key)::int with_idea' : ''
for (const r of await q(`select status, count(*)::int n${extra} from public.bots group by status order by status`)) {
  const more = extra ? `  wait_reason ${r.with_reason}  idea_key ${r.with_idea}` : ''
  console.log(`   ${r.status.padEnd(10)} ${String(r.n).padStart(6)}${more}`)
}
await client.end()
if (fails.length) { console.log(`${fails.length} FAIL`); process.exit(1) }
console.log('ALL PASS')
