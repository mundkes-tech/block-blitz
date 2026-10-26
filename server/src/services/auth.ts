import crypto from 'node:crypto'
import type { Pool } from 'pg'
import { ApiError } from '../errors.js'
import type { UserProfile } from './gameSessions.js'

const SECRET_KEY = process.env.JWT_SECRET || 'block-blitz-production-auth-secret-key-2026'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requirePool(pool: Pool | null): Pool {
  if (!pool) {
    throw new ApiError(503, 'Database is not configured')
  }
  return pool
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex')
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex'),
    )
  } catch {
    return false
  }
}

export function generateToken(userId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${userId}.${timestamp}`
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
  return `${payload}.${signature}`
}

export function verifyAuthToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [userId, timestampStr, signature] = parts
  const payload = `${userId}.${timestampStr}`
  const expectedSig = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')

  try {
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex'),
    )
    if (!isSigValid) return null

    // Check expiration: 30 days
    const timestamp = Number.parseInt(timestampStr, 10)
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000) {
      return null
    }

    return userId
  } catch {
    return null
  }
}

export type AuthResponse = {
  token: string
  user: UserProfile
}

export async function registerUser(
  pool: Pool | null,
  nameRaw: unknown,
  emailRaw: unknown,
  passwordRaw: unknown,
): Promise<AuthResponse> {
  const database = requirePool(pool)

  const name = typeof nameRaw === 'string' ? nameRaw.trim() : ''
  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
  const password = typeof passwordRaw === 'string' ? passwordRaw : ''

  if (!name || name.length < 2) {
    throw new ApiError(400, 'Name must be at least 2 characters long')
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ApiError(400, 'Please provide a valid email address')
  }

  if (!password || password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long')
  }

  // Check existing user
  const existing = await database.query<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [email],
  )
  if (existing.rows.length > 0) {
    throw new ApiError(409, 'An account with this email address already exists')
  }

  const { hash, salt } = hashPassword(password)

  const result = await database.query<UserProfile & { password_hash: string }>(
    `INSERT INTO users (name, email, password_hash, password_salt)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email,
               highest_score AS "highestScore",
               total_games AS "totalGames",
               total_lines_cleared AS "totalLinesCleared",
               highest_combo AS "highestCombo",
               created_at AS "createdAt"`,
    [name, email, hash, salt],
  )

  const user = result.rows[0]
  if (!user) {
    throw new ApiError(500, 'Failed to create user account')
  }

  const token = generateToken(user.id)
  return { token, user }
}

export async function loginUser(
  pool: Pool | null,
  emailRaw: unknown,
  passwordRaw: unknown,
): Promise<AuthResponse> {
  const database = requirePool(pool)

  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
  const password = typeof passwordRaw === 'string' ? passwordRaw : ''

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required')
  }

  const result = await database.query<{
    id: string
    name: string
    email: string
    password_hash: string | null
    password_salt: string | null
    highest_score: number
    total_games: number
    total_lines_cleared: number
    highest_combo: number
    created_at: Date
  }>(
    `SELECT id, name, email, password_hash, password_salt,
            highest_score, total_games, total_lines_cleared, highest_combo, created_at
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email],
  )

  const row = result.rows[0]
  if (!row || !row.password_hash || !row.password_salt) {
    throw new ApiError(401, 'Invalid email or password')
  }

  const isValid = verifyPassword(password, row.password_hash, row.password_salt)
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password')
  }

  const user: UserProfile = {
    id: row.id,
    name: row.name,
    email: row.email,
    highestScore: row.highest_score,
    totalGames: row.total_games,
    totalLinesCleared: row.total_lines_cleared,
    highestCombo: row.highest_combo,
    createdAt: row.created_at,
  }

  const token = generateToken(user.id)
  return { token, user }
}

export async function getAuthenticatedUser(
  pool: Pool | null,
  tokenOrUserId: string,
): Promise<UserProfile | null> {
  const database = requirePool(pool)

  let userId = tokenOrUserId
  // If it's a signed token, extract user ID
  if (tokenOrUserId.includes('.')) {
    const verified = verifyAuthToken(tokenOrUserId)
    if (!verified) return null
    userId = verified
  }

  const result = await database.query<UserProfile>(
    `SELECT id, name, email,
            highest_score AS "highestScore",
            total_games AS "totalGames",
            total_lines_cleared AS "totalLinesCleared",
            highest_combo AS "highestCombo",
            created_at AS "createdAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  )

  return result.rows[0] ?? null
}
