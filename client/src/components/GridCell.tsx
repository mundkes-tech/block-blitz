import { memo, type CSSProperties } from 'react'
import type { BlockPattern } from '../game/shapes'

type GridCellProps = {
  occupied: boolean
  color?: string | null
  pattern?: BlockPattern | null
  preview?: 'valid' | 'invalid'
  previewColor?: string | null
  previewPattern?: BlockPattern | null
  effect?: 'placement' | 'line-clear' | 'multi-line' | 'about-to-clear'
  isHammerTarget?: boolean
  locked?: boolean
  onClick?: () => void
}

function renderPatternSvg(pattern: BlockPattern | undefined | null) {
  if (!pattern) return null

  switch (pattern) {
    case 'dots':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.45" />
          <circle cx="6" cy="6" r="1.5" fill="currentColor" fillOpacity="0.3" />
          <circle cx="18" cy="18" r="1.5" fill="currentColor" fillOpacity="0.3" />
        </svg>
      )
    case 'stripes-diag':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="0" y1="24" x2="24" y2="0" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.35" />
          <line x1="-6" y1="18" x2="18" y2="-6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
          <line x1="6" y1="30" x2="30" y2="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
        </svg>
      )
    case 'grid':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
        </svg>
      )
    case 'cross':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
        </svg>
      )
    case 'rings':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.4" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
        </svg>
      )
    case 'diamond':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.45" />
        </svg>
      )
    case 'spark':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,2 14,9 21,12 14,15 12,22 10,15 3,12 10,9" fill="currentColor" fillOpacity="0.35" />
        </svg>
      )
    case 'stripes-h':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.35" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.35" />
        </svg>
      )
    default:
      return null
  }
}

function GridCell({
  occupied,
  color,
  pattern,
  preview,
  previewColor,
  previewPattern,
  effect,
  isHammerTarget,
  locked,
  onClick,
}: GridCellProps) {
  const previewClass = preview ? ` grid-cell--preview-${preview}` : ''
  const effectClass = effect ? ` grid-cell--effect-${effect}` : ''
  const hammerClass = isHammerTarget ? ' grid-cell--hammer-target' : ''
  const lockedClass = locked ? ' grid-cell--locked' : ''

  const style: CSSProperties = {}
  let activePattern: BlockPattern | null | undefined = null

  if (occupied && color) {
    style.backgroundColor = color
    style.borderColor = 'rgba(255, 255, 255, 0.45)'
    style.boxShadow = `inset 0 2px 3px rgba(255, 255, 255, 0.35), inset 0 -2px 3px rgba(0, 0, 0, 0.35), 0 2px 8px ${color}55`
    activePattern = pattern
  } else if (preview === 'valid' && previewColor) {
    style.borderColor = previewColor
    style.backgroundColor = `${previewColor}38`
    style.boxShadow = `0 0 12px ${previewColor}77`
    activePattern = previewPattern
  } else if (preview === 'invalid') {
    style.borderColor = '#ef4444'
    style.backgroundColor = 'rgba(239, 68, 68, 0.22)'
  }

  const ariaDescription = occupied
    ? `Occupied cell, ${pattern || 'solid'}`
    : preview === 'valid'
      ? 'Valid placement cell'
      : preview === 'invalid'
        ? 'Invalid placement cell'
        : 'Empty cell'

  return (
    <div
      className={`grid-cell${occupied ? ' grid-cell--occupied' : ''}${previewClass}${effectClass}${hammerClass}${lockedClass}`}
      style={style}
      onClick={locked ? undefined : onClick}
      role="gridcell"
      aria-label={ariaDescription}
      aria-disabled={locked}
    >
      {/* Pattern texture overlay for color-blind accessibility */}
      {renderPatternSvg(activePattern)}

      {/* Hammer crosshair targeting indicator */}
      {isHammerTarget && (
        <span className="cell-hammer-crosshair" aria-hidden="true">
          🔨
        </span>
      )}
    </div>
  )
}

export default memo(GridCell)
