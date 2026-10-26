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
    <aside className="desktop-sidebar desktop-sidebar--right piece-dock-sidebar" aria-label="Generated blocks dock">
      <div className="sidebar-card piece-dock-card">
        <header className="sidebar-card-header">
          <span className="eyebrow">⚡ GENERATED BLOCKS</span>
          <span className="piece-count-badge">
            {pieces.length} {pieces.length === 1 ? 'BLOCK' : 'BLOCKS'} READY
          </span>
        </header>

        <div className="piece-dock-list">
          {pieces.length === 0 ? (
            <div className="piece-dock-empty">
              <span className="dock-empty-spinner">🔄</span>
              <p>Drawing new pieces…</p>
            </div>
          ) : (
            pieces.map((piece, index) => {
              const dimensions = getShapeDimensions(piece.shape)
              const isDragging = activePieceId === piece.id
              const gridStyle = {
                '--piece-rows': dimensions.rows,
                '--piece-cols': dimensions.cols,
              } as CSSProperties

              return (
                <div className="piece-dock-slot" key={piece.id}>
                  <div className="piece-slot-header">
                    <span className="piece-slot-tag">Slot {index + 1}</span>
                    <span className="piece-shape-name">{piece.shape.name}</span>
                  </div>

                  <div
                    className={`piece-preview piece-preview--dock${isDragging ? ' piece-preview--active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${piece.shape.name} piece in slot ${index + 1}`}
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
                            boxShadow: `inset 0 1px 3px rgba(255, 255, 255, 0.45), 0 2px 6px ${piece.shape.color}88`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <footer className="piece-dock-tip">
          <span className="dock-tip-icon">💡</span>
          <p className="sidebar-hint">Tip: Clear simultaneous rows and columns for huge combo score multipliers!</p>
        </footer>
      </div>
    </aside>
  )
}

export default PieceTray

