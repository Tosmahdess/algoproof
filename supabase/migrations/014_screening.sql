-- Screening dashboard (spec 2026-07-22). One row per strategy x timeframe cell.
create table if not exists screening_campaigns (
  id                bigserial primary key,
  base              text not null,           -- engine strategy key, e.g. 'EMAcross'
  tf                text not null,           -- 'D1' | 'H4' | 'H1' | 'M30' | 'M15' | 'M5'
  state             text not null,           -- 'judged' | 'running' | 'queued' | 'never'
  judged_on         date,                    -- day granularity ONLY (spec section 7)
  data_dir          text,                    -- provenance of the frozen dataset
  n_behaviors       integer,                 -- configurations judged
  n_assets          integer,                 -- size of the tested universe; the denominator for per-asset trade density
  n_rejected        integer,
  n_marginal        integer,
  n_candidates      integer,                 -- "encore debout"
  null_bar          numeric,                 -- acceptance bar in force for this campaign
  created_at        timestamptz not null default now(),
  unique (base, tf)
);

create table if not exists screening_candidates (
  id                bigserial primary key,
  campaign_id       bigint not null references screening_campaigns(id) on delete cascade,
  label             text not null,           -- 'A', 'B' - never the parameter values (decision L)
  rank              integer not null,
  filter_families   text[] not null default '{}',  -- qualitative, e.g. '{tendance,pente longue}'
  null_pct          numeric,                 -- measured percentile
  dd                numeric,
  dd_limit          numeric,
  wf_oos            numeric,
  wf_bar            numeric,
  pf_net            numeric,                 -- backtest only; always rendered with the label
  trades            integer,
  assets_go         integer,
  qualified_assets  text[] not null default '{}',  -- membership only, no per-asset PF
  bot_slug          text,                    -- links to the paper bot; null before launch
  forward_trades    integer not null default 0,
  unique (campaign_id, label)
);

-- Append-only verdict journal (spec section 7). Never updated, never deleted.
create table if not exists screening_events (
  id                bigserial primary key,
  base              text not null,
  tf                text not null,
  happened_on       date not null,
  kind              text not null,           -- 'campaign_closed' | 'remeasure' | 'withdrawn'
  summary           text not null,           -- FR, first person, one or two sentences
  created_at        timestamptz not null default now()
);

create index if not exists idx_screening_campaigns_base on screening_campaigns(base);
create index if not exists idx_screening_candidates_campaign on screening_candidates(campaign_id);
create index if not exists idx_screening_candidates_bot_slug on screening_candidates(bot_slug) where bot_slug is not null;
create index if not exists idx_screening_events_base_tf on screening_events(base, tf, happened_on desc);

alter table screening_campaigns enable row level security;
alter table screening_candidates enable row level security;
alter table screening_events   enable row level security;

create policy "screening_campaigns public read" on screening_campaigns for select using (true);
create policy "screening_candidates public read" on screening_candidates for select using (true);
create policy "screening_events public read"   on screening_events   for select using (true);
