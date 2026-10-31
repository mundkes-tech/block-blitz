# Block Blitz

Block Blitz is a responsive 8x8 block-placement puzzle game. Place the three
generated pieces, clear complete rows or columns, build combos, and continue
until none of the remaining pieces fit. Gameplay, scoring, boosters, and the
visual layout are implemented in the React client; authenticated scores are
stored in PostgreSQL through the Express API.

## Features

- Pointer-based mouse, touch, and pen placement with valid/invalid previews.
- 8x8 board, row/column clears, combos, reroll, hammer, and undo boosters.
- Anonymous local play and authenticated history, dashboard statistics, and
  global leaderboards.
- MP3 background music plus Web Audio sound effects.
- Server-side plausibility validation and flagged-score review state.
- Persistent client retry queue for finished authenticated matches.

## Gameplay

Drag a tray piece onto the board. A piece is accepted only when every occupied
cell is inside the board and empty. A completed row or column is cleared
immediately. A match ends when no available piece can be placed.

## Scoring

The client uses the existing scoring implementation in
[`client/src/game/scoring.ts`](client/src/game/scoring.ts). The formula is:

`placement score = base piece-cell points + line-clear points + combo bonus`

The exact constants are defined in that source file and are not duplicated in
the API. The server applies plausibility ceilings; it does not recalculate the
game from a seeded piece stream.

## Architecture

```text
React/Vite client
       |
       | HTTPS JSON + Bearer JWT
       v
Express API (server/src)
       |
       | parameterized SQL / PostgreSQL transactions
       v
PostgreSQL
```

## Tech stack

React, TypeScript, Vite, Express 5, PostgreSQL, `pg`, Node.js, and Web Audio.

## Install and run

Prerequisites: Node.js 20+ and PostgreSQL 14+.

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run build
npm test
npm run dev:server
npm run dev:client
```

The API initializes the schema at startup. To run it explicitly:

```bash
npm run migrate
```

## Environment variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | HTTP port; hosting providers may inject this. |
| `NODE_ENV` | `development` or `production`; production requires `JWT_SECRET`. |
| `DATABASE_URL` | PostgreSQL connection URL. |
| `JWT_SECRET` | Long random signing secret; never commit it. |
| `CLIENT_ORIGINS` | Comma-separated browser origins allowed by CORS. |

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the API, without a trailing slash. |

Committed templates are [`server/.env.example`](server/.env.example) and
[`client/.env.example`](client/.env.example).

## API

All protected endpoints require `Authorization: Bearer <JWT>`.

| Method | Path | Auth | Body/query | Success and errors |
|---|---|---|---|---|
| GET | `/health` | No | None | `200` health response |
| GET | `/api/health` | No | None | `200` health response |
| GET | `/api/health/db` | No | None | `200` ready or `503` unavailable |
| POST | `/api/auth/register` | No | `name`, `email`, `password` | `201`; `400`, `409` |
| POST | `/api/auth/login` | No | `email`, `password` | `200`; `400`, `401` |
| GET | `/api/auth/me` | Yes | None | `200`; `401`, `404` |
| POST | `/api/games/start` | Yes | Empty JSON; `X-Request-Id` recommended | `201`; `401`, `500` |
| POST | `/api/games/complete` | Yes | `sessionId`, `score`, `linesCleared`, `blocksPlaced`, `highestCombo`, `duration`, `moveLog` | `200`; `400`, `401`, `403`, `404`, `500` |
| POST | `/api/games/:sessionId/complete` | Yes | Completion fields | Same as completion endpoint |
| GET | `/api/games/history` | Yes | `page`, `pageSize` | `200`; `400`, `401` |
| GET | `/api/games/stats` | Yes | None | `200`; `401` |
| GET | `/api/leaderboard` | No | `timeframe=all\|daily\|weekly\|monthly`, `page`, `pageSize` | `200`; `400`, `503` |
| GET | `/api/leaderboard/me` | Yes | None; identity comes from JWT | `200`; `401` |
| GET | `/api/game-sessions` | Yes | `page`, `pageSize` | `200`; `400`, `401` |

Completion `moveLog` entries have `{ shapeId, row, col }`. Malformed or
implausible submissions are saved as `flagged` for the player's history but
never affect aggregates or leaderboards. A PostgreSQL row lock makes duplicate
completion requests return the stored result without double-counting.

## Database schema

`users` contains `id UUID`, `name TEXT`, `email TEXT UNIQUE`,
`highest_score INTEGER`, `total_games INTEGER`, `total_lines_cleared INTEGER`,
`highest_combo INTEGER`, timestamps, and password fields.

`game_sessions` contains `session_id UUID PRIMARY KEY`, `request_id TEXT`,
`user_id UUID`, score fields, `move_log JSONB`, timestamps, and
`status TEXT` (`in_progress`, `completed`, or `flagged`). Indexes cover user,
status, completion time, score, and `(user_id, request_id)` uniqueness.

The `valid_games` SQL view is the shared filter:

```sql
WHERE status = 'completed' AND completed_at IS NOT NULL
```

Leaderboards, ranks, dashboard aggregates, and user profiles use this view.
Flagged sessions are intentionally queried separately only for the owner's
history, where they are marked **Under review**.

## Retry queue

When an authenticated result cannot be saved because of a missing session,
network failure, or server error, the client stores a versioned entry in
`localStorage` under `block-blitz-score-retry-v1`. It retries on app load, the
`online` event, and every 30 seconds with exponential backoff. The same request
ID is reused. Successful entries and non-retryable 4xx entries are removed.
Anonymous matches never call the API.

## Screenshots

Add deployment screenshots under [`docs/screenshots/`](docs/screenshots/):

- `home.png`
- `gameplay.png`
- `game-over.png`
- `leaderboard.png`

## Deployment

Deployment placeholders:

- Live client: `https://your-client.example.com`
- Backend API: `https://your-api.example.com`
- GitHub: `https://github.com/your-account/block-blitz`

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the provider-neutral checklist.

## Known limitations

Client-reported scores cannot be fully trusted. The validator checks ownership,
session lifecycle, move-log shape, coordinate ranges, duration, line limits,
combo limits, and a score ceiling. It does not prove that the client actually
performed every move; deterministic server-side replay is not implemented.
