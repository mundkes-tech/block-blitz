import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import {
  completeGameSession,
  createGameSession,
  getGameSessionStats,
  getPlayerRank,
  getUserGameHistory,
  getUserProfile,
  listCompletedGameSessions,
  listLeaderboard,
  listUsers,
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
          userId: session.userId,
          score: session.score,
          linesCleared: session.linesCleared,
          blocksPlaced: session.blocksPlaced,
          highestCombo: session.highestCombo,
          duration: session.duration,
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
  return async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string | undefined
    const stats = await getGameSessionStats(pool, userId)

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

export function leaderboardController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const timeframe = (req.query.timeframe as string) || 'all'
    const result = await listLeaderboard(
      pool,
      req.query.page,
      req.query.pageSize,
      timeframe,
    )

    res.json({
      success: true,
      data: {
        items: result.items.map((entry) => ({
          rank: entry.rank,
          playerName: entry.playerName,
          userId: entry.userId,
          score: entry.score,
          linesCleared: entry.linesCleared,
          highestCombo: entry.highestCombo,
          completedAt: entry.completedAt,
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

export function myRankController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string | undefined
    if (!userId) {
      res.json({ success: true, data: null })
      return
    }

    const rankInfo = await getPlayerRank(pool, userId)
    res.json({
      success: true,
      data: rankInfo,
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
      req.body?.blocksPlaced,
      req.body?.highestCombo,
      req.body?.duration ?? req.body?.gameDuration,
      req.body?.rowsCleared,
      req.body?.columnsCleared,
    )

    res.json({
      success: true,
      data: {
        sessionId: session.session_id,
        userId: session.user_id,
        status: session.status,
        score: session.score,
        linesCleared: session.lines_cleared,
        blocksPlaced: session.blocks_placed ?? 0,
        highestCombo: session.highest_combo ?? 0,
        duration: session.duration ?? 0,
        startedAt: session.started_at,
        completedAt: session.completed_at,
      },
    })
  }
}

export function listUsersController(pool: Pool | null) {
  return async (_req: Request, res: Response): Promise<void> => {
    const users = await listUsers(pool)
    res.json({
      success: true,
      data: users,
    })
  }
}

export function userProfileController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const userId = (req.query.userId ?? req.params.userId) as string
    const user = await getUserProfile(pool, userId)
    res.json({
      success: true,
      data: user,
    })
  }
}

export function userHistoryController(pool: Pool | null) {
  return async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string | undefined
    const result = await getUserGameHistory(
      pool,
      userId,
      req.query.page,
      req.query.pageSize,
    )

    res.json({
      success: true,
      data: result,
    })
  }
}
