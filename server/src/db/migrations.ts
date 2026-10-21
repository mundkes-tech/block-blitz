import type { Pool } from 'pg'

const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS game_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  lines_cleared INTEGER NOT NULL DEFAULT 0 CHECK (lines_cleared >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed'))
);

CREATE INDEX IF NOT EXISTS game_sessions_user_id_idx
  ON game_sessions (user_id);

CREATE INDEX IF NOT EXISTS game_sessions_status_idx
  ON game_sessions (status);

CREATE INDEX IF NOT EXISTS game_sessions_completed_at_idx
  ON game_sessions (completed_at);
`

export async function initializeDatabase(pool: Pool | null): Promise<void> {
  if (!pool) {
    return
  }

  await pool.query(INITIAL_SCHEMA)
}
