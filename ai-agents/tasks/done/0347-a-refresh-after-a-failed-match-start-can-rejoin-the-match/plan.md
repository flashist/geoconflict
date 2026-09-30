
# Plan — 0347: a refresh after a failed match start can rejoin the match

## Summary
- **Root cause (confirmed by reading the code):** `saveReconnectSession` has one caller, the runner's own `start` handler at `src/client/ClientGameRunner.ts:741-743`. That handler only runs once the worker has started and `r.start()` has run. If the worker start fails (`createClientGame` returns `undefined`, `:342-358`), nothing is saved, so a refresh has nothing to restore.
- **Fix:** save the session in `joinLobby`'s lobby-phase `start` branch (`:201-247`), before `createClientGame` builds the worker. Multiplayer only.
- **Server:** no change needed. It already accepts this rejoin (details below).
- **Client only.** Nothing in `src/core/` changes. No new player-facing text, so no `en.json` / `ru.json` change.
- **Two open questions** go to the owner (late rejoin can land as a spectator; `Game:Start` is never counted for such a match). Neither blocks the build. The recommended answer for both is "accept and document".

## Server check (the brief asked for this)
`GameServer.addClient` (`src/server/GameServer.ts:204-483`):
- A kicked clientID is refused (`:206`). Not our case.
- **Same clientID + same persistentID** → the stale entry is replaced (`:261-299`). A different persistentID is refused silently (`:264-273`). persistentID comes from the play token or cookie, so it is stable across a refresh.
- **The old socket:** on refresh, `beforeunload` → `gameStop()` → `runner === null` → `transport.leaveGame()` closes it. If that close lands first, `existing` is `undefined` and the client is simply re-added. If the old socket is somehow still open, it is replaced, and its later `close` removes only its own instance (`:466-472`). Both cases are fine.
- The game has started, so `sendStartGameMsg(ws, lastTurn)` runs (`:479-481`). The player is in the frozen roster, because they were in `activeClients` at start.
- `/api/game/:id/active` = `_hasStarted && !_isEnded` (`Worker.ts:331-334`, `GameServer.ts:1073-1075`). It does **not** check the player's clientID or whether they spawned.

**Verdict:** the server accepts the rejoin. Nothing to build there.

## Changes

### 1. `src/client/ClientGameRunner.ts` — `joinLobby`
- Import `clearReconnectSession` next to `saveReconnectSession` (`:56`).
- Add a local `let savedReconnectSession = false;` next to `let left = false;` (`:127`).
- In the `message.type === "start"` branch, directly after `lobbyConfig.gameStartInfo = message.gameStartInfo;` and **before** `createClientGame(...)`:
  ```ts
  // Task 0347. Save before the worker is built: a worker start failure
  // returns before the runner exists, and the runner's own save (in start())
  // never runs — so a refresh had nothing to rejoin. Multiplayer only.
  if (!transport.isLocal && !left) {
    saveReconnectSession(lobbyConfig.gameID, lobbyConfig.clientID);
    savedReconnectSession = true;
  }
  ```
  - `transport.isLocal` is fixed in the Transport constructor (`Transport.ts:199-201`). For multiplayer, `gameStartInfo` is still `undefined` at that point, so `isLocal` is `false`. For singleplayer, tutorial and replay it is `true`, so they are excluded.
  - `!left` is a cheap guard. It stops a `start` that arrives after a leave from writing the session back after `handleLeaveLobby` cleared it. The real Transport already nulls the handlers on leave, so this is a guard, not a fix for an observed bug.
- In the lobby-phase `message.type === "error"` branch (`:253-272`), add `if (savedReconnectSession) clearReconnectSession();` next to `left = true`.
  - **Why:** this branch runs while `runner === null`, which now includes "after `start`, while the worker is still starting or has already failed". A kick here (the server refuses a kicked clientID) would otherwise leave a Rejoin offer the server silently refuses. That is exactly `0256`'s bug, widened by this change. Clearing it keeps `0256` no worse on the path this task touches.
  - The clear only runs when this join wrote the session. That way it never wipes a session that belongs to a different game.
  - A 1002 schema error here is already terminal by choice (`0233` R1), so clearing on it is consistent.
- **Keep the runner's save at `:741-743` unchanged.** It is now redundant for the first save, but it is harmless (same values). It still re-saves when the socket reconnects inside the page. Keeping it is the smallest change. Update its comment to one line: "re-save on (re)connect; the first save is in joinLobby (task 0347)".

### 2. `src/client/ReconnectSession.ts` — make the save safe to call
Wrap `localStorage.setItem` in `saveReconnectSession` in `try { … } catch { /* storage unavailable: rejoin just isn't offered */ }`.
- **Why:** the save now sits directly in front of `createClientGame`. A throwing `setItem` (quota full, or storage blocked in a privacy mode or iframe) would otherwise skip the whole match start.
- The old call site had the same exposure (it threw before the turns loop), so this makes both sites safe.
- No change to `clearReconnectSession` or `loadReconnectSession`.

### 3. `ai-agents/knowledge-base/analytics-event-reference.md` (docs only, no event changes)
- `~:252-254` says the reconnect session has **one** writer, skipped when local. That becomes stale. Change it to: two call sites (`joinLobby` on `start`, and the runner on `start`), both skipped when the transport is local.
- **Reconnection Events** section: add a short note.
  - The prompt can now also follow a match start that failed (worker start failure, or a failed map load before the worker).
  - `Reconnect:Succeeded` means "the server said the game is active and the rejoin was sent". It does **not** prove the player got back in: a rejoin can fail again in the worker start, which shows as `Worker:InitFailed` after it. This is existing behaviour, clarified here, not changed.
  - Plus the `Game:Start` caveat from open question Q2, if the owner picks option (a).

### What each error path does with the saved session

| Path | Session | Change? |
|---|---|---|
| Worker start fails (`createClientGame` → `undefined`, "please refresh" modal) | **kept**: nothing clears it | none. This is the point of the task |
| `createClientGame` rejects (e.g. map load fails) | **kept**: a refresh can retry | none |
| Lobby-phase server `error` (kick / 1002) after `start` | **cleared** (only if this join saved it) | new (step 1) |
| Runner-phase server `error` (mid-game kick) | kept, same as today | none. This is `0256`'s job, out of scope |
| Worker crash mid-game (`errMsg` → `stop()`) | kept, same as today | none |
| Explicit exit (`GameRightSidebar:132`), game over (`WinModal`), Dismiss, `/active` → false, leave-lobby (`Main.ts:1028`) | cleared, same as today | none |
| `beforeunload` / refresh | kept (`gameStop` only closes the socket) | none |

### What the player sees on a second failure (the brief's design point)
1. Refresh → prompt → the player clicks Rejoin.
2. `join-lobby` runs with `isReconnect: true` → the server sends `start` → the lobby handler saves the session again (same values) → the worker fails again.
3. The player sees the **same** `error_modal.worker_init_failed` modal ("Failed to start the game — please try refreshing the page").
4. The session is still saved, so the next refresh offers Rejoin again.
5. Nothing retries by itself: the prompt always needs a click. No new text.

## Tests — new file `tests/client/JoinLobbyReconnectSession.test.ts`
- Copy the module-mock block from `tests/client/ClientGameRunnerTeardown.test.ts`, with these changes:
  - The Transport mock takes `isLocal` from `lobbyConfig`, the same way the real one does.
  - The `ReconnectSession` mock provides both `saveReconnectSession` and `clearReconnectSession`.
  - Add mocks for `../../src/core/worker/WorkerClient` (a constructor spy; `initialize` controllable), `../../src/core/configuration/ConfigLoader` (`getConfig` resolves `{}`) and `../../src/core/game/TerrainMapLoader` (`loadTerrainMap` / `getCachedMap`).
- Stub `document.querySelector` to return a truthy value, like the 0233 tests do, so `showErrorModal` returns early.
- Tests:
  - **J1:** multiplayer `start` → `saveReconnectSession("g","c")` is called during that `onmessage` call, and the `WorkerClient` constructor has not been called at that moment. Record the spy's call count from inside the save mock. This is the brief's required "session saved on `start`, before the worker starts".
  - **J2:** worker `initialize` rejects → flush promises → `onGameEnd` called once, the save called once, **`clearReconnectSession` never called**.
  - **J3:** singleplayer (`gameStartInfo.config.gameType = Singleplayer`) `start` → no save.
  - **J4:** `start` then lobby `error` → `clearReconnectSession` called once. **J4b:** `error` with no prior `start` → not called.
  - **J5:** `gameStop()` then `start` → no save (the `!left` guard).
- New small test `tests/client/ReconnectSession.test.ts`:
  - **R1:** `saveReconnectSession` does not throw when `localStorage.setItem` throws.
  - **R2:** save → load round-trip still works.
- `tests/client/ClientGameRunnerTeardown.test.ts`: add `clearReconnectSession: jest.fn()` to its `ReconnectSession` mock, to keep it robust (its T9 never saves, so nothing gets called).
- Run the two new files and the teardown file on their own, then `npm test` and `npm run lint`.
  - Known supertest flake: if it hits, re-run and say that it was re-run.

## Live checks (brief's Verification — local, `npm run dev`, one public match)
- **How to force the failure:** block the **worker bundle** request for the first attempt only, using Playwright `page.route` or DevTools "Block request URL". Blocking the map URL would also break the page's own map preload and hit the reject path instead of the worker path. Unblock it before clicking Rejoin. The brief's "Disable cache + Slow 4G" is an alternative.
- ⚠️ **Port 3001 must be free** (see memory: dev worker 0 dies silently otherwise → no public lobbies).
- Steps:
  1. **A** — baseline: a normal refresh mid-match → Rejoin works.
  2. **B** — failed start → `reconnect-session` is present in localStorage → refresh → prompt → Rejoin → you play the same match. **Do this within the ~20 s spawn phase** (300 turns × 66.7 ms), otherwise see Q1.
  3. **C** — same as B on a worktree at `5b3e6ec`: no prompt appears. If a second dev server there is impractical, record the static proof instead (`git diff 5b3e6ec HEAD` on the four files is empty, and there was a single save site) and flag C as **not run**.
  4. **Second failure:** keep the block on for Rejoin → the same modal → the session is still there → refresh → the prompt shows again → nothing happens without a click.
  5. Explicit exit → no session. A finished match → no prompt.
  6. A singleplayer game never writes `reconnect-session`.

## Edge cases considered
- **A refresh during a slow map load** (after `start`, before the worker fails): Rejoin is now offered. Wanted.
- **Several `start` messages to the lobby handler** (a socket reconnect inside the page during the lobby phase): the save is the same each time. The existing double `createClientGame` risk is untouched and belongs to a different task.
- **Rejoin with a leftover socket:** covered by the server check above.
- **A session left over from another game** (e.g. a join via hash while the prompt is up): the lobby-error clear only undoes this join's own write.
- **Late joiners and spectators receiving `start`** already got a save from the runner before this change, so nothing changes for them.
- **Interaction with `0348`:** `0348` will add worker cleanup to the failure path. It must not add `clearReconnectSession` there. Flag this in `0348`'s hand-off.

## After close (not this task's writes)
The wiki page `features/reconnection.md` should gain the "save on start, before the worker" fact. Route it to `fkit-wiki` (`/fkit-wiki-ingest` of the done brief).

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text.*

- **Plan:** APPROVED.
- **Q1 (late rejoin after the ~20 s spawn window lands as a spectator):** (a) **Accept for this task and write it down as a known limitation** — no widening.
- **Q2 (a rejoin-after-failed-start match never emits `Game:Start`):** (a) **Leave it as it is and note it in `analytics-event-reference.md`.**
