import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type { Pool } from 'pg'
import { loadConfig, type AppConfig } from './config.js'
import { checkDatabase, createDatabasePool } from './db/pool.js'
import { ApiError } from './errors.js'
import {
  leaderboardController,
  myRankController,
} from './controllers/gameSessions.js'
import { requireAuth } from './middleware/auth.js'
import { createGameSessionRouter } from './routes/gameSessions.js'
import { createGamesRouter } from './routes/games.js'
import { createAuthRouter } from './routes/auth.js'

export function createApp(
  config: AppConfig = loadConfig(),
  databasePool: Pool | null = createDatabasePool(config),
) {
  const app = express()

  const allowedOrigins = new Set(config.clientOrigins)

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true)
        } else if (
          process.env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          callback(null, true)
        } else {
          callback(new Error('Origin is not allowed by CORS'))
        }
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'BLOCK BLITZ API is running',
    })
    app.get('/health', (_req: Request, res: Response) => {
      res.json({ success: true, message: 'BLOCK BLITZ API is running' })
    })
  })

  app.get('/api/health/db', async (_req: Request, res: Response) => {
    const healthy = await checkDatabase(databasePool)

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      database: healthy ? 'ready' : 'unavailable',
    })
  })

  app.use('/api/game-sessions', createGameSessionRouter(databasePool))
  app.use('/api/games', createGamesRouter(databasePool))
  app.use('/api/auth', createAuthRouter(databasePool))
  app.get('/api/leaderboard/me', requireAuth(databasePool), myRankController(databasePool))
  app.get('/api/leaderboard', leaderboardController(databasePool))
  app.get('/api/games/leaderboard', leaderboardController(databasePool))

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (
      error instanceof SyntaxError &&
      'body' in error
    ) {
      res.status(400).json({
        success: false,
        error: 'Request body must contain valid JSON',
      })
      return
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      res.status(413).json({
        success: false,
        error: 'Request body is too large',
      })
      return
    }

    const statusCode = error instanceof ApiError ? error.statusCode : 500
    const message =
      error instanceof ApiError ? error.message : 'Internal server error'

    if (statusCode === 500) {
      console.error('Unhandled request error:', error)
    }

    res.status(statusCode).json({
      success: false,
      error: message,
    })
  }

  app.use(errorHandler)

  return app
}
