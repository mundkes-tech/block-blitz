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

export type CompletedSession = {
  sessionId: string
  score: number
  linesCleared: number
  startedAt: Date
  completedAt: Date
}

export type GameSessionStats = {
  totalCompletedGames: number
  highestScore: number
  averageScore: number
  totalLinesCleared: number
  mostRecentCompletedAt: Date | null
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

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

function parsePageValue(value: unknown, field: string, fallback: number): number {
  if (value === undefined) {
    return fallback
  }

  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new ApiError(400, `${field} must be a positive integer`)
  }

  return Number(value)
}

function safeAggregateValue(value: string | number | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function listCompletedGameSessions(
  pool: Pool | null,
  pageValue: unknown,
  pageSizeValue: unknown,
): Promise<{
  items: CompletedSession[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}> {
  const page = parsePageValue(pageValue, 'page', DEFAULT_PAGE)
  const pageSize = parsePageValue(pageSizeValue, 'pageSize', DEFAULT_PAGE_SIZE)

  if (pageSize > MAX_PAGE_SIZE) {
    throw new ApiError(400, `pageSize must be at most ${MAX_PAGE_SIZE}`)
  }

  const database = requirePool(pool)
  const offset = (page - 1) * pageSize
  if (!Number.isSafeInteger(offset)) {
    throw new ApiError(400, 'page is too large')
  }
  const [sessionsResult, countResult] = await Promise.all([
    database.query<{
      session_id: string
      score: number
      lines_cleared: number
      started_at: Date
      completed_at: Date
    }>(
      `SELECT session_id, score, lines_cleared, started_at, completed_at
       FROM game_sessions
       WHERE status = 'completed' AND completed_at IS NOT NULL
       ORDER BY completed_at DESC, session_id DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    database.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM game_sessions
       WHERE status = 'completed' AND completed_at IS NOT NULL`,
    ),
  ])
  const total = safeAggregateValue(countResult.rows[0]?.total)

  return {
    items: sessionsResult.rows.map((row) => ({
      sessionId: row.session_id,
      score: row.score,
      linesCleared: row.lines_cleared,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

export async function getGameSessionStats(
  pool: Pool | null,
): Promise<GameSessionStats> {
  const database = requirePool(pool)
  const result = await database.query<{
    total_completed_games: string
    highest_score: string
    average_score: string
    total_lines_cleared: string
    most_recent_completed_at: Date | null
  }>(
    `SELECT
       COUNT(*)::text AS total_completed_games,
       COALESCE(MAX(score), 0)::text AS highest_score,
       COALESCE(AVG(score), 0)::text AS average_score,
       COALESCE(SUM(lines_cleared), 0)::text AS total_lines_cleared,
       MAX(completed_at) AS most_recent_completed_at
     FROM game_sessions
     WHERE status = 'completed' AND completed_at IS NOT NULL`,
  )
  const row = result.rows[0]

  return {
    totalCompletedGames: safeAggregateValue(row?.total_completed_games),
    highestScore: safeAggregateValue(row?.highest_score),
    averageScore: safeAggregateValue(row?.average_score),
    totalLinesCleared: safeAggregateValue(row?.total_lines_cleared),
    mostRecentCompletedAt: row?.most_recent_completed_at ?? null,
  }
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
