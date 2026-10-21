# BLOCK BLITZ API

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL` to a local PostgreSQL
database. `PORT` and `CLIENT_URL` default to `5000` and
`http://localhost:5173`.

The server starts without a database connection so the existing API health
endpoint remains available. Database routes return `503` until
`DATABASE_URL` is configured and reachable. Database credentials are never
returned in API responses or logs.

## Database initialization

On startup, the server runs an idempotent initial schema for `game_sessions`.
The schema stores a nullable future `user_id`, score, cleared-line count,
timestamps, and an `in_progress` or `completed` status. It is safe to run on
every startup.

## Endpoints

- `GET /api/health` - existing API health response.
- `GET /api/health/db` - database readiness; returns `503` when unavailable.
- `POST /api/game-sessions` - creates an in-progress session. An optional
  `userId` must be a UUID.
- `PATCH /api/game-sessions/:sessionId/result` - completes an in-progress
  session with non-negative integer `score` and `linesCleared` values.

Scores are accepted as foundation data only. Server-authoritative gameplay
validation and authentication are future phases.
