import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import {
  completeGameSession,
  createGameSession,
} from '../services/gameSessions.js'

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
