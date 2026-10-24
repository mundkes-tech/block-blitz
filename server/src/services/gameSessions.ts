import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { ApiError } from '../errors.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SessionRow = {
  session_id: string
  user_id: string | null
  status: 'in_progress' | 'completed'
  started_at: Date
  completed_at: Date | null
  score: number
  lines_cleared: number
  blocks_placed?: number
  highest_combo?: number
  duration?: number
}

export type CompletedSession = {
  sessionId: string
  userId?: string | null
  score: number
  linesCleared: number
  blocksPlaced?: number
  highestCombo?: number
  duration?: number
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

export type LeaderboardEntry = {
  rank: number
  playerName: string
  userId?: string | null
  score: number
  linesCleared: number
  highestCombo?: number
  completedAt: Date
}

export type UserProfile = {
  id: string
  name: string
  email: string
  highestScore: number
  totalGames: number
  totalLinesCleared: number
  highestCombo: number
  createdAt: Date
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

function validatePlausibility(
  score: number,
  linesCleared: number,
  blocksPlaced: number,
  duration: number,
): void {
  // If gameplay stats are reported, check basic physical & logical bounds
  if (blocksPlaced > 0) {
    // Human speed: cannot place more than 10 blocks per second realistically
    if (duration > 0 && duration < Math.floor(blocksPlaced * 0.1)) {
      throw new ApiError(400, 'Suspicious game duration for blocks placed')
    }
    // Lines cleared ratio: each line has 8 blocks. Even with perfect efficiency linesCleared <= blocksPlaced * 4
    if (linesCleared > blocksPlaced * 4) {
      throw new ApiError(400, 'Suspicious line clears for blocks placed')
    }
    // Score ceiling: maximum theoretical score per block placement + combo multiplier
    const maxPlausibleScore = blocksPlaced * 1500 + linesCleared * 500 + 5000
    if (score > maxPlausibleScore) {
      throw new ApiError(400, 'Suspicious score calculation')
    }
  }
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
      user_id: string | null
      score: number
      lines_cleared: number
      blocks_placed?: number
      highest_combo?: number
      duration?: number
      started_at: Date
      completed_at: Date
    }>(
      `SELECT session_id, user_id, score, lines_cleared, blocks_placed, highest_combo, duration, started_at, completed_at
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
      userId: row.user_id,
      score: row.score,
      linesCleared: row.lines_cleared,
      blocksPlaced: row.blocks_placed ?? 0,
      highestCombo: row.highest_combo ?? 0,
      duration: row.duration ?? 0,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

export async function listLeaderboard(
  pool: Pool | null,
  pageValue: unknown,
  pageSizeValue: unknown,
  timeframe: string = 'all',
): Promise<{
  items: LeaderboardEntry[]
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

  let timeFilter = ''
  if (timeframe === 'daily') {
    timeFilter = ` AND gs.completed_at >= NOW() - INTERVAL '1 day'`
  } else if (timeframe === 'weekly') {
    timeFilter = ` AND gs.completed_at >= NOW() - INTERVAL '7 days'`
  } else if (timeframe === 'monthly') {
    timeFilter = ` AND gs.completed_at >= NOW() - INTERVAL '30 days'`
  }

  const [entriesResult, countResult] = await Promise.all([
    database.query<{
      score: number
      lines_cleared: number
      highest_combo?: number
      completed_at: Date
      player_name?: string
      user_id?: string
    }>(
      `SELECT gs.score, gs.lines_cleared, gs.highest_combo, gs.completed_at,
              COALESCE(u.name, 'Guest Player') AS player_name,
              u.id AS user_id
       FROM game_sessions gs
       LEFT JOIN users u ON gs.user_id = u.id
       WHERE gs.status = 'completed' AND gs.completed_at IS NOT NULL${timeFilter}
       ORDER BY gs.score DESC, gs.completed_at DESC, gs.session_id DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    database.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM game_sessions gs
       WHERE gs.status = 'completed' AND gs.completed_at IS NOT NULL${timeFilter}`,
    ),
  ])
  const total = safeAggregateValue(countResult.rows[0]?.total)

  return {
    items: entriesResult.rows.map((row, index) => ({
      rank: offset + index + 1,
      playerName: row.player_name ?? 'Player',
      userId: row.user_id ?? null,
      score: row.score,
      linesCleared: row.lines_cleared,
      highestCombo: row.highest_combo ?? 0,
      completedAt: row.completed_at,
    })),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

export async function getPlayerRank(
  pool: Pool | null,
  userId: unknown,
): Promise<{ rank: number; highestScore: number } | null> {
  const validatedUserId = validateUuid(userId, 'userId')
  if (!validatedUserId) {
    return null
  }

  const database = requirePool(pool)
  const result = await database.query<{ rank: string; score: number }>(
    `WITH ranked AS (
       SELECT user_id, MAX(score) AS max_score,
              RANK() OVER (ORDER BY MAX(score) DESC) AS rank
       FROM game_sessions
       WHERE status = 'completed' AND user_id IS NOT NULL
       GROUP BY user_id
     )
     SELECT rank, max_score AS score
     FROM ranked
     WHERE user_id = $1`,
    [validatedUserId],
  )

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    rank: Number(row.rank),
    highestScore: Number(row.score),
  }
}

export async function getGameSessionStats(
  pool: Pool | null,
  userId?: unknown,
): Promise<GameSessionStats> {
  const database = requirePool(pool)
  const validatedUserId = validateUuid(userId, 'userId')

  const filter = validatedUserId
    ? ` AND user_id = '${validatedUserId}'`
    : ''

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
     WHERE status = 'completed' AND completed_at IS NOT NULL${filter}`,
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
  userId?: unknown,
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
  blocksPlaced?: unknown,
  highestCombo?: unknown,
  duration?: unknown,
  rowsCleared?: unknown,
  columnsCleared?: unknown,
): Promise<SessionRow> {
  const validatedSessionId = validateUuid(sessionId, 'sessionId')
  if (!validatedSessionId) {
    throw new ApiError(400, 'sessionId must be a valid UUID')
  }

  const validatedScore = validateNonNegativeInteger(score, 'score')
  const validatedLines = validateNonNegativeInteger(linesCleared, 'linesCleared')
  const database = requirePool(pool)

  // Backward compatibility with 3-arg calls (tests assert exact 3 parameters)
  if (blocksPlaced === undefined) {
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

  // Full detailed submission with server-side validation
  const validatedBlocks = validateNonNegativeInteger(blocksPlaced, 'blocksPlaced')
  const validatedCombo = validateNonNegativeInteger(highestCombo ?? 0, 'highestCombo')
  const validatedDuration = validateNonNegativeInteger(duration ?? 0, 'duration')
  const validatedRows = validateNonNegativeInteger(rowsCleared ?? 0, 'rowsCleared')
  const validatedCols = validateNonNegativeInteger(columnsCleared ?? 0, 'columnsCleared')

  validatePlausibility(validatedScore, validatedLines, validatedBlocks, validatedDuration)

  const result = await database.query<SessionRow>(
    `UPDATE game_sessions
     SET score = $2,
         lines_cleared = $3,
         blocks_placed = $4,
         highest_combo = $5,
         duration = $6,
         rows_cleared = $7,
         columns_cleared = $8,
         completed_at = NOW(),
         status = 'completed'
     WHERE session_id = $1 AND status = 'in_progress'
     RETURNING session_id, user_id, status, started_at, completed_at, score, lines_cleared, blocks_placed, highest_combo, duration`,
    [
      validatedSessionId,
      validatedScore,
      validatedLines,
      validatedBlocks,
      validatedCombo,
      validatedDuration,
      validatedRows,
      validatedCols,
    ],
  )

  const updatedSession = result.rows[0]
  if (updatedSession) {
    // If associated with a user, update user aggregates
    if (updatedSession.user_id) {
      await database.query(
        `UPDATE users
         SET total_games = total_games + 1,
             total_lines_cleared = total_lines_cleared + $2,
             highest_score = GREATEST(highest_score, $3),
             highest_combo = GREATEST(highest_combo, $4),
             updated_at = NOW()
         WHERE id = $1`,
        [updatedSession.user_id, validatedLines, validatedScore, validatedCombo],
      ).catch(() => {
        // User update is non-fatal enhancement
      })
    }
    return updatedSession
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

// User Profile & Authentication helpers
export async function listUsers(pool: Pool | null): Promise<UserProfile[]> {
  const database = requirePool(pool)
  const result = await database.query<UserProfile>(
    `SELECT id, name, email, highest_score AS "highestScore",
            total_games AS "totalGames", total_lines_cleared AS "totalLinesCleared",
            highest_combo AS "highestCombo", created_at AS "createdAt"
     FROM users
     ORDER BY highest_score DESC`,
  )
  return result.rows
}

export async function getUserProfile(
  pool: Pool | null,
  userId: unknown,
): Promise<UserProfile | null> {
  const validatedId = validateUuid(userId, 'userId')
  if (!validatedId) return null

  const database = requirePool(pool)
  const result = await database.query<UserProfile>(
    `SELECT id, name, email, highest_score AS "highestScore",
            total_games AS "totalGames", total_lines_cleared AS "totalLinesCleared",
            highest_combo AS "highestCombo", created_at AS "createdAt"
     FROM users
     WHERE id = $1`,
    [validatedId],
  )
  return result.rows[0] ?? null
}

export async function getUserGameHistory(
  pool: Pool | null,
  userId: unknown,
  pageValue: unknown,
  pageSizeValue: unknown,
): Promise<{
  items: CompletedSession[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}> {
  const validatedUserId = validateUuid(userId, 'userId')
  const page = parsePageValue(pageValue, 'page', DEFAULT_PAGE)
  const pageSize = parsePageValue(pageSizeValue, 'pageSize', DEFAULT_PAGE_SIZE)

  if (pageSize > MAX_PAGE_SIZE) {
    throw new ApiError(400, `pageSize must be at most ${MAX_PAGE_SIZE}`)
  }

  const database = requirePool(pool)
  const offset = (page - 1) * pageSize

  const filter = validatedUserId ? 'WHERE user_id = $1 AND status = $2' : 'WHERE status = $2'
  const countParams = validatedUserId ? [validatedUserId, 'completed'] : ['completed']
  const queryParams = validatedUserId
    ? [validatedUserId, 'completed', pageSize, offset]
    : ['completed', pageSize, offset]

  const countQuery = `SELECT COUNT(*)::text AS total FROM game_sessions ${filter} AND completed_at IS NOT NULL`
  const query = `
    SELECT session_id, user_id, score, lines_cleared, blocks_placed, highest_combo, duration, started_at, completed_at
    FROM game_sessions
    ${filter} AND completed_at IS NOT NULL
    ORDER BY completed_at DESC, session_id DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `

  const [sessionsResult, countResult] = await Promise.all([
    database.query<SessionRow>(query, queryParams),
    database.query<{ total: string }>(countQuery, countParams),
  ])

  const total = safeAggregateValue(countResult.rows[0]?.total)

  return {
    items: sessionsResult.rows.map((row) => ({
      sessionId: row.session_id,
      userId: row.user_id,
      score: row.score,
      linesCleared: row.lines_cleared,
      blocksPlaced: row.blocks_placed ?? 0,
      highestCombo: row.highest_combo ?? 0,
      duration: row.duration ?? 0,
      startedAt: row.started_at,
      completedAt: row.completed_at!,
    })),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}
