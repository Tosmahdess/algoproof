// supabase/run_migration.mjs
// Generic migration runner: applies a .sql file directly to the Postgres database.
// Run with: node --env-file=.env.local supabase/run_migration.mjs supabase/migrations/<file>.sql
//
// Uses SUPABASE_DB_URL (direct Postgres connection, service role) rather than an
// exec_sql RPC — this project's Supabase instance does not expose one, and a direct
// pg connection lets a single migration file with multiple statements (CREATE TABLE,
// CREATE INDEX, ALTER TABLE ... ENABLE ROW LEVEL SECURITY, CREATE POLICY) run in one
// simple-query round trip.

import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node supabase/run_migration.mjs <path-to-sql-file>')
  process.exit(1)
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL (expected in .env.local)')
  process.exit(1)
}

let sql
try {
  sql = readFileSync(file, 'utf8')
} catch (err) {
  console.error(`Cannot read ${file}:`, err.message)
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

console.log(`Connecting...`)
await client.connect()
console.log(`Applying ${file} ...`)

try {
  await client.query(sql)
  console.log('Migration applied OK.')
} catch (err) {
  console.error('Migration error:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
