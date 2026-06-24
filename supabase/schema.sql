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
