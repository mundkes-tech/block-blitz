import { useEffect, useRef, useState, type PointerEvent } from 'react'
import GameBoard, {
  type BoardEffect,
  type BoardPreview,
} from './components/GameBoard'
import PieceTray from './components/PieceTray'
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
import './App.css'

type ActiveDrag = {
  piece: Piece
  pointerId: number
}

type GamePhase = 'home' | 'playing' | 'gameOver'

const BEST_SCORE_KEY = 'block-blitz-best-score'
const SOUND_ENABLED_KEY = 'block-blitz-sound-enabled'

function readBestScore(): number {
  try {
    const storedScore = Number.parseInt(
      window.localStorage.getItem(BEST_SCORE_KEY) ?? '',
      10,
    )

    return Number.isFinite(storedScore) && storedScore >= 0 ? storedScore : 0
  } catch {
    return 0
  }
}

function readSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

function HomeScreen({
  bestScore,
  onPlay,
}: {
  bestScore: number
  onPlay: () => void
}) {
  return (
    <main className="home-screen">
      <section className="home-card" aria-labelledby="home-title">
        <p className="eyebrow">PUZZLE ARENA</p>
        <h1 id="home-title">BLOCK BLITZ</h1>
        <p className="home-tagline">Build your best board, one block at a time.</p>
        <div className="home-preview" aria-hidden="true">
          <div className="home-board-preview">
            {Array.from({ length: 64 }, (_, index) => (
              <span
                className={`home-board-cell ${
                  [1, 2, 9, 10, 18, 19, 26, 34, 35, 36, 43, 51, 52, 53].includes(
                    index,
                  )
                    ? 'home-board-cell--filled'
                    : ''
                }`}
                key={index}
              />
            ))}
          </div>
          <div className="home-shapes">
            <span className="home-shape home-shape--a" />
            <span className="home-shape home-shape--b" />
            <span className="home-shape home-shape--c" />
          </div>
        </div>
        <p className="how-to-play">
          Drag the colorful blocks onto the 8×8 board. Fill a row or column to
          clear it and keep your combo going.
        </p>
        <button className="primary-button" type="button" onClick={onPlay}>
          Play Game
        </button>
        <p className="best-score">Best score <strong>{bestScore}</strong></p>
      </section>
    </main>
  )
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('home')
  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [pieces, setPieces] = useState<Piece[]>(generatePieces)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestScore, setBestScore] = useState(readBestScore)
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled)
  const [boardEffect, setBoardEffect] = useState<BoardEffect | null>(null)
  const [feedbackId, setFeedbackId] = useState(0)
  const [preview, setPreview] = useState<BoardPreview | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const previewRef = useRef<BoardPreview | null>(null)
  const soundEffectsRef = useRef<SoundEffects | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore))
    } catch {
      // Best score remains available for this session if storage is unavailable.
    }
  }, [bestScore])

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled))
    } catch {
      // The toggle still works for the current session if storage is unavailable.
    }
  }, [soundEnabled])

  useEffect(() => {
    if (!boardEffect) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setBoardEffect(null)
    }, 420)

    return () => window.clearTimeout(timeoutId)
  }, [boardEffect])

  const playSound = (effect: Parameters<SoundEffects['play']>[0]) => {
    if (!soundEnabled) {
      return
    }

    soundEffectsRef.current ??= new SoundEffects()
    soundEffectsRef.current.play(effect)
  }

  const updatePreview = (
    piece: Piece,
    clientX: number,
    clientY: number,
  ) => {
    const boardElement = boardRef.current

    if (!boardElement) {
      return
    }

    const bounds = boardElement.getBoundingClientRect()
    const styles = getComputedStyle(boardElement)
    const paddingLeft = Number.parseFloat(styles.paddingLeft)
    const paddingRight = Number.parseFloat(styles.paddingRight)
    const paddingTop = Number.parseFloat(styles.paddingTop)
    const paddingBottom = Number.parseFloat(styles.paddingBottom)
    const gap = Number.parseFloat(styles.columnGap)
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
    if (phase !== 'playing') {
      return
    }

    event.preventDefault()
    activeDragRef.current = { piece, pointerId: event.pointerId }
    updatePreview(piece, event.clientX, event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current

    if (activeDrag?.pointerId === event.pointerId) {
      updatePreview(activeDrag.piece, event.clientX, event.clientY)
    }
  }

  const clearDrag = () => {
    activeDragRef.current = null
    previewRef.current = null
    setPreview(null)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const activeDrag = activeDragRef.current
    const currentPreview = previewRef.current

    if (
      !activeDrag ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return
    }

    if (currentPreview?.valid && pieces.some(({ id }) => id === activeDrag.piece.id)) {
      const placedBoard = placeShape(
        board,
        activeDrag.piece.shape,
        currentPreview.row,
        currentPreview.col,
      )
      const cleared = clearCompletedLines(placedBoard)
      const clearedLineCount =
        cleared.clearedRows.length + cleared.clearedColumns.length
      const remainingPieces = pieces.filter(
        ({ id }) => id !== activeDrag.piece.id,
      )
      const nextPieces =
        remainingPieces.length === 0 ? generatePieces() : remainingPieces
      const placementScore = calculatePlacementScore(
        activeDrag.piece.shape.cells.length,
        clearedLineCount,
      )
      const nextScore = score + placementScore
      const nextCombo = updateCombo(combo, clearedLineCount)
      const didGameEnd = isGameOver(cleared.board, nextPieces)

      setBoard(cleared.board)
      setPieces(nextPieces)
      setScore(nextScore)
      setBestScore((currentBest) => Math.max(currentBest, nextScore))
      setCombo(nextCombo)
      setFeedbackId((currentId) => currentId + 1)
      setBoardEffect({
        id: Date.now(),
        placedCells: activeDrag.piece.shape.cells.map((cell) => ({
          row: currentPreview.row + cell.row,
          col: currentPreview.col + cell.col,
        })),
        clearedRows: cleared.clearedRows,
        clearedColumns: cleared.clearedColumns,
      })
      playSound('placement')
      if (clearedLineCount > 0) {
        playSound('lineClear')
      }
      if (clearedLineCount > 1 || nextCombo > 1) {
        playSound('combo')
      }
      if (didGameEnd) {
        setPhase('gameOver')
        playSound('gameOver')
      }
    }

    clearDrag()
  }

  const startNewGame = () => {
    clearDrag()
    setBoard(createEmptyBoard())
    setPieces(generatePieces())
    setScore(0)
    setCombo(0)
    setBoardEffect(null)
    setFeedbackId((currentId) => currentId + 1)
    setPhase('playing')
  }

  const returnHome = () => {
    clearDrag()
    setBoardEffect(null)
    setPhase('home')
  }

  if (phase === 'home') {
    return <HomeScreen bestScore={bestScore} onPlay={startNewGame} />
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <p className="eyebrow">PUZZLE ARENA</p>
        <h1>BLOCK BLITZ</h1>
        <p className="subtitle">Build your best board, one block at a time.</p>
        <button className="text-button" type="button" onClick={returnHome}>
          Home
        </button>
      </header>
      <section className="score-panel" aria-label="Game score">
        <div>
          <span className="score-label">SCORE</span>
          <strong
            className={
              feedbackId > 0 ? 'score-value score-value--updated' : 'score-value'
            }
            key={feedbackId}
          >
            {score}
          </strong>
        </div>
        {combo > 0 && (
          <div className="combo-feedback" aria-live="polite">
            <span className="score-label">COMBO</span>
            <strong className="combo-value" key={`${feedbackId}-${combo}`}>
              {combo}x
            </strong>
          </div>
        )}
      </section>
      <div className="game-controls">
        <button
          className="sound-toggle"
          type="button"
          aria-pressed={soundEnabled}
          onClick={() => setSoundEnabled((enabled) => !enabled)}
        >
          {soundEnabled ? 'Sound on' : 'Sound off'}
        </button>
      </div>
      <GameBoard
        board={board}
        boardRef={boardRef}
        preview={preview}
        effect={boardEffect}
      />
      <PieceTray
        pieces={pieces}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearDrag}
      />
      {phase === 'gameOver' && (
        <div className="game-over-overlay" role="dialog" aria-modal="true">
          <div className="game-over-card">
            <p className="eyebrow">BOARD COMPLETE</p>
            <h2>GAME OVER</h2>
            <p className="final-score">Final score: {score}</p>
            <div className="game-over-actions">
              <button className="primary-button" type="button" onClick={startNewGame}>
                Restart
              </button>
              <button className="secondary-button" type="button" onClick={returnHome}>
                Home
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
