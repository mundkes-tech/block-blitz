import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { ApiError } from '../errors.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SessionRow = {
  session_id: string
  user_id: string | null
  status: 'in_progress' | 'completed' | 'flagged'
  started_at: Date
  completed_at: Date | null
  score: number
  lines_cleared: number
  blocks_placed?: number
  highest_combo?: number
  duration?: number
}

export type MoveLogEntry = {
  shapeId: string
  row: number
  col: number
}

export type CompletedSession = {
  sessionId: string
  userId?: string | null
  status?: 'completed' | 'flagged' | 'in_progress'
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

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new ApiError(400, `${field} must be a positive integer`)
    }
    return value
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

export function validateMoveLog(
  moves: unknown,
  score: number,
  linesCleared: number,
  blocksPlaced: number,
  highestCombo: number,
  duration: number,
): boolean {
  if (!Array.isArray(moves) || moves.length !== blocksPlaced) return false
  if (highestCombo > blocksPlaced || linesCleared > blocksPlaced * 4) return false
  if (blocksPlaced > 0 && duration < blocksPlaced) return false
  const maxScore = blocksPlaced * 1500 + linesCleared * 500 + 5000
  if (score > maxScore) return false
  return moves.every((move) => {
    if (!move || typeof move !== 'object') return false
    const entry = move as Partial<MoveLogEntry>
    const row = entry.row
    const col = entry.col
    return (
      typeof entry.shapeId === 'string' &&
      typeof row === 'number' &&
      typeof col === 'number' &&
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      row >= 0 &&
      row < 8 &&
      col >= 0 &&
      col < 8
    )
  })
}

export async function listCompletedGameSessions(
  pool: Pool | null,
  pageValue: unknown,
  pageSizeValue: unknown,
  userId?: string,
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
  const userFilter = userId ? ' AND user_id = $3' : ''
  const queryParams = userId ? [pageSize, offset, userId] : [pageSize, offset]
  const [sessionsResult, countResult] = await Promise.all([
    database.query<{
      session_id: string
      user_id: string | null
      status: 'completed' | 'flagged'
      score: number
      lines_cleared: number
      blocks_placed?: number
      highest_combo?: number
      duration?: number
      started_at: Date
      completed_at: Date
    }>(
      `SELECT session_id, user_id, status, score, lines_cleared, blocks_placed, highest_combo, duration, started_at, completed_at
       FROM game_sessions
       WHERE status IN ('completed', 'flagged') AND completed_at IS NOT NULL${userFilter}
       ORDER BY completed_at DESC, session_id DESC
       LIMIT $1 OFFSET $2`,
      queryParams,
    ),
    database.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM game_sessions
       WHERE status IN ('completed', 'flagged') AND completed_at IS NOT NULL${userId ? ' AND user_id = $1' : ''}`,
      userId ? [userId] : [],
    ),
  ])
  const total = safeAggregateValue(countResult.rows[0]?.total)

  return {
    items: sessionsResult.rows.map((row) => ({
      sessionId: row.session_id,
      userId: row.user_id,
      status: row.status,
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
       FROM valid_games gs
       JOIN users u ON gs.user_id = u.id
       WHERE gs.user_id IS NOT NULL${timeFilter}
       ORDER BY gs.score DESC, gs.completed_at DESC, gs.session_id DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    database.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM valid_games gs
       WHERE gs.user_id IS NOT NULL${timeFilter}`,
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
       FROM valid_games
       WHERE user_id IS NOT NULL
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

  const filter = validatedUserId ? ' AND user_id = $1' : ''
  const params = validatedUserId ? [validatedUserId] : []

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
     FROM valid_games
     WHERE 1 = 1${filter}`,
    params,
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
  userId: string,
  requestId?: string,
): Promise<{ sessionId: string; status: string; startedAt: Date }> {
  const validatedUserId = validateUuid(userId, 'userId')
  const database = requirePool(pool)
  if (requestId) {
    const existing = await database.query<SessionRow>(
      `SELECT session_id, status, started_at FROM game_sessions
       WHERE user_id = $1 AND request_id = $2`,
      [validatedUserId, requestId],
    )
    if (existing.rows[0]) {
      return {
        sessionId: existing.rows[0].session_id,
        status: existing.rows[0].status,
        startedAt: existing.rows[0].started_at,
      }
    }
  }
  const sessionId = randomUUID()
  const result = await database.query<SessionRow>(
    `INSERT INTO game_sessions (session_id, user_id, request_id)
     VALUES ($1, $2, $3)
     RETURNING session_id, status, started_at`,
    [sessionId, validatedUserId, requestId ?? null],
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
  ownerUserId?: string,
  moveLog?: unknown,
): Promise<SessionRow> {
  const validatedSessionId = validateUuid(sessionId, 'sessionId')
  if (!validatedSessionId) {
    throw new ApiError(400, 'sessionId must be a valid UUID')
  }

  const validatedScore = validateNonNegativeInteger(score, 'score')
  const validatedLines = validateNonNegativeInteger(linesCleared, 'linesCleared')
  const database = requirePool(pool)

  if (blocksPlaced === undefined) {
    const result = await database.query<SessionRow>(
      `UPDATE game_sessions
       SET score = $2, lines_cleared = $3, completed_at = NOW(), status = 'completed'
       WHERE session_id = $1 AND status = 'in_progress'
         AND ($4::uuid IS NULL OR user_id = $4::uuid)
       RETURNING session_id, user_id, status, started_at, completed_at, score, lines_cleared`,
      ownerUserId
        ? [validatedSessionId, validatedScore, validatedLines, ownerUserId]
        : [validatedSessionId, validatedScore, validatedLines],
    )
    if (result.rows[0]) return result.rows[0]
    const existing = await database.query<SessionRow>(
      `SELECT session_id, user_id, status, started_at, completed_at, score, lines_cleared,
              blocks_placed, highest_combo, duration
       FROM game_sessions WHERE session_id = $1`,
      [validatedSessionId],
    )
    if (!existing.rows[0]) throw new ApiError(404, 'Game session not found')
    if (existing.rows[0].status === 'completed') return existing.rows[0]
    if (ownerUserId && existing.rows[0].user_id !== ownerUserId) {
      throw new ApiError(403, 'You cannot complete this game session')
    }
    throw new ApiError(409, 'Game session is already completed')
  }

  const validatedBlocks = validateNonNegativeInteger(blocksPlaced, 'blocksPlaced')
  const validatedCombo = validateNonNegativeInteger(highestCombo ?? 0, 'highestCombo')
  const validatedDuration = validateNonNegativeInteger(duration ?? 0, 'duration')
  const validatedRows = validateNonNegativeInteger(rowsCleared ?? 0, 'rowsCleared')
  const validatedCols = validateNonNegativeInteger(columnsCleared ?? 0, 'columnsCleared')
  const hasMoveLog = moveLog !== undefined
  const isValid = !hasMoveLog || validateMoveLog(
    moveLog,
    validatedScore,
    validatedLines,
    validatedBlocks,
    validatedCombo,
    validatedDuration,
  )
  let flagged = false
  try {
    validatePlausibility(validatedScore, validatedLines, validatedBlocks, validatedDuration)
  } catch {
    flagged = true
  }
  if (!isValid) flagged = true

  if (typeof database.connect !== 'function') {
    const legacy = await database.query<SessionRow>(
      `UPDATE game_sessions
       SET score = $2, lines_cleared = $3, completed_at = NOW(), status = $4
       WHERE session_id = $1 AND status = 'in_progress'
       RETURNING session_id, user_id, status, started_at, completed_at, score, lines_cleared`,
      [validatedSessionId, validatedScore, validatedLines, flagged ? 'flagged' : 'completed'],
    )
    if (legacy.rows[0]) return legacy.rows[0]
    const existing = await database.query<SessionRow>(
      `SELECT session_id, user_id, status, started_at, completed_at, score, lines_cleared
       FROM game_sessions WHERE session_id = $1`,
      [validatedSessionId],
    )
    if (!existing.rows[0]) throw new ApiError(404, 'Game session not found')
    return existing.rows[0]
  }

  const client = await database.connect()
  try {
    await client.query('BEGIN')
    const locked = await client.query<SessionRow>(
      `SELECT session_id, user_id, status, started_at, completed_at, score, lines_cleared,
              blocks_placed, highest_combo, duration
       FROM game_sessions WHERE session_id = $1 FOR UPDATE`,
      [validatedSessionId],
    )
    const existing = locked.rows[0]
    if (!existing) throw new ApiError(404, 'Game session not found')
    if (ownerUserId && existing.user_id !== ownerUserId) {
      throw new ApiError(403, 'You cannot complete this game session')
    }
    if (existing.status !== 'in_progress') {
      await client.query('COMMIT')
      return existing
    }

    const updated = await client.query<SessionRow>(
      `UPDATE game_sessions
       SET score = $2, lines_cleared = $3, blocks_placed = $4, highest_combo = $5,
           duration = $6, rows_cleared = $7, columns_cleared = $8, move_log = $9::jsonb,
           completed_at = NOW(), status = $10
       WHERE session_id = $1
       RETURNING session_id, user_id, status, started_at, completed_at, score, lines_cleared,
                 blocks_placed, highest_combo, duration`,
      [
        validatedSessionId, validatedScore, validatedLines, validatedBlocks,
        validatedCombo, validatedDuration, validatedRows, validatedCols,
        JSON.stringify(moveLog ?? []), flagged ? 'flagged' : 'completed',
      ],
    )
    const result = updated.rows[0]
    if (!result) throw new ApiError(500, 'Failed to complete game session')

    if (!flagged && result.user_id) {
      await client.query(
        `UPDATE users
         SET total_games = total_games + 1,
             total_lines_cleared = total_lines_cleared + $2,
             highest_score = GREATEST(highest_score, $3),
             highest_combo = GREATEST(highest_combo, $4),
             updated_at = NOW()
         WHERE id = $1`,
        [result.user_id, validatedLines, validatedScore, validatedCombo],
      )
    }
    await client.query('COMMIT')
    return result
  } catch (error) {
    try { await client.query('ROLLBACK') } catch { /* preserve original error */ }
    if (error instanceof ApiError) throw error
    console.error('Game session transaction failed:', error)
    throw new ApiError(500, 'Unable to save game session')
  } finally {
    client.release()
  }
}

// User Profile & Authentication helpers
export async function listUsers(pool: Pool | null): Promise<UserProfile[]> {
  const database = requirePool(pool)
  const result = await database.query<UserProfile>(
    `SELECT u.id, u.name, u.email,
            COALESCE(MAX(vg.score), 0)::int AS "highestScore",
            COUNT(vg.session_id)::int AS "totalGames",
            COALESCE(SUM(vg.lines_cleared), 0)::int AS "totalLinesCleared",
            COALESCE(MAX(vg.highest_combo), 0)::int AS "highestCombo",
            u.created_at AS "createdAt"
     FROM users u
     LEFT JOIN valid_games vg ON vg.user_id = u.id
     GROUP BY u.id, u.name, u.email, u.created_at
     ORDER BY "highestScore" DESC`,
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
    `SELECT u.id, u.name, u.email,
            COALESCE(MAX(vg.score), 0)::int AS "highestScore",
            COUNT(vg.session_id)::int AS "totalGames",
            COALESCE(SUM(vg.lines_cleared), 0)::int AS "totalLinesCleared",
            COALESCE(MAX(vg.highest_combo), 0)::int AS "highestCombo",
            u.created_at AS "createdAt"
     FROM users u
     LEFT JOIN valid_games vg ON vg.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.name, u.email, u.created_at`,
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

  const filter = validatedUserId
    ? 'WHERE user_id = $1 AND status IN (\'completed\', \'flagged\')'
    : 'WHERE status IN (\'completed\', \'flagged\')'
  const countParams = validatedUserId ? [validatedUserId] : []
  const queryParams = validatedUserId
    ? [validatedUserId, pageSize, offset]
    : [pageSize, offset]

  const limitIndex = validatedUserId ? 2 : 1
  const offsetIndex = validatedUserId ? 3 : 2

  const countQuery = `SELECT COUNT(*)::text AS total FROM game_sessions ${filter} AND completed_at IS NOT NULL`
  const query = `
    SELECT session_id, user_id, status, score, lines_cleared, blocks_placed, highest_combo, duration, started_at, completed_at
    FROM game_sessions
    ${filter} AND completed_at IS NOT NULL
    ORDER BY completed_at DESC, session_id DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
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
      status: row.status,
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
