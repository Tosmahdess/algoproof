import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// THIS FILE READS TEXT. IT DOES NOT RUN SQL, AND IT CANNOT TELL YOU THE RPC WORKS.
//
// Its previous version passed 3/3 while every anonymous call to survivor_family_catalog
// returned PostgreSQL 57014 in production. Grepping a migration cannot see a statement
// timeout, a colliding identifier, or a payload that moved. What it CAN do is stop a
// later edit from quietly reintroducing a shape we deliberately rejected, which is all
// it is asked to do here.
//
// The gate that actually proves the RPCs work is supabase/tests/survivor_family_index_live.py:
// it applies the migration to a real database inside a rolled-back transaction and
// asserts reconciliation, time budgets, the paid boundary and the trigger.
const read = (file: string) =>
  readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8')

const sql036 = read('036_survivor_family_payload.sql')
const sql037 = read('037_survivor_family_index.sql')
const sql038 = read('038_survivor_family_preview.sql')

describe('survivor family SQL boundary (static shape checks only)', () => {
  it('derives entitlement from auth.uid and never accepts an entitlement argument', () => {
    for (const sql of [sql036, sql037]) {
      expect(sql).toContain('auth.uid()')
      expect(sql).not.toMatch(/p_(is_paid|entitled|access)/)
    }
  })

  it('revokes public execution before granting authenticated access', () => {
    expect(sql037).toMatch(/revoke (all|execute) on function public\.survivor_family_/i)
    expect(sql037).toMatch(/grant execute on function public\.survivor_family_/i)
  })

  it('builds teaser entries with explicit JSON objects instead of survivor spreading', () => {
    expect(sql037).toContain("'access', v_access")
    // No `s` flag: the pattern has no `.`, so dotAll was inert, and it costs a
    // TS1501 under this project's ES2017 target — which fails `next build`.
    expect(sql037).not.toMatch(/teaser[^;]*\|\|[^;]*survivor/i)
  })
})

describe('038 exposes only a bounded family preview', () => {
  it('defines a bounded allowlisted preview RPC', () => {
    const previewBody = sql038.match(
      /create or replace function public\.survivor_family_preview[\s\S]*?\$\$;/i,
    )?.[0] ?? ''

    expect(sql038).toMatch(
      /create or replace function public\.survivor_family_preview\([\s\S]*p_limit integer default 5/i,
    )
    expect(previewBody).toMatch(/security definer[\s\S]*set search_path = ''/i)
    expect(previewBody).toMatch(/p_limit < 1 or p_limit > 20/i)
    expect(sql038).toMatch(
      /grant execute on function public\.survivor_family_preview\(text, text, text, integer\) to anon, authenticated/i,
    )
    for (const paid of ["'recipe'", "'signature'", "'params'", "'variants'"]) {
      expect(previewBody).not.toContain(paid)
    }
  })

  it('keeps global robustness while filtering before preview ranking', () => {
    expect(sql038).toMatch(/(?:pg_catalog\.)?lower\(m\.base\) = (?:pg_catalog\.)?lower\(p_strategy\)/i)
    expect(sql038).toMatch(/p_timeframe is null or timeframes \? p_timeframe/i)
    expect(sql038).toMatch(/'total',[\s\S]*(?:pg_catalog\.)?count\(\*\)/i)
    expect(sql038).toMatch(/preview_rank <= p_limit/i)
  })
})

describe('037 keeps the shapes that cost production a day', () => {
  // The index holds the paid corpus verbatim. Grants alone are one layer; RLS with no
  // policy is the second. Losing either turns the table into a public download.
  it('closes the index table with both revoked grants and RLS', () => {
    expect(sql037).toMatch(/alter table public\.survivor_family_member enable row level security/i)
    expect(sql037).toMatch(/revoke all on table public\.survivor_family_member from anon, authenticated/i)
    expect(sql037).not.toMatch(/create policy[\s\S]*survivor_family_member/i)
  })

  // 036 hashed base:timeframe:ordinality and handed 1 314 survivors an id that already
  // belonged to another survivor, because a (base, tf) pair carries several kmax units
  // whose ordinality restarts at 1.
  it('puts kmax into the survivor identity', () => {
    expect(sql037).toMatch(/'surv_'[\s\S]{0,400}kmax::text/)
  })

  // A jsonb_typeof guard, not coalesce: `"exit": null` yields jsonb null, which coalesce
  // keeps and jsonb_each refuses. 1 095 survivors in the live corpus are in that shape.
  it('guards the signature on the JSON type rather than on NULL', () => {
    expect(sql037).toMatch(/jsonb_typeof\(p_recipe -> 'exit'\) = 'object'/)
    expect(sql037).toMatch(/jsonb_typeof\(p_recipe -> 'params'\) = 'object'/)
    expect(sql037).toMatch(/jsonb_typeof\(p_recipe -> 'filters'\) = 'object'/)
    expect(sql037).not.toMatch(/jsonb_each\(coalesce\(p_recipe/)
  })

  // PostgREST resolves overloads by argument name, so leaving the one-argument form in
  // place next to the two-argument one makes {p_dataset} ambiguous.
  it('drops the single-argument survivor_family_all before redefining it', () => {
    expect(sql037).toMatch(/drop function if exists public\.survivor_family_all\(text\)/i)
    expect(sql037).toMatch(/create or replace function public\.survivor_family_all\(\s*p_dataset text default null,\s*p_strategy text default null\s*\)/i)
  })

  // The whole point of 037: no read path may call the signature function again. The
  // slice stops at section 6, which only revokes grants and legitimately names it.
  it('keeps the signature off every read path', () => {
    const afterRpcs = sql037.split('-- 5. The three RPCs, reading the index.')[1]
    expect(afterRpcs).toBeDefined()
    const rpcBodies = afterRpcs.split('-- 6. The boundary, restated.')[0]
    expect(rpcBodies).toBeDefined()
    expect(rpcBodies).toContain('create or replace function public.survivor_family_catalog')
    expect(rpcBodies).not.toContain('survivor_family_signature')
  })

  it('leaves 036 untouched rather than rewriting applied history', () => {
    expect(sql036).toContain('create or replace function public.survivor_family_signature')
    expect(sql036).not.toContain('survivor_family_member')
  })
})
