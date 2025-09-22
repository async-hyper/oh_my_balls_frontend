# Production API integration plan

## Immediate focus — lobby status + join
- Capture live contract: `GET https://omb-api.antosha.app/api/v1/status` and `POST .../join` (UUID) to log real payloads for status=0 and populated lobbies; note required headers, nullables, and rate limits.
- Refactor `web/src/lib/api.ts` to target `/api/v1/*`, model new response shape (`status`, `realtime_price`, `final_price`, `balls`, `winner`), and keep a mapper that translates raw payloads into the frontend-friendly structure used by Presenter/User screens.
- Update lobby polling (`PresenterLobby.tsx`, `UserLobby.tsx`) to consume the mapped production shape; ensure graceful handling of empty `balls` arrays and unexpected extras while status stays 0.
- Adjust join flow to post `{ uuid, name? }` per production contract (confirm optional fields) and push the returned `ball` into local state + presenter list.
- Add minimal logging / toasts around errors so we can debug bad responses without crashing the UI.

## Validation steps
- Manual: run cURL `GET /status` every few seconds during dev to ensure fields match assumptions; run `POST /join` with random UUID and observe lobby update end-to-end.
- App: start Presenter lobby, join from User lobby, confirm presenter table shows new ball, no console errors, status transition still navigates.

## Follow-up
- Align live game (`status:1`) and results (`status:2`) payload mappings once lobby + join are stable.
- Revisit mock/local API to emulate production contract for offline work.
- Consider feature flags or environment switch to avoid accidental production writes during dev.
