-- Created automatically on first use by lib/db.ts; kept here for reference.
CREATE TABLE IF NOT EXISTS user_state (
  uid        text PRIMARY KEY,           -- "gh:<github user id>"
  state      jsonb NOT NULL,             -- { marks: {verseId: {c, n}}, paths: [...] }
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shared_paths (
  uid        text PRIMARY KEY,
  name       text NOT NULL DEFAULT '',
  paths      jsonb NOT NULL,             -- [{ id, title, steps: [{ r, n }] }]
  updated_at timestamptz NOT NULL DEFAULT now()
);
