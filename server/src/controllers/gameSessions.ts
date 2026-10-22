import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import {
  completeGameSession,
  createGameSession,
  getGameSessionStats,
  listCompletedGameSessions,
} from '../services/gameSessions.js'

export function listSessionsController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const result = await listCompletedGameSessions(
      pool,
      req.query.page,
      req.query.pageSize,
    )

    res.json({
      success: true,
      data: {
        items: result.items.map((session) => ({
          sessionId: session.sessionId,
          score: session.score,
          linesCleared: session.linesCleared,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
        })),
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    })
  }
}

export function statsController(pool: Pool | null) {
  return async (_req: Request, res: Response): Promise<void> => {
    const stats = await getGameSessionStats(pool)

    res.json({
      success: true,
      data: {
        totalCompletedGames: stats.totalCompletedGames,
        highestScore: stats.highestScore,
        averageScore: stats.averageScore,
        totalLinesCleared: stats.totalLinesCleared,
        mostRecentCompletedAt: stats.mostRecentCompletedAt,
      },
    })
  }
}

export function createSessionController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const session = await createGameSession(pool, req.body?.userId)

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
      },
    })
  }
}

export function completeSessionController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const session = await completeGameSession(
      pool,
      req.params.sessionId,
      req.body?.score,
      req.body?.linesCleared,
    )

    res.json({
      success: true,
      data: {
        sessionId: session.session_id,
        status: session.status,
        score: session.score,
        linesCleared: session.lines_cleared,
        startedAt: session.started_at,
        completedAt: session.completed_at,
      },
    })
  }
}
