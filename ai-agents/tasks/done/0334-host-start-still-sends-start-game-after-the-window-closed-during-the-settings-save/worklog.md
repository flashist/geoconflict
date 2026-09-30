# Worklog — 0334: Host Start still sends `start_game` after the host window closed during the settings save

## Build

Build worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30, under the
approved `plan.md` (blob `e90d7fda…`, verified with `git hash-object` before starting) and the owner's Q1
ruling ("include the after-send guard (C)/(D)"). Node `v24.13.0`. The tree also carries the uncommitted
`0333`, `0347`, `0348` and `0035` changes (expected). Nothing committed.

### What changed
- **`src/client/HostLobbyModal.ts` — `attemptStart` only.** Four generation checks, each
  `generation !== this.openGeneration`, the same check the existing Review R7 guard uses:
  - **(A)** after `await this.putGameConfig()`, before the `!configResponse.ok` branch → `return null`.
  - **(B)** after `await getServerConfigFromClient()`, before the `start_game` `fetch` → `return null`.
  - **(C)** after the `start_game` `await`, before `!response.ok` / `this.close()` → `return response`
    (no close, no failure line).
  - **(D)** in the `catch`, after the existing `console.error`, before `showStartFailed()` → `return null`.
  - Two short comments (A: "Task 0334 (0327 review R1)…"; D: "Task 0334: a `start_game` already sent cannot
    be recalled…"). No helper, no refactor, `putGameConfig()` unchanged.
  - **Not touched:** `open()` (0333's `joined.catch(() => {})` intact), `createLobby()`, `pollPlayers()`,
    `reset()`, `startGame()`, `isStarting` handling. No server, `src/core/`, text, analytics change.
- **`tests/client/HostLobbyModalLeave.test.ts`** — new `describe("closing during the rest of a Start (task
  0334)")` block, next to 0327's ad-time test, reusing `openAndJoin()`, `clickClose()`, `flush()`, `render()`,
  `calls()`, `fetchMock`. A small `holdRequest(match)` helper holds the first matching request until released.

### Tests — red first
Red run: `npx jest tests/client/HostLobbyModalLeave.test.ts` on the unchanged source (0333's changes only) →
**`Tests: 6 failed, 9 passed, 15 total`**. Every failure on its behaviour assertion, none on setup:

| # | Test | Red (pre-fix) | Green |
|---|---|---|---|
| 1a | close while the save is pending, save answers OK late → no `start_game`, no failure line | **FAIL** — Start resolved to the `start_game` response (not `null`) | PASS |
| 1b | same, save answers 500 late | **FAIL** — resolved to the 500 save response (would show the failure line) | PASS |
| 2 | close while the Start's config read is pending → no `start_game` | **FAIL** — resolved to the `start_game` response | PASS |
| 3 | window kept open → exactly 1 `start_game`, 1 PUT, window closed, 0 leaves | PASS (**by nature** — guards the normal path; cannot be red-first) | PASS |
| 4 | close during in-flight `start_game`, reopen, old POST answers OK → new window stays open, no extra leave | **FAIL** — `isModalOpen` false | PASS |
| 5a | same, old POST answers 403 → no failure line in the new opening | **FAIL** — `#host-lobby-start-failed` rendered | PASS |
| 5b | same, old POST rejects (network error) → no failure line | **FAIL** — `#host-lobby-start-failed` rendered | PASS |

Test 2 checks the held config read really was the one `attemptStart` makes after the save (call count +1
after releasing the PUT).

Green run (after A/B/C/D): **15/15 pass.**

### Regression runs (plan §3)
- `npx jest tests/client/HostLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts
  tests/client/HostLobbyOpen.test.ts` → **3/3 suites, 43/43 tests pass** (run twice: after the fix, and again
  after the live check restored the file).
- The 0302 test `a stale Start finishing late does not clear the new opening's in-flight flag` (mocks `close`;
  its stale OK now skips `close` via C) — **stayed green**, no assertion edited.
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. `npx prettier --check` on both
  touched files → clean.
- Full `npm test` — **not run here**, per the driver's instruction (the separate Verify step runs it).

### Live check (plan §4)
Setup: `GAME_ENV=dev` game server (`npm run start:server-dev`, ports 3000–3002) + client via
`webpack serve --node-env development --port 9010` — all four ports checked free first. Port 9000 is another
project's dev server (PID 57856): not touched, still listening at the end. Playwright, headless Chromium, two
browser contexts (`tutorialCompleted` preset). Host opened via a **real Create click**; friend joined via
`#join=<id>`; Start and ✕ clicked through the DOM. `start_game` observed with `page.on('request')`; friend
start observed from its `lobby: game started` log and a game canvas; server log grepped for
`starting private lobby with id <id>`.

**Before-fix runs** were made by temporarily removing the four checks (0333's changes kept), letting webpack
rebuild, then restoring the fixed file — **restore verified byte-identical with `git hash-object`**.

| Case | Before fix | After fix |
|---|---|---|
| **Save held** — `PUT /api/game/<id>` held ~4.8 s with `page.route`, Start, ✕ during the hold, then released | **Reproduced.** `POST /w1/api/start_game/qXuYJt5c` left the host page the moment the PUT was released; server logged `starting private lobby with id qXuYJt5c` + `sending start message`; friend logged `game started`, canvas appeared. | **PASS.** 0 `start_game` requests; no `starting private lobby with id gkoBswKw` in the server log; friend not started (no `game started`, no canvas). Host window closed, no failure line. |
| **Config read held** | **NOT RUN** — `getServerConfigFromClient()` caches its result after the first `/api/env` fetch, so the Start's read makes no network request and `page.route` cannot hold it. Covered by jsdom test 2 only. | same |
| **Q1: `start_game` held, ✕, reopen, release to the real server** (dev bypasses the citizen gate → **200**) | **Reproduced.** Late 200 closed the **reopened** window (open → `false`). | **PASS.** Reopened window stays open, no failure line. |
| **Q1: same, synthetic 403 `citizens_only`** (`route.fulfill`, never reached the server) | **Reproduced.** Failure line shown in the reopened window. | **PASS.** No failure line; window open. |
| **Q1: same, synthetic network error** (`route.abort`) | **Reproduced.** Failure line shown in the reopened window. | **PASS.** No failure line; window open. |

⚠️ **Expected residual, seen live (plan §6, out of scope):** in the after-send runs the POST had already left
the page, so once released the server still started the old lobby (`starting private lobby with id
4er1szua`) and the friend was pulled into that match. (C)/(D) only stop the late *answer* from acting on the
reopened window; recalling a sent start needs a server-side cancel, which the brief excludes.

Every process I started (game server, webpack) was stopped; ports 3000–3002 and 9010 are free again. The
Playwright script and the backup copy used for the before-fix runs were deleted.

### Decision log
Calls the plan did not spell out:

- **L1 — two extra test variants (test-only).** Test 1 runs twice (`it.each`): save answers OK late, and save
  answers **500** late — the plan states (A) sits before the `!ok` branch so a failed save after a close
  shows no failure line; the 500 variant is what proves it. Test 5 runs twice: **403** and a **network error**
  — without the network-error variant, check (D) had no test at all. Both are obvious winners inside the
  plan's intent (they test behaviour the plan itself describes; no source change).
- **L2 — (D) keeps the existing `console.error`.** The check sits after the log line and only skips
  `showStartFailed()`. A real network error on a sent `start_game` is worth logging; the plan's "no log
  line" is about a Start stopped *before* sending (A/B), which log nothing.
- **L3 — (C) returns before the `!response.ok` branch, so a stale non-OK answer is not logged.** This is the
  plan's placement ("before `!response.ok` / `this.close()`"). Small asymmetry with L2, accepted: nothing
  reads that log.
- **L4 — live check drove Start / ✕ through DOM `.click()`** (as 0333's live check did), and added two
  **synthetic** answer modes (`route.fulfill` 403, `route.abort`) for the Q1 failure-line path, since the dev
  server answers 200 once the host is gone (the citizen gate is bypassed there). Labelled synthetic above.
- **Fixes applied without per-fix approval:** none (this was a build, not a review round).

## Review round 1 — process review

Process-review worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30,
under the approved `plan.md` (standing approval; ADR-019 discipline). Ledger: `review.md` round 1, R1 + R2
(both nits). No accepted residual or ADR in scope matched either finding (`decisions/` holds ADR-101..116,
none on host-lobby Start). Ledger header set to `Status: closed-out`.

### Decision log — fixes applied without per-fix owner approval
- **R1 → comment wording (`src/client/HostLobbyModal.ts`, `attemptStart`).** What changed: (A)'s comment now
  says "the settings save (its PUT or its own config read)"; (B) gained a one-line comment ("same, for a
  close during this Start's own config read"); (D)'s comment now names all three throw sources (save, config
  read, in-flight `start_game`). Why it qualified: verified `CORRECT` (the `catch` does take pre-send throws;
  (A)'s wording did blur into (B)'s read), mechanical/localized (comments only, zero behaviour), and in plan
  scope (plan §1 "Comment").
- **R2 → one extra test row (`tests/client/HostLobbyModalLeave.test.ts`).** What changed: the `it.each`
  "closing while the settings save is pending…" gained `["throws", new Error("network down")]`. Why it
  qualified: obvious winner within plan intent — test-only, reuses the existing `holdRequest().release(Error)`
  path, and closes the one untested path R2 named (close during the save, then the save throws). Evidence it
  pins something: with check (D) removed alone, exactly that row goes red (1 failed / 2 passed of the three
  save-pending rows). ⚠️ That mutation was made on the working-tree file for one jest run (not a scratch
  copy), then restored from a backup — restore verified byte-identical with `git hash-object`.
- **Not done (R2):** no test pinning (A) alone for the OK-save case — (B) masks it by design; (A) stays
  pinned by the 500 row.

### Runs after the round
- `npx jest tests/client/HostLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts
  tests/client/HostLobbyOpen.test.ts` → **3/3 suites, 44/44 tests pass** (43 before + the new row).
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. `npx prettier --check` on both
  files → clean.
- Full `npm test` — not run here (the driver's Verify step runs it).

