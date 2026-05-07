# Task — Fix Archive Endpoint Failures and Singleplayer Body Limit

## Sprint
Sprint 4c — Stabilization

## Priority
Medium-high — ~26.6 errors/min. Match history and replay data is silently lost on every affected game.

---

## Context

Two distinct archive failure modes are occurring in production:

1. **Multiplayer archive 404s**: `src/server/Archive.ts` posts full game records to `${config.jwtIssuer()}/game/{gameID}` and receives `Not Found`. This means completed multiplayer matches are not being archived.
2. **Singleplayer archive fetch failures**: `src/client/LocalServer.ts` posts compressed singleplayer records to `/api/archive_singleplayer_game` and fails client-side.
3. **Singleplayer body too large**: Some compressed singleplayer uploads exceed the current Express JSON body limit.

Error groups observed in Uptrace (2026-05-07 window):

| Error | Rate |
|---|---|
| `error archiving game record (gameID: ...): Not Found` | 16.29/min |
| `TypeError: Failed to archive singleplayer game: Failed to fetch` | 9.64/min |
| `Error in POST /api/archive_singleplayer_game: PayloadTooLargeError: request entity too large` | 0.64/min |

The live match can complete, but all match history, replay data, and post-incident debugging are compromised.

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## What to Build

### 1. Diagnose and fix the multiplayer archive 404

- In `src/server/Archive.ts`, check what URL `${config.jwtIssuer()}/game/{gameID}` resolves to in production.
- The `Not Found` response suggests either the archive service path changed or `jwtIssuer()` is pointing at the wrong host.
- Improve the error log: currently only `statusText` is captured. Add the response status code and a short safe excerpt of the response body to give enough routing context.
- Fix the URL or routing so `POST /game/:gameID` reaches the correct archive service endpoint.

### 2. Fix singleplayer archive body limit

In `src/server/Worker.ts`, the `/api/archive_singleplayer_game` route uses the default `express.json()` body limit (typically 100 KB). Compressed singleplayer records exceed this.

- Set an explicit, larger JSON body limit for this route (or globally if appropriate). Validate against expected compressed payload sizes before setting a value — propose a limit in the implementation and confirm it with Mark.
- Do not use an unbounded limit; pick the smallest value that covers real game records.

### 3. Fix or suppress singleplayer archive fetch failures

- Check why `src/client/LocalServer.ts` singleplayer archive POSTs are failing client-side (`Failed to fetch`). Confirm whether this is a consequence of the body-limit rejection or a separate routing issue.
- If the POST is a fire-and-forget (no user-visible outcome), ensure that failures do not surface as uncaught rejections. Log at `console.warn`, not `console.error`, if the archive is non-critical to match completion.

---

## Verification

1. `POST /game/:gameID` in production succeeds for completed multiplayer matches (confirmed in Uptrace: `Not Found` group disappears).
2. Singleplayer archive POSTs succeed for normal-sized game records.
3. Singleplayer archive POSTs for oversized records fail with a clean, bounded, low-severity server log — not an unhandled rejection.
4. Archive failure logs include status code and enough response context to diagnose future routing issues.

---

## Notes

- Do not change archive fire-and-forget semantics for the singleplayer path unless you confirm the handler is supposed to respond with archive success.
- The body limit value should be chosen based on actual payload sizes, not just set to a large number. Include the chosen value and rationale in the PR.
