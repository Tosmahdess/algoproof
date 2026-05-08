CREATE TABLE IF NOT EXISTS macro_reports (
  date         TEXT PRIMARY KEY,
  content      TEXT NOT NULL,
  score        REAL,
  regime       TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE macro_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON macro_reports FOR SELECT USING (true);
