import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// THIS FILE READS TEXT. IT DOES NOT RUN SQL.
//
// It pins the shapes of 050/051/052 that a later edit could quietly undo: the closed
// grants, the triggers, the legacy id copied verbatim from 037, and dossier_payload /
// survivor_lab_preset keeping their signature and output keys. The executed gate --
// migrations applied in a rolled-back transaction, outputs compared before/after the
// switch, timings, guard behaviour -- is supabase/tests/survivor_rows_gate.py.
const root = process.cwd()
const read = (rel: string) =>
  readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')

const sql037 = read('supabase/migrations/037_survivor_family_index.sql')
const sql043 = read('supabase/migrations/043_generation_scoped_survivors.sql')
const sql044 = read('supabase/migrations/044_dossier_payload_per_pair_generation.sql')
const sql050 = read('supabase/migrations/050_engine_verdict_survivor.sql')
const sql051 = read('supabase/migrations/051_survivor_id_legacy_map.sql')
const sql052 = read('supabase/migrations/052_survivor_rows_read_switch.sql')

const fn = (sql: string, name: string) => {
  const found = sql.match(
    new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;\\n`, 'g'),
  )
  expect(found, `${name} defined exactly once`).toHaveLength(1)
  return found![0]
}

// Everything up to the body: arguments, return type, language, volatility, definer, path.
const header = (block: string) => block.slice(0, block.indexOf('as $$'))

// The keys a jsonb_build_object call emits: 'key', value pairs.
const keys = (block: string) =>
  [...new Set([...block.matchAll(/^\s*'([a-z_]+)',/gm)].map((m) => m[1]))].sort()

describe('050: the child table is closed like survivor_family_member', () => {
  it('enables RLS and revokes everything from anon and authenticated', () => {
    expect(sql050).toMatch(/alter table public\.engine_verdict_survivor enable row level security;/)
    expect(sql050).toMatch(/revoke all on table public\.engine_verdict_survivor from public;/)
    expect(sql050).toMatch(
      /revoke all on table public\.engine_verdict_survivor from anon, authenticated;/,
    )
  })

  it('grants nothing to anon, authenticated or public, and writes only as engine_telemetry', () => {
    for (const sql of [sql050, sql051, sql052]) {
      expect(sql).not.toMatch(/grant [^;]* on table [^;]* to [^;]*\b(anon|authenticated|public)\b/i)
    }
    const policies = [...sql050.matchAll(/create policy "([^"]+)" on public\.(\w+) '\s*'for all to (\w+)/g)]
    expect(policies.map((m) => [m[1], m[2], m[3]])).toEqual([
      ['engine_verdict_survivor writer', 'engine_verdict_survivor', 'engine_telemetry'],
    ])
    expect(sql051).not.toMatch(/create policy/i)
  })

  it('fills the family columns in a BEFORE trigger from survivor_family_signature', () => {
    expect(sql050).toMatch(
      /create trigger engine_verdict_survivor_family\s+before insert or update on public\.engine_verdict_survivor/,
    )
    expect(fn(sql050, 'engine_verdict_survivor_family')).toContain(
      'public.survivor_family_signature(',
    )
  })

  it('guards survivors_storage and purges the rows of a unit that leaves rows mode', () => {
    expect(sql050).toMatch(/create trigger engine_verdicts_survivor_rows_guard\s+before insert or update/)
    expect(sql050).toMatch(/create trigger engine_verdicts_survivor_rows_demoted\s+after update/)
    expect(sql050).toMatch(/create trigger engine_verdicts_survivor_rows_deleted\s+after delete/)
    expect(fn(sql050, 'engine_verdicts_survivor_rows_guard')).toMatch(
      /coalesce\(new\.n_go, 0\) \+ coalesce\(new\.n_marginal, 0\)/,
    )
  })

  it('narrows 037\'s explode to the columns it reads', () => {
    expect(sql050).toMatch(
      /update of base, tf, dataset_version, kmax, published_at, survivors\s+or delete\s+on public\.engine_verdicts/,
    )
  })

  it('copies 037\'s positional id verbatim into survivor_legacy_id', () => {
    const expr037 = sql037.match(/'surv_' \|\| pg_catalog\.substr\(pg_catalog\.md5\(\n\s+pg_catalog\.lower\(new\.base\)[\s\S]*?, 1, 16\)/)
    expect(expr037).not.toBeNull()
    const expected = expr037![0]
      .replace(/new\.base/g, 'p_base')
      .replace(/new\.tf/g, 'p_tf')
      .replace(/new\.kmax/g, 'p_kmax')
      .replace(/e\.ordinality/g, 'p_ordinality')
      .replace(/\s+/g, ' ')
    expect(fn(sql050, 'survivor_legacy_id').replace(/\s+/g, ' ')).toContain(expected)
  })
})

describe('051: the legacy map is closed and built from the minting generation', () => {
  it('enables RLS with no policy and revokes the table and the rebuild function', () => {
    expect(sql051).toMatch(/alter table public\.survivor_id_legacy_map enable row level security;/)
    expect(sql051).toMatch(/revoke all on table public\.survivor_id_legacy_map from anon, authenticated;/)
    expect(sql051).toMatch(
      /revoke all on function public\.survivor_id_legacy_map_rebuild\(text, boolean\) from public, anon, authenticated;/,
    )
  })

  it('explodes the jsonb list with ordinality and joins position = ordinality - 1', () => {
    const body = fn(sql051, 'survivor_id_legacy_map_rebuild')
    expect(body).toMatch(/with ordinality as e\(recipe, ordinality\)/)
    expect(body).toMatch(/s\.position = m\.ordinality - 1/)
    expect(body).toMatch(/public\.survivor_legacy_id\(u\.base, u\.tf, u\.kmax, e\.ordinality\)/)
  })
})

describe('052: the read switch keeps every RPC contract', () => {
  const d044 = fn(sql044, 'dossier_payload')
  const d052 = fn(sql052, 'dossier_payload')

  it('keeps dossier_payload\'s signature, volatility, definer and search_path', () => {
    expect(header(d052)).toBe(header(d044))
  })

  it('changes dossier_payload in the survivors source hunk and nowhere else', () => {
    const hunk052 = /                   -- 052: THE ONLY CHANGE TO 044\.[\s\S]*?\) src\(e\)\n/
    const hunk044 =
      /                   from pg_catalog\.jsonb_array_elements\(\n\s+coalesce\(v\.survivors, '\[\]'::jsonb\)\) e\n/
    expect(d052.match(hunk052)).not.toBeNull()
    expect(d052.replace(hunk052, '')).toBe(d044.replace(hunk044, ''))
    // the neutral order is still the database's, on the entry's text
    expect(d052).toContain('order by pg_catalog.md5(e::text)')
  })

  it('emits the same dossier keys (units, teaser allow-list, paid recipe keys)', () => {
    expect(keys(d052)).toEqual(keys(d044))
  })

  it('keeps survivor_lab_preset\'s signature and output keys, and its constant refusals', () => {
    const p043 = fn(sql043, 'survivor_lab_preset')
    const p052 = fn(sql052, 'survivor_lab_preset')
    expect(header(p052)).toBe(header(p043))
    const out = (block: string) =>
      keys(block.slice(block.lastIndexOf("'access', 'full'"))).filter((k) => k !== 'access')
    expect(out(p052)).toEqual(out(p043))
    expect(p052).toContain("return pg_catalog.jsonb_build_object('access', 'missing');")
    expect(p052).toContain("return pg_catalog.jsonb_build_object('access', 'locked');")
    expect(p052).toMatch(/public\.survivor_id_legacy_map/)
  })

  it('replaces the table by a view with 037\'s columns in 037\'s order, closed', () => {
    const cols037 = sql037
      .match(/create table if not exists public\.survivor_family_member \(([\s\S]*?)\n  primary key/)![1]
      .split('\n')
      .map((l) => l.trim().match(/^([a-z_]+)\s+(text|integer|timestamptz|jsonb|boolean|numeric)/)?.[1])
      .filter(Boolean)
    const view = sql052.match(/create view public\.survivor_family_member as\nselect ([\s\S]*?)\n  from/)![1]
    const viewCols = view.split(',').map((c) => c.trim().replace(/^m\./, ''))
    expect(viewCols).toEqual(cols037)
    expect(sql052).toMatch(/revoke all on table public\.survivor_family_member from anon, authenticated;/)
  })

  it('re-grants only execute on the two RPCs it redefines', () => {
    expect(sql052).toMatch(/grant execute on function public\.dossier_payload\(text, text\) to anon, authenticated;/)
    expect(sql052).toMatch(/grant execute on function public\.survivor_lab_preset\(text\) to anon, authenticated;/)
  })

  it('keeps the rollback out of supabase/migrations', () => {
    expect(existsSync(resolve(root, 'supabase/manual/survivor_rows_rollback.sql'))).toBe(true)
  })
})
