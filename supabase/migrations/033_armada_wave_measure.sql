-- 033_armada_wave_measure.sql
-- One row: the wave's aggregate control measure (winner's curse estimate).
-- The 39 controls have NO bots row by design; this table is the only public
-- artefact of their existence.
create table if not exists public.armada_wave_measure (
  id            int primary key default 1 check (id = 1),
  computed_at   timestamptz not null,
  paired_clusters int not null,
  head_trades   int not null,
  median_trades int not null,
  marginal_trades int not null,
  head_pf       numeric,
  median_pf     numeric,
  marginal_pf   numeric
);
alter table public.armada_wave_measure enable row level security;
drop policy if exists armada_wave_measure_public_read on public.armada_wave_measure;
create policy armada_wave_measure_public_read
  on public.armada_wave_measure for select to anon, authenticated using (true);
grant select on public.armada_wave_measure to anon, authenticated;
