import { loadConfig } from './config.js'
import { createDatabasePool } from './db/pool.js'
import { initializeDatabase } from './db/migrations.js'

const config = loadConfig()
const pool = createDatabasePool(config)

if (!pool) {
  throw new Error('DATABASE_URL is required to run migrations')
}

void initializeDatabase(pool)
  .then(async () => {
    await pool.end()
    console.log('Database migrations completed')
  })
  .catch(async (error) => {
    await pool.end()
    console.error('Database migrations failed', error)
    process.exitCode = 1
  })
