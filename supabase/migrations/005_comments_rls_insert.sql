-- Migration 005: Allow anonymous inserts into comments table
-- Run in Supabase dashboard:
-- https://supabase.com/dashboard/project/avdegocswrhzdnvsyiui/sql/new

DROP POLICY IF EXISTS "anon_insert_comments" ON comments;

CREATE POLICY "anon_insert_comments" ON comments
  FOR INSERT WITH CHECK (true);
