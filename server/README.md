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

To complete this phase, the missing integration should specify:

- the official authentication flow and SDK or API base URL;
- how the backend validates the returned identity;
- trusted issuer, audience, signing-key, expiry, and token or cookie details;
- the stable VELOOP user identifier format; and
- the expected unauthenticated and expired-session behavior.
