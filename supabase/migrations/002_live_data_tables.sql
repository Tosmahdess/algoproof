-- Migration 002: Add wealth_calls, asset_prices, mi_snapshots tables

create table if not exists wealth_calls (
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

create table if not exists asset_prices (
  asset       text primary key,
  price_eur   numeric(16,6) not null,
  source      text not null,
  updated_at  timestamptz not null
);

create table if not exists mi_snapshots (
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename='wealth_calls' and policyname='public read wealth_calls') then
    alter table wealth_calls enable row level security;
    create policy "public read wealth_calls" on wealth_calls for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='asset_prices' and policyname='public read asset_prices') then
    alter table asset_prices enable row level security;
    create policy "public read asset_prices" on asset_prices for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='mi_snapshots' and policyname='public read mi_snapshots') then
    alter table mi_snapshots enable row level security;
    create policy "public read mi_snapshots" on mi_snapshots for select using (true);
  end if;
end $$;
