import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = resolve(
  process.cwd(),
  'supabase/migrations/039_survivor_lab_preset.sql',
)
const sql = existsSync(migration) ? readFileSync(migration, 'utf8') : ''

describe('survivor Lab preset SQL boundary (static checks only)', () => {
  it('ships the opaque-ID resolver migration', () => {
    expect(existsSync(migration)).toBe(true)
  })

  it('derives active entitlement from the cookie-bound caller', () => {
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(/set search_path = ''/i)
    expect(sql).toMatch(/auth\.uid\(\)/i)
    expect(sql).toMatch(/status\s*=\s*'active'/i)
    expect(sql).not.toMatch(/p_(is_paid|entitled|access)/i)
    expect(sql).not.toMatch(/service_role/i)
  })

  it('keeps paid fields out of locked and missing responses', () => {
    expect(sql).toMatch(/return pg_catalog\.jsonb_build_object\('access', 'missing'\)/i)
    expect(sql).toMatch(/return pg_catalog\.jsonb_build_object\('access', 'locked'\)/i)
    // No `s` flag: the pattern has no `.`, so dotAll was inert, and it costs a
    // TS1501 under this project's ES2017 target — which fails `next build`.
    expect(sql).not.toMatch(/'locked'[^;]*\|\|/i)
  })

  it('returns full data through an explicit allowlist', () => {
    const body = sql.match(
      /create or replace function public\.survivor_lab_preset[\s\S]*?\$\$;/i,
    )?.[0] ?? ''

    for (const key of [
      'survivor_id',
      'strategy',
      'timeframe',
      'dataset_version',
      'recipe',
      'asset_metrics',
      'metric_scope',
      'taker_fee',
      'slippage',
    ]) {
      expect(body).toContain(`'${key}'`)
    }
  })

  it('revokes public execution and grants only the callable roles', () => {
    expect(sql).toMatch(/revoke all on function public\.survivor_lab_preset/i)
    expect(sql).toMatch(
      /grant execute on function public\.survivor_lab_preset\(text\) to anon, authenticated/i,
    )
  })
})
