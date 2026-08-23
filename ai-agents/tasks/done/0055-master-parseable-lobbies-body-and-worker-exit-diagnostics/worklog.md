# Worklog — 0055 `Master.ts`: parseable lobbies body + worker-exit diagnostics

Build executed 2026-08-22 by the fkit-coder in an owner-present `fkit coder` session.
`plan.md` approved by the owner via `ExitPlanMode` before any edit. Nothing committed.

## Changes

One source file — `src/server/Master.ts` — plus one new test file.

1. **Lobbies payload initialised to a valid document** (`Master.ts:87`, was `:78`):
   `let publicLobbiesJsonStr = ""` → `JSON.stringify({ lobbies: [] })`.
   Shape verified against the only assignment (`fetchLobbies()`, now `:489`), which writes
   `JSON.stringify({ lobbies: lobbyInfos })` — identical top-level key set. Incident defect **#5**.

2. **Exit handler now logs what it already had** (`Master.ts:144-155`). The `if (!workerId)` branch
   emits `clusterId` (`worker.id`), `pid` (`worker.process.pid`), `code` and `signal` as structured
   winston fields. Message text `worker crashed could not find id` left **unchanged** so log greps
   written during the incident still match. Incident defect **#6**.
   **The `return` and all restart logic are untouched** — arming restarts is `0056` and must ship
   with a restart cap.

3. **`app` exported** (`Master.ts:24`). `export const app = express()`. Enables supertest against
   the routes without calling `startMaster()` (which forks real workers). No runtime change.

### Deviation from the approved plan — one extra edit, reported

The plan said three edits. A fourth was required and is recorded here rather than glossed.

`Master.ts` declared `const __filename` / `const __dirname` at module scope (old `:29-30`).
`@swc/jest` lowers this ESM module into CommonJS, where both identifiers already exist, so
**importing the file from a test failed outright**: `SyntaxError: Identifier '__dirname' has already
been declared`. Change 3 was therefore unusable as planned.

Renamed to `moduleFilename` / `moduleDir` (`:32-33`) with the three call sites updated
(`buildVersion` readFileSync, `express.static`, SPA fallback `sendFile`). This is **the convention
the repo already uses** — `src/server/CosmeticsConfig.ts:17` names it `moduleFilename` for the same
reason, which is why that module is importable under jest. Mechanical and behaviour-preserving;
`tsc --noEmit` and the full suite confirm it.

`src/server/Worker.ts:57` has the same shadow but declares it **inside** `startWorker()`, so it is
function-scoped and does not collide. Left alone — out of scope.

## Tests

New: `tests/server/Master.test.ts` — the first test to cover `Master.ts`
(`coverage/lcov.info` previously showed `LF:204 / LH:0`).

Follows `tests/server/Archive.test.ts` exactly: hoisted `jest.mock("jose", …)` and
`jest.mock("../../src/server/Logger", …)` above static imports. Three cases against
`GET /api/public_lobbies` with `startMaster()` never called — which *is* the outage state, since
the fetch interval that assigns the payload never installs:

1. `200` with a non-zero-length body
2. body survives `JSON.parse`
3. top-level keys are exactly `["lobbies"]`, value is an empty array

Case 3 pins the placeholder's shape. **Corrected after review (finding R1):** it is *not* a guard
against drift in `fetchLobbies()` — the test never reads that function, so changing the real
top-level key would leave it green. Genuine parity coverage needs `fetchLobbies` exported; out of
scope here, carried to `0056`.

## Verification

| Step | Result |
|---|---|
| `npx jest tests/server/Master.test.ts` | **3/3 pass** |
| **Prove-red** — reverted `:87` to `""`, re-ran | **3/3 fail**, restored, re-verified green |
| `npm test` (full unit suite) | **89 suites / 701 tests, all pass** — no regressions |
| `npx eslint src/server/Master.ts tests/server/Master.test.ts` | clean, exit 0 |
| `npx tsc --noEmit -p tsconfig.json` | no diagnostics for either file (swc does not typecheck) |

**Manual — plan step 5, no behaviour change when healthy.** Local `npm run start:server-dev`
(`DevConfig` = 2 workers). Both ready, gate closed, `GET /api/public_lobbies` →
`200, Content-Length: 399` with a real lobby. Unchanged.

**Manual — plan step 4, a worker death now names its cause.** `kill -9` on worker 0 (PID 25394)
produced:

```json
{"clusterId":1,"code":null,"pid":25394,"signal":"SIGKILL",
 "message":"worker crashed could not find id","level":"error","comp":"m"}
```

`code`, `signal`, `clusterId` and `pid` all present — this is precisely the evidence that was
missing on 2026-08-22 and that §7 of the incident record could not recover. **No `died with code`
and no `Restarting worker` line followed**, confirming the worker was still not restarted:
behaviour unchanged, as required.

Note for `0056`: `clusterId` is cluster's own 1-based id (worker index 0 → `clusterId 1`), not
`WORKER_ID`. `0056`'s index map is what makes the two line up.

## Reported, not fixed

Brief step 3 asked me to verify the client renders an empty state for zero lobbies. **It does
not.** `src/client/PublicLobby.ts:159` is `if (this.lobbies.length === 0) return html\`\`` — it
renders nothing. So this change does **not** alter what a player sees during an outage; the screen
is blank either way.

Still worth shipping: no thrown `SyntaxError`, a contractually correct endpoint, and one real
behavioural gain — `this.lobbies` is assigned only on success (`PublicLobby.ts:93`), so today a
stale lobby persists on screen indefinitely once scheduling stops. A valid empty payload clears it.

Per owner ruling (2026-08-22): reported only, no follow-up brief filed. Whether the lobby list
deserves a real "no lobbies right now" state is a product call left with the owner and producer.

## Decision log

- **Exported `app` rather than a getter for `publicLobbiesJsonStr`.** The endpoint test covers the
  same guarantee and tests the contract the client actually consumes. The repo has no precedent for
  reaching into module-level `let` state; `src/profile-server/Routes.ts`'s `createApp()` +
  supertest is the established pattern.
- **Did not unit-test the exit-handler change.** It lives inside `startMaster()`, which throws
  unless `cluster.isPrimary` and forks real `ts-node` workers. A unit test there would be fragile
  theatre. Verified manually instead (above). `0056` extracts the handler into a testable unit and
  is the right home for automated coverage.
- **Renamed `__dirname`/`__filename`** — see the deviation section. Not a judgment call: the
  approved change was impossible without it, and the repo already had the convention.

## Not done

- **Not committed.** Owner has not asked.
- **Task not closed.** Movers are producer-only since ADR-033 — route the close to `@fkit-producer`.
- **Review round 1 complete** — `review.md` ledger, verdict ⚠️ changes requested, 2 low defects and
  2 frontier-moves. R1 fixed (this file included); R3 and R4 accepted as residuals by owner ruling;
  R2 fixed (owner-approved optional-chain guard). Ledger closed out. Codex coverage was **partial** — it returned findings on the test file only
  and gave no opinion on `Master.ts`.
