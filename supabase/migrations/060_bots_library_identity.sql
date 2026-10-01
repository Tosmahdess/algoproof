-- 060: library identity on `bots` (chantier bibliotheque, lot 1a, D079).
--
-- Every survivor the engine judged GO_PAPER on the corrected engine, and that no host
-- runs, becomes a `bots` row with status 'backtest' (allowed since 011): public
-- existence, state and idea, never its settings -- `bots` is world-readable (anon
-- SELECT using(true)), so nothing here may spell a parameter value or an unkeyed hash
-- of one. The site already excludes 'backtest' (queries.ts PUBLIC_STATUS_EXCLUSION).
--
--   idea_key             'Base|TF', the library card a bot belongs to.
--   idea_rank            the "n° k" in its name, given once at first publication and
--                        never recomputed (a new generation must not renumber bots
--                        people starred). Unique within an idea.
--   survivor_id          link to engine_verdict_survivor (keyed id, kmax included):
--                        a link, not an identity -- the slug is the identity.
--   wait_reason          why a 'backtest' row does not run yet; null otherwise, which
--                        forces the promotion (lot 3) to clear it.
--   last_seen_generation the catalog build that last listed this survivor.
--   filter_keys          filter NAMES only (what varies), never their values.
--   mtf_caveat           carries mtf_align, whose live mask differs from the
--                        backtest's on 1.5-2.3 % of bars (measured 2026-09-06).
--
-- Additive only: no existing column, policy or row changes.

alter table public.bots
  add column if not exists idea_key text,
  add column if not exists idea_rank integer,
  add column if not exists survivor_id text,
  add column if not exists wait_reason text,
  add column if not exists last_seen_generation text,
  add column if not exists filter_keys text[],
  add column if not exists mtf_caveat boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bots_wait_reason_check') then
    alter table public.bots add constraint bots_wait_reason_check check (
      wait_reason is null
      or (status = 'backtest' and wait_reason in
          ('awaiting_validation', 'trailing_unsupported', 'executor_unsupported', 'not_surviving'))
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bots_idea_rank_key') then
    -- Full unique (nulls distinct): the 114 running bots carry no rank. A full
    -- constraint, not a partial index, so PostgREST on_conflict can name it (42P10).
    alter table public.bots add constraint bots_idea_rank_key unique (idea_key, idea_rank);
  end if;
end $$;

create index if not exists bots_idea_key_idx on public.bots (idea_key);
create index if not exists bots_status_idx on public.bots (status);
