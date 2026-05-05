-- supabase/schema.sql
-- Run this in the Supabase SQL editor

create table if not exists bots (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  strategy    text not null,
  status      text not null check (status in ('paper', 'live', 'backtest', 'frozen')),
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
