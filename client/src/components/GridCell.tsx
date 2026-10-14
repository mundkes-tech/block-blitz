type GridCellProps = {
  occupied: boolean
  preview?: 'valid' | 'invalid'
  effect?: 'placement' | 'line-clear' | 'multi-line'
}

function GridCell({ occupied, preview, effect }: GridCellProps) {
  const previewClass = preview ? ` grid-cell--preview-${preview}` : ''
  const effectClass = effect ? ` grid-cell--effect-${effect}` : ''

  return (
    <div
      className={`grid-cell${occupied ? ' grid-cell--occupied' : ''}${previewClass}${effectClass}`}
      aria-label={occupied ? 'Occupied cell' : 'Empty cell'}
    />
  )
}

export default GridCell
