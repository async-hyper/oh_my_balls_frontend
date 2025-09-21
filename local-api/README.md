# Local Mock API

Simple Node.js HTTP server that emulates `/join`, `/status`, `/start`, and `/reset` endpoints for the Oh My Balls frontend.

## Usage

```bash
cd local-api
node server.js
```

- Server listens on `http://localhost:4000` (override with `PORT` env var).
- State persists in `state.json` alongside the server. Delete the file or hit `POST /reset` to start a fresh round.
- Endpoints:
  - `POST /join` — body `{ "uuid": "..." }`, returns `{ ball, name }`.
  - `GET /status` — returns phase-specific payload (`status:0|1|2`).
  - `POST /start` — fills remaining slots with bots and transitions to live phase.
  - `POST /reset` — clears current round.

Enable the frontend with `?api=local` (default) so it points to this server.
