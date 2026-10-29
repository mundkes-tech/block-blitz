import type { CSSProperties, PointerEvent } from 'react'
import type { Piece } from '../game/shapes'
import { getShapeDimensions } from '../game/shapes'
import { BlockPatternSvg } from './BlockPatternSvg'

type PieceTrayProps = {
  pieces: Piece[]
  activePieceId?: string | null
  returningPieceId?: string | null
  locked?: boolean
  compact?: boolean
  onPointerDown: (piece: Piece, event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void
}

export function PieceTray({
  pieces,
  activePieceId,
  returningPieceId,
  locked = false,
  compact = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PieceTrayProps) {
  // We represent the 3 standard pieces slots
  const maxSlots = 3
  const slots = Array.from({ length: maxSlots }, (_, index) => pieces[index] || null)

  return (
    <section
      className={`piece-dock-container${locked ? ' piece-dock-container--locked' : ''}${
        compact ? ' piece-dock-container--compact' : ''
      }`}
      aria-label="Generated blocks dock"
    >
      <div className="piece-dock-card">
        {!compact && (
          <header className="piece-dock-header">
            <div className="dock-title-group">
              <span className="eyebrow">BLOCKS ARSENAL</span>
            </div>
            <span
              className={`piece-count-badge${pieces.length === 0 ? ' piece-count-badge--empty' : ''}`}
              aria-live="polite"
            >
              {pieces.length} / 3 READY
            </span>
          </header>
        )}

        <div className="piece-dock-list" role="group" aria-label="Available pieces for placement">
          {slots.map((piece, slotIdx) => {
            if (!piece) {
              return (
                <div
                  key={`slot-empty-${slotIdx}`}
                  className="piece-dock-slot piece-dock-slot--spent"
                  aria-label={`Slot ${slotIdx + 1}: Block placed`}
                >
                  <div className="piece-spent-indicator">
                    <span className="spent-icon" aria-hidden="true">✓</span>
                    <span className="spent-label">PLACED</span>
                  </div>
                </div>
              )
            }

            const dimensions = getShapeDimensions(piece.shape)
            const isDragging = activePieceId === piece.id
            const isReturning = returningPieceId === piece.id

            const gridStyle = {
              '--piece-rows': dimensions.rows,
              '--piece-cols': dimensions.cols,
            } as CSSProperties

            return (
              <div
                className={`piece-dock-slot${isDragging ? ' piece-dock-slot--dragging' : ''}${
                  isReturning ? ' piece-dock-slot--returning' : ''
                }`}
                key={piece.id}
              >
                <div
                  className={`piece-preview piece-preview--dock${
                    isDragging ? ' piece-preview--active' : ''
                  }${isReturning ? ' piece-preview--returning' : ''}`}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-label={`${piece.shape.name} piece, ${dimensions.rows} by ${dimensions.cols} blocks`}
                  aria-disabled={locked}
                  style={{ touchAction: 'none' }}
                  onPointerDown={(event) => {
                    if (locked) return
                    event.currentTarget.setPointerCapture(event.pointerId)
                    onPointerDown(piece, event)
                  }}
                  onPointerMove={locked ? undefined : onPointerMove}
                  onPointerUp={locked ? undefined : onPointerUp}
                  onPointerCancel={locked ? undefined : onPointerCancel}
                  onLostPointerCapture={locked ? undefined : onPointerCancel}
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
                        }}
                      >
                        {/* Tactile pattern texture for color-blind accessibility */}
                        <BlockPatternSvg pattern={piece.shape.pattern} />
                        <span className="piece-cell-shine" aria-hidden="true" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {!compact && (
          <footer className="piece-dock-tip">
            <p className="sidebar-hint">Drag blocks onto the 8×8 grid</p>
          </footer>
        )}
      </div>
    </section>
  )
}

export default PieceTray
