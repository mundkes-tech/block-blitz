type GridCellProps = {
  occupied: boolean
  preview?: 'valid' | 'invalid'
}

function GridCell({ occupied, preview }: GridCellProps) {
  const previewClass = preview ? ` grid-cell--preview-${preview}` : ''

  return (
    <div
      className={`grid-cell${occupied ? ' grid-cell--occupied' : ''}${previewClass}`}
      aria-label={occupied ? 'Occupied cell' : 'Empty cell'}
    />
  )
}

export default GridCell
