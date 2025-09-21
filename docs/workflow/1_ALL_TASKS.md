# Full list of tasks
  
## Backend/API (mock-first)
- Define status schema: phase, p0, p30, chgPct, nowIdx, participants, winner
- Implement mock transport in browser using localStorage
- Implement API client with join(uuid) and status()
- Toggle remote vs mock via URL flag ?api=remote

## Frontend SPA
- Scaffold React SPA under public-entry/app with HashRouter
- Shared styles aligned to simulation HTML
- Status polling hooks (100ms presenter, 1s user)
- Phase routing: lobby → live → results per status.phase

### Screens — Presenter
- Presenter Lobby
  - QR placeholder linking to #/user/lobby
  - Participants table from status.participants
  - Controls: Reset, Force Start (mock helpers)
  - Auto-route on phase change
- Presenter Live
  - Canvas area and indicator line synced to lanes
  - Right panel lanes S9..B9 with winner highlight
  - Show p0, current, Δ%, direction
  - 100ms polling
  - Resolve action (mock helper)
- Presenter Results
  - Display winner ball, p0, p30, Δ%
  - New Round button

### Screens — User
- User Lobby
  - Generate/persist uuid, POST /join, show ball
  - Poll /status each second, auto-route to live
- User Live
  - Show ball, countdown, progress
  - Poll /status each second
- User Results
  - Show own ball, final place (TBD), replay

## Visualization
- Price lane mapping consistent with simulation labels
- Indicator line mapping from nowIdx to lane
- Canvas trail (phase 2)
- Winner highlight logic and animation (phase 2)

## Integration (later)
- Swap mock to remote API endpoints
- Add QR code generation for presenter lobby
- Persist and show participant names (optional)
- Error states, reconnect logic, retries

## Tooling & Docs
- README usage for /public-entry/app/index.html
- Document API schema and flows
- Workflow docs: current task and doing now
