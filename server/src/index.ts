import type { Server } from 'node:http'
import { loadConfig } from './config.js'
import { createDatabasePool } from './db/pool.js'
import { initializeDatabase } from './db/migrations.js'
import { createApp } from './app.js'

const config = loadConfig()
const databasePool = createDatabasePool(config)

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

  const server = createApp(config, databasePool).listen(config.port, () => {
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
