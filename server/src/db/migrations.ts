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
    CHECK (status IN ('in_progress', 'completed'))
);

ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS blocks_placed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS rows_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS columns_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS highest_combo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS game_sessions_user_id_idx ON game_sessions (user_id);
CREATE INDEX IF NOT EXISTS game_sessions_status_idx ON game_sessions (status);
CREATE INDEX IF NOT EXISTS game_sessions_completed_at_idx ON game_sessions (completed_at);
CREATE INDEX IF NOT EXISTS game_sessions_score_idx ON game_sessions (score DESC);
CREATE INDEX IF NOT EXISTS users_highest_score_idx ON users (highest_score DESC);
`

const SEED_BENCHMARK_USERS = `
INSERT INTO users (id, name, email, highest_score, total_games, total_lines_cleared, highest_combo)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'Ayan', 'ayan@veloop.dev', 15420, 114, 1540, 19),
  ('22222222-2222-4222-8222-222222222222', 'Rahul', 'rahul@veloop.dev', 14980, 98, 1320, 18),
  ('33333333-3333-4333-8333-333333333333', 'Priya', 'priya@veloop.dev', 13750, 84, 1150, 16),
  ('44444444-4444-4444-8444-444444444444', 'Arjun', 'arjun@veloop.dev', 12920, 72, 980, 15),
  ('55555555-5555-4555-8555-555555555555', 'Neha', 'neha@veloop.dev', 12450, 65, 870, 14),
  ('00000000-0000-4000-8000-000000000001', 'VELoop Intern (You)', 'intern@veloop.com', 8420, 12, 148, 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO game_sessions (session_id, user_id, score, lines_cleared, blocks_placed, highest_combo, duration, status, completed_at)
VALUES
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 15420, 92, 145, 19, 580, 'completed', NOW() - INTERVAL '2 hours'),
  ('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 14980, 88, 138, 18, 540, 'completed', NOW() - INTERVAL '5 hours'),
  ('a3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 13750, 81, 129, 16, 490, 'completed', NOW() - INTERVAL '1 day'),
  ('a4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 12920, 75, 120, 15, 460, 'completed', NOW() - INTERVAL '2 days'),
  ('a5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 12450, 71, 115, 14, 430, 'completed', NOW() - INTERVAL '3 days')
ON CONFLICT (session_id) DO NOTHING;
`

export async function initializeDatabase(pool: Pool | null): Promise<void> {
  if (!pool) {
    return
  }

  await pool.query(MIGRATIONS_SCHEMA)
  await pool.query(SEED_BENCHMARK_USERS)
}
