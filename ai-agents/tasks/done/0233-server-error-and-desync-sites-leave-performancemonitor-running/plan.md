# Plan — 0233: the three `showErrorModal` sites that stop nothing

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **Q2 — Site 2 (desync): NO teardown.** Measure, then drop the site with the written reason; jest T8 pins
>   the decision (a `desync` message must not tear down; turns must still reach the worker).
> - **Q3 — Site 3 (lobby error): the 3-line fix** (`left = true; transport.leaveGame(); onGameEnd();`) **if
>   step 1 shows** socket churn after a pre-start error or a live monitor in the build window (3b);
>   otherwise drop with the record.
> - **Q5 — measurement scope: full per-site**, including 3b (temp delay before `worker.initialize()`,
>   `TEMP-0233`-tagged, removed after) and the two-context forced desync.
> - **Q1 / Q4 — not separately ruled; take the plan's recommendations:** Site 1 = full `this.stop()` after
>   the modal; jest tests added as a new `describe` block in `tests/client/ClientGameRunnerTeardown.test.ts`
>   with a `document` stub, file stays on the node environment, 0231's T1–T6 untouched.
> - **Working tree / HEAD:** `6822210`; `src/client/ClientGameRunner.ts`, `Main.ts`, `Transport.ts` are clean
>   at HEAD. The tree carries uncommitted 0220/0221 changes (profile-server files, `setup-profile.sh`,
>   `build-deploy-profile.sh`, harnesses, `Dockerfile.profile`, `example.env.profile`, `profile-checks.sh`) and
>   new Backlog briefs — **touch none of them.** `git diff --stat src/core/` must stay empty.
> - **Build scope for the Build spawn:** step 1 measurement first (all sites, before and after), then D1
>   (site 1), D3 only if step 1 justifies it, D2 = no change; tests §5; browser after-numbers + criterion 6;
>   all temp instrumentation reverted and grep-gated.

# Plan — 0233: the three `showErrorModal` sites that stop nothing

**Planning-only step, spawned by `fkit-sprint-ship-loop`. No source written, no files created, no commits, no wiki writes.** `EnterPlanMode` is not granted to a spawn; the gate is the prose contract.

## Summary (lead with the news)

- **Site 2 (desync) is probably not a leak at all.** The server keeps sending turns to an out-of-sync client (`GameServer.ts` only excludes it from winner/participation credit, `:1191-1198`, `:1395-1400`); the modal is closable and says "what you see might differ". The game goes on, so the monitor running is correct. Tearing down here is exactly the brief's verification-6 risk. **Recommendation: measure, then drop site 2 with that reason** — pending the owner's product call (Q2).
- **Site 1 (the kick) is worse than "monitor keeps sampling", by code reading:** the server closes the socket with code 1000 right after the `error` (`GameServer.ts:1005`), so `Transport` does not reconnect (`Transport.ts:362-378`) — but the runner's connection check (`ClientGameRunner.ts:1203-1216`) and the ping loop on a CLOSED socket (`Transport.ts:734-741`) will open a new socket every ~5 s, and `addClient` refuses a kicked client **silently** (`GameServer.ts:196-201`), so it never ends. **Reasoned, not observed — step 1 measures it.** Fix: `this.stop()` after the modal (Q1, Rec).
- **Site 3 (lobby error) splits into two cases:** 3a pre-`start` (no monitor can be running) and 3b the build window between `onJoin` and `r.start()` (monitor running, runner not yet built). Both measured; fix shape depends on the numbers (Q3).
- **Seam answer: reuse 0227's `onGameEnd` — no new seam.** Site 1 reaches it through `stop()` (`:893`); site 3 has it in scope as `joinLobby`'s 5th parameter (`:117`), exactly like 0227's two call sites (`:232`, `:246`). `Main.gameStop` is neither nulled nor re-driven (0227's bar).
- **One file changes: `src/client/ClientGameRunner.ts`**, ≤ ~8 lines. `Main.ts`, `Transport.ts`, `src/core/` untouched. Jest coverage for sites 1/2/3a via the 0231 mock pattern; 3b browser-only.
- **No figure, rate or severity is written anywhere in this plan.** Every expectation below is labelled as code-reasoned.

## 0. Facts the plan rests on — re-verified at `HEAD` `6822210` by content, not by offset

`git status` shows `src/client/ClientGameRunner.ts`, `Main.ts`, `Transport.ts` **clean** at HEAD; the working tree's modified files are 0220/0221's (profile server) — not touched by this task.

| Fact | Where (`HEAD` `6822210`) |
|---|---|
| **Site 1** — runner `onmessage`, `if (message.type === "error")` → `showErrorModal(..., true, false, "error_modal.connection_error")` and nothing else | `src/client/ClientGameRunner.ts:772-781` |
| **Site 2** — `if (message.type === "desync")` → `showErrorModal(..., "error_modal.desync_notice")` only | `:758-770` |
| **Site 3** — `joinLobby`'s own `onmessage`, `error` branch → modal only | `:253-263` |
| `joinLobby(eventBus, lobbyConfig, onPrestart, onJoin, onGameEnd)`; `let runner = null; let left = false` (0231) | `:108-119`, `:130-131` |
| 0227's two direct `onGameEnd()` call sites; 0231's `if (left) { r.stop(); return; }` | `:228-247` |
| Returned closure (= `Main.gameStop`): `left = true; runner ? runner.stop() : transport.leaveGame()` | `:264-274` |
| Worker-init `catch` — **0227's, do not touch** | `:335-349` |
| Crash branch: modal → `console.error` → `this.stop()` — the precedent for `stop()` from inside a runner callback | `:559-568` |
| `keepWorkerAlive` rAF re-schedules only while `isActive` — `stop()` ends it | `:695-705` |
| Runner `onmessage` starts; `lastMessageTime` refresh | `:712-713` |
| `stop()`: `isStopped` latch, music behind `isActive`, overlay, timeout+interval cleared, 5 listeners off, `worker.cleanup()`, `transport.leaveGame()`, `onGameEnd()` last | `:862-894` |
| `onConnectionCheck`: `!isActive || isLocal` → return; >5000 ms silence → `transport.reconnect()` | `:1203-1216` |
| `showErrorModal`: dedupes on `#error-modal`; `closable` adds an X | `:1219-1276` (`:1228-1230`, `:1261-1268`) |
| `Main`: monitor starts in `onJoin` (`restartPerformanceMonitor`), generation claimed beside it | `src/client/Main.ts:766`, `:769` |
| `Main`'s `onGameEnd`: generation-guarded, **monitor only**, `gameStop` left alone | `:786-799` |
| `handleJoinLobby` stops a previous game + monitor; `handleLeaveLobby`; `beforeunload` | `:683-687`, `:949-962`, `:255-262` |
| `Transport.connectRemote`: `startPing()`, `killExistingSocket()`, new socket, **replaces `this.onmessage`**; `onclose`: 1002 → `reconnect-failed`, 1000 → nothing, else `reconnect()` | `src/client/Transport.ts:310-379` (`:362-378`) |
| `Transport.leaveGame`: local → `endGame()`; remote → `stopPing`, null-socket return, else `killExistingSocket()` (nulls all socket handlers) — idempotent | `:459-477`, `:747-762` |
| `sendMsg` on a CLOSED socket → `connectRemote` again (the ping loop's reconnect) | `:734-741` |
| Server kick: sends `error` "Kicked from game (you may have been playing on another tab)", `ws.close(1000, ...)`, adds to `kickedClients` | `src/server/GameServer.ts:987-1012` |
| `addClient` refuses a kicked clientID **silently** — no message back | `:194-201` |
| Same-account conflict kick is **prod-only** (`config.env() === GameEnv.Prod`) — a second tab does **not** kick in dev | `:231-248`; `DevConfig.ts:17-19` |
| Other server `error` sources: malformed client message → `error` + `close(1002)` | `GameServer.ts:314-325`; `Worker.ts:401-412` |
| Host kick intent (`kick_player`, lobby creator only) | `GameServer.ts:370-380` |
| Admin kick route, master → worker | `Master.ts:393-408` → `Worker.ts:370-385`; token `DevConfig.ts:9` |
| Desync: needs ≥2 active clients, every 10 turns; with `outOfSync ≥ floor(n/2)` **all** clients are marked; sent once per client | `GameServer.ts:1093-1141` (`:1094`, `:1097`, `:1181-1182`, `:1130-1133`) |
| `LocalServer` never sends `error`; sends `desync` only in an archived replay with a hash mismatch | `src/client/LocalServer.ts:200-216` |
| `PerformanceMonitor`: 5-min `setInterval` + rAF + `visibilitychange`; stopper | `src/client/PerformanceMonitor.ts:6`, `:69-73` |
| Dev console prints every analytics event (`DEPLOY_ENV !== "prod"`) — `Performance:*` is visible without instrumentation | `src/client/flashist/FlashistFacade.ts:198-207` |
| jest `testEnvironment: "node"`; `jest-environment-jsdom` is installed | `jest.config.ts:11`; `package.json:95` |
| Dev public lobby: game starts ~5 s after joining, AI fill | `DevConfig.ts:21-23` (0232's recipe) |

**Two derived facts that shape the design (code-reasoned):**
- **Every server `error` is terminal for that socket.** All three server sites close the socket immediately after sending it (1002, 1002, 1000). A rejoin after a kick is refused silently; after a schema error it would fail the same way. So `error` ⇒ "this game is over for this client", at every site.
- **Site 3 can only fire while `runner === null`.** `r.start()` (`:237`) calls `transport.connect` synchronously (`:797`), which kills the old socket and swaps `onmessage`; the lobby handler is unreachable from then on. So site 3 = 3a (before `start`) or 3b (between `start`/`onJoin` and `r.start()` — terrain load + worker init).

## 1. MEASURE FIRST — build step, real browser, per site (brief step 1)

**Environment:** 0231/0232's recipe — dev game server (`GAME_ENV=dev … src/server/Server.ts`) + `webpack serve --node-env development` as two background processes (`npm run dev` minus `--open`), Playwright MCP (Chromium). MP = dev public lobby "Join next Game"; SP = Custom Game, Faroe Islands.

**Instrument (one instrument, before and after, never in `src/`):** `page.addInitScript` wrapping `setInterval`/`clearInterval` (live set keyed by period — **the monitor's interval in that set is the direct "is a monitor running right now" answer**), the `WebSocket` constructor (count + timestamp — socket churn after the modal), `Worker` ctor/`terminate`, and capturing console lines: `flashist_logEventAnalytics | logEvent __ event:  Performance:*`, `No message from server for`, `Connected to game server!`, `WebSocket closed. Code:`, `on stop: leaving game`, `WebSocket is not open`, `joining lobby: gameID: … clientID: …` (`:119-121`, gives the ids the triggers need).
**One temporary source edit, 0227 precedent:** `SAMPLE_INTERVAL_MS` lowered to `3 * 1000`, tagged `TEMP-0233`, restored before finishing. Gates: `git diff --stat src/client/PerformanceMonitor.ts` empty; `grep -rn TEMP-0233 src tests` empty.

**Recorded per site, numbers not adjectives:** (a) monitor interval live at modal time — yes/no; (b) `Performance:*` lines after the modal — count and timestamps over a fixed 60 s window; (c) sockets opened after the modal; (d) runner 1000 ms interval live; (e) what, if anything, stopped the monitor in the window (nothing / leave / join).

| Site | Trigger | Expected (code-reasoned — record what is seen) |
|---|---|---|
| **1** kick, MP | One context; ≥25 s into the game (after the 20 s arm); `POST http://localhost:3000/api/kick_player/<gameID>/<clientID>` with header `config.adminHeader()` = `DevConfig.adminToken()` (master forwards to the worker). The second-tab kick **cannot** be reproduced in dev (prod-only); the message and client path are identical. Fallback: private lobby, host context kicks victim (`kick_player` intent). | monitor live; `Performance:*` continues; a new socket every ~5 s; runner interval live; nothing stops it within 60 s. |
| **2** desync, MP | Two Playwright **contexts** (separate storage ⇒ separate persistent ids; ≤3-per-IP rule allows it); both "Join next Game" inside the 5 s creation window, confirm same `gameID` from both consoles. Context B's init script wraps `WebSocket.prototype.send` to rewrite the `hash` field of `{"type":"hash",…}` payloads. At turn 10/20/… with n=2 the majority rule marks **both** out of sync ⇒ both get one `desync`. Fallback (no second context): archived replay with a doctored hash (`LocalServer.ts:200-216`). | monitor live; `Performance:*` continues **because the game continues** — turns keep arriving after the modal; emission stops at the normal game end / leave, like any game. |
| **3a** pre-start error | Dev public lobby; fire the kick POST immediately after the `joining lobby:` log, inside the ~5 s pre-start window. Or the shipped path: private lobby, host kicks a waiting player. | **no** monitor interval live (nothing has started one; a previous game's was stopped at `Main.ts:683-687`); socket churn from the lobby transport's ping loop — count it. |
| **3b** build-window error | Kick between `start` and `r.start()`. Window is sub-second to a few seconds; widen with Playwright CPU throttling or a `TEMP-0233` 10 s delay before `worker.initialize()` in `createClientGame` (0227 precedent), removed after. | monitor live, runner null; when the runner then starts it rejoins, is refused silently, and its connection check reconnects every ~5 s; nothing stops the monitor. |

A site whose (a) is "no" and whose (c) is 0 needs no fix and is dropped with that record.

## 2. Seam question — answered

**Reuse 0227's `onGameEnd`. No new seam.** Sites 1 and 2 are inside the class and reach it via `stop()` (`:893`); site 3 is inside `joinLobby`, where `onGameEnd` is already a local (`:117`) with two existing direct calls (`:232`, `:246`). `Main.gameStop` stays non-null and is not re-driven — the same shape 0227/0231 already sanctioned for the crash branch; a later `handleLeaveLobby`/`handleJoinLobby`/`beforeunload` calls `gameStop()` → `runner.stop()` latched no-op / `transport.leaveGame()` idempotent → safe. Generation guard: the errored game is the current one, so the guard passes; if a newer join superseded it the guard correctly does nothing — the worklog records which case was tested (wiki's `0232` trap).

## 3. Teardown depth — per site, in writing

- **Site 1 — full `stop()`.** The socket is closed by the server and a rejoin is refused; the game cannot continue. `stop()` (cheap, idempotent since 0231) clears the reconnect timer/interval, kills the worker, ends the `keepWorkerAlive` rAF (`isActive=false`), leaves the transport (`stopPing` + `killExistingSocket` — ends the ping churn), removes the 5 listeners and stops the monitor through the seam. Monitor-only would leave the reconnect-every-5-s loop, which step 1 is expected to show is the larger half.
- **Site 2 — no teardown (Rec).** Game continues; monitor lifetime = game lifetime, ended by `SendWinnerEvent`/leave as usual. Full `stop()` would kill a playable game; monitor-only would stop sampling a live game. Product alternative (Q2): treat desync as game-over because the client can no longer earn credit. → **Owner ruled: no teardown.**
- **Site 3 — depends on step 1 (Q3).** If fixed: `left = true; transport.leaveGame(); onGameEnd();` — `left` closes the 3b window through 0231's existing `.then` branch (`r.stop()` when the pending runner arrives), `leaveGame()` ends the ping churn, `onGameEnd()` is a no-op when no monitor runs and the fix when one does. `runner === null` is an invariant here (derived fact above) — stated in a comment, not branched on.

## 4. Implementation — `src/client/ClientGameRunner.ts` only

- **D1 (site 1, `:772-781`):** after `showErrorModal(...)`, add `this.stop();` with a two-line comment (server closes the socket and refuses rejoin; `stop()` is latched). Modal first, then stop — same order as the crash branch `:560-567`.
- **D2 (site 2, `:758-770`):** no change (pending Q2). If the owner rules teardown: `this.stop()` after the modal, same shape. → **Owner ruled no change.**
- **D3 (site 3, `:253-263`):** pending Q3/step 1 — after the modal: `left = true; transport.leaveGame(); onGameEnd();` with a comment giving the invariant and the terminal-error argument.
- Nothing else: no `Main.ts`, no `Transport.ts`, no `src/core/`, worker-init `catch` untouched, 0227's folder untouched.

## 5. Tests

**Jest — `tests/client/ClientGameRunnerTeardown.test.ts` pattern (mocks already load the runner under node).**
- `showErrorModal` touches `document` (undefined under node). In the new tests: `(globalThis as any).document = { querySelector: () => ({}) }` in `beforeEach` (truthy ⇒ `showErrorModal` returns at `:1228-1230` before touching the DOM), deleted in `afterEach`. This keeps the file on node and 0231's six tests untouched. (Alternative: a separate file with `@jest-environment jsdom` — not recommended, see Q4.)
- **T7 (site 1):** `runner.start()`; take `onmessage = transport.connect.mock.calls[0][1]`; feed `{type:"error", error:"Kicked from game"}` → `worker.cleanup` ×1, `transport.leaveGame` ×1, `onGameEnd` ×1, five listeners gone, `advanceTimersByTime(60_000)` → `transport.reconnect` never called. Then a second `error` → all still ×1 (latch).
- **T8 (site 2, if Q2 = no teardown):** feed a `desync` message (`lobby.gameStartInfo` set) → `worker.cleanup`/`leaveGame`/`onGameEnd` **not** called; then a `turn` after a `start` with `turns: []` still reaches `worker.sendTurn` (add `sendTurn: jest.fn()` to the worker mock). Pins the decision so a later "fix" cannot silently tear down a live game.
- **T9 (site 3, if fixed):** `joinLobby` is exported (`:108`). Extend the `Transport` mock class with `connect/leaveGame/joinGame` jest fns and a module-level `instances` array; call `joinLobby(bus, lobbyConfig, jest.fn(), jest.fn(), onGameEnd)`, feed `{type:"error",…}` to the captured handler → `onGameEnd` ×1, `leaveGame` ×1; then call the returned closure → no throw. **3b is not jest-testable** (`createClientGame` needs terrain/worker/renderer) — browser only, said plainly in the worklog.
- 0231's T1–T6 must stay green unchanged.

**Browser (brief step 5 + verification 6):** re-run step 1 per confirmed site with the same instrument — after numbers beside before numbers: monitor interval gone, `Performance:*` count 0 in the 60 s window, sockets opened 0 after the modal, runner interval gone; the modal still shows. Then criterion 6: MP and SP join → play → shipped sidebar exit → rejoin, unchanged; and one *recoverable* disconnect (drop the network via CDP for ~6 s, restore) shows the reconnect path still reconnects and nothing tears down — `error` is never on that path, but the brief asks for the proof.

**Gates:** `npm test` (~22–25 s), `npm run lint`, `npx tsc --noEmit`; `git diff --stat src/core/` empty; `git diff --stat src/client/PerformanceMonitor.ts` empty; `grep -rn TEMP-0233 src tests` empty.

## 6. Collision check

- **0252 (Backlog, A/B undecided):** covers renderer/canvas/rAF, Transport's 24 bus listeners, lobby poll restart, R1 — on in-page *leave* routes, in `Main.ts`/`GameRenderer`/`Transport`. This task adds call sites of the existing `stop()`/`onGameEnd()` inside `ClientGameRunner.ts` only. After a kick the canvas keeps painting the frozen frame and Transport's bus listeners stay — **0252's, on every route; not fixed here, recorded as such.** 0252's "coordinate line numbers" note: this diff shifts `ClientGameRunner.ts` by a few lines below `:253`/`:781`; 0252's citations are already declared against an older frame.
- **0228 (Backlog):** `Main.handleJoinLobby` — untouched.
- **0227's constraints:** worker-init `catch` untouched; `Main.gameStop` not re-driven; 0227's folder untouched.
- **Working tree:** uncommitted 0220/0221 files untouched; `ClientGameRunner.ts` is clean at HEAD so the diff is one file.

## 7. Edge cases and risks

1. **`stop()` at site 1 nulls `socket.onclose` before the server's close frame is processed** (`killExistingSocket`). For the kick (1000) nothing is lost. For a 1002 (malformed client message — a client bug) the `reconnect-failed` dispatch is lost, which matters only if `ReconnectModal` had an active rejoin session (`ReconnectModal.ts:196-204`). Accepted edge, recorded; fixing it means touching `Transport` (0252 territory).
2. `leaveGame()` on a server-closed socket logs "attempting reconnect" (`Transport.ts:468-475`) but does not reconnect — a misleading log line the measurement reader must not misread as churn.
3. Music stops on kick (`stopBackgroundMusic` behind `isActive`) — new, and reasonable; the modal stays; the frozen board and the sidebar exit (full navigation) behave as today. `beforeunload` still logs `GAME_ABANDON` for a kicked game — pre-existing, unchanged.
4. `clearReconnectSession` is not called on a kick → a reload may offer "Rejoin" for a game the server refuses silently. Pre-existing; **residual for the producer**, not fixed here.
5. Multiple `error`/`desync` messages: `stop()` latched; `showErrorModal` dedupes.
6. SP: `LocalServer` never sends `error`; D1 is inert there — fine. Site 2 in SP exists only for replays.
7. Two-context desync may land the contexts in different games — verify `gameID` matches, retry if not.
8. Step-1 instrumentation (`SAMPLE_INTERVAL_MS`, optional 3b delay) must be reverted — gated above.
9. The generation-guard trap: measure on the current game, and say so.

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

- **Q1 — Site 1 depth:** (a) full `this.stop()` after the modal — Rec; (b) monitor-only. → **Recommendation stands (a).**
- **Q2 — Site 2 (desync):** (a) no teardown, drop with the written reason, T8 pins it — Rec; (b) full `stop()`; (c) monitor-only. → **Owner ruled (a).**
- **Q3 — Site 3:** (a) drop if 3a shows no monitor and 3b unobservable; (b) the 3-line fix conditional on step 1 — Rec; (c) `onGameEnd()` only. → **Owner ruled (b).**
- **Q4 — Jest placement:** (a) new `describe` block in the existing teardown test with a `document` stub — Rec; (b) separate jsdom file. → **Recommendation stands (a).**
- **Q5 — Measurement scope:** (a) full per-site incl. 3b + two-context desync — Rec; (b) skip. → **Owner ruled (a).**
