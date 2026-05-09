-- supabase/migrations/006_bot_changelogs.sql
-- Changelog entries pushed by Claude CLI checkpoint after each session.
-- INSERT restricted to service role only (no client INSERT policy).
-- SELECT is public.

CREATE TABLE IF NOT EXISTS bot_changelogs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bot_slug     TEXT        NOT NULL,
  entry_date   DATE        NOT NULL,
  category     TEXT        NOT NULL CHECK (category IN ('asset', 'fix', 'strategy', 'perf', 'risk')),
  summary      TEXT        NOT NULL,
  detail       TEXT,
  session_ref  TEXT
);

CREATE INDEX IF NOT EXISTS idx_bot_changelogs_slug ON bot_changelogs(bot_slug);
CREATE INDEX IF NOT EXISTS idx_bot_changelogs_date ON bot_changelogs(entry_date DESC);

ALTER TABLE bot_changelogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read changelog"
  ON bot_changelogs FOR SELECT USING (true);
