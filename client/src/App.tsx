import { useEffect, useRef, useState, type PointerEvent } from 'react'
import GameBoard, {
  type BoardEffect,
  type BoardPreview,
} from './components/GameBoard'
import PieceTray from './components/PieceTray'
import { Navbar, type ThemeMode } from './components/Navbar'
import { FloatingScores, type ScorePopup } from './components/FloatingScores'
import { ParticleCanvas, type ParticleTrigger } from './components/ParticleCanvas'
import { ConfettiCanvas } from './components/ConfettiCanvas'
import { DesktopSidebarLeft } from './components/DesktopSidebarLeft'
import { DesktopSidebarRight, type MatchLogEntry } from './components/DesktopSidebarRight'
import { LeaderboardModal } from './components/LeaderboardModal'
import { PlayerDashboardModal } from './components/PlayerDashboardModal'
import { DailyChallengeModal } from './components/DailyChallengeModal'
import { AchievementsModal } from './components/AchievementsModal'
import { GameOverModal } from './components/GameOverModal'
import { BOARD_SIZE, createEmptyBoard, type Board } from './game/board'
import { clearCompletedLines } from './game/lines'
import { canPlaceShape, placeShape } from './game/placement'
import { generatePieces, type Piece } from './game/shapes'
import { isGameOver } from './game/gameOver'
import {
  calculatePlacementScore,
  updateCombo,
} from './game/scoring'
import { SoundEffects } from './game/sound'
import {
  calculatePlayerLevel,
  readUnlockedAchievements,
  saveUnlockedAchievements,
} from './game/achievements'
import {
  completeGameSession,
  createGameSession,
  fetchUserProfile,
  type UserProfile,
} from './services/gameSessionsApi'
import './App.css'

type ActiveDrag = {
  piece: Piece
  pointerId: number
  isTouch: boolean
}

type GamePhase = 'home' | 'playing' | 'gameOver'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'unavailable'

type BoardSnapshot = {
  board: Board
  boardColors: (string | null)[][]
  pieces: Piece[]
  score: number
  combo: number
  linesCleared: number
  blocksPlaced: number
}

const BEST_SCORE_KEY = 'block-blitz-best-score'
const SOUND_ENABLED_KEY = 'block-blitz-sound-enabled'
const MUSIC_ENABLED_KEY = 'block-blitz-music-enabled'
const THEME_KEY = 'block-blitz-theme'
const USER_ID_KEY = 'block-blitz-active-user-id'

function readBestScore(): number {
  try {
    const stored = Number.parseInt(window.localStorage.getItem(BEST_SCORE_KEY) ?? '', 10)
    return Number.isFinite(stored) && stored >= 0 ? stored : 0
  } catch {
    return 0
  }
}

function readStoredBool(key: string, fallback: boolean): boolean {
  try {
    const val = window.localStorage.getItem(key)
    return val !== null ? val === 'true' : fallback
  } catch {
    return fallback
  }
}

function createEmptyColorBoard(): (string | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )
}

function HomeScreen({
  bestScore,
  onPlay,
  onOpenLeaderboard,
  onOpenDashboard,
  onOpenChallenge,
  onOpenAchievements,
}: {
  bestScore: number
  onPlay: () => void
  onOpenLeaderboard: () => void
  onOpenDashboard: () => void
  onOpenChallenge: () => void
  onOpenAchievements: () => void
}) {
  return (
    <main className="home-screen">
      <section className="home-card" aria-labelledby="home-title">
        <div className="home-brand-badge">PUZZLE ARENA</div>
        <h1 id="home-title" className="home-brand-title">BLOCK BLITZ</h1>
        <p className="home-tagline">PUZZLE • PLACE • CLEAR • COMBO</p>

        <div className="home-preview" aria-hidden="true">
          <div className="home-board-preview">
            {Array.from({ length: 64 }, (_, index) => {
              const filledPositions: Record<number, string> = {
                1: '#f59e0b',
                2: '#f59e0b',
                9: '#f59e0b',
                10: '#f59e0b',
                18: '#06b6d4',
                19: '#06b6d4',
                26: '#06b6d4',
                34: '#ec4899',
                35: '#ec4899',
                36: '#ec4899',
                43: '#ec4899',
                51: '#a855f7',
                52: '#a855f7',
                53: '#a855f7',
              }
              const color = filledPositions[index]
              return (
                <span
                  key={index}
                  className={`home-board-cell ${color ? 'home-board-cell--filled' : ''}`}
                  style={color ? { backgroundColor: color, boxShadow: `0 0 6px ${color}88` } : undefined}
                />
              )
            })}
          </div>
          <div className="home-floating-chips">
            <span className="home-chip chip-a">Combo x3! 🔥</span>
            <span className="home-chip chip-b">Line Clear! ⚡</span>
          </div>
        </div>

        <p className="how-to-play">
          Drag colorful block shapes onto the 8×8 board. Fill entire rows or columns
          to clear them, chain consecutive clears for explosive combo scores!
        </p>

        <div className="home-primary-actions">
          <button className="primary-button btn-large pulse-glow" type="button" onClick={onPlay}>
            ▶ Start Game
          </button>
        </div>

        <div className="home-sub-actions">
          <button className="text-pill-btn" type="button" onClick={onOpenLeaderboard}>
            🏆 Leaderboard
          </button>
          <button className="text-pill-btn" type="button" onClick={onOpenDashboard}>
            📊 Dashboard
          </button>
          <button className="text-pill-btn" type="button" onClick={onOpenChallenge}>
            🎯 Daily Mission
          </button>
          <button className="text-pill-btn" type="button" onClick={onOpenAchievements}>
            🎖️ Badges
          </button>
        </div>

        <p className="best-score">
          Personal Best: <strong>{bestScore.toLocaleString()}</strong> pts
        </p>
      </section>
    </main>
  )
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('home')
  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [boardColors, setBoardColors] = useState<(string | null)[][]>(createEmptyColorBoard)
  const [pieces, setPieces] = useState<Piece[]>(() => generatePieces(3))
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestScore, setBestScore] = useState(readBestScore)
  const [totalLinesCleared, setTotalLinesCleared] = useState(0)
  const [blocksPlaced, setBlocksPlaced] = useState(0)
  const [highestCombo, setHighestCombo] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [boardEffect, setBoardEffect] = useState<BoardEffect | null>(null)
  const [shakeBoard, setShakeBoard] = useState(false)
  const [preview, setPreview] = useState<BoardPreview | null>(null)
  const [activeDragPieceId, setActiveDragPieceId] = useState<string | null>(null)
  const [popups, setPopups] = useState<ScorePopup[]>([])
  const [particleTrigger, setParticleTrigger] = useState<ParticleTrigger | null>(null)

  // Power-Ups State (Section 47 Bonus Features)
  const [rerollsLeft, setRerollsLeft] = useState(1)
  const [hammersLeft, setHammersLeft] = useState(1)
  const [undosLeft, setUndosLeft] = useState(1)
  const [hammerActive, setHammerActive] = useState(false)
  const [undoHistory, setUndoHistory] = useState<BoardSnapshot[]>([])
  const [matchLogs, setMatchLogs] = useState<MatchLogEntry[]>([])

  // Achievements & Confetti State (Section 47 Bonus Features)
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(readUnlockedAchievements)
  const [achievementToast, setAchievementToast] = useState<{ title: string; icon: string } | null>(null)
  const [isConfettiActive, setIsConfettiActive] = useState(false)
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)

  // Theme & Audio state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (window.localStorage.getItem(THEME_KEY) as ThemeMode) || 'classic'
  })
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredBool(SOUND_ENABLED_KEY, true))
  const [musicEnabled, setMusicEnabled] = useState(() => readStoredBool(MUSIC_ENABLED_KEY, false))

  // User & Modals state
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return window.localStorage.getItem(USER_ID_KEY) || '00000000-0000-4000-8000-000000000001'
  })
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [isChallengeOpen, setIsChallengeOpen] = useState(false)

  const boardRef = useRef<HTMLDivElement>(null)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const previewRef = useRef<BoardPreview | null>(null)
  const soundEffectsRef = useRef<SoundEffects | null>(null)
  const gameTokenRef = useRef(0)
  const sessionIdRef = useRef<string | null>(null)
  const sessionCompletionSubmittedRef = useRef(false)
  const timerIntervalRef = useRef<number | null>(null)

  const gameStatsRef = useRef({
    score: 0,
    linesCleared: 0,
    blocksPlaced: 0,
    highestCombo: 0,
    duration: 0,
    ended: false,
  })

  // Player Level & XP
  const careerLines = (currentUser?.totalLinesCleared ?? 0) + totalLinesCleared
  const careerBlocks = blocksPlaced + (currentUser?.totalGames ?? 0) * 20
  const careerScore = Math.max(currentUser?.highestScore ?? 0, bestScore)
  const totalXP = careerLines * 50 + careerBlocks * 5 + Math.round(careerScore * 0.1)
  const playerLevelInfo = calculatePlayerLevel(totalXP)

  // Load current user profile
  useEffect(() => {
    fetchUserProfile(currentUserId)
      .then((user) => {
        if (user) {
          setCurrentUser(user)
          if (user.highestScore > bestScore) {
            setBestScore(user.highestScore)
          }
        }
      })
      .catch(() => {})
  }, [currentUserId])

  // Save preferences
  useEffect(() => {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore))
  }, [bestScore])

  useEffect(() => {
    window.localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled))
  }, [soundEnabled])

  useEffect(() => {
    window.localStorage.setItem(MUSIC_ENABLED_KEY, String(musicEnabled))
    if (musicEnabled && phase === 'playing') {
      soundEffectsRef.current?.startBgm()
    } else {
      soundEffectsRef.current?.stopBgm()
    }
  }, [musicEnabled, phase])

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(USER_ID_KEY, currentUserId)
  }, [currentUserId])

  // Clear board effects after animation
  useEffect(() => {
    if (!boardEffect) return
    const timeoutId = window.setTimeout(() => {
      setBoardEffect(null)
      setShakeBoard(false)
    }, 450)
    return () => window.clearTimeout(timeoutId)
  }, [boardEffect])

  // Clear popups after animation
  useEffect(() => {
    if (popups.length === 0) return
    const timeoutId = window.setTimeout(() => {
      setPopups([])
    }, 1200)
    return () => window.clearTimeout(timeoutId)
  }, [popups])

  // Match timer
  useEffect(() => {
    if (phase === 'playing') {
      timerIntervalRef.current = window.setInterval(() => {
        setDurationSeconds((sec) => {
          const next = sec + 1
          gameStatsRef.current.duration = next
          return next
        })
      }, 1000)
    } else if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current)
      }
    }
  }, [phase])

  // Cleanup audio
  useEffect(() => () => soundEffectsRef.current?.dispose(), [])

  const playSound = (effect: Parameters<SoundEffects['play']>[0], level = 1) => {
    if (!soundEnabled) return
    soundEffectsRef.current ??= new SoundEffects()
    soundEffectsRef.current.play(effect, level)
  }

  const addMatchLog = (text: string, subtext?: string, color?: string) => {
    setMatchLogs((prev) => [{ id: Date.now() + Math.random(), text, subtext, color }, ...prev.slice(0, 15)])
  }

  const checkAndUnlock = (id: string, title: string, icon: string) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      saveUnlockedAchievements(next)
      setAchievementToast({ title, icon })
      playSound('achievement')
      window.setTimeout(() => setAchievementToast(null), 3500)
      addMatchLog('🎖️ Badge Unlocked!', title, '#facc15')
      return next
    })
  }

  const submitSessionResult = (token: number) => {
    const sessionId = sessionIdRef.current
    const stats = gameStatsRef.current

    if (
      token !== gameTokenRef.current ||
      !sessionId ||
      !stats.ended ||
      sessionCompletionSubmittedRef.current
    ) {
      return
    }

    sessionCompletionSubmittedRef.current = true
    setSaveStatus('saving')

    completeGameSession(
      sessionId,
      stats.score,
      stats.linesCleared,
      stats.blocksPlaced,
      stats.highestCombo,
      stats.duration,
    )
      .then(() => {
        if (token === gameTokenRef.current) {
          setSaveStatus('saved')
        }
      })
      .catch(() => {
        if (token === gameTokenRef.current) {
          setSaveStatus('unavailable')
        }
      })
  }

  const createSessionForGame = (token: number) => {
    setSaveStatus('saving')
    createGameSession(currentUserId)
      .then((sessionId) => {
        if (token !== gameTokenRef.current) return
        sessionIdRef.current = sessionId
        setSaveStatus(gameStatsRef.current.ended ? 'saving' : 'saved')
        submitSessionResult(token)
      })
      .catch(() => {
        if (token === gameTokenRef.current) {
          setSaveStatus('unavailable')
        }
      })
  }

  // Power-Ups logic
  const handleUseReroll = () => {
    if (rerollsLeft <= 0 || phase !== 'playing') return
    const newPieces = generatePieces(3, Math.random, board)
    setPieces(newPieces)
    setRerollsLeft((prev) => prev - 1)
    playSound('buttonClick')
    addMatchLog('🔄 Reroll Used', 'New pieces drawn', '#06b6d4')
    checkAndUnlock('reroll_used', 'Tactician', '🔄')
  }

  const handleToggleHammer = () => {
    if (hammersLeft <= 0 || phase !== 'playing') return
    setHammerActive((prev) => !prev)
    playSound('buttonClick')
  }

  const handleCellClick = (r: number, c: number) => {
    if (!hammerActive || !board[r][c] || hammersLeft <= 0) return

    // Save snapshot for undo
    setUndoHistory((prev) => [
      ...prev,
      {
        board: board.map((row) => [...row]),
        boardColors: boardColors.map((row) => [...row]),
        pieces,
        score,
        combo,
        linesCleared: totalLinesCleared,
        blocksPlaced,
      },
    ])

    const nextBoard = board.map((row) => [...row])
    const nextBoardColors = boardColors.map((row) => [...row])
    const smashedColor = boardColors[r][c] ?? '#f59e0b'

    nextBoard[r][c] = false
    nextBoardColors[r][c] = null

    setBoard(nextBoard)
    setBoardColors(nextBoardColors)
    setHammersLeft((prev) => prev - 1)
    setHammerActive(false)
    playSound('lineClear')

    // Trigger particle blast on smashed cell
    if (boardRef.current) {
      const bounds = boardRef.current.getBoundingClientRect()
      const cellSize = bounds.width / BOARD_SIZE
      setParticleTrigger({
        id: Date.now(),
        cells: [{ x: (c + 0.5) * cellSize, y: (r + 0.5) * cellSize, color: smashedColor }],
      })
    }

    addMatchLog('🔨 Hammer Smash!', 'Block cleared', '#f43f5e')
    checkAndUnlock('hammer_used', 'Demolitionist', '🔨')
  }

  const handleUseUndo = () => {
    if (undosLeft <= 0 || undoHistory.length === 0 || phase !== 'playing') return
    const lastSnapshot = undoHistory[undoHistory.length - 1]
    setUndoHistory((prev) => prev.slice(0, prev.length - 1))

    setBoard(lastSnapshot.board)
    setBoardColors(lastSnapshot.boardColors)
    setPieces(lastSnapshot.pieces)
    setScore(lastSnapshot.score)
    setCombo(lastSnapshot.combo)
    setTotalLinesCleared(lastSnapshot.linesCleared)
    setBlocksPlaced(lastSnapshot.blocksPlaced)
    setUndosLeft((prev) => prev - 1)
    playSound('buttonClick')
    addMatchLog('↩️ Move Undone', 'Reverted previous state', '#a855f7')
  }

  const updatePreview = (
    piece: Piece,
    clientX: number,
    clientY: number,
  ) => {
    const boardElement = boardRef.current
    if (!boardElement) return

    const bounds = boardElement.getBoundingClientRect()
    const styles = getComputedStyle(boardElement)
    const paddingLeft = Number.parseFloat(styles.paddingLeft)
    const paddingRight = Number.parseFloat(styles.paddingRight)
    const paddingTop = Number.parseFloat(styles.paddingTop)
    const paddingBottom = Number.parseFloat(styles.paddingBottom)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0')
    const contentWidth = bounds.width - paddingLeft - paddingRight
    const contentHeight = bounds.height - paddingTop - paddingBottom
    const cellWidth = (contentWidth - gap * (BOARD_SIZE - 1)) / BOARD_SIZE
    const cellHeight = (contentHeight - gap * (BOARD_SIZE - 1)) / BOARD_SIZE
    const x = clientX - bounds.left - paddingLeft
    const y = clientY - bounds.top - paddingTop
    const column = Math.floor(x / (cellWidth + gap))
    const row = Math.floor(y / (cellHeight + gap))
    const insideBoard =
      x >= 0 &&
      y >= 0 &&
      x < contentWidth &&
      y < contentHeight &&
      column >= 0 &&
      column < BOARD_SIZE &&
      row >= 0 &&
      row < BOARD_SIZE

    if (!insideBoard) {
      previewRef.current = null
      setPreview(null)
      return
    }

    const nextPreview: BoardPreview = {
      row,
      col: column,
      shape: piece.shape,
      valid: canPlaceShape(board, piece.shape, row, column),
    }
    previewRef.current = nextPreview
    setPreview(nextPreview)
  }

  const handlePointerDown = (
    piece: Piece,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (phase !== 'playing') return

    event.preventDefault()
    const isTouch = event.pointerType === 'touch'
    activeDragRef.current = { piece, pointerId: event.pointerId, isTouch }
    setActiveDragPieceId(piece.id)
    playSound('blockPick')

    // Section 10 & 39: On mobile touch, lift preview upward so thumb doesn't obscure the placement
    const dragY = isTouch ? event.clientY - 65 : event.clientY
    updatePreview(piece, event.clientX, dragY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current
    if (activeDrag?.pointerId === event.pointerId) {
      const dragY = activeDrag.isTouch ? event.clientY - 65 : event.clientY
      updatePreview(activeDrag.piece, event.clientX, dragY)
    }
  }

  const clearDrag = () => {
    activeDragRef.current = null
    previewRef.current = null
    setActiveDragPieceId(null)
    setPreview(null)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current
    const currentPreview = previewRef.current

    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return

    if (currentPreview?.valid && pieces.some(({ id }) => id === activeDrag.piece.id)) {
      // Save snapshot for undo booster
      setUndoHistory((prev) => [
        ...prev.slice(-3),
        {
          board: board.map((row) => [...row]),
          boardColors: boardColors.map((row) => [...row]),
          pieces,
          score,
          combo,
          linesCleared: totalLinesCleared,
          blocksPlaced,
        },
      ])

      const placedBoard = placeShape(
        board,
        activeDrag.piece.shape,
        currentPreview.row,
        currentPreview.col,
      )

      // Record block colors onto the board
      const nextBoardColors = boardColors.map((r) => [...r])
      activeDrag.piece.shape.cells.forEach((cell) => {
        nextBoardColors[currentPreview.row + cell.row][currentPreview.col + cell.col] =
          activeDrag.piece.shape.color
      })

      const cleared = clearCompletedLines(placedBoard)
      const clearedLineCount = cleared.clearedRows.length + cleared.clearedColumns.length

      // Trigger particle burst on cleared cells
      if (clearedLineCount > 0 && boardRef.current) {
        const bounds = boardRef.current.getBoundingClientRect()
        const cellSize = bounds.width / BOARD_SIZE
        const particlesToSpawn: { x: number; y: number; color: string }[] = []

        cleared.clearedRows.forEach((r) => {
          for (let c = 0; c < BOARD_SIZE; c++) {
            particlesToSpawn.push({
              x: (c + 0.5) * cellSize,
              y: (r + 0.5) * cellSize,
              color: nextBoardColors[r][c] || '#f59e0b',
            })
          }
        })
        cleared.clearedColumns.forEach((c) => {
          for (let r = 0; r < BOARD_SIZE; r++) {
            particlesToSpawn.push({
              x: (c + 0.5) * cellSize,
              y: (r + 0.5) * cellSize,
              color: nextBoardColors[r][c] || '#06b6d4',
            })
          }
        })
        setParticleTrigger({ id: Date.now(), cells: particlesToSpawn })
      }

      // Clear colors for cleared rows and columns
      cleared.clearedRows.forEach((r) => {
        for (let c = 0; c < BOARD_SIZE; c++) nextBoardColors[r][c] = null
      })
      cleared.clearedColumns.forEach((c) => {
        for (let r = 0; r < BOARD_SIZE; r++) nextBoardColors[r][c] = null
      })

      const remainingPieces = pieces.filter(({ id }) => id !== activeDrag.piece.id)
      const nextPieces =
        remainingPieces.length === 0
          ? generatePieces(3, Math.random, cleared.board)
          : remainingPieces

      const nextCombo = updateCombo(combo, clearedLineCount)
      const placementScore = calculatePlacementScore(
        activeDrag.piece.shape.cells.length,
        clearedLineCount,
        nextCombo,
      )
      const nextScore = score + placementScore
      const nextBlocksPlaced = blocksPlaced + 1
      const nextHighestCombo = Math.max(highestCombo, nextCombo)
      const nextLinesTotal = totalLinesCleared + clearedLineCount
      const didGameEnd = isGameOver(cleared.board, nextPieces)

      setBoard(cleared.board)
      setBoardColors(nextBoardColors)
      setPieces(nextPieces)
      setScore(nextScore)
      setBlocksPlaced(nextBlocksPlaced)
      setCombo(nextCombo)
      setHighestCombo(nextHighestCombo)
      setTotalLinesCleared(nextLinesTotal)

      // Achievements Checks
      if (clearedLineCount > 0) {
        checkAndUnlock('first_clear', 'First Blast', '⚡')
      }
      if (clearedLineCount >= 2) {
        checkAndUnlock('double_clear', 'Double Trouble', '✨')
      }
      if (clearedLineCount >= 3) {
        checkAndUnlock('triple_clear', 'Triple Threat', '💥')
      }
      if (nextCombo >= 4) {
        checkAndUnlock('combo_master', 'Combo Master', '🔥')
      }
      if (nextBlocksPlaced >= 50) {
        checkAndUnlock('centurion', 'Centurion', '🧱')
      }
      if (nextScore >= 5000) {
        checkAndUnlock('score_5k', 'High Roller', '🏆')
      }
      if (nextScore >= 10000) {
        checkAndUnlock('score_10k', 'Grandmaster', '👑')
      }

      // Match telemetry log
      if (clearedLineCount > 1) {
        addMatchLog(`⚡ ${clearedLineCount} Lines Blast! (+${placementScore})`, `Combo x${nextCombo}`, '#ec4899')
      } else if (clearedLineCount === 1) {
        addMatchLog(`✨ Line Clear (+${placementScore})`, nextCombo > 1 ? `Combo x${nextCombo}` : undefined, '#06b6d4')
      } else {
        addMatchLog(`Piece Placed (+${placementScore})`, activeDrag.piece.shape.name, activeDrag.piece.shape.color)
      }

      // High Score check & celebration
      if (nextScore > bestScore) {
        if (!isNewBest && bestScore > 0) {
          setIsNewBest(true)
          playSound('newBest')
          setIsConfettiActive(true)
          window.setTimeout(() => setIsConfettiActive(false), 4500)
        }
        setBestScore(nextScore)
      }

      gameStatsRef.current = {
        score: nextScore,
        linesCleared: nextLinesTotal,
        blocksPlaced: nextBlocksPlaced,
        highestCombo: nextHighestCombo,
        duration: durationSeconds,
        ended: false,
      }

      // Popups
      const newPopups: ScorePopup[] = [
        {
          id: Date.now(),
          text: `+${placementScore}`,
          subtext:
            clearedLineCount > 1
              ? `${clearedLineCount} Lines Clear! 🔥`
              : clearedLineCount === 1
                ? 'Line Clear! ✨'
                : undefined,
          color: activeDrag.piece.shape.color,
        },
      ]
      if (nextCombo > 1 && clearedLineCount > 0) {
        newPopups.push({
          id: Date.now() + 1,
          text: `COMBO x${nextCombo}!`,
          subtext: 'Streak bonus',
          color: '#facc15',
        })
      }
      setPopups(newPopups)

      // Visual board effect
      setBoardEffect({
        id: Date.now(),
        placedCells: activeDrag.piece.shape.cells.map((cell) => ({
          row: currentPreview.row + cell.row,
          col: currentPreview.col + cell.col,
        })),
        clearedRows: cleared.clearedRows,
        clearedColumns: cleared.clearedColumns,
      })

      if (clearedLineCount > 1 || nextCombo > 2) {
        setShakeBoard(true)
      }

      // Audio cues
      playSound('placement')
      if (clearedLineCount === 1) {
        playSound('lineClear')
      } else if (clearedLineCount > 1) {
        playSound('multiLine')
      }
      if (nextCombo > 1 && clearedLineCount > 0) {
        playSound('combo', nextCombo)
      }

      if (didGameEnd) {
        gameStatsRef.current.ended = true
        setPhase('gameOver')
        playSound('gameOver')
        if (isNewBest) {
          setIsConfettiActive(true)
          window.setTimeout(() => setIsConfettiActive(false), 5000)
        }
        submitSessionResult(gameTokenRef.current)
      }
    }

    clearDrag()
  }

  const startNewGame = () => {
    clearDrag()
    gameTokenRef.current += 1
    sessionIdRef.current = null
    sessionCompletionSubmittedRef.current = false
    gameStatsRef.current = {
      score: 0,
      linesCleared: 0,
      blocksPlaced: 0,
      highestCombo: 0,
      duration: 0,
      ended: false,
    }

    const empty = createEmptyBoard()
    setBoard(empty)
    setBoardColors(createEmptyColorBoard())
    setPieces(generatePieces(3, Math.random, empty))
    setScore(0)
    setCombo(0)
    setTotalLinesCleared(0)
    setBlocksPlaced(0)
    setHighestCombo(0)
    setDurationSeconds(0)
    setIsNewBest(false)
    setIsConfettiActive(false)
    setRerollsLeft(1)
    setHammersLeft(1)
    setUndosLeft(1)
    setHammerActive(false)
    setUndoHistory([])
    setMatchLogs([{ id: Date.now(), text: 'Match Started', subtext: '8×8 Grid Clean', color: '#10b981' }])
    setBoardEffect(null)
    setShakeBoard(false)
    setPopups([])
    setSaveStatus('saving')
    setPhase('playing')
    playSound('buttonClick')

    if (musicEnabled) {
      soundEffectsRef.current?.startBgm()
    }

    createSessionForGame(gameTokenRef.current)
  }

  const returnHome = () => {
    clearDrag()
    setBoardEffect(null)
    setShakeBoard(false)
    setHammerActive(false)
    setIsConfettiActive(false)
    setPhase('home')
    soundEffectsRef.current?.stopBgm()
    playSound('buttonClick')
  }

  return (
    <div className={`app-root theme-${theme}`}>
      {/* Global Confetti Shower Canvas on High Score & Milestones */}
      <ConfettiCanvas active={isConfettiActive} />

      {/* Achievement Unlocked Toast Banner */}
      {achievementToast && (
        <div className="achievement-toast-banner" role="alert">
          <span className="toast-icon">{achievementToast.icon}</span>
          <div className="toast-text">
            <span className="toast-tag">ACHIEVEMENT UNLOCKED</span>
            <strong>{achievementToast.title}</strong>
          </div>
        </div>
      )}

      <Navbar
        theme={theme}
        onThemeChange={setTheme}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          setSoundEnabled((prev) => !prev)
          playSound('buttonClick')
        }}
        musicEnabled={musicEnabled}
        onToggleMusic={() => {
          setMusicEnabled((prev) => !prev)
          playSound('buttonClick')
        }}
        onOpenLeaderboard={() => {
          setIsLeaderboardOpen(true)
          playSound('buttonClick')
        }}
        onOpenDashboard={() => {
          setIsDashboardOpen(true)
          playSound('buttonClick')
        }}
        onOpenChallenge={() => {
          setIsChallengeOpen(true)
          playSound('buttonClick')
        }}
        onOpenAchievements={() => {
          setIsAchievementsOpen(true)
          playSound('buttonClick')
        }}
        levelInfo={playerLevelInfo}
        currentUser={currentUser}
      />

      {phase === 'home' ? (
        <HomeScreen
          bestScore={bestScore}
          onPlay={startNewGame}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          onOpenChallenge={() => setIsChallengeOpen(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
        />
      ) : (
        <div className="widescreen-arena-wrapper">
          {/* Desktop Left Sidebar: Profile & Power-Ups */}
          <DesktopSidebarLeft
            currentUser={currentUser}
            currentLinesCleared={totalLinesCleared}
            rerollsLeft={rerollsLeft}
            hammersLeft={hammersLeft}
            undosLeft={undosLeft}
            hammerActive={hammerActive}
            onUseReroll={handleUseReroll}
            onToggleHammer={handleToggleHammer}
            onUseUndo={handleUseUndo}
            canUndo={undoHistory.length > 0}
            onOpenDashboard={() => setIsDashboardOpen(true)}
            onOpenChallenge={() => setIsChallengeOpen(true)}
            onOpenAchievements={() => setIsAchievementsOpen(true)}
            levelInfo={playerLevelInfo}
          />

          {/* Center Arena */}
          <main className="game-shell">
            {/* Header & Score Bar */}
            <header className="game-hud">
              <div className="hud-card hud-score">
                <span className="hud-label">SCORE</span>
                <strong className="hud-value hud-value--score">{score.toLocaleString()}</strong>
              </div>

              <div className="hud-card hud-best">
                <span className="hud-label">BEST</span>
                <strong className="hud-value">{bestScore.toLocaleString()}</strong>
              </div>

              <div className="hud-card hud-lines">
                <span className="hud-label">LINES</span>
                <strong className="hud-value text-teal">{totalLinesCleared}</strong>
              </div>

              {combo > 1 && (
                <div className="hud-card hud-combo pulse-combo">
                  <span className="hud-label">COMBO</span>
                  <strong className="hud-value text-amber">{combo}x 🔥</strong>
                </div>
              )}
            </header>

            {/* Hammer active mode banner */}
            {hammerActive && (
              <div className="hammer-active-banner">
                <span>🔨 HAMMER MODE ACTIVE</span>
                <p>Click any occupied block on the board to smash it!</p>
              </div>
            )}

            {/* Save & Connectivity status */}
            {saveStatus !== 'idle' && (
              <p className={`save-status save-status--${saveStatus}`} aria-live="polite">
                {saveStatus === 'saving' && '● Syncing game session…'}
                {saveStatus === 'saved' && '✓ Session connected'}
                {saveStatus === 'unavailable' && 'Offline session active'}
              </p>
            )}

            {/* Floating Score Popups */}
            <FloatingScores popups={popups} />

            {/* 8x8 Board with Particle Explosion Canvas */}
            <div className="board-outer-wrapper">
              <ParticleCanvas trigger={particleTrigger} />
              <GameBoard
                board={board}
                boardColors={boardColors}
                boardRef={boardRef}
                preview={preview}
                effect={boardEffect}
                shake={shakeBoard}
                hammerActive={hammerActive}
                onCellClick={handleCellClick}
              />
            </div>

            {/* Mobile Power-Ups Strip (visible only on mobile) */}
            <div className="mobile-boosters-strip">
              <button
                type="button"
                className="mobile-booster-btn"
                onClick={handleUseReroll}
                disabled={rerollsLeft === 0}
                title="Reroll Tray"
              >
                🔄 Reroll ({rerollsLeft})
              </button>
              <button
                type="button"
                className={`mobile-booster-btn${hammerActive ? ' mobile-booster-btn--active' : ''}`}
                onClick={handleToggleHammer}
                disabled={hammersLeft === 0}
                title="Hammer Smash"
              >
                🔨 Hammer ({hammersLeft})
              </button>
              <button
                type="button"
                className="mobile-booster-btn"
                onClick={handleUseUndo}
                disabled={undoHistory.length === 0 || undosLeft === 0}
                title="Undo Move"
              >
                ↩️ Undo ({undosLeft})
              </button>
            </div>

            {/* Piece Tray */}
            <PieceTray
              pieces={pieces}
              activePieceId={activeDragPieceId}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={clearDrag}
            />

            {/* Return Home Button */}
            <div className="game-bottom-actions">
              <button className="text-pill-btn" type="button" onClick={returnHome}>
                ← Back to Home
              </button>
            </div>
          </main>

          {/* Desktop Right Sidebar: Live Leaderboard & Match Logs */}
          <DesktopSidebarRight
            currentUserId={currentUserId}
            matchLogs={matchLogs}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'gameOver' && (
        <GameOverModal
          score={score}
          bestScore={bestScore}
          isNewBest={isNewBest}
          linesCleared={totalLinesCleared}
          highestCombo={highestCombo}
          blocksPlaced={blocksPlaced}
          durationSeconds={durationSeconds}
          onPlayAgain={startNewGame}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          onHome={returnHome}
        />
      )}

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={currentUserId}
      />

      {/* Player Dashboard Modal */}
      <PlayerDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        currentUserId={currentUserId}
        onSwitchUser={(user) => {
          setCurrentUserId(user.id)
          setCurrentUser(user)
          if (user.highestScore > bestScore) {
            setBestScore(user.highestScore)
          }
        }}
      />

      {/* Daily Challenge Modal */}
      <DailyChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        currentLinesCleared={totalLinesCleared}
        onPlay={() => {
          if (phase !== 'playing') {
            startNewGame()
          }
        }}
      />

      {/* Achievements / Badges Modal (Section 47) */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        unlockedIds={unlockedAchievements}
      />
    </div>
  )
}

export default App
