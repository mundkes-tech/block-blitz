import type { CSSProperties, PointerEvent } from 'react'
import type { Piece } from '../game/shapes'
import { getShapeDimensions } from '../game/shapes'

type PieceTrayProps = {
  pieces: Piece[]
  activePieceId?: string | null
  onPointerDown: (piece: Piece, event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void
}

function PieceTray({
  pieces,
  activePieceId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PieceTrayProps) {
  return (
    <section className="piece-tray" aria-label="Available pieces">
      <div className="piece-tray-header">
        <h2 className="piece-tray-title">AVAILABLE BLOCKS</h2>
        <span className="piece-count-badge">{pieces.length} remaining</span>
      </div>
      <div className="piece-list">
        {pieces.map((piece) => {
          const dimensions = getShapeDimensions(piece.shape)
          const isDragging = activePieceId === piece.id
          const gridStyle = {
            '--piece-rows': dimensions.rows,
            '--piece-cols': dimensions.cols,
          } as CSSProperties

          return (
            <div
              className={`piece-preview${isDragging ? ' piece-preview--active' : ''}`}
              key={piece.id}
              role="button"
              tabIndex={0}
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
                    style={{
                      gridRow: row + 1,
                      gridColumn: col + 1,
                      backgroundColor: piece.shape.color,
                      boxShadow: `inset 0 1px 3px rgba(255, 255, 255, 0.45), 0 2px 4px ${piece.shape.color}88`,
                    }}
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
