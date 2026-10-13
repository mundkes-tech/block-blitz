type GridCellProps = {
  occupied: boolean
}

function GridCell({ occupied }: GridCellProps) {
  return (
    <div
      className={`grid-cell${occupied ? ' grid-cell--occupied' : ''}`}
      aria-label={occupied ? 'Occupied cell' : 'Empty cell'}
    />
  )
}

export default GridCell
