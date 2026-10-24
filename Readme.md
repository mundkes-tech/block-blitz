# 🧩 BLOCK BLITZ

> **PUZZLE • PLACE • CLEAR • COMBO**  
> A full-stack browser-based block puzzle web game inspired by *Block Blast!*, engineered with React 19, TypeScript, Express 5, and PostgreSQL.

---

## 📖 Project Overview

**BLOCK BLITZ** is an engaging puzzle game combining responsive tactile drag-and-drop gameplay, satisfying row and column blast effects, progressive combo mechanics, global and filtered leaderboards, user profiles, and server-side score verification.

---

## 🎮 Gameplay & Rules

1. **Board**: An 8×8 grid where blocks are placed.
2. **Block Generation**: 3 dynamic shapes appear in the tray per cycle. A fairness algorithm ensures deals are never impossible when valid moves exist on the board.
3. **Placing Pieces**: Drag shapes onto the board. Hovering shows a glowing ghost footprint (valid) or soft red warning (invalid). On mobile touch screens, blocks feature an elevated offset so the finger never blocks the view.
4. **Clearing Lines**: Filling any complete row or column clears it instantly. Multiple simultaneous rows/columns trigger **Double**, **Triple**, or **Quadruple Clears** with glowing flash effects and dynamic screen shake!
5. **Combos**: Clearing lines on consecutive turns builds up a combo multiplier (`Combo x2`, `Combo x3`, etc.), triggering pitch-shifting harmonic chimes and large bonus points.
6. **Tactical Boosters (Section 47 Bonus Points)**:
   * 🔄 **Reroll Tray**: Redraw 3 fresh pieces when facing an unplayable tray.
   * 🔨 **Hammer Smash**: Click hammer mode, then click any filled cell on the board to smash it with particle effects.
   * ↩️ **Undo Move**: Reverts the last placed block if you make an accidental move.
7. **HTML5 Canvas Particle Burst**: Simultaneous row/column clears blast glowing particle shards matching block colors with real physics.
8. **Responsive Widescreen Layout**: Adapts to full desktop width with a 3-column studio arena (Player profile, live telemetry, and mini-leaderboard) while collapsing cleanly to a thumb-friendly mobile layout on smaller screens.
9. **Game Over**: The match concludes when none of the available pieces can legally fit onto the board.

---

## 🧮 Scoring System & Formula

Documented as required by **Section 17 & 43**:

$$\text{Total Score} = \text{Base Block Points} + \text{Line Clear Points} + \text{Multi-Clear Bonus} + \text{Combo Bonus}$$

| Action | Formula / Points | Example |
| :--- | :--- | :--- |
| **Placing a Block** | `10 pts per cell` | 4-cell block = `+40 pts` |
| **Single Line Clear** | `100 pts` | 1 line = `+100 pts` |
| **Double Clear** | `200 pts + 20 multi bonus = 240 pts` | 2 lines = `+240 pts` |
| **Triple Clear** | `300 pts + 40 multi bonus = 340 pts` | 3 lines = `+340 pts` |
| **Combo Bonus** | `Combo Level × 50 pts` | Combo x3 = `+150 bonus pts` |

---

## 🛡️ Server-Side Score Validation (Anti-Cheat Engine)

As specified in **Section 33**, client-submitted game data is never blindly trusted:
1. **Session Lifecycle Verification**: Sessions must be created via `/api/games/start` before play; duplicate submissions or completing an already completed session return `409 Conflict`.
2. **Speed & Duration Plausibility**: Compares `blocksPlaced` against `duration`. Minimum required placement time threshold prevents automated instant bot injections (`duration >= blocksPlaced * 0.1s`).
3. **Line-to-Block Mathematical Limit**: Cleared lines cannot physically exceed theoretical bounds relative to blocks placed (`linesCleared <= blocksPlaced * 4`).
4. **Score Ceiling Bounds**: Max score is checked against theoretical maximums per block and combo multiplier (`score <= blocksPlaced * 1500 + linesCleared * 500 + 5000`).

---

## 🎨 Visual Themes & Audio System

* **5 Curated Themes**:
  * 🟢 **Classic Emerald**: Deep midnight obsidian with lush jade accents.
  * ⚡ **Cyber Neon**: Dark purple with radiant neon pink and electric cyan.
  * 🍬 **Sweet Candy**: Bubblegum pink, sunny pastel yellow, and mint.
  * 🌊 **Ocean Deep**: Abyssal navy, glowing cyan, and seafoam.
  * 🌌 **Galaxy Starlight**: Cosmic purple, nebula magenta, and stardust.
* **Audio System**:
  * **Independent Controls**: Separate **Music ON/OFF** and **Sound FX ON/OFF** toggles.
  * **Procedural Ambient BGM**: Relaxing pentatonic synth arpeggios generated in real-time via Web Audio API (no external asset lag).
  * **Dynamic Sound Effects**: Button clicks, block pick-up pops, placement thuds, line clear chimes, multi-line chords, escalating combo tones, game over sound, and high-score fanfare.

---

## 📊 Database Schema (PostgreSQL)

### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  highest_score INTEGER NOT NULL DEFAULT 0,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_lines_cleared INTEGER NOT NULL DEFAULT 0,
  highest_combo INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `game_sessions`
```sql
CREATE TABLE game_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  lines_cleared INTEGER NOT NULL DEFAULT 0,
  blocks_placed INTEGER NOT NULL DEFAULT 0,
  rows_cleared INTEGER NOT NULL DEFAULT 0,
  columns_cleared INTEGER NOT NULL DEFAULT 0,
  highest_combo INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
);
```

---

## 🔌 API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/games/start` | Creates a new game session. Optional `userId` body parameter. |
| `POST` | `/api/games/complete` | Submits match result (`sessionId`, `score`, `linesCleared`, `blocksPlaced`, `highestCombo`, `duration`). Validates results and updates player statistics. |
| `GET` | `/api/games/history` | Returns paginated match history (`page`, `pageSize`, optional `userId`). |
| `GET` | `/api/games/stats` | Returns aggregate statistics (total games, highest score, average score, lines cleared). |
| `GET` | `/api/leaderboard` | Global ranked players. Supports `?timeframe=all\|daily\|weekly\|monthly` and pagination. |
| `GET` | `/api/leaderboard/me` | Fetches the rank and highest score for a given `?userId=...`. |
| `GET` | `/api/auth/me` | Returns current user profile and career stats. |
| `GET` | `/api/auth/users` | Lists benchmark demo users for quick testing and profile switching. |

---

## 🚀 Getting Started Locally

### Prerequisites
* Node.js v18+ (tested on Node v20)
* PostgreSQL 14+

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/username/block-blitz.git
   cd block-blitz
   ```

2. **Configure Environment Variables**:
   * Create `server/.env`:
     ```env
     PORT=5000
     CLIENT_URL=http://localhost:5173
     DATABASE_URL=postgresql://postgres:password@localhost:5432/block_blitz
     ```
   * Create `client/.env`:
     ```env
     VITE_API_BASE_URL=http://localhost:5000
     ```

3. **Install Dependencies**:
   ```bash
   npm install
   npm --prefix client install
   ```

4. **Run Database Migrations & Start Servers**:
   ```bash
   # Start backend API (runs migrations and seeds benchmark accounts automatically)
   npm run dev:server

   # Start frontend client (in another terminal)
   npm run dev:client
   ```

5. **Run Tests**:
   ```bash
   npm test
   ```

---

## 🌐 Live Deployment Guide

* **Frontend**: Deploy `client/` to **Vercel** or **Netlify**. Set build command to `npm run build` and output directory to `dist`. Configure `VITE_API_BASE_URL` in environment variables.
* **Backend**: Deploy `server/` to **Render**, **Railway**, or **Fly.io**. Set environment variables `PORT=5000`, `CLIENT_URL=https://your-app.vercel.app`, and `DATABASE_URL=postgres://...`.
* **Database**: Managed PostgreSQL on **Neon.tech** or **Supabase**.
