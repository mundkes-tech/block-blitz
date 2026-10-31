import type { NextFunction, Request, Response } from 'express'
import type { Pool } from 'pg'
import { getAuthenticatedUser, verifyAuthToken } from '../services/auth.js'
import { ApiError } from '../errors.js'
import type { UserProfile } from '../services/gameSessions.js'

export type AuthenticatedRequest = Request & {
  user?: UserProfile
}

export function requireAuth(pool: Pool | null) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const userId = token ? verifyAuthToken(token) : null
    if (!userId) {
      next(new ApiError(401, 'Authentication required'))
      return
    }

    const user = await getAuthenticatedUser(pool, userId)
    if (!user) {
      next(new ApiError(401, 'Invalid or expired authentication session'))
      return
    }

    req.user = user
    next()
  }
}
