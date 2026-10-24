import { Router } from 'express'
import type { Pool } from 'pg'
import {
  listUsersController,
  userProfileController,
} from '../controllers/gameSessions.js'

export function createAuthRouter(pool: Pool | null): Router {
  const router = Router()

  // Section 27, 34, 35: Authentication & Profile endpoints
  router.get('/users', listUsersController(pool))
  router.get('/me', (req, res) => {
    // If no userId query provided, default to demo intern user
    if (!req.query.userId) {
      req.query.userId = '00000000-0000-4000-8000-000000000001'
    }
    return userProfileController(pool)(req, res)
  })
  router.get('/profile/:userId', userProfileController(pool))

  return router
}
