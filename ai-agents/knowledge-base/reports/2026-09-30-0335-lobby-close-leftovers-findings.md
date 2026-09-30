# 0335 — the four lobby-close leftovers from `0327`: findings

**Task:** [`0335`](../../tasks/done/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md) ·
**Author:** `fkit-architect` (spawned by `fkit-sprint-ship-loop`, no owner channel) · **Date:** 2026-09-30

📌 **Frame.** Every `file:line` below is the **current working tree** on 2026-09-30, which includes the
**uncommitted** `0333`, `0334`, `0347`, `0348` and `0035` changes. `0327` itself is committed (`68303d5`) and is in the
`0.0.155` deploy commit (`00825f0`, 2026-09-29) — checked with `git merge-base --is-ancestor`; whether that build is
actually live was not checked. `0333`/`0334` are **not** in any deploy yet. Find code by name if lines move.

## Summary

- **All four are real. None is serious.** Two were shown by throwaway tests (cases 2 and 4), one partly by a test
  (case 3: client half tested, server half tested), one only by reading the code (case 1).
- **None was fixed or changed by `0333`/`0334`/`0347`/`0348`/`0035`.** All four are still present, in the same shape.
  `0334` adds more ways to reach case 4 but no new effect.
- **Only case 1 can affect a player**, and only in a window of about one network round trip. It belongs to `0228`.
- **Production reach today is small.** The private-lobby row is shown only when the `private_lobbies` remote flag is on,
  which `0302`'s plan set to *default disabled, testers only*. The live console state was not checked (no access).
- **One thing the brief expected is no longer true:** `0327` plan §8 said a server fix for case 3 must wait for `0322`.
  `0322` is done and committed (`68303d5`), so that ordering rule no longer applies.

## Evidence method

| Case | Verdict evidence |
|---|---|
| 1 | **Reasoned from code only.** `Main`'s `Client` is not exported (`src/client/Main.ts:160`), so no unit probe. No live run (see below). |
| 2 | **Throwaway test** (probe P2), plus the code. |
| 3 | **Throwaway tests** — client half (probe P3a) and server half (probe P3b). |
| 4 | **Throwaway tests** (probes P4, P4b). |

The probes were run once with `npx jest <file>` and then **moved out of the tree** to the session scratchpad. `git status`
shows no test or source files from this task. Probe results are quoted verbatim below.

**Live reproduction — NOT RUN.** Case 1 needs a close timed inside one network round trip, and on `localhost` that round
trip is a few milliseconds. A real repro needs `npm run dev` plus a browser with the `/cosmetics.json` response held back.
Port 9000 belongs to another project's dev server, and our dev server is fixed to 9000. Moving it would mean a webpack
config change, which is out of scope for this task. None of the verdicts below rely on a live run.

---

## Case 1 — close during the join's setup window (`0228`'s race, reached through `0327`)

**Status in the current tree: still present, unchanged.** `0333` moved the host's public-lobby leave to the Create tap
(`src/client/HostLobbyOpen.ts:17-28`). That makes `gameStop` null when the host's join starts, but the gap is the same.
`0347`/`0348`/`0035` changed what `gameStop` does (`src/client/ClientGameRunner.ts:318-328`), not when it is set.

### 1. Is it real? — Yes. Reasoned from code only.

- **The window modal marks the player joined, then dispatches `join-lobby`.**
  - Join window: `hasJoined = true`, then dispatch (`src/client/JoinPrivateLobbyModal.ts:268-280`).
  - Host window: `hasJoinedLobby = true`, then dispatch (`src/client/HostLobbyModal.ts:644-654`).
- **`Main.handleJoinLobby` sets `gameStop` only after three awaits** (`src/client/Main.ts:744-766`, `:783`):
  - `await getServerConfigFromClient()` (`:759`). After the first load it is cached (`src/core/configuration/ConfigLoader.ts:30-31`), so it resolves at once.
  - `await fetchCosmetics()` (`:762`). This is a **real `fetch("/cosmetics.json")` on every call**, with no in-memory cache (`src/client/Cosmetics.ts:77-80`). nginx proxies it through the default `location /` with no cache headers (`nginx.conf:317-326`).
  - `await FlashistFacade.instance.getYandexUniqueId()` (`:783`). It waits on the platform-init promise (`FlashistFacade.ts:1823`), which is settled long before any lobby click.
  - Then `this.gameStop = joinLobby(...)` (`:766`). JavaScript works out the arguments first, so `:783` still comes before the assignment.
- **A close in that gap:**
  - The modal's close funnel resets and sends one `leave-lobby` (`JoinPrivateLobbyModal.ts:145-159`; `HostLobbyModal.ts:674-688`).
  - `Main.handleLeaveLobby` returns at once when `gameStop === null` (`Main.ts:1023-1026`), so the leave is dropped.
  - If the player was already in a public lobby (Join window only; the Join button does not leave it first — `Main.ts:558-563`), `gameStop` still holds the **old, already-called** stopper, which `handleJoinLobby` never clears (`:754-758`). Then `handleLeaveLobby` calls it a second time, which does no harm: `leaveGame()` returns early when the socket is null (`Transport.ts:459-465`). It then clears `gameStop` and resets the start screen.
  - **Either way the awaits then finish and `joinLobby()` connects.** The player is in the lobby with the window closed.
- **This is `0228`'s own window** (the same three awaits). `0228` was written for *two joins* landing in it. This is a *join plus a leave* landing in it. That is the concrete, user-reachable path `0228`'s brief says nobody had shown (`0228` brief, "REACHABILITY IS NOT ESTABLISHED").

### 2. How bad?

- **Joiner (Join window):** the player is connected with the window closed.
  - If they stay idle on the start screen, the host's Start pulls them into the match. This is the original `0327` bug, reached by a narrower route.
  - `gameStop !== null` also makes the start screen think the player is away (`Main.ts:176`, `:326`, `:336`). The mid-session citizenship restart offer (`0303`) waits, and the login-restart treats the player as "match active".
- **Host (Create window):** the host is connected to their own lobby with the window closed.
  - Nobody can start it: only the host window has Start, and the Create-tap leave (`HostLobbyOpen.ts:21-23`) drops the connection on the next Create.
  - Friends who joined see the host in their list, in a lobby that cannot start. That is the same outcome the owner accepted for a host who leaves (`0327` Q1).
- **It heals itself on the next action.** Any public, private or single-player join goes through `handleJoinLobby`, which stops the stale connection (`Main.ts:754-758`). Another Create goes through `HostLobbyOpen`.
- **No data is lost or corrupted.** The server cost is one extra idle connection.
- **Production reach:**
  - Both windows sit in the private-lobby row. The row is hidden unless `private_lobbies` **and** the citizenship surfaces are both on (`src/client/PrivateLobbyAccess.ts:53-70`). Per `0302`'s plan, the flag defaults to `disabled` and is enabled for testers only.
  - Create is also locked to citizens (`PrivateLobbyAccess.ts:36-45`).
  - A `#join=<id>` link opens the Join window **whatever the flag says** (`Main.ts:722-727`). But someone must first have created a lobby.

### 3. How likely?

- **The window is about one round trip to the game server, for `/cosmetics.json`.** Estimate: tens of ms on a good connection, a few hundred ms on mobile. This comes from the code path. It was not measured.
- **To hit it, the player must close (✕, tap outside, Escape) in that window**, right after the "joined, waiting" text appears or right after Create's lobby id appears. Only an accidental instant close does that. A fast double tap on Join does not: the second tap lands inside the window content, not outside it.
- **For the host there are two windows back to back:** the create round trip (→ case 3) and then the cosmetics round trip (→ this case).
- **Rough rate:** very rare, well under 1 % of private joins. That is judgement, not data. Today it applies to testers only.
- **Telemetry: nothing measures this today.** A signal would need a new client event: "a leave arrived while a join was still setting up".

### 4. How hard to fix?

- **Client-only, in `Main.ts`. Roughly 20–30 lines plus tests. Medium-low risk.**
  - (a) Clear `gameStop` right after calling it in `handleJoinLobby` (`0228`'s original fix).
  - (b) Add a "join still setting up" marker. `handleLeaveLobby` sets it to *cancelled* when it finds `gameStop === null`, or finds a pending join. After the awaits, `handleJoinLobby` stops before calling `joinLobby()`.
  - It must keep `0227`'s `joinGeneration` mint and its order intact (`Main.ts:765`, `:843`, `:867`; `0228` brief §2a).
- **Tests:** `Client` is not exported. Pull the join/leave order out into a small module, the way `0333` did with `HostLobbyOpen.ts`, and unit-test it. That avoids the "test that only proves a null was added" trap `0228` warns about.
- **Rejected:** caching `fetchCosmetics()` in memory. It would shrink the gap to microtasks, which a click cannot land in, so it hides the race in practice. But it is fragile (the first call still fetches) and it does not fix the ordering.

### 5. Recommendation — **fold into `0228`; no new task.**

- The producer updates `0228`'s brief with this route as its first **shown-reachable** path, and adds part (b) to its scope.
- Keep `0228` on the Backlog at its current rank until private lobbies are opened beyond testers. Then raise it, because this path is the one players would hit.
- **Tradeoff:** a small, rare, self-healing glitch stays live for testers meanwhile. In return, `Main.ts` is not reopened now for a case no real player can reach yet.

---

## Case 2 — `0252`'s Transport listener leak, now also on the private-lobby leave

**Status in the current tree: still present, unchanged.** `0347`/`0348`/`0035` changed the stopper
(`ClientGameRunner.ts:318-328`: `left`, `leaveController.abort()`, `runner.stop()` or `transport.leaveGame()`). None of
them touched Transport's bus listeners.

### 1. Is it real? — Yes. Throwaway test (P2) plus the code.

- Transport registers **24** listeners on `Main`'s long-lived event bus in its constructor (`src/client/Transport.ts:203-262`; `grep -c "this.eventBus.on("` = 24).
- Nothing removes them. `leaveGame()` only stops the ping and kills the socket (`Transport.ts:459-477`, `:737-751`).
- **Probe P2** built a Transport on a fresh `EventBus` and called `leaveGame()`, three times over. That is what the private-lobby leave does before a match exists. Output:
  `{"listenerCounts":[0,24,48,72],"webSocketsOpened":0,"reconnectLogsOnOneEmit":3}`
  → **+24 per join, never removed.** A dead Transport stays **inactive** when an intent later fires: `sendIntent` only logs "attempting reconnect" (`Transport.ts:709-722`), `sendMsg` returns when the socket is null (`:724-730`), and no socket is opened.
- **Correction to the brief's framing.** The listeners are added **per join**, not per leave. Before `0327`, closing the window left the same Transport alive (with a live socket) until the next join stopped it. After `0327`, it is stopped sooner. **`0327` adds no extra leaked listeners.** It only makes this a second shipped route on which the same per-join leak is visible.

### 2. How bad?

- **Players see nothing.** Before a match there is no renderer or canvas, so the heavy half of `0252` (canvas, animation loop, the third same-page game failing) does not apply.
- **Cost per join/close cycle:** 24 small, inactive closures, and one misleading `console.log` per dead Transport each time a later intent fires.
- **Bounded:** the page reloads after a match (`Main.ts:792` comment, and the in-game exits are full page loads — `0252` brief).
- **Other players and the server are unaffected.**
- **Production reach:** the same as case 1 (the private-lobby row is tester-only). The public-lobby card's leave already reaches this in production for everyone (`PublicLobby.ts`), and that is the larger route.

### 3. How likely?

- **Certain on every private-lobby join (+24 each), whatever the close route.** It only adds up if a player joins and closes many times without reloading. 10 cycles = 240 inactive listeners.
- **Telemetry: nothing measures it**, and there is no need to.

### 4. How hard to fix?

- It belongs to `Transport.ts` (**`0252`'s file; not touched here**): keep the handlers and `off()` them in `leaveGame()`. About 30 lines, client-only, low risk, and easy to unit-test (probe P2 is the test shape).
- `0252` has a design gate (close the in-page route, or tear everything down), and this is part of the teardown option.

### 5. Recommendation — **no new task; add a note to `0252`.**

- The producer appends to `0252`: the private-lobby close route is now shipped (`0327`, in the `0.0.155` commit). Before a match it adds +24 inactive listeners per join. That was measured at unit level by `0335` P2, which partly answers `0252`'s step 2 ("has NOT been measured"). The browser measurement is still owed.
- `0252`'s owner-ruled **Medium** rank already assumed this route (`0252` brief, 2026-09-28 ruling), so **no re-rank**.
- **Tradeoff:** the leak stays until `0252` is scheduled. It is inactive and bounded by the page's lifetime.

---

## Case 3 — orphan private lobby when the host closes before `createLobby` answers

**Status in the current tree: still present, unchanged.**

- `0333` fixed the *client* side of the same early close: the public-lobby connection is now dropped at the Create tap.
- It deliberately left the server-side orphan to this task (`0333` worklog:98, plan:134).
- `0353` (open) lists it as out of scope.

### 1. Is it real? — Yes. Throwaway tests, both halves.

- **Client (probe P3a, real `HostLobbyModal` and `o-modal`):** open → ✕ while `create_game` is pending → the create answers → 10 s pass. Output:
  `{"all":["POST /w1/api/create_game/…"],"afterCreateAnswered":[],"joins":0,"leaves":0}`
  → the lobby **is** created on the server. The client then sends **nothing** (no join, no leave, no cancel). The generation check drops the answer (`HostLobbyModal.ts:636-641`).
- **Server (probe P3b, real `GameServer.phase()`, private, zero clients):** output:
  `{"1s":"LOBBY","1min":"LOBBY","10min":"LOBBY","1h":"LOBBY","2h59m":"LOBBY","3h+1s":"FINISHED"}`
  → it lives **3 hours**. An unstarted private game is `Lobby` whatever its client count (`GameServer.ts:1003-1015`). Only `maxGameDuration` ends it (`:60`, `:993-997`). `GameManager.tick` then removes it and `end()` skips archiving (`GameManager.ts:113-145`; `GameServer.ts:877-879`).
- **There is no server call to cancel a lobby.** `create_game`, `start_game` and `PUT game` exist; nothing deletes one (`src/server/Worker.ts:187-300`).

### 2. How bad?

- **Players see nothing.** Nobody holds the id, the host's window is closed, and the host's next Create makes a new lobby.
- **Server cost per orphan:** one idle `GameServer` object in memory (no timers: the AI-lobby interval is public-only, `GameServer.ts:147-151`; the turn interval starts only on start). Plus one cheap `phase()` call per second.
- **Metrics:** each orphan adds 1 to the `geoconflict.server.games.total` gauge for 3 h (`src/server/WorkerMetrics.ts:55-68`).
- **Nothing is lost or corrupted.**
- **This case is a small slice of a larger, existing class.** Every unstarted private lobby that is abandoned lives 3 h:
  - host closes after the join (`0327` Q1, "host leaves cleanly");
  - host reopens Create;
  - host closes the tab;
  - direct calls to `create_game`, which is **not identity-gated** (`Worker.ts:187`; `0302`: "`create_game` is not gated") and is limited only by the 20 requests/s/IP rate limit (`Worker.ts:180-184`).
- **Production reach:** the host window only, so citizens with the row visible. Today that is testers only (see case 1).

### 3. How likely?

- **The window is the create round trip** (`POST create_game` — config is already cached). Same estimate as case 1: tens to a few hundred ms after the window opens.
- The host has to open Create and close it almost at once (for example, a mis-tap). This is rare, and **much rarer than the ordinary abandon routes above**, which leave the same 3 h lobby.
- **Telemetry — partial signals exist today:**
  - The server warn log `game past max duration` (`GameServer.ts:994`) fires once for each lobby that reaches 3 h (plus any match longer than 3 h). It counts **all** abandoned private lobbies, not this path.
  - `geoconflict.server.games.total − geoconflict.server.games.started` = lobbies waiting (public + private).
  - Separating this path would need a new client event ("create answered after close").

### 4. How hard to fix?

- **A client-only fix does not work.** There is no endpoint to cancel with.
  - Aborting the create `fetch` on close would only help if the abort reaches the server before its ~1 ms "requester settled" check (`Worker.ts`, task `0194`). Usually it arrives later.
- **Server fix (recommended shape, if ever done):** in `GameServer.phase()`, end an **unstarted private lobby that has had no connected client for N minutes** (for example 10–15), counted from creation or from the last time a client was seen.
  - It fixes the **whole class**, not just this path.
  - About 10–20 lines in `GameServer.ts` plus tests. Probe P3b is the test shape.
  - Risk: low-medium. The grace time must cover a host who reconnects, or a host whose join is slow.
  - Server-only: one game-server deploy, with no client dependency.
- **Ordering:** `0327` plan §8 required waiting for `0322`. **`0322` is done** (`68303d5`), so that rule no longer applies. No server file is modified in the current tree (`git status`).

### 5. Recommendation — **accept as a known leftover now. Re-raise before private lobbies open beyond testers.**

- Filing a fix for this path alone would treat a symptom. The real issue is that abandoned unstarted private lobbies live 3 h. That only matters at scale, and private lobbies are tester-only today.
- **Tradeoff:** idle lobbies take a little memory for 3 h and inflate `games.total` slightly. A server-side cleanup is postponed until the feature has real traffic.
- **Re-raise if:** the `private_lobbies` flag is turned on for general players; `game past max duration` warns rise noticeably; or someone scripts `create_game`.

---

## Case 4 — `isStarting` stays true after a successful host Start

**Status in the current tree: still present, unchanged in effect.**

- `0334` added four generation checks in `attemptStart` (`HostLobbyModal.ts:903-962`). Each close-during-Start path now also leaves `isStarting` true until the next `open()`.
- `0334`'s plan says this is intended and unchanged (`0334` plan:15, :108).
- The `finally` logic is unchanged (`HostLobbyModal.ts:889-897`).

### 1. Is it real? — Yes. Throwaway tests.

- **Probe P4 (successful Start):**
  `{"afterStart":{"isStarting":true,"modalOpen":false,"btnDisabled":true},"afterReopen":{"isStarting":false,"modalOpen":true,"btnDisabled":false}}`
- **Probe P4b (close while the Start's ad is up):** `{"isStarting":true,"startGameSent":false}`.
- **Why:** `close()` → `reset()` bumps `openGeneration` (`HostLobbyModal.ts:665-668`, `:692`), so `startGame`'s `finally` skips the reset (`:893`). `open()` clears it (`:626`).

### 2. How bad? — Nobody can see it.

- The flag only disables the Start button (`HostLobbyModal.ts:592`), and it matters only while the window is shown.
- The window is shown only by `open()` (the only `modalEl.open()` call, `:659`; the only caller is `HostLobbyOpen.ts:27` via `Main.ts:535-542`), and `open()` resets the flag first.
- No other player, the server and stored data are all unaffected.
- Reachable in production for testers, but not visible to them either.

### 3. How likely? — Every successful Start, and every close during a Start. Always without effect.

No telemetry is needed.

### 4. How hard to fix? — Trivial.

- Add `this.isStarting = false` in `reset()` (`HostLobbyModal.ts:690-704`).
- It is safe: the generation bump already makes any in-flight Start return early, and it can no longer be tapped twice because the window is closed.
- One line plus one test (probe P4 is the test). Client-only, near-zero risk.

### 5. Recommendation — **accept as a known leftover.**

- Optionally, fold the one-liner into whichever task next edits `HostLobbyModal.ts`. `0353` is the obvious one: it edits the same file's poll. That would be the producer adding one line to `0353`'s scope, only if the owner wants it.
- **Tradeoff:** a flag that looks wrong but has no effect stays in the code. Fixing it alone costs a task, a review and a deploy for zero player benefit.

---

## Summary table

| Case | Real? (evidence) | Severity | Likelihood | Fix cost | Recommendation |
|---|---|---|---|---|---|
| 1 — close during join setup (`0228` race) | **Yes** — reasoned from code only | **Low**: invisible join; a joiner can be pulled into a match if idle; heals on next action; nothing lost | **Very rare**: close within ~1 round trip (`/cosmetics.json`) of joining; testers only today | Small–medium: `Main.ts` ~20–30 lines + extracted-module tests; client-only | **Fold into `0228`** (add this path + cancel-pending-join) |
| 2 — Transport listeners (`0252`) | **Yes** — probe P2 (+24/join, inactive) | **Negligible**: inactive closures + console noise; bounded by page reload | **Every** private join; adds up only over many join/close cycles without reload | Small (~30 lines in `Transport.ts`), but it is `0252`'s design gate | **Note on `0252`**; no new task; no re-rank |
| 3 — orphan lobby on early host close | **Yes** — probes P3a (client sends nothing) + P3b (lives 3 h) | **Negligible**: idle server object + `games.total` +1 for 3 h; nobody sees it | **Rare**: close within the create round trip; far rarer than existing abandon routes with the same result | Server-only ~10–20 lines in `GameServer.phase()` (idle-lobby cleanup, covers the whole class); `0322` ordering no longer applies | **Accept as known**; re-raise before opening private lobbies to all players |
| 4 — `isStarting` after Start | **Yes** — probes P4/P4b | **None visible** | Every Start; never visible | Trivial (1 line + 1 test) | **Accept as known** (optionally fold into `0353`) |

## Open questions for the owner

1. **Case 1:** fold into `0228` as its first shown-reachable path? (Rec) / file a separate brief / accept as known.
2. **Case 2:** add a note to `0252`, no new task, rank unchanged? (Rec) / nothing.
3. **Case 3:** accept now and re-raise before private lobbies open to everyone? (Rec) / file a small server brief now for idle private-lobby cleanup (covers all abandoned lobbies).
4. **Case 4:** accept as known? (Rec) / fold the one-liner into `0353`.
5. **Fact to confirm (not a ruling):** is the `private_lobbies` flag still testers-only in the Yandex console? Every likelihood above assumes yes.

## What was written

- This report.
- `ai-agents/tasks/backlog/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/worklog.md`.
- No source, test or wiki change. The probes are kept outside the repo, in the session scratchpad.

**Wiki:** once the owner rules, `fkit-wiki` should ingest this report (`/fkit-wiki-ingest` on this path).
