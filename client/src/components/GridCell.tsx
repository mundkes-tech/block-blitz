import { memo, type CSSProperties } from 'react'

type GridCellProps = {
  occupied: boolean
  color?: string | null
  preview?: 'valid' | 'invalid'
  previewColor?: string | null
  effect?: 'placement' | 'line-clear' | 'multi-line'
  isHammerTarget?: boolean
  onClick?: () => void
}

function GridCell({
  occupied,
  color,
  preview,
  previewColor,
  effect,
  isHammerTarget,
  onClick,
}: GridCellProps) {
  const previewClass = preview ? ` grid-cell--preview-${preview}` : ''
  const effectClass = effect ? ` grid-cell--effect-${effect}` : ''
  const hammerClass = isHammerTarget ? ' grid-cell--hammer-target' : ''

  const style: CSSProperties = {}
  if (occupied && color) {
    style.backgroundColor = color
    style.borderColor = 'rgba(255, 255, 255, 0.4)'
    style.boxShadow = `inset 0 2px 4px rgba(255, 255, 255, 0.35), 0 2px 6px ${color}66`
  } else if (preview === 'valid' && previewColor) {
    style.borderColor = previewColor
    style.backgroundColor = `${previewColor}44`
    style.boxShadow = `0 0 10px ${previewColor}88`
  }

  return (
    <div
      className={`grid-cell${occupied ? ' grid-cell--occupied' : ''}${previewClass}${effectClass}${hammerClass}`}
      style={style}
      onClick={onClick}
      aria-label={occupied ? 'Occupied cell' : 'Empty cell'}
    />
  )
}

export default memo(GridCell)
