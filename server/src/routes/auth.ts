import { Router, type Request, type Response } from 'express'
import type { Pool } from 'pg'
import {
  loginUser,
  registerUser,
} from '../services/auth.js'
import { userProfileController } from '../controllers/gameSessions.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export function createAuthRouter(pool: Pool | null): Router {
  const router = Router()

  // Registration endpoint
  router.post('/register', async (req: Request, res: Response): Promise<void> => {
    const result = await registerUser(
      pool,
      req.body?.name,
      req.body?.email,
      req.body?.password,
    )
    res.status(201).json({
      success: true,
      data: result,
      message: 'Account created successfully',
    })
  })

  // Login endpoint
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const result = await loginUser(
      pool,
      req.body?.email,
      req.body?.password,
    )
    res.json({
      success: true,
      data: result,
      message: 'Signed in successfully',
    })
  })

  // Get currently logged-in user profile
  router.get('/me', requireAuth(pool), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: req.user,
    })
  })

  // Logout endpoint (client clears stored token)
  router.post('/logout', (_req: Request, res: Response): void => {
    res.json({
      success: true,
      message: 'Logged out successfully',
    })
  })

  // Public user profile lookup
  router.get('/profile/:userId', userProfileController(pool))

  return router
}
