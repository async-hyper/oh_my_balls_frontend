# Doing Now — Shared Mock Backend & Synced Clients

This checklist captures the active migration from ad-hoc in-memory mocks to a shared JSON-backed mock backend that keeps presenter and user flows in sync. New teammates can treat this document as the source of truth for the current scope.

## Context Snapshot
- Frontend lives in `web/` (React + Vite). All screens already render the static UI from the HTML mocks.
- `mockServer.ts` currently keeps state in module-level variables; presenter live still simulates prices locally.
- Goal: centralise lobby/live/mock logic in persistent JSON so multiple tabs behave consistently and mimic API semantics (`/status`, `/join`, `/start`).

## High-Level Milestones
1. JSON storage layer for mock API state.
2. Lobby refactor (join/status + force start).
3. Live refactor (shared price feed + placement helpers).
4. Phase-driven navigation and final verification/build.

## Detailed Checklist

### 1. JSON-Backed Mock Storage
- [ ] Create `web/src/lib/mockStore.ts` (or similar) that reads/writes a `mock-data.json` file in the repo (decide on location, e.g., `web/mock-data/mock-data.json`).
  - Include helper functions: `readState()`, `writeState(next)`, `withState(mutator)` to make modifications atomic.
  - Ensure type definitions cover round phase (`0 lobby`, `1 live`, `2 results`), participants, price history, timestamps.
  - Provide safe defaults on first run (no file -> seed initial structure).
- [ ] Update existing mock endpoints to use this store instead of module-level arrays.
  - Split responsibilities into services: `lobbyService` (status, join, start), `liveService` (price ticker), `resultsService` if needed.
  - Replace `resetMockLobby` / `resetMockLive` with store mutations (e.g., `resetRound(state)` helper).

### 2. Lobby Flow Refactor
- [ ] `/join` mock:
  - Accept UUID from client, assign a ball if not already present (respect the 20 unique balls pool `B9..B0` + `S0..S9`).
  - Persist participant `{ uuid, ball, name?, joinedAt }` into `mock-data.json`.
- [ ] `/status` mock (phase 0):
  - Return `{ status:0, balls:[{ uuid, ball, name }] }` built from stored participants.
  - Include current phase (`status`), optional metadata (countdown placeholder).
- [ ] Presenter Lobby UI (`PresenterLobby.tsx`):
  - Replace incremental local mock with polling shared `/status` (1s).
  - Display participants from JSON (ball + Ready); show actual count vs 20.
  - Add `Force Start` button -> calls `/start` mock.
- [ ] `/start` mock:
  - Validate phase == lobby.
  - Fill remaining slots with bot participants (generate UUID-like ids, assigned balls without duplicates).
  - Transition phase to `1` (live) and record `p0`, `startedAt`.
  - Initialise price timeline structure for the live phase (seed empty samples array).
- [ ] Ensure presenter lobby navigates to live when phase flips to `1` (after manual or forced start).

### 3. Shared Live Simulation
- [ ] `/status` mock (phase 1):
  - Return `{ status:1, realtime_price:{ price, p0, elapsedMs, samples } }` where `samples` is historical price data.
  - Price updates should be generated centrally: schedule ticks that mutate JSON (or simulate on each request while persisting results).
  - Guarantee consistent data for presenter/user clients (both read same price/time arrays).
- [ ] Presenter Live (`PresenterLive.tsx`):
  - Replace internal random walk with polling the shared price samples (100 ms).
  - Use helper functions to convert price -> lane index -> DOM positions.
  - If `/status` returns `status:2`, auto-navigate to presenter results.
- [ ] User Live (`UserLive.tsx`):
  - Poll `/status` (1000 ms or faster if needed).
  - Show assigned ball and derive placement from price using shared helper.
  - Display countdown based on `startedAt` / elapsedMs.
- [ ] Implement shared math helper (`gameMath.ts`):
  - `ballLane(ballId)` → index.
  - `priceToLane(p0, price)` → float index.
  - `laneToPrice(p0, laneIndex)`.
  - `placementForBall(ballId, p0, price)` returns 1..20 (for user).

### 4. Phase-Based Navigation & Verification
- [ ] Update `/status` for phase 2 (results) to include winner + final prices.
- [ ] Ensure user lobby/live listen for phase changes:
  - Lobby: `status:1` -> navigate to `/user/live`.
  - Live: `status:2` -> navigate to `/user/results` (and show final placement/winner info once implemented).
- [ ] Presenter results should read from shared store (winner, p0, p30, Δ%) instead of static placeholders.
- [ ] Manual test flow:
  1. Clear/reset mock data (provide script/command?).
  2. Open presenter lobby + user lobby in separate tabs.
  3. Join via user tab, verify presenter sees participant.
  4. Force start, ensure both transition to live with identical price feed.
  5. Let timer run to completion (or trigger resolve) and confirm both sides reach results with consistent data.
- [ ] Run `npm run build` to verify TypeScript after refactor.

## Notes / Open Questions
- Decide whether JSON writes can be synchronous (likely fine) or need debouncing to reduce disk churn.
- Consider adding a lightweight CLI script to reset `mock-data.json` between runs.
- When bot-filling on `Force Start`, choose naming scheme (`Bot 01` etc.) for clarity in presenter UI.
- For future work: extend results mock, add persistent history, integrate real backend.

---
Keep this document updated as tasks complete; strike through finished items or move them into a “Done” log if preferred.
