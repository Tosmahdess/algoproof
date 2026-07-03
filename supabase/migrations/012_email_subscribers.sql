-- 012 — email capture (newsletter / waitlist), single shared list for site + lab.
-- Writes go through the service role only (API route /api/subscribe); RLS stays closed.

create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'site',
  created_at timestamptz not null default now()
);

alter table public.email_subscribers enable row level security;
-- No policies on purpose: anon/authenticated cannot read or write the list.

-- down:
-- drop table if exists public.email_subscribers;
