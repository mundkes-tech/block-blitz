import type { BlockPattern } from '../game/shapes'

export function BlockPatternSvg({ pattern }: { pattern?: BlockPattern | null }) {
  if (!pattern) return null

  switch (pattern) {
    case 'dots':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.45" />
          <circle cx="6" cy="6" r="1.5" fill="currentColor" fillOpacity="0.3" />
          <circle cx="18" cy="18" r="1.5" fill="currentColor" fillOpacity="0.3" />
        </svg>
      )
    case 'stripes-diag':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="0" y1="24" x2="24" y2="0" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.35" />
          <line x1="-6" y1="18" x2="18" y2="-6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
          <line x1="6" y1="30" x2="30" y2="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
        </svg>
      )
    case 'grid':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
        </svg>
      )
    case 'cross':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
        </svg>
      )
    case 'rings':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.4" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
        </svg>
      )
    case 'diamond':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.45" />
        </svg>
      )
    case 'spark':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12,2 14,9 21,12 14,15 12,22 10,15 3,12 10,9" fill="currentColor" fillOpacity="0.35" />
        </svg>
      )
    case 'stripes-h':
      return (
        <svg className="cell-pattern-svg" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.35" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.35" />
        </svg>
      )
    default:
      return null
  }
}

