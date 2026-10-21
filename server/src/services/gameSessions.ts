import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { ApiError } from '../errors.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SessionRow = {
  session_id: string
  status: 'in_progress' | 'completed'
  started_at: Date
  completed_at: Date | null
  score: number
  lines_cleared: number
}

function requirePool(pool: Pool | null): Pool {
  if (!pool) {
    throw new ApiError(503, 'Database is not configured')
  }

  return pool
}

function validateUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ApiError(400, `${field} must be a valid UUID`)
  }

  return value
}

function validateNonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new ApiError(400, `${field} must be a non-negative integer`)
  }

  return value
}

export async function createGameSession(
  pool: Pool | null,
  userId: unknown,
): Promise<{ sessionId: string; status: string; startedAt: Date }> {
  const validatedUserId = validateUuid(userId, 'userId')
  const database = requirePool(pool)
  const sessionId = randomUUID()
  const result = await database.query<SessionRow>(
    `INSERT INTO game_sessions (session_id, user_id)
     VALUES ($1, $2)
     RETURNING session_id, status, started_at`,
    [sessionId, validatedUserId],
  )
  const row = result.rows[0]

  if (!row) {
    throw new ApiError(500, 'Failed to create game session')
  }

  return {
    sessionId: row.session_id,
    status: row.status,
    startedAt: row.started_at,
  }
}

export async function completeGameSession(
  pool: Pool | null,
  sessionId: unknown,
  score: unknown,
  linesCleared: unknown,
): Promise<SessionRow> {
  const validatedSessionId = validateUuid(sessionId, 'sessionId')
  if (!validatedSessionId) {
    throw new ApiError(400, 'sessionId must be a valid UUID')
  }

  const validatedScore = validateNonNegativeInteger(score, 'score')
  const validatedLines = validateNonNegativeInteger(
    linesCleared,
    'linesCleared',
  )
  const database = requirePool(pool)
  const result = await database.query<SessionRow>(
    `UPDATE game_sessions
     SET score = $2, lines_cleared = $3, completed_at = NOW(), status = 'completed'
     WHERE session_id = $1 AND status = 'in_progress'
     RETURNING session_id, status, started_at, completed_at, score, lines_cleared`,
    [validatedSessionId, validatedScore, validatedLines],
  )

  if (result.rows[0]) {
    return result.rows[0]
  }

  const existing = await database.query<{ status: SessionRow['status'] }>(
    'SELECT status FROM game_sessions WHERE session_id = $1',
    [validatedSessionId],
  )

  if (!existing.rows[0]) {
    throw new ApiError(404, 'Game session not found')
  }

  throw new ApiError(409, 'Game session is already completed')
}
