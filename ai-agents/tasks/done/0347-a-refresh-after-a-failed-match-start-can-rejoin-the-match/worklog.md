# Worklog — 0347: a refresh after a failed match start can rejoin the match

## 2026-09-30 — BUILD (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Build worker)

Built against the approved `plan.md` (blob `c0c44101283a9e27c5ebecfc7bb113d646810ec9`, checked with
`git hash-object` before starting — matched the pasted plan). `plan.md` was not touched.

### What changed

- **`src/client/ClientGameRunner.ts`** (`joinLobby`)
  - Imports `clearReconnectSession` next to `saveReconnectSession`.
  - New local `savedReconnectSession = false` next to `left`.
  - Lobby-phase `start` branch: right after `lobbyConfig.gameStartInfo = …` and before
    `createClientGame(…)`, saves the session when `!transport.isLocal && !left`, and sets the flag.
  - Lobby-phase `error` branch: `if (savedReconnectSession) clearReconnectSession();` next to
    `left = true`.
  - Runner's own save in `start` (the old single call site) kept unchanged; one-line comment added:
    "Re-save on (re)connect; the first save is in joinLobby (task 0347)."
- **`src/client/ReconnectSession.ts`** — `saveReconnectSession` wraps `localStorage.setItem` in
  `try/catch` (storage unavailable → rejoin just isn't offered). `clear`/`load` unchanged.
- **`tests/client/JoinLobbyReconnectSession.test.ts`** (new) — J1, J2, J3, J4, J4b, J5 per the plan.
- **`tests/client/ReconnectSession.test.ts`** (new) — R1 (throwing `setItem` does not throw), R2
  (save → load round-trip).
- **`tests/client/ClientGameRunnerTeardown.test.ts`** — `clearReconnectSession: jest.fn()` added to its
  `ReconnectSession` mock.
- **`ai-agents/knowledge-base/analytics-event-reference.md`** (docs only, no event changes)
  - The "only writer … one call site" sentence in the leaderboard-participation residual now says two
    call sites (`joinLobby` on `start`, and the runner on `start`), both skipped when local.
  - Reconnection Events: a "Since task `0347`" note — prompt can follow a failed start;
    `Reconnect:Succeeded` does not prove the player got back in (`Worker:InitFailed` can follow it);
    **Q2** caveat (no `Game:Start` for a rejoin-after-failed-start match); **Q1** known limitation (a
    rejoin after the ~20 s spawn phase lands as a spectator).

No change to `src/core/`, the server, `en.json` or `ru.json`.

### Tests run (targeted; full `npm test` + `npm run lint` + live checks are the driver's Verify step)

- `npx jest tests/client/JoinLobbyReconnectSession.test.ts tests/client/ReconnectSession.test.ts tests/client/ClientGameRunnerTeardown.test.ts`
  → **3 suites passed, 18 tests passed**.
- **Red-first check:** the new `JoinLobbyReconnectSession` suite run against `HEAD`'s
  `ClientGameRunner.ts` (restored afterwards) → **J1, J2, J4 fail; J3, J4b, J5 pass.** The three that
  pass on old code are guards by nature (old code never saved from `joinLobby`, so "no save" / "no
  clear" holds trivially there). They pin the new code's exclusions, not the bug.
- `npx tsc --noEmit -p tsconfig.json` (includes `tests/**`) → exit 0.
- `npx eslint` on the five changed `.ts` files → clean. `npx prettier --check` → the two source files
  and the test files are clean (the new test was formatted with `prettier --write`).

**Not run here:** full `npm test`, `npm run lint`, and the live checks A–C / second failure / exit /
singleplayer from the plan — those belong to the driver's Verify step.

### Decision log

Calls the plan did not spell out, each inside the plan's intent:

1. **Where the Q1 known-limit note goes.** The plan's step 3 lists the doc notes but only says Q1 is
   "accepted and documented" in the owner rulings; the driver said "where the brief/doc fits". Chose
   the analytics doc's Reconnection Events note (next to the other reconnect caveats) plus this
   worklog. **Did not edit the brief** — the driver has an uncommitted edit on it and forbade Status
   changes; a doc note is enough to "write it down". Cheap to move if the owner wants it in the brief.
2. **Correction to the plan's framing of the Q2 caveat.** On checking `MatchStartAnalytics.ts`,
   `Match:Duration` and `Match:Spawned` both need the match-start time that only `Game:Start` sets, so
   for such a match they **do not fire at all**; only `Game:End` fires (unmatched). The doc says
   exactly that. (My first draft said all three fire unmatched — caught and fixed before hand-off.)
3. **Comment on the runner's save.** The plan said "update its comment"; there was no comment there,
   so one line was added with the plan's wording.
4. **`analytics-event-reference.md` formatting.** `prettier --check` flags that file, but it already
   fails at `HEAD`; I did not reformat it (unrelated churn). `npm run lint` is plain `eslint`, so it
   does not check markdown; the `lint-staged` pre-commit config was not checked (the hook is inert,
   `0223`).
5. **Test mechanics.** J2 flushes microtasks with a 10-step `await Promise.resolve()` loop (no fake
   timers needed — the failure path has no timers). The `WorkerClient` mock's default `initialize()`
   never settles, so J1/J4/J5 park `createClientGame` at the worker start instead of building a
   `GameView`.

**Fixes applied without asking / obvious-winner calls (ADR-019 / ADR-032 audit):** none — this was a
BUILD step, not a review round.

## Verify — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Verify worker; wrote no source/tests)

- **`npm test`, first run: 180/181 suites, 3228/3229 tests. RED on one test.** It was `tests/profile-server/RouteMetrics.test.ts` › "a body-parser rejection is timed too…", failing with `socket hang up`. That suite uses `supertest` and is profile-server code this change does not touch. No `SIGSEGV` appeared in the log. The only `node-*.ips` crash report is from 2026-09-29, older than this run, so the `0197` crash is ruled out. The failure matches the known supertest-flake family, but its `socket hang up` shape has **never been traced**.
  - **Re-ran:** the file alone passed (23/23). The full `npm test` re-run was **green: 181/181 suites, 3229/3229 tests**, and the shell harnesses were included.
- **`npm run lint`:** exit 0, clean.
- **Live checks.** Local dev on this working tree: the game server on 3000–3002 and the client via `webpack serve` on port **9010**, because 9000 was held by an unrelated project's dev server (`pixel-dungeon`, PID 57856), which was left untouched. Driven with Playwright. To force the failure, the worker bundle (`/js/src_core_worker_Worker_worker_ts.*.js`) was aborted with `page.route`. All the processes I started were stopped afterwards.
  - **A (baseline refresh mid-match): PASS.** The session was saved on start. After a refresh the "Match in progress" prompt appeared, Rejoin put the player back in the same match with their own territory, and the session was kept.
  - **B (failed start, then refresh, then Rejoin): PASS.** One worker request was blocked. The `Failed to start the game — please try refreshing the page.` modal showed, `Worker:InitFailed` fired, and `reconnect-session` held that game and client ID. After unblocking and refreshing, the prompt appeared. Rejoin logged `Reconnect:Accepted` → `Reconnect:Succeeded` → `Worker:InitSuccess` → "starting game!" on the same gameID and clientID, and the player was back in the spawn phase about 5.5 s after the failure. `Game:Start` did not fire for that match, which is the documented Q2 caveat.
  - **C (the same flow on old code shows no prompt): NOT RUN live.** Running a second dev server on `5b3e6ec`, or reverting the tree, was not done. Static proof instead:
    - `git diff 5b3e6ec HEAD` is empty for `ClientGameRunner.ts`, `ReconnectSession.ts` and `ReconnectModal.ts`. `Main.ts` differs, but not on the save path.
    - `HEAD` has exactly one `saveReconnectSession(` call site, in the runner's `start` handler after the worker is up (`ClientGameRunner.ts:742` at `HEAD`).
    - The Build step's red-first run also showed J1, J2 and J4 failing on `HEAD` code.
  - **Second failure: PASS.** The block stayed on through Rejoin. The same modal showed a second time, with 2 worker requests blocked in total, and the session was still present. After a refresh the prompt appeared again. No join, `Worker:Init*` event or other activity happened in the 10 s that followed without a click, and the prompt stayed up. Dismiss then cleared the session.
  - **Explicit exit: PASS.** The in-game exit button cleared `reconnect-session`, and a fresh page load showed no prompt.
  - **Game over: PARTIAL.** The elimination ("You died") case was observed: the session was cleared and the next page load showed no prompt. A match played to its end (win or timer) was **NOT RUN**.
  - **Singleplayer: PASS.** Ran "Play Mission: 1" (the singleplayer campaign) to "starting game!" with a `setItem` spy in place: zero writes to `reconnect-session`, and it stayed `null`. The first-visit tutorial, which is also local, did not write it either. "Custom Game" singleplayer was not run separately.
- **Fixes applied without asking / obvious-winner calls: none.** This was a Verify step.

## Process review, round 1 — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Process-review worker)

Ledger: `review.md` R1–R4 (all low). All four verified `CORRECT`; all four fixed; ledger `Status: closed-out`.
No regression or oscillation (round 1 — no prior rounds). No finding matched an accepted residual as a
re-raise (R3 meets the Q2 residual's own re-raise condition). No ADR in scope (`adr-115` mentions
reconnect but covers the server-side name, not this).

### Decision log — fixes applied without asking (ADR-019 / ADR-032 audit)

1. **R1** — what: in `joinLobby`'s lobby-phase `error` branch, the reconnect-session clear moved from
   before `transport.leaveGame()` / `onGameEnd()` to after them. Why it qualified: verified `CORRECT`
   (a throw there would skip the teardown); mechanical (a reorder inside one branch, neither call reads
   the session); inside the plan (step 1 adds this clear to this branch; its exact position is not
   load-bearing). Test J4d.
2. **R2** — what: the same clear now also requires `loadReconnectSession()` to still hold this join's
   `gameID` + `clientID`; the `savedReconnectSession` comment reworded. Why it qualified:
   **obvious-winner within the plan's intent** — the plan states the clear "only undoes this join's own
   write" (plan.md § Edge cases considered, "A session left over from another game"); the other option
   (only correcting the comment) would have quietly weakened that promise. Localized: one condition in
   one branch, single-tab behaviour unchanged. Test J4c. Note: the other clear sites (explicit exit,
   `WinModal`, Dismiss) stay unconditional — last-writer-wins across tabs there is pre-existing and out
   of this task's scope.
3. **R3** — what: doc-only rewording of the Q2 bullet in `analytics-event-reference.md` (Game:End fires
   more than once, first with Game:Abandon). Why it qualified: verified `CORRECT` against
   `Main.ts` (`onJoin` sets `gameHasStarted`; `beforeunload` → `logActiveMatchAbandon`); mechanical;
   inside plan step 3 (document the Q2 caveat); the owner's ruling is not touched.
4. **R4** — what: J1 gained a `getConfig`-mock ordering check; new J2b (map load rejects → session kept,
   re-throw still unhandled-by-design). Why it qualified: verified `CORRECT`; test-only; inside the
   plan (its tests section and error-path table row 2).

Mutation checks (each done on a backup copy, file restored and diff re-checked after): save moved after
`createClientGame(...)` → J1 red; unconditional clear → J4c red; clear before teardown → J4d red.

### Evidence

- Targeted: `npx jest` on the three in-scope suites → 3/3 suites, 21/21 tests.
- `npm test` (full, shell harnesses included) → **181/181 suites, 3232/3232 tests**, first run, no flake.
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. `prettier --check` on the five
  `.ts` files → clean.
- **Not re-run:** the live checks (A, B, second failure, exit, singleplayer). The changes touch only the
  lobby-phase `error` branch, which none of those live checks exercised.

## Re-verify (after review round 1) — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop`; wrote no source/tests)

- **Diff vs plan:** `ClientGameRunner.ts` + `ReconnectSession.ts` vs HEAD match `plan.md` intent — save
  in `joinLobby`'s `start` branch before `createClientGame`, gated `!transport.isLocal && !left`;
  `setItem` wrapped in try/catch; runner's own save kept with the one-line comment. Lobby-phase `error`
  clear now runs after `transport.leaveGame()`/`onGameEnd()` and only when `savedReconnectSession` and
  `loadReconnectSession()` still hold this join's `gameID`+`clientID`. Differs from the plan's literal
  text (clear "next to `left = true`", no ID check) only as round-1 R1/R2 recorded; within the plan's
  "only undoes this join's own write" intent. No drift found.
- `npm test` (full, shell harnesses included) → **181/181 suites, 3232/3232 tests**, exit 0, first run,
  no flake, no re-run, no skips. J1–J5 (incl. J2b/J4c/J4d), R1/R2 and the teardown suite all PASS.
- `npm run lint` → exit 0.
- **Live re-check: NOT RUN.** The only code changed since the last live pass is the lobby-phase `error`
  branch; reaching it live needs the server to send an `error` (kick / schema reject) to a client after
  `start` but before its worker finishes starting — no cheap local trigger exists, and port 9000 belongs
  to another project's dev server. Covered by unit tests J4/J4b/J4c/J4d only.
