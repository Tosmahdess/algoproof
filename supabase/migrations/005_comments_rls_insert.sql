-- Migration 005: comments table + anonymous insert policy
-- Run in Supabase dashboard:
-- https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new
--
-- NOTE: The comments table was created manually in production.
-- This migration documents the full DDL for new environments.

CREATE TABLE IF NOT EXISTS comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_slug   text NOT NULL,
  pseudo     text NOT NULL,
  message    text NOT NULL,
  hidden     boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_bot_slug_idx ON comments(bot_slug);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public_read_comments" ON comments
  FOR SELECT USING (NOT hidden);

DROP POLICY IF EXISTS "anon_insert_comments" ON comments;
CREATE POLICY "anon_insert_comments" ON comments
  FOR INSERT WITH CHECK (true);
