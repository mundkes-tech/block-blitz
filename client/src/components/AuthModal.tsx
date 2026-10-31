import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { login, register } from '../services/authApi'
import type { UserProfile } from '../services/gameSessionsApi'
import './authModal.css'

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && modalRef.current) {
        const nodes = modalRef.current.querySelectorAll<HTMLElement>('button, input')
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (mode === 'register' && (!name.trim() || name.trim().length < 2)) {
      setFieldErrors({ name: 'Player name must be at least 2 characters.' })
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setFieldErrors({ email: 'Please enter a valid email address.' })
      return
    }

    if (!password || password.length < 6) {
      setFieldErrors({ password: 'Password must be at least 6 characters long.' })
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
      <div className="bb-auth-modal" ref={modalRef}>
        <header className="bb-auth-modal__header">
          <div className="modal-title-group">
            <span className="bb-auth-modal__eyebrow">PLAYER IDENTITY</span>
            <h2 id="auth-modal-title">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          </div>
          <button
            className="bb-auth-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tab switcher: Login / Register */}
        <div className="bb-auth-modal__tabs" role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`bb-auth-modal__tab${mode === 'login' ? ' is-active' : ''}`}
            onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setMode('register') } }}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`bb-auth-modal__tab${mode === 'register' ? ' is-active' : ''}`}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setMode('login') } }}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bb-auth-modal__error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form className="bb-auth-modal__form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="bb-auth-modal__field">
              <label htmlFor="auth-name">Player name</label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. NeonStriker"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={fieldErrors.name ? 'auth-name-error' : undefined}
                required
                maxLength={30}
              />
              {fieldErrors.name && <small id="auth-name-error" className="bb-auth-modal__field-error">{fieldErrors.name}</small>}
            </div>
          )}

          <div className="bb-auth-modal__field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="player@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
              required
            />
            {fieldErrors.email && <small id="auth-email-error" className="bb-auth-modal__field-error">{fieldErrors.email}</small>}
          </div>

          <div className="bb-auth-modal__field">
            <label htmlFor="auth-password">Password</label>
            <div className="bb-auth-modal__password">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === 'register' ? 'auth-password-hint' : fieldErrors.password ? 'auth-password-error' : undefined}
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            {mode === 'register' && <small id="auth-password-hint" className="bb-auth-modal__hint">min 6 characters</small>}
            {fieldErrors.password && <small id="auth-password-error" className="bb-auth-modal__field-error">{fieldErrors.password}</small>}
          </div>

          <button
            type="submit"
            className="bb-auth-modal__submit"
            disabled={loading}
          >
            {loading ? <span className="bb-auth-modal__spinner" aria-label="Loading" /> : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <footer className="bb-auth-modal__footer">
          <p>
            {mode === 'login'
              ? 'New here? '
              : 'Already have an account? '}
            <button
              type="button"
              className="bb-auth-modal__switch"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </footer>
      </div>
    </div>
  )
}
