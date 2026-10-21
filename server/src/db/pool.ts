import { Pool, type PoolConfig } from 'pg'
import type { AppConfig } from '../config.js'

export function createDatabasePool(config: AppConfig): Pool | null {
  if (!config.databaseUrl) {
    return null
  }

  const poolConfig: PoolConfig = {
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  }

  const pool = new Pool(poolConfig)
  pool.on('error', () => {
    console.error('Unexpected database client error')
  })

  return pool
}

export async function checkDatabase(pool: Pool | null): Promise<boolean> {
  if (!pool) {
    return false
  }

  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
