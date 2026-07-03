-- 013 — allow anonymous inserts on email_subscribers (same pattern as 005 for comments).
-- supabaseServer uses the ANON key, so the subscribe route needs an insert policy.
-- No select/update/delete policy: the list stays unreadable from outside.

create policy "anon_insert_email_subscribers"
  on public.email_subscribers
  for insert
  to anon
  with check (true);

-- down:
-- drop policy if exists "anon_insert_email_subscribers" on public.email_subscribers;
