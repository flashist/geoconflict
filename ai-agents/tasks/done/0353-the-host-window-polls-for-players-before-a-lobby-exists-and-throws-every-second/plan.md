# Plan — 0353: the host window's player poll runs before a lobby exists

**Planning only. No files written.** Planned against the current working tree, which includes 0380's uncommitted edits to `HostLobbyModal.ts` (copy, `copyFailed`, the hint lines). Those edits do not touch `open()`'s poll start or `pollPlayers()`.

## Root cause (checked in the code)
- `open()` (`src/client/HostLobbyModal.ts:691`) starts `setInterval(pollPlayers, 1000)` straight away, before `createLobby` answers.
- `pollPlayers()` (`:1054-1067`) fetches `/${workerPath(lobbyId)}/api/game/${lobbyId}` with `lobbyId === ""`. Its `.then(r => r.json())` chain has no catch, so a non-JSON reply gives one uncaught rejection per tick.
- Expected production reply, from reading the code: the worker has no route for an empty id. `/api/game/:id` does not match `/api/game/`, `express.static` misses, and there is no catch-all, so Express's default 404 **HTML** comes back. That HTML makes `json()` throw in production too. Step 1 confirms this live.
- A second gap found while planning: `reset()` never clears `lobbyId`. On a **reopen**, the poll queries the **previous** lobby's id until the new create answers. That is the same "no lobby yet" window, so the fix must cover it too.

## Change (one file, `src/client/HostLobbyModal.ts`, `pollPlayers()` only)
1. **Gate the poll on `hasJoinedLobby`, not on `lobbyId`.** `hasJoinedLobby` is set true at the exact moment this opening's create answers (`:674`), and `reset()` clears it (`:722`). It covers first open, failed create, slow create and reopen-with-a-stale-id in one check. It does not change `lobbyId`, the rendered code, `putGameConfig` or 0380's copy. The interval keeps its current start/stop points in `open()` and `reset()`, so 0327's close behaviour and 0333's Create-tap leave are untouched.
2. **Rewrite the body as async/await inside try/catch.** Read `lobbyId` and `openGeneration` once at the start. After the reply, return without writing if the generation changed: a poll still in flight when the window closed or reopened must not fill the new opening's player list. This matches the file's existing `openGeneration` guards.
3. **The catch logs with `console.warn`, not `console.error`.** `OtelBrowserInit.ts:80` forwards every `console.error` to OTEL. A transient failure once a second would just move the noise from `unhandledrejection` into telemetry. The `console.log` of each reply stays as it is today.
- Nothing else changes: `open()` (0374 edits its `endJoining`, so there is no overlap), `close()`/`reset()`/`handleModalClose()`, `createLobby`, `Transport.ts`, `src/core/`.

## Steps
1. **Confirm it first (brief step 1).** On local dev (`npm run dev`, headless browser), open the host window twice: once with create slowed and once with create forced to 500. Wait at least 5 s each time. Record in the worklog how many `Uncaught (in promise)` errors appear and which request each came from. Also do a read-only `curl` GET of the empty-id path on production and record the status and content type. If it does not reproduce, say so and stop.
2. Write the new tests and run them against today's code. Record that they **fail**.
3. Make the change above.
4. Rerun the new tests and record that they **pass**. Run `tests/client/HostLobbyModalLeave.test.ts`, `HostLobbyOpen.test.ts`, `JoinPrivateLobbyModalLeave.test.ts` and `HostLobbyModalUrl.test.ts`.
5. Live recheck: with create failing for at least 5 s, expect zero uncaught errors and zero `/api/game/` requests. Then a normal create: the player list fills and refreshes. Record the after-fix count (0).
6. Run `npm test` and `npm run lint` (if the known supertest flake appears: rerun and say so).

## Tests — new `tests/client/HostLobbyPoll.test.ts`
Uses the same harness as `HostLobbyModalLeave.test.ts`: real o-modal, fake timers, `workerPath` → `w1`, the `jose` stub that 0380 added. The empty-id GET mock answers with a `json()` that rejects with a SyntaxError, as the server's HTML would. Uncaught rejections are caught by a `process.on("unhandledRejection")` collector, drained with a real `setImmediate` tick.
- **Slow create** (create never answers), advance 5 s: no GET to `/w1/api/game/` or any `/api/game/` path, and no unhandled rejection. *Fails today.*
- **Failed create** (create returns 500), advance 5 s: same assertions. *Fails today.*
- **Lobby exists:** create answers, advance 1 s → one GET to `/w1/api/game/HOSTLOBBY`, and the player list shows the mocked clients. The next reply has another client; advance 1 s and the list updates. *Passes today (guards against breaking it).*
- **Poll error after the lobby exists** (`json()` rejects once): no unhandled rejection, and the next tick still polls. *Fails today.*
- **Reopen during a slow create:** open → join `HOSTLOBBY` → close → reopen with the create pending, advance 3 s → no GET for the old `HOSTLOBBY`. *Fails today.*
- **Close stops the poll:** after close, advancing the timers sends no more GETs. Already covered by 0327's `pollCalls`; one assertion repeated here.
- ⚠️ **Risk:** detecting an unhandled rejection under jsdom plus fake timers can be unreliable. If the collector does not catch the failure on today's code, the build says so plainly. The "no empty-id request" and "no stale-id request" assertions still fail on today's code without the collector.

## Edge cases covered
- A tick in flight during close or reopen: generation guard.
- A lobby gone on the server: the worker answers JSON 404 `{error}`, so `clients ?? []` is empty and nothing throws, same as today.
- Fake-timer interaction with 0327's existing poll assertions: the gate only skips ticks before the lobby exists, so their after-join counts are unchanged.

## Sequencing
The 0380 edits sit in the working tree, uncommitted. 0374 edits `open()` next. This change stays inside `pollPlayers()`, so the two do not collide, but build 0374 after this one.

---

## Owner rulings at approval (2026-10-04, live via `AskUserQuestion` in the `fkit lead` session, `fkit-sprint-ship-loop`)

- **Plan: APPROVED** — the plan above, as written. The plan had no open questions.
