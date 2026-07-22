create table if not exists screening_candidate_assets (
  id            bigserial primary key,
  candidate_id  bigint not null references screening_candidates(id) on delete cascade,
  asset         text not null,
  trades        integer not null,
  pf            numeric,
  pnl_cum       numeric,
  win_rate      numeric,
  dd            numeric,
  qualified     boolean not null default false,
  unique (candidate_id, asset)
);
create index if not exists idx_candidate_assets on screening_candidate_assets(candidate_id);
alter table screening_candidate_assets enable row level security;
create policy "candidate assets public read" on screening_candidate_assets for select using (true);
