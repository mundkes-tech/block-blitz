# Block Blitz deployment

1. Create a PostgreSQL database and copy its connection URL.
2. Deploy the repository to Render using [`render.yaml`](render.yaml), or run
   the server container from [`server/Dockerfile`](server/Dockerfile).
3. Configure `NODE_ENV=production`, `DATABASE_URL`, a long random `JWT_SECRET`,
   `CLIENT_ORIGINS=https://your-client.example.com`, and the provider `PORT`.
4. Run `npm run migrate` once against the production database, then start the
   API with `npm start`.
5. Deploy `client/` to Vercel using [`client/vercel.json`](client/vercel.json).
   Set `VITE_API_URL=https://your-api.example.com` before building.
6. Replace the placeholder URLs in [`Readme.md`](Readme.md).

## Smoke test

- `GET /health` returns 200.
- Register and log in.
- Start a match and place pieces.
- Reach game over and confirm the save status.
- Confirm the score appears in the leaderboard and dashboard.
- Refresh the browser and confirm authentication/session state remains usable.
- Submit the same completion twice and confirm totals increase only once.
