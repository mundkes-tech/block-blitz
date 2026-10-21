import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type { Server } from 'node:http'
import { loadConfig } from './config.js'
import { checkDatabase, createDatabasePool } from './db/pool.js'
import { initializeDatabase } from './db/migrations.js'
import { ApiError } from './errors.js'
import { createGameSessionRouter } from './routes/gameSessions.js'

const config = loadConfig()
const databasePool = createDatabasePool(config)

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.clientUrl }))
  app.use(express.json())

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

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        success: false,
        error: 'Request body must contain valid JSON',
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

async function startServer(): Promise<{
  server: Server
  shutdown: () => Promise<void>
}> {
  try {
    await initializeDatabase(databasePool)
    if (databasePool) {
      console.log('Database schema is ready')
    } else {
      console.warn('DATABASE_URL is not configured; database features are unavailable')
    }
  } catch {
    console.error('Database initialization failed; continuing without readiness')
  }

  const server = createApp().listen(config.port, () => {
    console.log(`BLOCK BLITZ API running on port ${config.port}`)
  })

  const shutdown = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    await databasePool?.end()
  }

  return { server, shutdown }
}

void startServer()
  .then(({ shutdown }) => {
    process.once('SIGINT', () => {
      void shutdown().then(() => process.exit(0))
    })

    process.once('SIGTERM', () => {
      void shutdown().then(() => process.exit(0))
    })
  })
  .catch(() => {
    console.error('Server failed to start')
    process.exitCode = 1
  })
