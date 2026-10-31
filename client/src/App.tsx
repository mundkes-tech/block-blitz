import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GameBoard, {
  type BoardEffect,
  type BoardPreview,
} from './components/GameBoard'
import PieceTray from './components/PieceTray'
import { AppHeader, type ThemeMode } from './components/AppHeader'
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
import { AuthModal } from './components/AuthModal'
import { HomeScreen } from './components/HomeScreen'
import { BOARD_SIZE, createEmptyBoard, type Board } from './game/board'
import { clearCompletedLines } from './game/lines'
import { canPlaceShape, placeShape } from './game/placement'
import { generatePieces, getShapeDimensions, type BlockPattern, type Piece } from './game/shapes'
import { BlockPatternSvg } from './components/BlockPatternSvg'
import { isGameOver } from './game/gameOver'
import {
  findForgivingAnchor,
  getPieceSize,
  mapPointerToAnchor,
  type DragOffset,
  type GridAnchor,
  type GridGeometry,
} from './game/dragGeometry'
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
  type UserProfile,
} from './services/gameSessionsApi'
import type { MoveLogEntry } from './services/gameSessionsApi'
import {
  enqueueScoreRetry,
  getDueScoreRetries,
  removeScoreRetry,
  scheduleScoreRetry,
  updateScoreRetry,
} from './services/scoreRetryQueue'
import { fetchMe, logout, getStoredUser } from './services/authApi'
import './styles/design-tokens.css'
import './App.css'
import './styles/redesign.css'

type ActiveDrag = {
  piece: Piece
  pointerId: number
  offset: DragOffset
  sourceElement: HTMLDivElement
}

type GamePhase = 'home' | 'playing' | 'gameOver'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unavailable' | 'error'

type BoardSnapshot = {
  board: Board
  boardColors: (string | null)[][]
  boardPatterns: (BlockPattern | null)[][]
  pieces: Piece[]
  score: number
  combo: number
  linesCleared: number
  blocksPlaced: number
  highestCombo: number
}

const BEST_SCORE_KEY = 'block-blitz-best-score'
const THEME_KEY = 'block-blitz-theme'
const SOUND_ENABLED_KEY = 'block-blitz-sound-enabled'
const MUSIC_ENABLED_KEY = 'block-blitz-music-enabled'

function readStoredBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY)
    const parsed = Number(raw)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

function readStoredBool(key: string, defaultValue: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return defaultValue
    return raw === 'true'
  } catch {
    return defaultValue
  }
}

function createEmptyColorBoard(): (string | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )
}

function createEmptyPatternBoard(): (BlockPattern | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<GamePhase>('home')
  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [boardColors, setBoardColors] = useState<(string | null)[][]>(createEmptyColorBoard)
  const [boardPatterns, setBoardPatterns] = useState<(BlockPattern | null)[][]>(createEmptyPatternBoard)
  const [pieces, setPieces] = useState<Piece[]>(() => generatePieces(3))
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [totalLinesCleared, setTotalLinesCleared] = useState(0)
  const [blocksPlaced, setBlocksPlaced] = useState(0)
  const [bestScore, setBestScore] = useState(readStoredBestScore)
  const [highestCombo, setHighestCombo] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [boardEffect, setBoardEffect] = useState<BoardEffect | null>(null)
  const [shakeBoard, setShakeBoard] = useState(false)
  const [preview, setPreview] = useState<BoardPreview | null>(null)
  const [keyboardPieceId, setKeyboardPieceId] = useState<string | null>(null)
  const [keyboardAnchor, setKeyboardAnchor] = useState<GridAnchor>({ row: 0, col: 0 })
  const [activeDragPieceId, setActiveDragPieceId] = useState<string | null>(null)
  const [returningPieceId, setReturningPieceId] = useState<string | null>(null)
  const [dragCoords, setDragCoords] = useState<{
    x: number
    y: number
    width: number
    height: number
    gap: number
  } | null>(null)
  const [popups, setPopups] = useState<ScorePopup[]>([])
  const [particleTrigger, setParticleTrigger] = useState<ParticleTrigger | null>(null)
  const [liveAnnounce, setLiveAnnounce] = useState('')
  const [matchLogs, setMatchLogs] = useState<MatchLogEntry[]>([])

  // Power-Ups State
  const [rerollsLeft, setRerollsLeft] = useState(1)
  const [hammersLeft, setHammersLeft] = useState(1)
  const [undosLeft, setUndosLeft] = useState(1)
  const [hammerActive, setHammerActive] = useState(false)
  const [undoHistory, setUndoHistory] = useState<BoardSnapshot[]>([])

  // Achievements & Confetti State
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(readUnlockedAchievements)
  const [achievementToast, setAchievementToast] = useState<{ title: string; icon: string } | null>(null)
  const [isConfettiActive, setIsConfettiActive] = useState(false)

  // Theme & Audio state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (window.localStorage.getItem(THEME_KEY) as ThemeMode) || 'classic'
  })
  const moveLogRef = useRef<MoveLogEntry[]>([])
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredBool(SOUND_ENABLED_KEY, true))
  const [musicEnabled, setMusicEnabled] = useState(() => readStoredBool(MUSIC_ENABLED_KEY, false))

  // User & Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getStoredUser)
  const currentUserId = currentUser?.id ?? null

  // Route-driven modal and view state
  const isLeaderboardOpen = location.pathname === '/leaderboard'
  const isDashboardOpen = location.pathname === '/dashboard'
  const isChallengeOpen = location.pathname === '/challenges'
  const isAchievementsOpen = location.pathname === '/achievements'
  const isAuthOpen = location.pathname === '/login' || location.pathname === '/register'
  const authInitialMode: 'login' | 'register' = location.pathname === '/register' ? 'register' : 'login'

  const activeDragRef = useRef<ActiveDrag | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const soundEffectsRef = useRef<SoundEffects | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const saveRequestIdRef = useRef(crypto.randomUUID())
  const sessionCompletionSubmittedRef = useRef(false)
  const gameTokenRef = useRef(0)
  const baseRouteRef = useRef('/')

  const gameStatsRef = useRef({
    score: 0,
    linesCleared: 0,
    blocksPlaced: 0,
    highestCombo: 0,
    duration: 0,
    ended: false,
  })

  const retryQueuedScores = useCallback(async () => {
    if (!currentUserId) return
    for (const entry of getDueScoreRetries()) {
      if (entry.userId !== currentUserId) continue
      try {
        const sessionId =
          entry.sessionId ??
          await createGameSession(entry.userId, entry.requestId)
        await completeGameSession(
          sessionId,
          entry.score,
          entry.linesCleared,
          entry.blocksPlaced,
          entry.highestCombo,
          entry.duration,
          entry.moveLog,
          entry.requestId,
        )
        removeScoreRetry(entry.requestId)
        setSaveStatus('saved')
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
          removeScoreRetry(entry.requestId)
          console.warn('Dropping non-retryable score save', entry.requestId)
        } else {
          updateScoreRetry(scheduleScoreRetry(entry))
        }
      }
    }
  }, [currentUserId])

  useEffect(() => {
    const startupRetry = window.setTimeout(() => void retryQueuedScores(), 0)
    const onOnline = () => void retryQueuedScores()
    window.addEventListener('online', onOnline)
    const intervalId = window.setInterval(() => void retryQueuedScores(), 30_000)
    return () => {
      window.clearTimeout(startupRetry)
      window.removeEventListener('online', onOnline)
      window.clearInterval(intervalId)
    }
  }, [retryQueuedScores])

  // Dynamic Level & XP
  const playerLevelInfo = calculatePlayerLevel(score)

  // Sound manager lifecycle
  useEffect(() => {
    const sound = new SoundEffects()
    soundEffectsRef.current = sound
    return () => {
      sound.dispose()
      soundEffectsRef.current = null
    }
  }, [])

  const playSound = useCallback((effect: Parameters<SoundEffects['play']>[0], comboLevel = 1) => {
    if (!soundEnabled) return
    soundEffectsRef.current?.play(effect, comboLevel)
  }, [soundEnabled])

  // Sync auth state on mount
  useEffect(() => {
    fetchMe()
      .then((user) => {
        if (user) {
          setCurrentUser(user)
          if (user.highestScore > bestScore) {
            setBestScore(user.highestScore)
          }
        }
      })
      .catch(() => {})
  }, [bestScore])

  // Persistence: Best Score
  useEffect(() => {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore))
    } catch {
      // Storage quota or privacy mode
    }
  }, [bestScore])

  // Persistence: Theme
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage quota or privacy mode
    }
  }, [theme])

  // Persistence: Sound FX
  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled))
    } catch {
      // Storage quota or privacy mode
    }
  }, [soundEnabled])

  // Persistence: Music
  useEffect(() => {
    try {
      window.localStorage.setItem(MUSIC_ENABLED_KEY, String(musicEnabled))
    } catch {
      // Storage quota or privacy mode
    }

    if (musicEnabled) {
      soundEffectsRef.current?.startBgm()
    } else {
      soundEffectsRef.current?.stopBgm()
    }
  }, [musicEnabled])

  // Auto-dismiss score popups
  useEffect(() => {
    if (popups.length === 0) return
    const timeoutId = window.setTimeout(() => {
      setPopups([])
    }, 900)
    return () => window.clearTimeout(timeoutId)
  }, [popups])

  // Escape key cancels hammer targeting
  useEffect(() => {
    if (!hammerActive) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setHammerActive(false)
        setLiveAnnounce('Hammer mode cancelled.')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hammerActive])

  // Reset returning piece after animation
  useEffect(() => {
    if (!returningPieceId) return
    const timer = window.setTimeout(() => setReturningPieceId(null), 240)
    return () => window.clearTimeout(timer)
  }, [returningPieceId])

  // Match timer
  useEffect(() => {
    if (phase === 'playing') {
      const interval = window.setInterval(() => {
        setDurationSeconds((sec) => sec + 1)
      }, 1000)
      return () => window.clearInterval(interval)
    }
  }, [phase])

  const addMatchLog = useCallback((text: string, subtext?: string, color?: string) => {
    setMatchLogs((prev) => [
      { id: Date.now() + Math.random(), text, subtext, color },
      ...prev.slice(0, 15),
    ])
  }, [])

  const checkAndUnlock = (id: string, title: string, icon: string) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      saveUnlockedAchievements(next)
      setAchievementToast({ title, icon })
      playSound('achievement')
      window.setTimeout(() => setAchievementToast(null), 3500)
      addMatchLog('🎖️ Badge Unlocked!', title, '#facc15')
      setLiveAnnounce(`Achievement unlocked: ${title}`)
      return next
    })
  }

  const submitSessionResult = (token: number, forceRetry = false) => {
    const sessionId = sessionIdRef.current
    const stats = gameStatsRef.current

    if (
      token !== gameTokenRef.current ||
      !stats.ended ||
      (sessionCompletionSubmittedRef.current && !forceRetry)
    ) {
      return
    }

    sessionCompletionSubmittedRef.current = true
    setSaveStatus('saving')

    const retryEntry = {
      requestId: saveRequestIdRef.current,
      sessionId,
      userId: currentUserId ?? '',
      score: stats.score,
      linesCleared: stats.linesCleared,
      blocksPlaced: stats.blocksPlaced,
      highestCombo: stats.highestCombo,
      duration: stats.duration,
      moveLog: [...moveLogRef.current],
      timestamp: Date.now(),
    }

    if (!sessionId) {
      if (currentUserId) {
        enqueueScoreRetry(retryEntry)
        setSaveStatus('unavailable')
      }
      return
    }

    completeGameSession(
      sessionId,
      stats.score,
      stats.linesCleared,
      stats.blocksPlaced,
      stats.highestCombo,
      stats.duration,
      moveLogRef.current,
      saveRequestIdRef.current,
    )
      .then((completedData) => {
        if (completedData) {
          setSaveStatus('saved')
          setLiveAnnounce('Match score successfully saved to leaderboard.')
        } else {
          setSaveStatus('saved')
        }
      })
      .catch(() => {
        enqueueScoreRetry(retryEntry)
        setSaveStatus('unavailable')
        setLiveAnnounce('Your result is safe, but your records could not be updated.')
      })
  }

  const retrySaveSession = () => {
    submitSessionResult(gameTokenRef.current, true)
  }

  const createSessionForGame = useCallback((token: number) => {
    if (!currentUserId) {
      sessionIdRef.current = null
      saveRequestIdRef.current = crypto.randomUUID()
      setSaveStatus('idle')
      return
    }
    createGameSession(currentUserId ?? undefined, saveRequestIdRef.current)
      .then((createdSessionId) => {
        if (token !== gameTokenRef.current) return
        sessionIdRef.current = createdSessionId
        setSaveStatus('idle')
      })
      .catch(() => {
        if (token !== gameTokenRef.current) return
        sessionIdRef.current = null
        setSaveStatus('unavailable')
      })
  }, [currentUserId])

  const handleUseReroll = () => {
    if (rerollsLeft <= 0 || phase !== 'playing') return
    const nextPieces = generatePieces(3, Math.random, board)
    setPieces(nextPieces)
    setRerollsLeft((r) => r - 1)
    playSound('buttonClick')
    addMatchLog('🔄 Reroll Used', 'New piece set deal', '#38bdf8')
    setLiveAnnounce('Reroll used. Fresh blocks dealt.')
  }

  const handleToggleHammer = () => {
    if (hammersLeft <= 0 || phase !== 'playing') return
    const nextState = !hammerActive
    setHammerActive(nextState)
    playSound('buttonClick')
    if (nextState) {
      setLiveAnnounce('Hammer mode active. Tap an occupied block to clear.')
    } else {
      setLiveAnnounce('Hammer mode cancelled.')
    }
  }

  const handleUseUndo = () => {
    if (undoHistory.length === 0 || undosLeft <= 0 || phase !== 'playing') return
    const previous = undoHistory[undoHistory.length - 1]
    const remainingHistory = undoHistory.slice(0, -1)

    setBoard(previous.board)
    setBoardColors(previous.boardColors)
    setBoardPatterns(previous.boardPatterns)
    setPieces(previous.pieces)
    setScore(previous.score)
    setCombo(previous.combo)
    setTotalLinesCleared(previous.linesCleared)
    setBlocksPlaced(previous.blocksPlaced)
    setHighestCombo(previous.highestCombo)
    setUndoHistory(remainingHistory)
    setUndosLeft((u) => u - 1)
    playSound('buttonClick')
    addMatchLog('↩️ Move Undone', 'Board snapshot restored', '#a78bfa')
    setLiveAnnounce('Previous move undone.')
  }

  const handleCellClick = (row: number, col: number) => {
    if (!hammerActive || !board[row]?.[col] || hammersLeft <= 0) return

    const nextBoard = board.map((r, rIdx) =>
      r.map((cell, cIdx) => (rIdx === row && cIdx === col ? false : cell)),
    )
    const nextColors = boardColors.map((r, rIdx) =>
      r.map((color, cIdx) => (rIdx === row && cIdx === col ? null : color)),
    )
    const nextPatterns = boardPatterns.map((r, rIdx) =>
      r.map((pattern, cIdx) => (rIdx === row && cIdx === col ? null : pattern)),
    )

    if (boardRef.current) {
      const bounds = boardRef.current.getBoundingClientRect()
      const cellSize = bounds.width / BOARD_SIZE
      setParticleTrigger({
        id: Date.now(),
        cells: [
          {
            x: (col + 0.5) * cellSize,
            y: (row + 0.5) * cellSize,
            color: boardColors[row][col] || '#f59e0b',
          },
        ],
      })
    }

    setBoard(nextBoard)
    setBoardColors(nextColors)
    setBoardPatterns(nextPatterns)
    setHammersLeft((h) => h - 1)
    setHammerActive(false)
    playSound('lineClear')
    addMatchLog('🔨 Hammer Smash', `Cleared block at (${row + 1}, ${col + 1})`, '#ef4444')
    setLiveAnnounce(`Hammer smashed block at row ${row + 1}, column ${col + 1}.`)
  }

  const measureGrid = (): GridGeometry | null => {
    const boardEl = boardRef.current
    if (!boardEl) return null

    const bounds = boardEl.getBoundingClientRect()
    const styles = window.getComputedStyle(boardEl)
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0
    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0
    const borderRight = Number.parseFloat(styles.borderRightWidth) || 0
    const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0')
    const contentWidth =
      bounds.width - paddingLeft - paddingRight - borderLeft - borderRight
    const cellSize = (contentWidth - gap * (BOARD_SIZE - 1)) / BOARD_SIZE
    return {
      paddingLeft,
      paddingTop,
      borderLeft,
      borderTop,
      borderRight,
      borderBottom,
      cellSize,
      gap,
    }
  }

  const getDragAnchor = (
    activeDrag: ActiveDrag,
    clientX: number,
    clientY: number,
  ): GridAnchor | null => {
    const geometry = measureGrid()
    const boardEl = boardRef.current
    if (!geometry || !boardEl) return null
    const size = getPieceSize(activeDrag.piece.shape, geometry)

    const rect = boardEl.getBoundingClientRect()
    const anchor = mapPointerToAnchor(
      clientX,
      clientY,
      rect,
      geometry,
      size.width,
      size.height,
      activeDrag.offset,
    )
    return findForgivingAnchor(
      board,
      activeDrag.piece.shape,
      anchor,
      clientX,
      clientY,
      rect,
      geometry,
      size.width,
      size.height,
      activeDrag.offset,
    ) ?? anchor
  }

  const updatePreview = (activeDrag: ActiveDrag, clientX: number, clientY: number) => {
    const anchor = getDragAnchor(activeDrag, clientX, clientY)
    if (!anchor) {
      setPreview(null)
      return
    }
    setPreview({
      row: anchor.row,
      col: anchor.col,
      shape: activeDrag.piece.shape,
      valid: canPlaceShape(board, activeDrag.piece.shape, anchor.row, anchor.col),
    })
  }

  const handlePointerDown = (
    piece: Piece,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (phase !== 'playing') return

    event.preventDefault()
    const geometry = measureGrid()
    const boardEl = boardRef.current
    if (!geometry || !boardEl) return
    const sourceRect = event.currentTarget.getBoundingClientRect()
    const size = getPieceSize(piece.shape, geometry)
    const offset = {
      offsetXRatio: Math.max(0, Math.min(1, (event.clientX - sourceRect.left) / sourceRect.width)),
      offsetYRatio: Math.max(0, Math.min(1, (event.clientY - sourceRect.top) / sourceRect.height)),
    }
    activeDragRef.current = {
      piece,
      pointerId: event.pointerId,
      offset,
      sourceElement: event.currentTarget,
    }
    setActiveDragPieceId(piece.id)
    setDragCoords({
      x: event.clientX - offset.offsetXRatio * size.width,
      y: event.clientY - offset.offsetYRatio * size.height,
      width: size.width,
      height: size.height,
      gap: geometry.gap,
    })
    playSound('blockPick')
    updatePreview(activeDragRef.current, event.clientX, event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current
    if (activeDrag?.pointerId === event.pointerId) {
      event.preventDefault()
      const geometry = measureGrid()
      if (!geometry) return
      const size = getPieceSize(activeDrag.piece.shape, geometry)
      setDragCoords({
        x: event.clientX - activeDrag.offset.offsetXRatio * size.width,
        y: event.clientY - activeDrag.offset.offsetYRatio * size.height,
        width: size.width,
        height: size.height,
        gap: geometry.gap,
      })
      updatePreview(activeDrag, event.clientX, event.clientY)
    }
  }

  const clearDrag = useCallback(() => {
    activeDragRef.current = null
    setActiveDragPieceId(null)
    setDragCoords(null)
    setPreview(null)
  }, [])

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return
    event.preventDefault()
    setReturningPieceId(activeDrag.piece.id)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already have been released by the browser.
    }
    clearDrag()
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const activeDrag = activeDragRef.current
      if (!activeDrag) return
      event.preventDefault()
      setReturningPieceId(activeDrag.piece.id)
      if (activeDrag.sourceElement.hasPointerCapture(activeDrag.pointerId)) {
        activeDrag.sourceElement.releasePointerCapture(activeDrag.pointerId)
      }
      clearDrag()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearDrag])

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current

    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return
    event.preventDefault()
    const finalAnchor = getDragAnchor(activeDrag, event.clientX, event.clientY)
    const validDrop =
      finalAnchor !== null &&
      canPlaceShape(board, activeDrag.piece.shape, finalAnchor.row, finalAnchor.col) &&
      pieces.some(({ id }) => id === activeDrag.piece.id)

    if (validDrop && finalAnchor) {
    moveLogRef.current = [
      ...moveLogRef.current,
      {
        shapeId: activeDrag.piece.shape.id,
        row: finalAnchor.row,
        col: finalAnchor.col,
      },
    ]
      // Save snapshot for undo booster
      setUndoHistory((prev) => [
        ...prev.slice(-3),
        {
          board: board.map((r) => [...r]),
          boardColors: boardColors.map((r) => [...r]),
          boardPatterns: boardPatterns.map((r) => [...r]),
          pieces,
          score,
          combo,
          linesCleared: totalLinesCleared,
          blocksPlaced,
          highestCombo,
        },
      ])

      const placedBoard = placeShape(
        board,
        activeDrag.piece.shape,
        finalAnchor.row,
        finalAnchor.col,
      )

      // Record block colors and patterns onto the board
      const nextBoardColors = boardColors.map((r) => [...r])
      const nextBoardPatterns = boardPatterns.map((r) => [...r])
      activeDrag.piece.shape.cells.forEach((cell) => {
        const r = finalAnchor.row + cell.row
        const c = finalAnchor.col + cell.col
        nextBoardColors[r][c] = activeDrag.piece.shape.color
        nextBoardPatterns[r][c] = activeDrag.piece.shape.pattern || null
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

      // Clear colors and patterns for cleared rows and columns
      cleared.clearedRows.forEach((r) => {
        for (let c = 0; c < BOARD_SIZE; c++) {
          nextBoardColors[r][c] = null
          nextBoardPatterns[r][c] = null
        }
      })
      cleared.clearedColumns.forEach((c) => {
        for (let r = 0; r < BOARD_SIZE; r++) {
          nextBoardColors[r][c] = null
          nextBoardPatterns[r][c] = null
        }
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
      setBoardPatterns(nextBoardPatterns)
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

      // Match telemetry log & live announcement
      if (clearedLineCount > 1) {
        addMatchLog(`⚡ ${clearedLineCount} Lines Blast! (+${placementScore})`, `Combo x${nextCombo}`, '#ec4899')
        setLiveAnnounce(`${clearedLineCount} lines blasted! Combo multiplier times ${nextCombo}. Score: ${nextScore}`)
      } else if (clearedLineCount === 1) {
        addMatchLog(`✨ Line Clear (+${placementScore})`, nextCombo > 1 ? `Combo x${nextCombo}` : undefined, '#06b6d4')
        setLiveAnnounce(`Line cleared! Score: ${nextScore}`)
      } else {
        addMatchLog(`Piece Placed (+${placementScore})`, activeDrag.piece.shape.name, activeDrag.piece.shape.color)
        setLiveAnnounce(`Piece placed. Score: ${nextScore}`)
      }

      // High Score check & celebration
      if (nextScore > bestScore) {
        if (!isNewBest && bestScore > 0) {
          setIsNewBest(true)
          playSound('newBest')
          setIsConfettiActive(true)
          window.setTimeout(() => setIsConfettiActive(false), 4500)
          setLiveAnnounce(`New personal best record! ${nextScore} points!`)
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
      moveLogRef.current = []

      // Floating Popups
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
          row: finalAnchor.row + cell.row,
          col: finalAnchor.col + cell.col,
        })),
        clearedRows: cleared.clearedRows,
        clearedColumns: cleared.clearedColumns,
      })

      if (clearedLineCount > 1 || nextCombo > 2) {
        setShakeBoard(true)
      }

      // Audio
      playSound('placement')
      if (clearedLineCount > 0) {
        window.setTimeout(() => {
          if (clearedLineCount === 1) {
            playSound('lineClear')
          } else {
            playSound('multiLine')
          }
        }, 110)

        if (nextCombo > 1) {
          window.setTimeout(() => {
            playSound('combo', nextCombo)
          }, 240)
        }
      }

      if (didGameEnd) {
        gameStatsRef.current.ended = true
        setPhase('gameOver')
        playSound('gameOver')
        navigate('/game-over')
        setLiveAnnounce(`Game over! No moves remaining. Final score: ${nextScore}`)
        if (isNewBest) {
          setIsConfettiActive(true)
          window.setTimeout(() => setIsConfettiActive(false), 5000)
        }
        submitSessionResult(gameTokenRef.current)
      }
    } else {
      // Dropped outside or invalid - trigger return animation
      setReturningPieceId(activeDrag.piece.id)
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    clearDrag()
  }

  const handleKeyboardSelect = (piece: Piece) => {
    if (phase !== 'playing') return
    setKeyboardPieceId(piece.id)
    setKeyboardAnchor({ row: 0, col: 0 })
    setPreview({
      row: 0,
      col: 0,
      shape: piece.shape,
      valid: canPlaceShape(board, piece.shape, 0, 0),
    })
    setLiveAnnounce(`${piece.shape.name} piece selected. Use arrow keys to move it.`)
  }

  const handleKeyboardMove = (piece: Piece, key: string) => {
    if (phase !== 'playing' || keyboardPieceId !== piece.id) return
    const row = Math.max(0, Math.min(BOARD_SIZE - 1, keyboardAnchor.row + (key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0)))
    const col = Math.max(0, Math.min(BOARD_SIZE - 1, keyboardAnchor.col + (key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0)))
    const nextAnchor = { row, col }
    setKeyboardAnchor(nextAnchor)
    setPreview({
      row,
      col,
      shape: piece.shape,
      valid: canPlaceShape(board, piece.shape, row, col),
    })
  }

  const handleKeyboardPlace = (piece: Piece) => {
    if (phase !== 'playing' || keyboardPieceId !== piece.id) return
    const boardEl = boardRef.current
    const source = document.querySelector(`[data-piece-id="${piece.id}"]`)
    if (!boardEl || !(source instanceof HTMLDivElement)) return
    const geometry = measureGrid()
    if (!geometry) return
    const rect = boardEl.getBoundingClientRect()
    const styles = window.getComputedStyle(boardEl)
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0
    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0
    const step = geometry.cellSize + geometry.gap
    const event = {
      currentTarget: source,
      pointerId: -1,
      clientX: rect.left + borderLeft + paddingLeft + keyboardAnchor.col * step,
      clientY: rect.top + borderTop + paddingTop + keyboardAnchor.row * step,
      preventDefault: () => undefined,
    } as unknown as PointerEvent<HTMLDivElement>
    activeDragRef.current = {
      piece,
      pointerId: -1,
      offset: { offsetXRatio: 0, offsetYRatio: 0 },
      sourceElement: source,
    }
    handlePointerUp(event)
    setKeyboardPieceId(null)
    setPreview(null)
  }

  const handleKeyboardCancel = () => {
    setKeyboardPieceId(null)
    setPreview(null)
    setLiveAnnounce('Placement cancelled. Piece returned to the tray.')
  }

  const startNewGame = useCallback(() => {
    clearDrag()
    gameTokenRef.current += 1
    sessionIdRef.current = null
    saveRequestIdRef.current = crypto.randomUUID()
    setKeyboardPieceId(null)
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
    setBoardPatterns(createEmptyPatternBoard())
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
    setBoardEffect(null)
    setShakeBoard(false)
    setPopups([])
    setSaveStatus('saving')
    setPhase('playing')
    playSound('buttonClick')
    setLiveAnnounce('New match started. Board is empty and ready.')

    if (musicEnabled) {
      soundEffectsRef.current?.startBgm()
    }

    createSessionForGame(gameTokenRef.current)
    if (location.pathname !== '/play') {
      navigate('/play')
    }
  }, [clearDrag, musicEnabled, playSound, location.pathname, navigate, createSessionForGame])

  const returnHome = () => {
    clearDrag()
    setBoardEffect(null)
    setShakeBoard(false)
    setHammerActive(false)
    setIsConfettiActive(false)
    setPhase('home')
    playSound('buttonClick')
    if (location.pathname !== '/' && location.pathname !== '/home') {
      navigate('/')
    }
  }

  const closeModal = () => {
    navigate(baseRouteRef.current || '/')
  }

  const openAuth = (mode: 'login' | 'register') => {
    navigate(mode === 'register' ? '/register' : '/login')
  }

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user)
    if (user.highestScore > bestScore) {
      setBestScore(user.highestScore)
    }
    closeModal()
  }

  const handleLogout = () => {
    logout().finally(() => {
      setCurrentUser(null)
    })
  }

  // Router URL synchronization without cascading synchronous render
  useEffect(() => {
    const current = location.pathname
    if (current === '/' || current === '/home') {
      baseRouteRef.current = '/'
      if (phase === 'playing' || phase === 'gameOver') {
        queueMicrotask(() => {
          clearDrag()
          setBoardEffect(null)
          setShakeBoard(false)
          setHammerActive(false)
          setIsConfettiActive(false)
          setPhase('home')
        })
      }
    } else if (current === '/play') {
      baseRouteRef.current = '/play'
      if (phase === 'home') {
        queueMicrotask(() => {
          startNewGame()
        })
      }
    } else if (current === '/game-over') {
      if (phase !== 'gameOver') {
        queueMicrotask(() => {
          setPhase('gameOver')
        })
      }
    }
  }, [location.pathname, phase, startNewGame, clearDrag])

  useEffect(() => {
    document.title = location.pathname === '/play' ? 'Block Blitz - Play' : 'BLOCK BLITZ — Puzzle Game'
  }, [location.pathname])

  const activeDragPiece = pieces.find((p) => p.id === activeDragPieceId) || null

  return (
    <div className={`app-root theme-${theme} phase-${phase}`}>
      {/* Polite Accessibility Live Region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnounce}
      </div>

      {/* Global Confetti Shower Canvas on High Score & Milestones */}
      <ConfettiCanvas active={isConfettiActive} />

      {/* Achievement Unlocked Toast Banner */}
      {achievementToast && (
        <div className="achievement-toast-banner animate-slide-up" role="alert">
          <span className="toast-icon" aria-hidden="true">{achievementToast.icon}</span>
          <div className="toast-text">
            <span className="toast-tag">ACHIEVEMENT UNLOCKED</span>
            <strong>{achievementToast.title}</strong>
          </div>
        </div>
      )}

        <AppHeader
          theme={theme}
          onThemeChange={setTheme}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            setSoundEnabled((prev) => !prev)
            playSound('buttonClick')
          }}
          musicEnabled={musicEnabled}
          onToggleMusic={() => {
            const nextEnabled = !musicEnabled
            setMusicEnabled(nextEnabled)
            if (nextEnabled) {
              soundEffectsRef.current?.startBgm()
            } else {
              soundEffectsRef.current?.stopBgm()
            }
            playSound('buttonClick')
          }}
          onOpenLeaderboard={() => {
            navigate('/leaderboard')
            playSound('buttonClick')
          }}
          onOpenDashboard={() => {
            navigate('/dashboard')
            playSound('buttonClick')
          }}
          onOpenChallenge={() => {
            navigate('/challenges')
            playSound('buttonClick')
          }}
          onOpenAchievements={() => {
            navigate('/achievements')
            playSound('buttonClick')
          }}
          onHome={returnHome}
          onOpenAuth={() => openAuth('login')}
          levelInfo={playerLevelInfo}
          currentUser={currentUser}
        />

      <div className="bb-page">
      {phase === 'home' && location.pathname !== '/play' ? (
        <HomeScreen
          bestScore={bestScore}
          totalLinesCleared={totalLinesCleared}
          unlockedBadgesCount={unlockedAchievements.length}
          onPlay={startNewGame}
          currentUser={currentUser}
          levelInfo={playerLevelInfo}
          soundEnabled={soundEnabled}
          musicEnabled={musicEnabled}
          onToggleSound={() => {
            setSoundEnabled((prev) => !prev)
            playSound('buttonClick')
          }}
          onToggleMusic={() => {
            const nextEnabled = !musicEnabled
            setMusicEnabled(nextEnabled)
            if (nextEnabled) soundEffectsRef.current?.startBgm()
            else soundEffectsRef.current?.stopBgm()
            playSound('buttonClick')
          }}
          onOpenLeaderboard={() => {
            navigate('/leaderboard')
            playSound('buttonClick')
          }}
          onOpenDashboard={() => {
            navigate('/dashboard')
            playSound('buttonClick')
          }}
          onOpenChallenge={() => {
            navigate('/challenges')
            playSound('buttonClick')
          }}
          onOpenAchievements={() => {
            navigate('/achievements')
            playSound('buttonClick')
          }}
          onOpenAuth={() => openAuth('login')}
        />
      ) : (
        <div className="widescreen-arena-wrapper">
          {/* Zone 1: Left - Tactical Boosters & Daily Mission */}
          <DesktopSidebarLeft
            currentLinesCleared={totalLinesCleared}
            onOpenChallenge={() => {
              navigate('/challenges')
              playSound('buttonClick')
            }}
            onNewGame={startNewGame}
            onHome={returnHome}
            score={score}
            bestScore={bestScore}
            saveStatus={saveStatus}
            combo={combo}
            locked={phase === 'gameOver'}
          />

          {/* Zone 2: Center - Arena, Dominant Score HUD & 8x8 Board */}
          <main className="game-shell" role="main">
            <div className="arena-context">
              <div className="arena-context-copy">
                <span className="eyebrow">SOLO ARENA</span>
                <h1>Make your move</h1>
              </div>
            </div>

            {/* Hammer active mode banner */}
            {hammerActive && (
              <div className="hammer-active-banner animate-pulse" role="status">
                <span className="hammer-banner-icon" aria-hidden="true">🔨</span>
                <span className="hammer-banner-text">
                  HAMMER ACTIVE: Tap any occupied block on the grid to shatter it!
                </span>
                <button
                  type="button"
                  className="hammer-banner-cancel-btn"
                  onClick={() => {
                    setHammerActive(false)
                    setLiveAnnounce('Hammer mode cancelled.')
                  }}
                  title="Cancel Hammer (Escape)"
                  aria-label="Cancel Hammer Mode"
                >
                  Cancel (Esc)
                </button>
              </div>
            )}

            {/* Floating Score Popups */}
            <FloatingScores popups={popups} />

            {/* 8x8 Board with Particle Explosion Canvas */}
            <div className={`board-outer-wrapper${phase === 'gameOver' ? ' board-outer-wrapper--locked' : ''}`}>
              {blocksPlaced === 0 && (
                <div className="empty-board-hint" aria-hidden="true">
                  Drag a block onto the grid to begin
                </div>
              )}
              <ParticleCanvas trigger={particleTrigger} />
              <GameBoard
                board={board}
                boardColors={boardColors}
                boardPatterns={boardPatterns}
                boardRef={boardRef}
                preview={preview}
                effect={boardEffect}
                shake={shakeBoard}
                hammerActive={hammerActive}
                locked={phase === 'gameOver'}
                onCellClick={handleCellClick}
              />
            </div>

            {/* Mobile Power-Ups Strip (visible only on mobile) */}
            <div className="mobile-boosters-strip" role="group" aria-label="Tactical boosters">
              <button
                type="button"
                className="mobile-booster-btn"
                onClick={handleUseReroll}
                disabled={rerollsLeft === 0 || phase !== 'playing'}
                title={rerollsLeft === 0 ? 'No rerolls remaining' : 'Reroll piece tray'}
              >
                <span aria-hidden="true">🔄</span>
                <span>Reroll ({rerollsLeft})</span>
              </button>
              <button
                type="button"
                className={`mobile-booster-btn${hammerActive ? ' mobile-booster-btn--active' : ''}`}
                onClick={handleToggleHammer}
                disabled={hammersLeft === 0 || phase !== 'playing'}
                aria-pressed={hammerActive}
                title={hammersLeft === 0 ? 'No hammers remaining' : 'Hammer block smash'}
              >
                <span aria-hidden="true">🔨</span>
                <span>{hammerActive ? 'Cancel (Esc)' : `Hammer (${hammersLeft})`}</span>
              </button>
              <button
                type="button"
                className="mobile-booster-btn"
                onClick={handleUseUndo}
                disabled={undoHistory.length === 0 || undosLeft === 0 || phase !== 'playing'}
                title={
                  undosLeft === 0
                    ? 'No undos remaining'
                    : undoHistory.length === 0
                      ? 'No previous move to revert'
                      : 'Undo last placement'
                }
              >
                <span aria-hidden="true">↩️</span>
                <span>Undo ({undosLeft})</span>
              </button>
            </div>

            {/* Blocks Arsenal Dock (Centered directly under the 8x8 Board) */}
            <PieceTray
              pieces={pieces}
              activePieceId={activeDragPieceId ?? keyboardPieceId}
              returningPieceId={returningPieceId}
              locked={phase === 'gameOver'}
              compact={false}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onKeyboardSelect={handleKeyboardSelect}
              onKeyboardMove={handleKeyboardMove}
              onKeyboardPlace={handleKeyboardPlace}
              onKeyboardCancel={handleKeyboardCancel}
            />

            {/* Mobile Bottom Quick Actions */}
            <div className="game-bottom-actions">
              <button
                className="text-pill-btn"
                type="button"
                onClick={startNewGame}
                title="Restart with a new game session"
              >
                🔄 Restart Run
              </button>
              <button
                className="text-pill-btn"
                type="button"
                onClick={returnHome}
                title="Return to home screen"
              >
                ← Back to Home
              </button>
            </div>
          </main>

          {/* Zone 3: Right - Global Arena Leaderboard, Live Feed & Controls */}
          <div className="desktop-right-column">
            <DesktopSidebarRight
              currentUserId={currentUserId}
              matchLogs={matchLogs}
              onOpenLeaderboard={() => {
                navigate('/leaderboard')
                playSound('buttonClick')
              }}
              rerollsLeft={rerollsLeft}
              hammersLeft={hammersLeft}
              undosLeft={undosLeft}
              hammerActive={hammerActive}
              onUseReroll={handleUseReroll}
              onToggleHammer={handleToggleHammer}
              onUseUndo={handleUseUndo}
              canUndo={undoHistory.length > 0}
              locked={phase === 'gameOver'}
            />
          </div>

          {/* Floating Drag Avatar (Follows cursor/touch seamlessly) */}
          {activeDragPiece && dragCoords && (
            <div
              className="floating-drag-piece"
              style={{
                left: `${dragCoords.x}px`,
                top: `${dragCoords.y}px`,
                width: `${dragCoords.width}px`,
                height: `${dragCoords.height}px`,
              }}
              aria-hidden="true"
            >
              <div
                className="piece-grid"
                style={{
                  '--piece-rows': getShapeDimensions(activeDragPiece.shape).rows,
                  '--piece-cols': getShapeDimensions(activeDragPiece.shape).cols,
                  '--drag-cell-size': `${(dragCoords.width - dragCoords.gap * (getShapeDimensions(activeDragPiece.shape).cols - 1)) / getShapeDimensions(activeDragPiece.shape).cols}px`,
                  '--drag-gap': `${dragCoords.gap}px`,
                } as CSSProperties}
              >
                {activeDragPiece.shape.cells.map(({ row, col }) => (
                  <span
                    className="piece-cell piece-cell--dragging"
                    key={`floating-${row}-${col}`}
                    style={{
                      gridRow: row + 1,
                      gridColumn: col + 1,
                      backgroundColor: activeDragPiece.shape.color,
                    }}
                  >
                    <BlockPatternSvg pattern={activeDragPiece.shape.pattern} />
                    <span className="piece-cell-shine" aria-hidden="true" />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Game Over Modal */}
      {(phase === 'gameOver' || location.pathname === '/game-over') && (
        <GameOverModal
          score={score}
          bestScore={bestScore}
          isNewBest={isNewBest}
          linesCleared={totalLinesCleared}
          highestCombo={highestCombo}
          blocksPlaced={blocksPlaced}
          durationSeconds={durationSeconds}
          saveStatus={saveStatus}
          currentUser={currentUser}
          onPlayAgain={startNewGame}
          onOpenLeaderboard={() => {
            navigate('/leaderboard')
            playSound('buttonClick')
          }}
          onOpenDashboard={() => {
            navigate('/dashboard')
            playSound('buttonClick')
          }}
          onOpenAuth={() => openAuth('register')}
          onHome={returnHome}
          onRetrySave={retrySaveSession}
        />
      )}

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={closeModal}
        currentUserId={currentUserId}
      />

      {/* Player Dashboard Modal */}
      <PlayerDashboardModal
        isOpen={isDashboardOpen}
        onClose={closeModal}
        currentUser={currentUser}
        onOpenAuth={() => openAuth('login')}
        onLogout={handleLogout}
      />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={closeModal}
        onSuccess={handleAuthSuccess}
      />

      {/* Daily Challenge Modal */}
      <DailyChallengeModal
        isOpen={isChallengeOpen}
        onClose={closeModal}
        currentLinesCleared={totalLinesCleared}
        onPlay={() => {
          if (phase !== 'playing') {
            startNewGame()
          } else {
            navigate('/play')
          }
        }}
      />

      {/* Achievements / Badges Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={closeModal}
        unlockedIds={unlockedAchievements}
      />
    </div>
  )
}

export default App
