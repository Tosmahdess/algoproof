// supabase/run_migration.mjs
// Migration: add family column to bots table
// Run with: node --env-file=.env.local supabase/run_migration.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

// SQL to execute
const ALTER_SQL = `
ALTER TABLE bots
  ADD COLUMN IF NOT EXISTS family text
  CHECK (family IN ('trend','breakout','multi-signal','multi-asset','leveraged'));
`

const UPDATE_SQL = `
UPDATE bots
SET family = 'trend'
WHERE slug IN ('v1-spot', 'v1-hl')
  AND family IS NULL;
`

console.log('Testing connection...')
const { data: testData, error: testError } = await supabase.from('bots').select('slug, status')
if (testError) {
  console.error('Connection error:', testError.message)
  process.exit(1)
}
console.log('Connected OK. Current bots:', testData.map(b => b.slug).join(', '))

// Check if family column already exists
const { data: familyCheck, error: familyErr } = await supabase.from('bots').select('slug, family')
if (!familyErr) {
  console.log('\nfamily column already exists! Current values:')
  console.log(JSON.stringify(familyCheck, null, 2))

  // Still run UPDATE in case some rows have NULL family
  console.log('\nRunning UPDATE to set family = trend for v1-spot and v1-hl...')
  const { error: updateErr } = await supabase.rpc('exec_sql', { sql: UPDATE_SQL }).catch(() => ({ error: { message: 'exec_sql not available' } }))
  if (updateErr) {
    // Try direct update via REST
    const { error: directErr } = await supabase
      .from('bots')
      .update({ family: 'trend' })
      .in('slug', ['v1-spot', 'v1-hl'])
      .is('family', null)
    if (directErr) {
      console.error('Direct UPDATE error:', directErr.message)
    } else {
      console.log('UPDATE OK via direct REST call')
    }
  }
  process.exit(0)
}

console.log('\nfamily column does not exist yet (expected). Running DDL migration...')
console.log('Trying exec_sql RPC...')

const { error: alterError } = await supabase.rpc('exec_sql', { sql: ALTER_SQL })

if (alterError) {
  console.warn('exec_sql RPC not available:', alterError.message)
  console.log('\n--- MANUAL MIGRATION REQUIRED ---')
  console.log('The Supabase project does not expose an exec_sql function.')
  console.log('Please run the following SQL in the Supabase dashboard SQL editor:')
  console.log('https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new')
  console.log('\n-- Migration SQL --')
  console.log(ALTER_SQL)
  console.log(UPDATE_SQL)
  console.log('---')
  process.exit(2)
}

console.log('ALTER TABLE: OK')

// Run UPDATE via direct REST (service role can do DML)
const { error: updateError } = await supabase
  .from('bots')
  .update({ family: 'trend' })
  .in('slug', ['v1-spot', 'v1-hl'])

if (updateError) {
  console.error('UPDATE error:', updateError.message)
} else {
  console.log('UPDATE bots SET family = trend: OK')
}

// Verify final state
console.log('\nVerifying...')
const { data: bots, error: readError } = await supabase
  .from('bots')
  .select('slug, status, family')

if (readError) {
  console.error('Verify read error:', readError.message)
} else {
  console.log('Final bots state:')
  console.log(JSON.stringify(bots, null, 2))
}
