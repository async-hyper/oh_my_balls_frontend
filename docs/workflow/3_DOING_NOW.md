# Doing Now — Shared Mock Backend & Synced Clients

_Last updated: in-progress refactor to persistent mock API. All items below reflect current status._

## Context Snapshot
- React/Vite frontend (`web/`) already mirrors the HTML designs.
- All mock endpoints now live in `web/src/lib/mockStore.ts` + `mockServer.ts`, backed by `web/mock-data/mock-data.json`.
- Phases: `0` lobby, `1` live, `2` results. Presenter/user screens poll `/status` to react to phase changes.

## Detailed Checklist & Status

### 1. JSON-Backed Mock Storage ✅ (done)
- `mockStore.ts` loads/saves `mock-data/mock-data.json`, exposes `getState()`, `updateState()`, `resetState()`.
- Types cover participants, price samples, results metadata; default JSON seeded on first run.
- `mockServer.ts` uses the store for all mutations (lobby/live/results). Legacy in-memory resets removed.

### 2. Lobby Flow Refactor ✅
- `/join` assigns real UUIDs, persists `{ uuid, ball, name, isBot, joinedAt }`; user UUID cached in localStorage.
- `/status` (phase 0) returns `{ status:0, capacity, participants, roundId }` from JSON.
- Presenter lobby polls every 1s, shows combined human/bot list, and `Force Start` triggers `/start`.
- `/start` fills remaining balls with bot names (`S9…S0`, `B0…B9`), transitions to live, records `p0`/`startedAt`.
- Presenter lobby auto-navigates when phase flips to 1 (either by full roster or force start).

### 3. Shared Live Simulation ✅
- `/status` (phase 1) emits `{ status:1, realtime_price { p0, price, elapsedMs, samples, standings } }`; price ticks stored centrally.
- Presenter live polls 100 ms, draws shared trail/lanes, and routes to results once phase=2.
- User live polls 300 ms, displays countdown/progress, placement, Δ%, and persists assigned ball.
- Shared helpers (`game.ts`) provide `priceToLane`, `placementForBall`, etc.

### 4. Phase-Based Navigation & Verification ⚠️ partially complete
- `/status` phase 2 exposes final standings, winner, p0/p30/Δ% (✅).
- Presenter/User results read shared data; “New Round” resets store + clears local ball cache (✅).
- Manual regression checklist (run before demos):
  1. `cd web && npm run dev`.
  2. Open `#/presenter/lobby` — confirm empty table → click **Force Start** → lobby fills bots, auto-routes to live.
  3. Open `#/user/lobby` in another tab — ensure join assigns ball and presenter list includes the user.
  4. Observe live screens (presenter + user) stay in sync; placement updates match standings.
  5. Let timer finish (or click Resolve) → both sides reach results with same winner stats.
  6. Click **New Round** on presenter results → verify lobby resets (participants cleared) and returning user gets fresh assignment.
- [ ] TODO: add quick utility/CLI to wipe `mock-data.json` without using UI (optional).
- [ ] TODO: extend manual checklist to cover multi-user scenario (2+ real players).

## Next Verification Steps for QA / Teammates
1. Follow the manual regression checklist above end-to-end.
2. After completing the flow, re-run `npm run build` (already green, but re-check if additional edits are made).
3. If `mock-data.json` becomes inconsistent, delete it or trigger “New Round” to reset.

## Notes / Open Questions
- JSON writes currently synchronous via localStorage (sufficient for mock). If we migrate to filesystem writes, consider debouncing.
- Bot naming currently mirrors ball IDs (e.g., `S9`, `B4`). Revisit if we want friendlier labels.
- Future milestones: richer results view, persistent history per round, integration with real backend.

---
_Keep striking/completing items here as new work finishes or new TODOs are discovered._
