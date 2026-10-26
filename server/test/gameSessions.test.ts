import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import test from 'node:test'
import type { Pool, QueryResult } from 'pg'
import { createApp } from '../src/app.js'
import type { AppConfig } from '../src/config.js'
import { ApiError } from '../src/errors.js'
import {
  completeGameSession,
  getGameSessionStats,
  getUserGameHistory,
  listCompletedGameSessions,
  listLeaderboard,
} from '../src/services/gameSessions.js'

type QueryHandler = (
  text: string,
  values?: readonly unknown[],
) => Promise<QueryResult>

function createPool(handler: QueryHandler): Pool {
  return { query: handler } as unknown as Pool
}

const validSessionId = '123e4567-e89b-12d3-a456-426614174000'
const testConfig: AppConfig = {
  port: 0,
  clientUrl: 'http://localhost:5173',
}

async function startTestServer(): Promise<{
  server: Server
  baseUrl: string
}> {
  const server = createServer(createApp(testConfig, null))
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()

  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Test server did not expose a port')
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  }
}

async function stopTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

test('rejects invalid session results before querying the database', async () => {
  let queryCount = 0
  const pool = createPool(async () => {
    queryCount += 1
    throw new Error('query should not run')
  })

  await assert.rejects(
    completeGameSession(pool, 'not-a-uuid', 10, 1),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 400 &&
      error.message === 'sessionId must be a valid UUID',
  )
  await assert.rejects(
    completeGameSession(pool, validSessionId, -1, 1),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 400 &&
      error.message === 'score must be a non-negative integer',
  )
  await assert.equal(queryCount, 0)
})

test('completes an in-progress session with parameterized values', async () => {
  const queries: Array<{ text: string; values?: readonly unknown[] }> = []
  const pool = createPool(async (text, values) => {
    queries.push({ text, values })
    return {
      rows: [
        {
          session_id: validSessionId,
          status: 'completed',
          started_at: new Date('2026-01-01T00:00:00Z'),
          completed_at: new Date('2026-01-01T00:01:00Z'),
          score: 120,
          lines_cleared: 1,
        },
      ],
    } as QueryResult
  })

  const result = await completeGameSession(pool, validSessionId, 120, 1)

  assert.equal(result.status, 'completed')
  assert.deepEqual(queries[0].values, [validSessionId, 120, 1])
  assert.match(queries[0].text, /WHERE session_id = \$1 AND status = 'in_progress'/)
})

test('returns not found and conflict for unknown and completed sessions', async () => {
  const unknownPool = createPool(async (text) => {
    if (text.startsWith('UPDATE')) return { rows: [] } as QueryResult
    return { rows: [] } as QueryResult
  })
  const completedPool = createPool(async (text) => {
    if (text.startsWith('UPDATE')) return { rows: [] } as QueryResult
    return { rows: [{ status: 'completed' }] } as QueryResult
  })

  await assert.rejects(
    completeGameSession(unknownPool, validSessionId, 0, 0),
    (error: unknown) => error instanceof ApiError && error.statusCode === 404,
  )
  await assert.rejects(
    completeGameSession(completedPool, validSessionId, 0, 0),
    (error: unknown) => error instanceof ApiError && error.statusCode === 409,
  )
})

test('uses completed-only parameterized pagination for history and leaderboard', async () => {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = []
  const pool = createPool(async (text, values) => {
    calls.push({ text, values })

    if (text.includes('COUNT(*)')) {
      return { rows: [{ total: '3' }] } as QueryResult
    }

    return {
      rows: [
        {
          session_id: validSessionId,
          score: 500,
          lines_cleared: 4,
          started_at: new Date('2026-01-01T00:00:00Z'),
          completed_at: new Date('2026-01-01T00:01:00Z'),
        },
      ],
    } as QueryResult
  })

  const history = await listCompletedGameSessions(pool, '2', '1')
  const leaderboard = await listLeaderboard(pool, '2', '1')

  assert.equal(history.items.length, 1)
  assert.equal(history.totalPages, 3)
  assert.equal(leaderboard.items[0].rank, 2)
  assert.ok(calls.every(({ text }) => text.includes("status = 'completed'")))
  assert.deepEqual(calls[0].values, [1, 1])
  assert.deepEqual(calls[2].values, [1, 1])
})

test('returns zero-safe aggregate statistics for an empty result', async () => {
  const pool = createPool(async () => ({
    rows: [
      {
        total_completed_games: '0',
        highest_score: '0',
        average_score: '0',
        total_lines_cleared: '0',
        most_recent_completed_at: null,
      },
    ],
  }) as QueryResult)

  assert.deepEqual(await getGameSessionStats(pool), {
    totalCompletedGames: 0,
    highestScore: 0,
    averageScore: 0,
    totalLinesCleared: 0,
    mostRecentCompletedAt: null,
  })
})

test('returns a safe error when the database is unavailable', async () => {
  await assert.rejects(
    listLeaderboard(null, undefined, undefined),
    (error: unknown) =>
      error instanceof ApiError &&
      error.statusCode === 503 &&
      error.message === 'Database is not configured',
  )
})

test('returns safe responses for malformed and oversized JSON bodies', async () => {
  const { server, baseUrl } = await startTestServer()

  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`)
    assert.equal(healthResponse.status, 200)
    assert.deepEqual(await healthResponse.json(), {
      success: true,
      message: 'BLOCK BLITZ API is running',
    })

    const databaseHealthResponse = await fetch(`${baseUrl}/api/health/db`)
    assert.equal(databaseHealthResponse.status, 503)
    assert.deepEqual(await databaseHealthResponse.json(), {
      success: false,
      database: 'unavailable',
    })

    const malformedResponse = await fetch(`${baseUrl}/api/game-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"score":',
    })
    const malformedBody = await malformedResponse.json()

    assert.equal(malformedResponse.status, 400)
    assert.deepEqual(malformedBody, {
      success: false,
      error: 'Request body must contain valid JSON',
    })

    const oversizedResponse = await fetch(`${baseUrl}/api/game-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 'x'.repeat(33 * 1024) }),
    })
    const oversizedBody = await oversizedResponse.json()

    assert.equal(oversizedResponse.status, 413)
    assert.deepEqual(oversizedBody, {
      success: false,
      error: 'Request body is too large',
    })
    assert.equal(JSON.stringify(oversizedBody).includes('stack'), false)
  } finally {
    await stopTestServer(server)
  }
})

test('getUserGameHistory supports both global and user-specific history queries', async () => {
  const executedQueries: Array<{ text: string; values?: readonly unknown[] }> = []
  const pool = createPool(async (text, values) => {
    executedQueries.push({ text, values })
    if (text.includes('COUNT(*)')) {
      return { rows: [{ total: '0' }], rowCount: 1 } as QueryResult
    }
    return { rows: [], rowCount: 0 } as QueryResult
  })

  // Global history (no userId)
  const globalResult = await getUserGameHistory(pool, undefined, 1, 10)
  assert.equal(globalResult.page, 1)
  assert.equal(globalResult.total, 0)
  assert.ok(executedQueries[0].text.includes('WHERE status = $1'))
  assert.deepEqual(executedQueries[0].values, ['completed', 10, 0])

  // User-specific history
  executedQueries.length = 0
  const userResult = await getUserGameHistory(pool, validSessionId, 2, 5)
  assert.equal(userResult.page, 2)
  assert.equal(userResult.total, 0)
  assert.ok(executedQueries[0].text.includes('WHERE user_id = $1 AND status = $2'))
  assert.deepEqual(executedQueries[0].values, [validSessionId, 'completed', 5, 5])
})

