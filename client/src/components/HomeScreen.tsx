import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { UserProfile, LeaderboardEntry } from '../services/gameSessionsApi'
import { fetchLeaderboard, fetchMyRank } from '../services/gameSessionsApi'
import type { PlayerLevelInfo } from '../game/achievements'
import './arcadeLobby.css'

type GameMode = 'classic' | 'blitz' | 'bomb'
type IconName = 'volume' | 'volumeOff' | 'music' | 'musicOff' | 'grid' | 'zap' | 'shield' | 'trophy' | 'chart' | 'target' | 'medal' | 'flame' | 'lock' | 'arrow' | 'wifi' | 'refresh'

type HomeScreenProps = {
  bestScore: number
  totalLinesCleared?: number
  unlockedBadgesCount?: number
  onPlay: (mode?: GameMode) => void
  currentUser?: UserProfile | null
  levelInfo?: PlayerLevelInfo
  soundEnabled: boolean
  musicEnabled: boolean
  onToggleSound: () => void
  onToggleMusic: () => void
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenChallenge: () => void
  onOpenAchievements: () => void
  onOpenAuth: () => void
}

const MODES: Array<{
  id: GameMode
  icon: IconName
  name: string
  description: string
  available: boolean
}> = [
  {
    id: 'classic',
    icon: 'grid',
    name: 'Classic Blitz',
    description: 'The timeless 8×8 block puzzle. Place, clear, and chain combos.',
    available: true,
  },
  { id: 'blitz', icon: 'lock', name: 'More modes soon', description: '', available: false },
]

const BOARD_COLORS = ['emerald', 'amber', 'pink', 'sky', 'violet']
const HERO_CELLS = new Set([
  '1:1', '1:2', '2:1', '2:2', '2:5', '2:6', '3:5', '3:6',
  '5:1', '5:2', '5:3', '6:1', '7:1', '7:2', '7:3',
  '4:4', '4:5', '4:6', '4:7', '4:8',
])

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`lobby-logo${compact ? ' lobby-logo--compact' : ''}`} aria-label="Block Blitz">
      <span>BLOCK</span> <b>BLITZ</b>
    </span>
  )
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></>,
    volumeOff: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m18 9 4 4m0-4-4 4" /></>,
    music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
    musicOff: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /><path d="m3 3 18 18" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    shield: <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" />,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 4-6" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></>,
    medal: <><circle cx="12" cy="14" r="6" /><path d="m8 3 4 5 4-5M8 3H5l3 6M16 3h3l-3 6" /></>,
    flame: <path d="M12 22c4 0 7-2.7 7-6.5 0-3.1-1.8-5.3-4.1-7.5.1 2.2-1 3.5-2.2 4.1.3-3.7-1.7-6.6-4.2-9.1C8.7 7.8 5 10.8 5 15.5 5 19.3 8 22 12 22Z" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    wifi: <><path d="M5 12.5a11 11 0 0 1 14 0M8 16a6.5 6.5 0 0 1 8 0M11 19.5a2 2 0 0 1 2 0" /><path d="m3 3 18 18" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 5v6h-6" /></>,
  }
  return <svg className="lobby-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function HeroBoard() {
  return (
    <div className="hero-board-wrap">
      <div className="hero-board" aria-hidden="true">
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8) + 1
          const col = (index % 8) + 1
          const key = `${row}:${col}`
          const filled = HERO_CELLS.has(key)
          return (
            <span
              className={`hero-board-cell${filled ? ` hero-block hero-block--${BOARD_COLORS[(row * 3 + col) % BOARD_COLORS.length]}` : ''}${row === 4 ? ' hero-board-cell--flash-row' : ''}`}
              key={key}
            />
          )
        })}
        <span className="hero-floating-score">+80</span>
        <span className="hero-particles hero-particles--one" />
        <span className="hero-particles hero-particles--two" />
        <span className="hero-particles hero-particles--three" />
      </div>
    </div>
  )
}

function ModeSwitcher({ selected, onSelect }: { selected: GameMode; onSelect: (mode: GameMode) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedMode = MODES.find((mode) => mode.id === selected) ?? MODES[0]
  return (
    <section className="lobby-mode-section" aria-label="Game mode">
      <div className="lobby-mode-switcher" role="radiogroup" aria-label="Select game mode">
        {MODES.map((mode, index) => (
          <button
            key={mode.id}
            ref={(element) => { refs.current[index] = element }}
            className={`lobby-mode-chip${selected === mode.id ? ' is-selected' : ''}${!mode.available ? ' is-soon' : ''}`}
            type="button"
            role="radio"
            aria-checked={selected === mode.id}
            aria-disabled={!mode.available}
            disabled={!mode.available}
            tabIndex={selected === mode.id ? 0 : -1}
            onClick={() => onSelect(mode.id)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? MODES.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + MODES.length) % MODES.length
              const availableIndex = MODES.findIndex((candidate, candidateIndex) => candidateIndex >= next && candidate.available)
              const targetIndex = availableIndex >= 0 ? availableIndex : 0
              onSelect(MODES[targetIndex].id)
              refs.current[targetIndex]?.focus()
            }}
          >
            <span className="lobby-mode-icon"><Icon name={mode.icon} /></span>
            <span>{mode.name}</span>
          </button>
        ))}
      </div>
      <p className="lobby-mode-description">{selectedMode.description}</p>
    </section>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bb-home-card ${className}`}>{children}</section>
}

function PlayerCard({ currentUser, levelInfo, bestScore, totalLinesCleared, onOpenAuth, onOpenChallenge }: Pick<HomeScreenProps, 'currentUser' | 'levelInfo' | 'bestScore' | 'totalLinesCleared' | 'onOpenAuth' | 'onOpenChallenge'>) {
  const progress = Math.min(10, totalLinesCleared ?? 0)
  if (!currentUser) {
    return (
      <Card className="lobby-player-card lobby-player-card--guest">
        <div className="lobby-card-label">PLAYER PROFILE</div>
        <div className="lobby-guest-heading">
          <div className="lobby-guest-icon" aria-hidden="true">?</div>
          <div><h2>Guest</h2><p>Sign in to save scores.</p></div>
        </div>
        <div className="lobby-auth-actions">
          <button className="lobby-outline-btn" type="button" onClick={onOpenAuth}>Sign In</button>
          <button className="lobby-text-link" type="button" onClick={onOpenAuth}>Create account <Icon name="arrow" size={14} /></button>
        </div>
        <button className="lobby-mission-block" type="button" onClick={onOpenChallenge}>
          <span className="lobby-mission-meta"><span className="lobby-card-label">DAILY MISSION</span><small>{progress} / 10</small></span>
          <strong>Clear 10 lines</strong>
          <span className="lobby-progress"><i style={{ width: `${progress * 10}%` }} /></span>
        </button>
      </Card>
    )
  }
  const xpProgress = levelInfo?.progressPercent ?? 0
  return (
    <Card className="lobby-player-card">
      <div className="lobby-card-label">PLAYER PROFILE</div>
      <div className="lobby-player-heading">
        <span className="lobby-avatar">{currentUser.name.charAt(0).toUpperCase()}</span>
        <div><h2>{currentUser.name}</h2><span>Level {levelInfo?.level ?? 1}</span></div>
      </div>
      <div className="lobby-xp-label"><span>XP PROGRESS</span><strong>{levelInfo?.currentXP ?? 120} / 500 XP</strong></div>
      <div className="lobby-progress"><span style={{ width: `${xpProgress}%` }} /></div>
      <div className="lobby-personal-best"><span>PERSONAL BEST</span><strong>{bestScore.toLocaleString()}</strong></div>
      <button className="lobby-mission-block" type="button" onClick={onOpenChallenge}>
        <span className="lobby-mission-meta"><span className="lobby-card-label">DAILY MISSION</span><small>{progress} / 10</small></span>
        <strong>Clear 10 lines</strong>
        <span className="lobby-progress"><i style={{ width: `${progress * 10}%` }} /></span>
      </button>
    </Card>
  )
}

function MiniLeaderboard({ currentUser, onOpenLeaderboard, onOpenAuth, onPlay, onRankChange }: Pick<HomeScreenProps, 'currentUser' | 'onOpenLeaderboard' | 'onOpenAuth' | 'onPlay'> & { onRankChange: (rank: number | null) => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [highestScore, setHighestScore] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [offlineNote, setOfflineNote] = useState(false)
  const [pendingRetry, setPendingRetry] = useState(false)
  const cachedEntries = (): LeaderboardEntry[] | null => {
    try {
      const cached = sessionStorage.getItem('block-blitz-top-ranks')
      return cached ? JSON.parse(cached) as LeaderboardEntry[] : null
    } catch {
      return null
    }
  }
  const load = useCallback((automaticRetry = true) => {
    const cached = cachedEntries()
    if (cached) setEntries(cached)
    else setEntries(null)
    setError(false)
    setRetrying(automaticRetry)
    void fetchLeaderboard(1, 3).then((result) => {
      setEntries(result.items)
      setOfflineNote(false)
      setRetrying(false)
      try { sessionStorage.setItem('block-blitz-top-ranks', JSON.stringify(result.items)) } catch { /* storage is optional */ }
    }).catch((reason: unknown) => {
      const status = typeof reason === 'object' && reason !== null && 'statusCode' in reason ? ((reason as { statusCode?: number | null }).statusCode ?? null) : null
      if (status === 401 || status === 403) {
        setEntries([])
        setRetrying(false)
        return
      }
      if (automaticRetry && (status === null || status >= 500)) {
        setPendingRetry(true)
        return
      }
      setRetrying(false)
      if (cached) {
        setEntries(cached)
        setOfflineNote(true)
      } else setError(true)
    })
    if (currentUser) void fetchMyRank().then((result) => {
      setRank(result?.rank ?? null)
      setHighestScore(result?.highestScore ?? null)
      onRankChange(result?.rank ?? null)
    }).catch(() => undefined)
  }, [currentUser, onRankChange])
  useEffect(() => {
    if (!pendingRetry) return
    const timer = window.setTimeout(() => {
      setPendingRetry(false)
      load(false)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [load, pendingRetry])
  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  return (
    <Card className="lobby-leaderboard-card">
      <div className="lobby-ranks-heading"><div className="lobby-card-label">TOP RANKS</div><button className="lobby-view-all" type="button" onClick={onOpenLeaderboard}>View all <Icon name="arrow" size={14} /></button></div>
      <div className="lobby-ranks-live" aria-live="polite">
      {error && !currentUser ? (
        <div className="lobby-empty-ranks lobby-empty-ranks--guest"><Icon name="trophy" size={24} /><strong>Be the first on the board</strong><span>Finish a game and your score will show up here.</span><button className="lobby-outline-btn" type="button" onClick={onOpenAuth}>Sign in</button></div>
      ) : error && currentUser ? (
        <div className="lobby-leaderboard-error"><Icon name="wifi" size={22} /><strong>Ranks are taking a break</strong><span>We couldn't reach the server. Try again in a moment.</span><button type="button" onClick={() => load()} disabled={retrying}><Icon name="refresh" size={15} />{retrying ? 'Retrying' : 'Try again'}</button></div>
      ) : entries === null ? (
        <div className="lobby-skeleton-list" aria-label="Loading leaderboard">{[1, 2, 3].map((row) => <span className="lobby-skeleton-row" key={row}><i /><b /><em /></span>)}</div>
      ) : entries.length && (!currentUser || currentUser.totalGames > 0) ? (
        <div className="lobby-rank-list">
          {entries.map((entry, index) => <div className="lobby-rank-row" key={`${entry.userId ?? entry.playerName}-${index}`}><b className={`medal-${index + 1}`}>{index + 1}</b><span>{entry.playerName}</span><strong>{entry.score.toLocaleString()}</strong></div>)}
          {currentUser ? (
            <div className="lobby-you-rank"><span>You: #{rank ?? '—'}</span><strong>{highestScore?.toLocaleString() ?? '—'}</strong></div>
          ) : (
            <div className="lobby-you-rank lobby-you-rank--guest"><button className="lobby-text-link" type="button" onClick={onOpenAuth}>Sign in to see your rank <Icon name="arrow" size={14} /></button></div>
          )}
        </div>
      ) : currentUser ? (
        <div className="lobby-empty-ranks"><Icon name="trophy" size={24} /><strong>{currentUser.totalGames > 0 ? 'Be the first on the board' : "You're not ranked yet"}</strong><span>{currentUser.totalGames > 0 ? 'Finish a game and your score will show up here.' : 'Finish your first game to get on the board.'}</span><button className="lobby-outline-btn" type="button" onClick={() => onPlay('classic')}>Play now</button></div>
      ) : (
        <div className="lobby-empty-ranks lobby-empty-ranks--guest"><Icon name="trophy" size={24} /><strong>Be the first on the board</strong><span>Finish a game and your score will show up here.</span><button className="lobby-outline-btn" type="button" onClick={onOpenAuth}>Sign in</button></div>
      )}
      {offlineNote && <div className="lobby-ranks-note">Updated just now · offline</div>}
      </div>
    </Card>
  )
}

function BottomDock({ onOpenLeaderboard, onOpenDashboard, onOpenChallenge, onOpenAchievements, onOpenAuth }: Pick<HomeScreenProps, 'onOpenLeaderboard' | 'onOpenDashboard' | 'onOpenChallenge' | 'onOpenAchievements' | 'onOpenAuth'>) {
  const links = [['grid', 'Home', () => undefined], ['trophy', 'Ranks', onOpenLeaderboard], ['target', 'Missions', onOpenChallenge], ['medal', 'Badges', onOpenAchievements], ['volume', 'Profile', onOpenDashboard]] as const
  return <nav className="lobby-bottom-dock" aria-label="Lobby navigation">{links.map(([icon, label, action]) => <button key={label} type="button" className={label === 'Home' ? 'is-active' : ''} onClick={label === 'Profile' ? onOpenAuth : action}><span><Icon name={icon} size={19} /></span><small>{label}</small></button>)}</nav>
}

export function HomeScreen(props: HomeScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic')
  const { currentUser, levelInfo, onPlay } = props
  return (
    <main className="arcade-lobby">
      <div className="lobby-drift-field" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="bb-home-layout">
        <aside className="bb-home-rail bb-home-rail--left" aria-label="Player information">
          <PlayerCard currentUser={currentUser} levelInfo={levelInfo} bestScore={props.bestScore} totalLinesCleared={props.totalLinesCleared} onOpenAuth={props.onOpenAuth} onOpenChallenge={props.onOpenChallenge} />
        </aside>
        <section className="bb-home-stage">
          <span className="lobby-free-pill">FREE TO PLAY</span>
          <h1><span>BLOCK</span> <b>BLITZ</b></h1>
          <p className="lobby-tagline">PUZZLE <i>•</i> PLACE <i>•</i> CLEAR <i>•</i> COMBO</p>
          <HeroBoard />
          <ModeSwitcher selected={selectedMode} onSelect={setSelectedMode} />
          <button className="lobby-play-button" type="button" onClick={() => onPlay(selectedMode)}>
            <span>PLAY</span><small>{MODES.find((mode) => mode.id === selectedMode)?.name}</small>
          </button>
        </section>
        <aside className="bb-home-rail bb-home-rail--right" aria-label="Top ranks">
          <MiniLeaderboard currentUser={currentUser} onOpenLeaderboard={props.onOpenLeaderboard} onOpenAuth={props.onOpenAuth} onPlay={onPlay} onRankChange={() => undefined} />
        </aside>
      </div>
      <section className="bb-hiw" aria-labelledby="bb-hiw-title">
        <header className="bb-hiw__head">
          <p className="bb-hiw__eyebrow">HOW IT WORKS</p>
          <h2 className="bb-hiw__title" id="bb-hiw-title">Three moves to a perfect clear</h2>
        </header>
        <ol className="bb-hiw__grid">
          <li className="bb-hiw__card">
            <div className="bb-hiw__top"><span className="bb-hiw__icon bb-hiw__icon--emerald"><Icon name="grid" /></span><span className="bb-hiw__num">01</span></div>
            <h3 className="bb-hiw__card-title">Drag a piece</h3>
            <p className="bb-hiw__desc">Choose a shape from your tray.</p>
          </li>
          <li className="bb-hiw__card">
            <div className="bb-hiw__top"><span className="bb-hiw__icon bb-hiw__icon--amber"><Icon name="target" /></span><span className="bb-hiw__num">02</span></div>
            <h3 className="bb-hiw__card-title">Fill a row or column</h3>
            <p className="bb-hiw__desc">Complete lines to clear them.</p>
          </li>
          <li className="bb-hiw__card">
            <div className="bb-hiw__top"><span className="bb-hiw__icon bb-hiw__icon--sky"><Icon name="zap" /></span><span className="bb-hiw__num">03</span></div>
            <h3 className="bb-hiw__card-title">Chain combos</h3>
            <p className="bb-hiw__desc">Keep the streak alive for more points.</p>
          </li>
        </ol>
      </section>
      <footer className="lobby-footer"><Logo compact /><span>PUZZLE · PLACE · CLEAR · COMBO</span><nav><button type="button" onClick={props.onOpenLeaderboard}>Leaderboard</button><button type="button" onClick={props.onOpenDashboard}>Dashboard</button><button type="button" onClick={props.onOpenChallenge}>How to play</button></nav><small>© 2026 Block Blitz</small></footer>
      <BottomDock onOpenLeaderboard={props.onOpenLeaderboard} onOpenDashboard={props.onOpenDashboard} onOpenChallenge={props.onOpenChallenge} onOpenAchievements={props.onOpenAchievements} onOpenAuth={props.onOpenAuth} />
    </main>
  )
}
