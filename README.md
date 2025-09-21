# Oh My Balls — Developer Notes

This repo contains the React frontend (`web/`) and a local mock API (`local-api/`) that together power the game flow. Use the instructions below to run everything locally, build for production, or share the API contract with backend teammates.

---

## Quick Start (Local Dev)

### Requirements
- Node.js 20+
- npm

### 1. Install dependencies (first run only)
```bash
cd web
npm install
```

### 2. Start the mock API (terminal tab #1)
```bash
cd local-api
node server.js
```
- Default port: `http://localhost:4000`
- Environment: `PORT=5000 node server.js` (optional)
- State lives in `local-api/state.json` (reset via endpoint below).

### 3. Start the React frontend (terminal tab #2)
```bash
cd web
npm run dev
```
- Opens at `http://localhost:5173`
- By default the app targets the local API (`?api=local`). Other options:
  - `?api=mock` — legacy localStorage mock
  - `?api=remote` — production backend (`https://api-omb.antosha.app`)

### 4. Manual regression checklist
1. Presenter lobby (`#/presenter/lobby`): verify empty state → **Force Start** to auto-fill bots and switch to live.
2. User lobby (`#/user/lobby` in a second tab): confirm a random unique ball is assigned and appears on the presenter list.
3. Live screens (`#/presenter/live`, `#/user/live`): ensure price trail + placement stay in sync.
4. Let the 30s timer finish (or hit Resolve): both sides should land on matching results.
5. **New Round** on presenter results should reset state (lobby empty, users see new assignments).

---

## Production Deployment

### Frontend (static)
1. Build assets:
   ```bash
   cd web
   npm run build
   ```
   Output lands in `web/dist/`.
2. Serve `web/dist` via nginx or any static host (e.g. point an `root /path/to/web/dist;` block at it).
3. Ensure the site is reachable at a stable URL and that requests to `/` fall back to `index.html` for SPA routing (`try_files $uri /index.html;`).

### Mock API (optional prod usage)
The local Node server can be deployed as a simple process alongside nginx if you need the “fake” API in production (until the real backend is ready):
```bash
NODE_ENV=production PORT=4000 node server.js
```
Proxy `/join`, `/status`, `/start`, `/reset` through nginx to that port. Note that it persists state on disk (`state.json`); bake a startup task to clear or rotate it between sessions if needed.

### Switching to Real Backend
Once the production backend is available, configure the frontend with `?api=remote` or set the default mode inside `web/src/lib/api.ts`.

---

## REST API Specification (current mock implementation)
_Base URL_: `http://localhost:4000`

### POST /join
Assigns or returns a player’s ball.

**Request body**
```json
{
  "uuid": "string"
}
```

**Response 200**
```json
{
  "ball": "B7"
}
```
- Error `400`: missing/invalid JSON
- Error `409`: lobby full

### GET /status
Returns current round state.

**Responses**
- Lobby (`status:0`):
  ```json
  {
    "status": 0,
    "roundId": 123,
    "capacity": 20,
    "participants": [
      { "uuid": "...", "ball": "S4", "name": "S4", "isBot": false }
    ]
  }
  ```
- Live (`status:1`):
  ```json
  {
    "status": 1,
    "roundId": 123,
    "realtime_price": {
      "price": 61234.56,
      "p0": 61000.00,
      "startedAt": 1710000000000,
      "elapsedMs": 12000,
      "samples": [ { "tMs": 0, "price": 61000, "lane": 9.5 }, ... ],
      "standings": [
        { "uuid": "...", "ball": "B2", "name": "B2", "isBot": false, "position": 1, "distance": 0.2 }
      ]
    }
  }
  ```
- Results (`status:2`):
  ```json
  {
    "status": 2,
    "roundId": 123,
    "results": {
      "winnerBall": "B3",
      "winnerName": "B3",
      "p0": 61000,
      "p30": 61250,
      "chgPct": 0.0041,
      "standings": [
        { "uuid": "...", "ball": "B3", "name": "B3", "isBot": false, "position": 1, "distance": 0.0 },
        ...
      ]
    }
  }
  ```

### POST /start
Immediately fills remaining slots with bots and transitions to live phase.

**Response 200**
```json
{ "ok": true }
```
- Error `409`: round already in live phase.

### POST /reset
Clears current round state and returns to lobby.
```json
{ "ok": true }
```

---

## Handy Tips
- `local-api/state.json` tracks the live round; delete it or hit `/reset` if you need a clean slate.
- Debugging placement math is easier by inspecting the `samples` array and comparing lane indices (`game.ts` provides helpers such as `priceToLane`).
- Cookie modal state for the user is cached under `omb_congrats_hidden_round`; clearing localStorage makes the win screen reappear.

Happy hacking! 🤘
