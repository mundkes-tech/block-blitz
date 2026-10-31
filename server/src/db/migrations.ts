import type { Pool } from 'pg'

const MIGRATIONS_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  highest_score INTEGER NOT NULL DEFAULT 0 CHECK (highest_score >= 0),
  total_games INTEGER NOT NULL DEFAULT 0 CHECK (total_games >= 0),
  total_lines_cleared INTEGER NOT NULL DEFAULT 0 CHECK (total_lines_cleared >= 0),
  highest_combo INTEGER NOT NULL DEFAULT 0 CHECK (highest_combo >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  session_id UUID PRIMARY KEY,
  request_id TEXT NULL,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  lines_cleared INTEGER NOT NULL DEFAULT 0 CHECK (lines_cleared >= 0),
  blocks_placed INTEGER NOT NULL DEFAULT 0 CHECK (blocks_placed >= 0),
  rows_cleared INTEGER NOT NULL DEFAULT 0 CHECK (rows_cleared >= 0),
  columns_cleared INTEGER NOT NULL DEFAULT 0 CHECK (columns_cleared >= 0),
  highest_combo INTEGER NOT NULL DEFAULT 0 CHECK (highest_combo >= 0),
  duration INTEGER NOT NULL DEFAULT 0 CHECK (duration >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'flagged'))
);

ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS blocks_placed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS rows_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS columns_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS highest_combo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS move_log JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS request_id TEXT NULL;
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_status_check
  CHECK (status IN ('in_progress', 'completed', 'flagged'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT NULL;

CREATE INDEX IF NOT EXISTS game_sessions_user_id_idx ON game_sessions (user_id);
CREATE INDEX IF NOT EXISTS game_sessions_status_idx ON game_sessions (status);
CREATE INDEX IF NOT EXISTS game_sessions_completed_at_idx ON game_sessions (completed_at);
CREATE INDEX IF NOT EXISTS game_sessions_score_idx ON game_sessions (score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_user_request_idx
  ON game_sessions (user_id, request_id)
  WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_highest_score_idx ON users (highest_score DESC);

CREATE OR REPLACE VIEW valid_games AS
SELECT *
FROM game_sessions
WHERE status = 'completed' AND completed_at IS NOT NULL;
`

const CLEAN_MOCK_DEMO_USERS = `
DELETE FROM game_sessions WHERE user_id IS NULL;
DELETE FROM game_sessions WHERE user_id IN (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '00000000-0000-4000-8000-000000000001'
) OR session_id IN (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'a3333333-3333-4333-8333-333333333333',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555'
);

DELETE FROM users WHERE id IN (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '00000000-0000-4000-8000-000000000001'
);
`

export async function initializeDatabase(pool: Pool | null): Promise<void> {
  if (!pool) {
    return
  }

  await pool.query(MIGRATIONS_SCHEMA)
  await pool.query(CLEAN_MOCK_DEMO_USERS).catch(() => { })
}