-- supabase/migrations/008_changelog_scopes.sql
-- Generalize bot_changelogs from per-bot to multi-scope (bot/fleet/mi/wealth).
-- Back-compatible: existing rows default to scope_type='bot'.

ALTER TABLE bot_changelogs
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'bot'
    CHECK (scope_type IN ('bot','fleet','mi','wealth')),
  ADD COLUMN IF NOT EXISTS applies_to TEXT;   -- fleet only: 'all'|'family:x'|'venue:x'|'slug:a,b'

ALTER TABLE bot_changelogs ALTER COLUMN bot_slug DROP NOT NULL;

-- Extend category CHECK: +signal (MI), +deploy (fleet/infra)
ALTER TABLE bot_changelogs DROP CONSTRAINT IF EXISTS bot_changelogs_category_check;
ALTER TABLE bot_changelogs ADD CONSTRAINT bot_changelogs_category_check
  CHECK (category IN ('asset','fix','strategy','perf','risk','signal','deploy'));

CREATE INDEX IF NOT EXISTS idx_changelogs_scope_date
  ON bot_changelogs(scope_type, entry_date DESC, created_at DESC);
