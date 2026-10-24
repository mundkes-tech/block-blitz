export type ScorePopup = {
  id: number
  text: string
  subtext?: string
  color?: string
}

type FloatingScoresProps = {
  popups: ScorePopup[]
}

export function FloatingScores({ popups }: FloatingScoresProps) {
  return (
    <div className="floating-scores-container" aria-live="polite">
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="floating-score-bubble"
          style={{ color: popup.color ?? '#facc15' }}
        >
          <span className="floating-score-main">{popup.text}</span>
          {popup.subtext && (
            <span className="floating-score-sub">{popup.subtext}</span>
          )}
        </div>
      ))}
    </div>
  )
}
