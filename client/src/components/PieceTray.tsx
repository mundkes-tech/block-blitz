import type { CSSProperties, PointerEvent } from 'react'
import type { Piece } from '../game/shapes'
import { getShapeDimensions } from '../game/shapes'

type PieceTrayProps = {
  pieces: Piece[]
  onPointerDown: (piece: Piece, event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void
}

function PieceTray({
  pieces,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PieceTrayProps) {
  return (
    <section className="piece-tray" aria-label="Available pieces">
      <h2 className="piece-tray-title">NEXT BLOCKS</h2>
      <div className="piece-list">
        {pieces.map((piece) => {
          const dimensions = getShapeDimensions(piece.shape)
          const gridStyle = {
            '--piece-rows': dimensions.rows,
            '--piece-cols': dimensions.cols,
          } as CSSProperties

          return (
            <div
              className="piece-preview"
              key={piece.id}
              role="img"
              aria-label={`${piece.shape.name} piece`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                onPointerDown(piece, event)
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
            >
              <div className="piece-grid" style={gridStyle}>
                {piece.shape.cells.map(({ row, col }) => (
                  <span
                    className="piece-cell"
                    key={`${piece.id}-${row}-${col}`}
                    style={{ gridRow: row + 1, gridColumn: col + 1 }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PieceTray
