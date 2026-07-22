-- supabase/schema.sql
-- Run this in the Supabase SQL editor

create table if not exists bots (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  strategy    text not null,
  status      text not null check (status in ('paper', 'live', 'backtest', 'frozen', 'archived')),
  family      text        check (family in ('trend','breakout','multi-signal','multi-asset','leveraged')),
  exchange    text not null,
  assets      text[] not null default '{}',
  timeframe   text not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists trades (
  id          uuid primary key default gen_random_uuid(),
  bot_id      uuid not null references bots(id) on delete cascade,
  opened_at   timestamptz not null,
  closed_at   timestamptz not null,
  asset       text not null,
  side        text not null check (side in ('long', 'short')),
  pnl         numeric(10, 4) not null,
  reason      text,
  is_paper    boolean not null default true,
  created_at  timestamptz default now()
);

create table if not exists perf_daily (
  id             uuid primary key default gen_random_uuid(),
  bot_id         uuid not null references bots(id) on delete cascade,
  date           date not null,
  capital        numeric(12, 2) not null,
  pnl_day        numeric(10, 4) not null,
  win_rate       numeric(5, 4),
  profit_factor  numeric(6, 4),
  unique (bot_id, date)
);

-- Enable RLS + public read access (no auth in Phase 1)
alter table bots enable row level security;
alter table trades enable row level security;
alter table perf_daily enable row level security;

create policy "public read bots"       on bots       for select using (true);
create policy "public read trades"     on trades     for select using (true);
create policy "public read perf_daily" on perf_daily for select using (true);

create index if not exists trades_bot_id_idx on trades(bot_id);

create table wealth_calls (
  id            uuid primary key default gen_random_uuid(),
  executed_at   timestamptz not null,
  asset         text not null,
  portfolio     text not null check (portfolio in ('wealth','growth')),
  amount_eur    numeric(10,2) not null,
  multiplier    numeric(4,2) not null,
  signal_level  text not null,
  venue         text not null,
  price_eur     numeric(16,6),
  quantity      numeric(16,8),
  created_at    timestamptz default now(),
  unique (executed_at, asset)
);

create table asset_prices (
  asset       text primary key,
  price_eur   numeric(16,6) not null,
  source      text not null,
  updated_at  timestamptz not null
);

create table mi_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  snapshot_at        timestamptz not null unique,
  composite_score    numeric(6,2),
  regime             text,
  is_safe            boolean,
  is_macro_safe      boolean,
  sentiment_score    numeric(6,2),
  derivatives_score  numeric(6,2),
  news_score         numeric(6,2),
  macro_score        numeric(6,2),
  created_at         timestamptz default now()
);

alter table wealth_calls  enable row level security;
alter table asset_prices  enable row level security;
alter table mi_snapshots  enable row level security;

create policy "public read wealth_calls"  on wealth_calls  for select using (true);
create policy "public read asset_prices"  on asset_prices  for select using (true);
create policy "public read mi_snapshots"  on mi_snapshots  for select using (true);

-- ── 014_screening.sql ──
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

-- ── 016_candidate_assets.sql ──
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
