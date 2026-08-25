import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/036_survivor_family_payload.sql'),
  'utf8',
)

describe('survivor family SQL boundary', () => {
  it('derives entitlement from auth.uid and never accepts an entitlement argument', () => {
    expect(sql).toContain('auth.uid()')
    expect(sql).not.toMatch(/p_(is_paid|entitled|access)/)
  })

  it('revokes public execution before granting authenticated access', () => {
    expect(sql).toMatch(/revoke (all|execute) on function public\.survivor_family_/i)
    expect(sql).toMatch(/grant execute on function public\.survivor_family_/i)
  })

  it('builds teaser entries with explicit JSON objects instead of survivor spreading', () => {
    expect(sql).toContain("'access', v_access")
    expect(sql).not.toMatch(/teaser[^;]*\|\|[^;]*survivor/is)
  })
})
