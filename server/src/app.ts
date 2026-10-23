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
import { leaderboardController } from './controllers/gameSessions.js'
import { createGameSessionRouter } from './routes/gameSessions.js'

export function createApp(
  config: AppConfig = loadConfig(),
  databasePool: Pool | null = createDatabasePool(config),
) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.clientUrl }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'BLOCK BLITZ API is running',
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
  app.get('/api/leaderboard', leaderboardController(databasePool))

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
      console.error('Unhandled request error')
    }

    res.status(statusCode).json({
      success: false,
      error: message,
    })
  }

  app.use(errorHandler)

  return app
}
