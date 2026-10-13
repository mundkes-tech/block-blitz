import { useState } from 'react'
import GameBoard from './components/GameBoard'
import { createEmptyBoard, type Board } from './game/board'
import './App.css'

function App() {
  const [board] = useState<Board>(createEmptyBoard)

  return (
    <main className="game-shell">
      <header className="game-header">
        <p className="eyebrow">PUZZLE ARENA</p>
        <h1>BLOCK BLITZ</h1>
        <p className="subtitle">Build your best board, one block at a time.</p>
      </header>
      <GameBoard board={board} />
    </main>
  )
}

export default App
