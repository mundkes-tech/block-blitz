import { useEffect } from 'react'

type DailyChallengeModalProps = {
  isOpen: boolean
  onClose: () => void
  currentLinesCleared: number
  targetLines?: number
  onPlay: () => void
}

export function DailyChallengeModal({
  isOpen,
  onClose,
  currentLinesCleared,
  targetLines = 10,
  onPlay,
}: DailyChallengeModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const progressPercent = Math.min(100, Math.round((currentLinesCleared / targetLines) * 100))
  const isCompleted = currentLinesCleared >= targetLines

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card challenge-card animate-scale-up">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">DAILY MISSION</span>
            <h2 id="challenge-title">🎯 DAILY CHALLENGE</h2>
          </div>
          <button
            className="icon-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close daily challenge modal"
          >
            ✕
          </button>
        </header>

        <div className="challenge-body">
          <div className="challenge-badge-icon" aria-hidden="true">
            {isCompleted ? '🏆' : '⚡'}
          </div>
          <h3>Goal: Clear {targetLines} Lines Today</h3>
          <p className="challenge-desc">
            Put your spatial block puzzle skills to the test. Form rows and columns across matches to fill today's quota!
          </p>

          <div className="challenge-progress-bar-container">
            <div className="progress-info-row">
              <span>Today's Progress</span>
              <strong className="tabular-nums font-mono">
                {Math.min(currentLinesCleared, targetLines)} / {targetLines} Lines
              </strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={currentLinesCleared}
              aria-valuemin={0}
              aria-valuemax={targetLines}
              aria-label="Daily lines cleared progress"
            >
              <div
                className={`progress-fill${isCompleted ? ' progress-fill--complete' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {isCompleted ? (
            <div className="challenge-reward-banner animate-fade-in" role="status">
              <span>🎉 MISSION ACCOMPLISHED!</span>
              <p>Outstanding work! You've successfully cleared the 10-line daily challenge quota.</p>
            </div>
          ) : (
            <p className="challenge-hint">
              {targetLines - currentLinesCleared} more lines needed to complete today's mission.
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              onClose()
              onPlay()
            }}
          >
            {isCompleted ? 'Play Again' : 'Play Mission'}
          </button>
          <button className="secondary-button" type="button" onClick={onClose}>
            Back
          </button>
        </footer>
      </div>
    </div>
  )
}
