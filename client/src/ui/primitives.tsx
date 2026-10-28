import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react'

/* ==========================================================================
   ANIMATED NUMBER (Count-up under 300ms, CLS = 0 with tabular numbers)
   ========================================================================== */
export type AnimatedNumberProps = {
  value: number
  durationMs?: number
  className?: string
  formatter?: (n: number) => string
}

export function AnimatedNumber({
  value,
  durationMs = 280,
  className = '',
  formatter = (n) => Math.round(n).toLocaleString(),
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)
  const startTimeRef = useRef<number | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const startValue = prevValueRef.current
    const diff = value - startValue

    if (diff === 0) {
      setDisplayValue(value)
      return
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(1, elapsed / durationMs)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = startValue + diff * ease

      setDisplayValue(current)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        prevValueRef.current = value
        startTimeRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
      prevValueRef.current = value
      startTimeRef.current = null
    }
  }, [value, durationMs])

  return (
    <span
      className={`tabular-nums inline-block tracking-tight ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatter(displayValue)}
    </span>
  )
}

/* ==========================================================================
   BUTTON PRIMITIVE
   ========================================================================== */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'ui-button inline-flex items-center justify-center font-semibold transition-all select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
  const variantClass = `ui-button--${variant}`
  const sizeClass = `ui-button--${size}`

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
    >
      {isLoading ? (
        <span className="ui-spinner mr-2" aria-hidden="true" />
      ) : icon ? (
        <span className="ui-button__icon mr-2" aria-hidden="true">{icon}</span>
      ) : null}
      <span className="ui-button__content">{children}</span>
    </button>
  )
}

/* ==========================================================================
   PANEL / CARD PRIMITIVE
   ========================================================================== */
export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  glow?: boolean
  elevation?: 'flat' | 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Panel({
  glow = false,
  elevation = 'md',
  className = '',
  children,
  ...props
}: PanelProps) {
  return (
    <div
      {...props}
      className={`ui-panel ui-panel--elevation-${elevation}${glow ? ' ui-panel--glow' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

/* ==========================================================================
   TOGGLE PRIMITIVE (role="switch")
   ========================================================================== */
export type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
  className?: string
  id?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
  className = '',
  id,
}: ToggleProps) {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <label
      htmlFor={toggleId}
      className={`ui-toggle flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="ui-toggle__label-group flex items-center gap-2">
        {icon && <span className="ui-toggle__icon" aria-hidden="true">{icon}</span>}
        <div>
          <span className="ui-toggle__label font-medium text-sm text-slate-200 block">{label}</span>
          {description && (
            <span className="ui-toggle__desc text-xs text-slate-400 block">{description}</span>
          )}
        </div>
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`ui-switch relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
          checked ? 'bg-emerald-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  )
}

/* ==========================================================================
   MODAL PRIMITIVE (Focus trapped, Escape key to close, WCAG 2.2 compliant)
   ========================================================================== */
export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  maxWidth = 'md',
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  // Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return

    previousActiveElementRef.current = document.activeElement as HTMLElement

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Focus first focusable element
    const timer = setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      firstFocusable?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
      previousActiveElementRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modal-title"
        className={`ui-modal-card ui-modal--${maxWidth} w-full max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl overflow-hidden ${className}`}
      >
        <header className="ui-modal-header flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            {eyebrow && (
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block">
                {eyebrow}
              </span>
            )}
            <h2 id="ui-modal-title" className="text-lg font-bold text-slate-100">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="ui-modal-close p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </header>

        <div className="ui-modal-body p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {footer && (
          <footer className="ui-modal-footer px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   BADGE PRIMITIVE
   ========================================================================== */
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'

export type BadgeProps = {
  variant?: BadgeVariant
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'neutral',
  icon,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${variant} inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${className}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

/* ==========================================================================
   PROGRESS BAR PRIMITIVE
   ========================================================================== */
export type ProgressBarProps = {
  value: number
  max?: number
  label?: string
  showText?: boolean
  variant?: 'primary' | 'secondary' | 'accent'
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showText = false,
  variant = 'primary',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  return (
    <div className={`ui-progress-wrapper w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-300">
          <span>{label}</span>
          {showText && <span>{percentage}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
        className="ui-progress-track h-2 w-full rounded-full bg-slate-800/80 overflow-hidden"
      >
        <div
          className={`ui-progress-fill ui-progress-fill--${variant} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/* ==========================================================================
   TOAST NOTIFICATION PRIMITIVE
   ========================================================================== */
export type ToastProps = {
  title: string
  message?: string
  icon?: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  onDismiss?: () => void
}

export function Toast({
  title,
  message,
  icon,
  variant = 'info',
  onDismiss,
}: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`ui-toast ui-toast--${variant} flex items-start gap-3 p-4 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-xl backdrop-blur-md animate-slide-up max-w-sm`}
    >
      {icon && <span className="ui-toast__icon text-lg" aria-hidden="true">{icon}</span>}
      <div className="flex-1 min-w-0">
        <strong className="block text-sm font-semibold text-slate-100">{title}</strong>
        {message && <p className="text-xs text-slate-400 mt-0.5">{message}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 p-1"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  )
}
