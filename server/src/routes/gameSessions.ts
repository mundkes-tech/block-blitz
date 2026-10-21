import { Router } from 'express'
import type { Pool } from 'pg'
import {
  completeSessionController,
  createSessionController,
} from '../controllers/gameSessions.js'

export function createGameSessionRouter(pool: Pool | null): Router {
  const router = Router()

  router.post('/', createSessionController(pool))
  router.patch('/:sessionId/result', completeSessionController(pool))

  return router
}
