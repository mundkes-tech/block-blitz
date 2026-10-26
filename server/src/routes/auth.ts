import { Router, type Request, type Response } from 'express'
import type { Pool } from 'pg'
import {
  getAuthenticatedUser,
  loginUser,
  registerUser,
} from '../services/auth.js'
import { userProfileController } from '../controllers/gameSessions.js'

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
  router.get('/me', async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization
    let token: string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim()
    } else if (req.query.token) {
      token = String(req.query.token).trim()
    } else if (req.query.userId) {
      token = String(req.query.userId).trim()
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication token required',
      })
      return
    }

    const user = await getAuthenticatedUser(pool, token)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication session',
      })
      return
    }

    res.json({
      success: true,
      data: user,
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
