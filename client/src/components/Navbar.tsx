import type { UserProfile } from '../services/gameSessionsApi'
import type { PlayerLevelInfo } from '../game/achievements'

export type ThemeMode = 'classic' | 'neon' | 'candy' | 'ocean' | 'galaxy'

type NavbarProps = {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  soundEnabled: boolean
  onToggleSound: () => void
  musicEnabled: boolean
  onToggleMusic: () => void
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenChallenge: () => void
  onOpenAchievements: () => void
  onHome?: () => void
  onOpenAuth?: () => void
  levelInfo?: PlayerLevelInfo
  currentUser?: UserProfile | null
}

export function Navbar({
  theme,
  onThemeChange,
  soundEnabled,
  onToggleSound,
  musicEnabled,
  onToggleMusic,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenChallenge,
  onOpenAchievements,
  onHome,
  onOpenAuth,
  levelInfo,
  currentUser,
}: NavbarProps) {
  return (
    <>
      <nav className="top-navbar" aria-label="Main application header">
      <div
        className="navbar-left"
        onClick={onHome}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onHome?.()
          }
        }}
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        title="Go to Home"
      >
        <span className="navbar-logo-icon">🧩</span>
        <div className="navbar-branding">
          <span className="navbar-title">BLOCK BLITZ</span>
        </div>
      </div>

      <div className="navbar-center">
        <button
          className="nav-action-btn"
          type="button"
          onClick={onOpenLeaderboard}
          title="Global Leaderboard"
        >
          🏆 <span className="nav-btn-text">Rank</span>
        </button>
        <button
          className="nav-action-btn"
          type="button"
          onClick={onOpenDashboard}
          title="Player Dashboard & History"
        >
          📊 <span className="nav-btn-text">Stats</span>
        </button>
        <button
          className="nav-action-btn"
          type="button"
          onClick={onOpenChallenge}
          title="Daily Challenge"
        >
          🎯 <span className="nav-btn-text">Mission</span>
        </button>
        <button
          className="nav-action-btn"
          type="button"
          onClick={onOpenAchievements}
          title="Milestones & Badges"
        >
          🎖️ <span className="nav-btn-text">Badges</span>
        </button>
      </div>

      <div className="navbar-right">
        {/* Level & XP Mini Badge (Section 47) */}
        {levelInfo && (
          <div className="navbar-level-badge" title={`Player Tier: ${levelInfo.title} (${levelInfo.currentXP} XP)`}>
            <span className="level-number">Lv.{levelInfo.level}</span>
            <div className="level-mini-bar">
              <div className="level-mini-fill" style={{ width: `${levelInfo.progressPercent}%` }} />
            </div>
          </div>
        )}

        {/* Theme Picker (Section 37 & 47) */}
        <select
          className="theme-dropdown"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
          aria-label="Select visual theme"
        >
          <option value="classic">🟢 Classic</option>
          <option value="neon">⚡ Neon</option>
          <option value="candy">🍬 Candy</option>
          <option value="ocean">🌊 Ocean</option>
          <option value="galaxy">🌌 Galaxy</option>
        </select>

        {/* Music Toggle (Section 22) */}
        <button
          className={`audio-btn audio-btn--music${musicEnabled ? ' audio-btn--active' : ''}`}
          type="button"
          onClick={onToggleMusic}
          title={musicEnabled ? 'Turn Music Off' : 'Turn Music On'}
          aria-pressed={musicEnabled}
        >
          {musicEnabled ? '🎵' : '🔇'}
        </button>

        {/* Sound FX Toggle (Section 21) */}
        <button
          className={`audio-btn audio-btn--sfx${soundEnabled ? ' audio-btn--active' : ''}`}
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? 'Turn Sound FX Off' : 'Turn Sound FX On'}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? '🔊' : '🔈'}
        </button>

        {/* User Profile pill / Sign In button */}
        {currentUser ? (
          <button
            className="user-profile-pill"
            type="button"
            onClick={onOpenDashboard}
            title={`Active Player: ${currentUser.name} (${currentUser.email})`}
          >
            <span className="avatar-dot">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
            </span>
            <span className="user-pill-name">{currentUser.name}</span>
          </button>
        ) : (
          <button
            className="nav-signin-btn"
            type="button"
            onClick={onOpenAuth}
            title="Sign in or register an account"
          >
            🔐 <span className="nav-signin-text">Sign In</span>
          </button>
        )}
      </div>
    </nav>
    <div className="navbar-spacer" aria-hidden="true" />
  </>
  )
}
