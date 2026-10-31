import { Router } from 'express'
import type { Pool } from 'pg'
import {
  completeSessionController,
  createSessionController,
  statsController,
  userHistoryController,
} from '../controllers/gameSessions.js'
import { requireAuth } from '../middleware/auth.js'

export function createGamesRouter(pool: Pool | null): Router {
  const router = Router()
  router.use(requireAuth(pool))

  // Section 30 & 35: Suggested Game Session API
  router.post('/start', createSessionController(pool))
  router.post('/complete', (req, res) => {
    // Allows either /api/games/complete with sessionId in body, or standard params
    const body = req.body as { sessionId?: string } | undefined
    const params = req.params as Record<string, string>
    if (body?.sessionId && !params.sessionId) {
      params.sessionId = body.sessionId
    }
    return completeSessionController(pool)(req, res)
  })
  router.post('/:sessionId/complete', completeSessionController(pool))
  router.get('/history', userHistoryController(pool))
  router.get('/stats', statsController(pool))

  return router
}
