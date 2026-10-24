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
  if (!isOpen) return null

  const progressPercent = Math.min(100, Math.round((currentLinesCleared / targetLines) * 100))
  const isCompleted = currentLinesCleared >= targetLines

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
      <div className="modal-card challenge-card">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">DAILY MISSION</span>
            <h2 id="challenge-title">🎯 DAILY CHALLENGE</h2>
          </div>
          <button className="icon-close-btn" type="button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        <div className="challenge-body">
          <div className="challenge-badge-icon">{isCompleted ? '🏆' : '⚡'}</div>
          <h3>Goal: Clear {targetLines} Lines Today</h3>
          <p className="challenge-desc">
            Put your block puzzle skills to the test. Form rows and columns to fill the quota!
          </p>

          <div className="challenge-progress-bar-container">
            <div className="progress-info-row">
              <span>Progress</span>
              <strong>
                {Math.min(currentLinesCleared, targetLines)} / {targetLines} Lines
              </strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {isCompleted ? (
            <div className="challenge-reward-banner">
              <span>🎉 CHALLENGE COMPLETED!</span>
              <p>Awesome work! You earned the Master Blitzer badge for today.</p>
            </div>
          ) : (
            <p className="challenge-hint">
              {targetLines - currentLinesCleared} more lines needed to complete today's mission!
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
            {isCompleted ? 'Play More' : 'Play Challenge'}
          </button>
          <button className="secondary-button" type="button" onClick={onClose}>
            Back
          </button>
        </footer>
      </div>
    </div>
  )
}
