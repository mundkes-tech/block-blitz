import { Router } from 'express'
import type { Pool } from 'pg'
import {
  completeSessionController,
  createSessionController,
  listSessionsController,
  statsController,
} from '../controllers/gameSessions.js'
import { requireAuth } from '../middleware/auth.js'

export function createGameSessionRouter(pool: Pool | null): Router {
  const router = Router()
  router.use(requireAuth(pool))

  router.get('/', listSessionsController(pool))
  router.get('/stats', statsController(pool))
  router.post('/', createSessionController(pool))
  router.patch('/:sessionId/result', completeSessionController(pool))

  return router
}
