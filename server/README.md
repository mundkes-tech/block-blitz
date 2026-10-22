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
- `GET /api/game-sessions?page=1&pageSize=20` - returns completed anonymous
  sessions newest first. `pageSize` defaults to `20` and is limited to `100`.
  The response includes `items` and `pagination` (`page`, `pageSize`, `total`,
  and `totalPages`).
- `GET /api/game-sessions/stats` - returns aggregate statistics for completed
  anonymous sessions: `totalCompletedGames`, `highestScore`, `averageScore`,
  `totalLinesCleared`, and `mostRecentCompletedAt`.
- `GET /api/leaderboard?page=1&pageSize=20` - returns ranked completed
  anonymous sessions. Each item contains `rank`, `score`, `linesCleared`, and
  `completedAt`; session IDs and user IDs are not exposed.

Example requests:

```text
GET http://localhost:5000/api/game-sessions?page=1&pageSize=20
GET http://localhost:5000/api/game-sessions/stats
GET http://localhost:5000/api/leaderboard?page=1&pageSize=20
```

History and statistics exclude all `in_progress` sessions. They aggregate
across available anonymous development sessions and are not authenticated
player-specific data. Query parameters must be positive integers; invalid
values return `400`.

Leaderboard entries are sorted by score descending, then completion timestamp
descending, then session ID descending as a deterministic tie-breaker. It uses
the same pagination metadata and limits as history: page defaults to `1`,
`pageSize` defaults to `20`, and `pageSize` cannot exceed `100`. Repeated
sessions from the same person may appear as separate anonymous entries, and
the endpoint is not a verified per-player leaderboard.

Scores are accepted as foundation data only. Server-authoritative gameplay
validation and authentication are future phases.

## Authentication status

Authentication is intentionally not enabled yet. The repository does not
contain the original VELOOP Rewards task brief, an official VELOOP
authentication document or SDK, an issuer/audience configuration, or test
credentials. No authentication protocol is assumed.

The current game-session endpoints are therefore anonymous foundation
endpoints. The nullable `user_id` column is reserved for a verified identity
from a future integration; clients must not treat the optional `userId` body
field as proof of identity. User-specific reads, writes, and frontend
authenticated states must be added only after VELOOP provides the documented
authentication flow.

The frontend uses anonymous sessions for development. Starting a game attempts
to create one session, and game over submits its score and total cleared-line
count once. Returning Home abandons the active session without submitting a
result; the current schema intentionally leaves that session
`in_progress`. A failed API request never blocks local gameplay.

To complete this phase, the missing integration should specify:

- the official authentication flow and SDK or API base URL;
- how the backend validates the returned identity;
- trusted issuer, audience, signing-key, expiry, and token or cookie details;
- the stable VELOOP user identifier format; and
- the expected unauthenticated and expired-session behavior.
