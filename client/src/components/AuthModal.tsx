import { useEffect, useState, type FormEvent } from 'react'
import { login, register } from '../services/authApi'
import type { UserProfile } from '../services/gameSessionsApi'

type AuthModalProps = {
  isOpen: boolean
  initialMode?: 'login' | 'register'
  onClose: () => void
  onSuccess: (user: UserProfile) => void
}

export function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && (!name.trim() || name.trim().length < 2)) {
      setError('Player name must be at least 2 characters.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const result = await register(name.trim(), email.trim(), password)
        onSuccess(result.user)
      } else {
        const result = await login(email.trim(), password)
        onSuccess(result.user)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card auth-card animate-scale-up">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">PLAYER IDENTITY</span>
            <h2 id="auth-modal-title">
              {mode === 'login' ? '🔐 SIGN IN' : '⚡ REGISTER BLITZER'}
            </h2>
          </div>
          <button
            className="icon-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </header>

        {/* Tab switcher: Login / Register */}
        <div className="auth-tabs" role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`tab-btn${mode === 'login' ? ' tab-btn--active' : ''}`}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`tab-btn${mode === 'register' ? ' tab-btn--active' : ''}`}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="auth-error-banner animate-fade-in" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Player Name / Handle</label>
              <input
                id="auth-name"
                type="text"
                autoComplete="nickname"
                placeholder="e.g. NeonStriker"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={30}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="player@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password (min 6 characters)</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="primary-button btn-large w-full mt-4"
            disabled={loading}
          >
            {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In to Play' : 'Create Blitzer Account'}
          </button>
        </form>

        <footer className="auth-footer">
          <p className="auth-hint">
            {mode === 'login'
              ? "Don't have an account yet? "
              : 'Already have an existing profile? '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>
        </footer>
      </div>
    </div>
  )
}
