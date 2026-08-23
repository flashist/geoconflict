# Task 0055 — `Master.ts`: parseable lobbies body + worker-exit diagnostics

Repo: `/Users/mark.dolbyrev/Workspace/geoconflict`
Brief: `ai-agents/tasks/done/0055-master-parseable-lobbies-body-and-worker-exit-diagnostics/brief.md`
Incident: `ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`

## Context

On 2026-08-22 prod served an empty `/api/public_lobbies` body for ~3.5 hours. One of 20 workers
died at startup; the master's `cluster.on("exit")` handler could not identify it (it reads
`worker.process.env.WORKER_ID`, and `ChildProcess` has no `.env`), so it never restarted it. The
scheduling gate requires all 20 ready, never closed, so `publicLobbiesJsonStr` stayed at its
initial `""`.

This task is the **small, decision-free half** of the repair — incident defects **#5** and **#6**.
It changes no control flow. Arming restarts and fixing the gate is `0056`, which is sequenced
behind `0057` by owner ruling. Order: `0055` → `0057` → `0056`.

**Why it matters now:** production is running with crash recovery disarmed. Until `0056` ships, a
second worker death produces the same unreadable log line. This buys diagnosability for that gap.

## Scope

`src/server/Master.ts` (three small edits) + one new test file. No client changes, no infra
changes, no control-flow changes.

## Changes

### 1. Initialise the lobbies payload to a valid empty document

`src/server/Master.ts:78`

```ts
let publicLobbiesJsonStr = "";                            // before
let publicLobbiesJsonStr = JSON.stringify({ lobbies: [] }); // after
```

Shape verified against the only assignment, `Master.ts:480-482`, which writes
`JSON.stringify({ lobbies: lobbyInfos })`. Top-level key set is identical, so a client parsing the
placeholder and a client parsing a real response take the same path.

### 2. Log what the exit handler already has

`src/server/Master.ts:135-137`, failure branch only.

Keep the existing `worker crashed could not find id` text so incident-era greps still match; add
`code`, `signal`, `worker.id`, `worker.process.pid` as structured fields (winston child logger
accepts a metadata object, per the `{ clientID, persistentID }` style used in `GameServer.ts`).

**Leave the `return` and all restart logic untouched.** Arming restarts is `0056` and must ship
with a restart cap.

### 3. Export `app` for testability

`src/server/Master.ts:22` — add `export` to the existing `const app = express()`.

Rationale: routes are registered at module scope, but `startMaster()` is the only current export,
and it forks real workers. Exporting `app` lets supertest hit `/api/public_lobbies` **without ever
calling `startMaster()`** — which is precisely the outage condition (the fetch interval never
installs), deterministically and in CI. Runtime behaviour is unchanged.

Chosen over exporting a getter for the module-level `let`: the endpoint test covers the same
guarantee and tests the contract the client actually consumes. Repo has no precedent for reaching
into module `let` state; `src/profile-server/Routes.ts`'s `createApp()` + supertest is the
established pattern (`tests/profile-server/Routes.test.ts`).

## Tests — `tests/server/Master.test.ts` (new)

First test for this file; `coverage/lcov.info` shows `LF:204 / LH:0`.

Follow `tests/server/Archive.test.ts` exactly — hoisted `jest.mock` above static imports:

```ts
jest.mock("jose", () => ({ base64url: { decode: jest.fn() } }));
jest.mock("../../src/server/Logger", () => ({
  logger: { child: () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }) },
  formatError: (error: unknown) => String(error),
}));
import request from "supertest";
import { app } from "../../src/server/Master";
```

`Master.ts:14` is `import { formatError, logger } from "./Logger"` — mock shape matches.

Cases:
1. `GET /api/public_lobbies` with `startMaster()` never called → `200`, **non-zero** `Content-Length`.
2. Body survives `JSON.parse` (today it throws — this is the regression guard).
3. Parsed value has exactly the top-level keys `["lobbies"]`, and `lobbies` is an array of length 0.

Import is safe: no port opened, no `cluster.fork`, no repo-owned timers. `express-rate-limit`'s
MemoryStore interval is `unref()`'d so it will not hold jest open. `GAME_ENV` unset defaults to
`dev`, so no env setup is needed.

**Not unit-tested — stated plainly rather than glossed:** change 2 lives inside `startMaster()`,
which forks real `ts-node` workers and throws unless `cluster.isPrimary`. Unit-testing it would be
fragile theatre. Verified manually (step 4 below). `0056` extracts this handler into a testable
unit; that is the right place for automated coverage.

## Verification

1. `npx jest tests/server/Master.test.ts` — new tests pass.
2. `npm test` — full unit suite green. Coverage thresholds (statements 21 / branches 16 /
   lines 21 / functions 20.5) only move up.
3. `npm run lint`.
4. **Manual — worker death now names its cause.** Boot locally (`npm run start:server-dev`,
   `DevConfig` = 2 workers). Once ready, `kill -9` one worker PID. Confirm the emitted line carries
   `code`, `signal`, `worker.id`, `pid`, **and that the worker is still not restarted** — unchanged
   behaviour is part of the pass condition.
5. **Manual — no behaviour change when healthy.** Same boot, both workers ready, `curl
   localhost:3000/api/public_lobbies` returns real lobbies exactly as before.

## Edge cases and failure modes considered

- **Shape drift.** If `fetchLobbies()` ever changes its top-level keys, the placeholder silently
  diverges. **Corrected after review (finding R1):** test case 3 pins only the *placeholder*, so it
  does **not** catch this. Genuine parity coverage needs `fetchLobbies` exported, which is out of
  `0055`'s scope; the gap is carried to `0056`. The risk is accepted for this task.
- **Cache poisoning of the placeholder.** nginx caches this route for 1s (`nginx.conf:102`). The
  placeholder is a valid 200 and will be cached like any response — harmless, and it self-heals
  within a second once real lobbies exist.
- **ETag change.** The response ETag stops being the empty-string ETag
  (`W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"`). Any monitoring keyed to that exact value would need
  updating — none known, flagged for completeness.
- **Test import side effects.** `Master.ts` registers `process.on("uncaughtException")` at import;
  a MaxListeners warning appears only if many suites import it. One suite does.
- **`buildVersion`** does a synchronous `readFileSync` of the repo-root `package.json` at import.
  Resolves correctly under jest (same `import.meta.url` idiom as `CosmeticsConfig.ts`).

## Reported, not fixed — owner ruled "report only"

Brief step 3 asked me to verify the client renders an empty state for zero lobbies. **It does
not.** `PublicLobby.ts:159` is `if (this.lobbies.length === 0) return html\`\`` — it renders
nothing. So this change does **not** alter what a player sees during an outage; blank either way.

It is still worth shipping: no thrown `SyntaxError`, a contractually correct endpoint, and one
genuine behavioural gain — `this.lobbies` is only assigned on success (`PublicLobby.ts:93`), so
today a stale lobby persists on screen indefinitely once scheduling stops. A valid empty payload
clears it.

Whether the lobby list deserves a real "no lobbies right now" state is a product call, left with
the owner and producer. Not filed as a brief, per owner ruling.

## Out of scope

Defects #1, #2, #3, #4 (`0056`); worker routing (`0057`); `Worker.ts` `server.on("error")`
(`0058`); precompiling the server (`0059`). No commits — owner asks explicitly.
