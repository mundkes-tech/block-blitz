import { memo, type CSSProperties } from 'react'
import type { BlockPattern } from '../game/shapes'
import { BlockPatternSvg } from './BlockPatternSvg'

type GridCellProps = {
  row?: number
  col?: number
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

function GridCell({
  occupied,
  row,
  col,
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

  const position = row !== undefined && col !== undefined
    ? `Board cell row ${row + 1}, column ${col + 1}`
    : 'Board cell'
  const ariaDescription = occupied
    ? `${position}, occupied cell, ${pattern || 'solid'}`
    : preview === 'valid'
      ? `${position}, valid`
      : preview === 'invalid'
        ? `${position}, invalid`
        : `${position}, empty`

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
      <BlockPatternSvg pattern={activePattern} />

      {/* Subtle tactile dot for empty cell matrix */}
      {!occupied && !preview && (
        <span className="cell-empty-dot" aria-hidden="true" />
      )}

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
