import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateToken,
  hashPassword,
  verifyAuthToken,
  verifyPassword,
} from '../src/services/auth.js'

describe('Authentication Service', () => {
  it('correctly hashes and verifies passwords using scrypt', () => {
    const password = 'SuperSecretPassword123!'
    const { hash, salt } = hashPassword(password)

    assert.ok(hash && typeof hash === 'string')
    assert.ok(salt && typeof salt === 'string')

    const isValid = verifyPassword(password, hash, salt)
    assert.equal(isValid, true, 'Original password must verify successfully')

    const isWrong = verifyPassword('WrongPassword', hash, salt)
    assert.equal(isWrong, false, 'Incorrect password must be rejected')
  })

  it('generates HMAC signed tokens and validates integrity', () => {
    const userId = '12345678-1234-4234-8234-123456789abc'
    const token = generateToken(userId)

    assert.ok(token && token.includes('.'))

    const extractedUserId = verifyAuthToken(token)
    assert.equal(extractedUserId, userId, 'Token should decode back to the original userId')

    // Tampered token must fail
    const tampered = token.slice(0, -4) + 'abcd'
    const tamperedUserId = verifyAuthToken(tampered)
    assert.equal(tamperedUserId, null, 'Tampered signature must be rejected')
  })
})
