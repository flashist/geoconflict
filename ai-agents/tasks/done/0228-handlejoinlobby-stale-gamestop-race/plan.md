# Plan — 0228 `handleJoinLobby()` stale `gameStop` race

> Planning only. Nothing written. Line numbers are from today's working tree (2026-10-09), which includes the uncommitted `0415` edit in `Main.ts`. Find code by name, not by number.

## 0. What the brief gets wrong today (checked against the code)

- **Line numbers are stale.** Today the guard is at `Main.ts:821-825`, the three awaits are at `:826` (`getServerConfigFromClient`), `:829` (`fetchCosmetics`) and `:851` (`getYandexUniqueId`, inside the `joinLobby(...)` arguments), the `joinGeneration` mint is at `:832`, `handleLeaveLobby` is at `:1075-1082`, `beforeunload` is at `:310-317`, the listeners are at `:341-342` and `onHashUpdate` is at `:604-613`.
- **There are still exactly three awaits in the window.** `handleJoinLobby` is now a wrapper. It runs `beginJoiningLobby()` (`0336`) before `joinLobbyFromEvent`, and it has a long-session-refresh early return (`0404`).
- **The stopper closure is no longer three lines.** `0231` changed it (`ClientGameRunner.ts:317-327`): it now sets `left`, aborts, and calls `runner.stop()` (latched, so it runs once) or `transport.leaveGame()`. Calling a stale stopper twice still looks harmless. `0335` traced `leaveGame()` returning early on a null socket.
- **A worse consequence than the brief's "double call" (reasoned, not observed).** `joinLobby()` is synchronous and connects at once. If two joins both finish their awaits, the second `this.gameStop = …` overwrites the first, so **the first join's stopper is lost**. Its transport is never torn down, and its `onPrestart`/`onJoin` callbacks can still fire later. In the `Prod` config the server kicks an older client that has the same `persistentID` (`GameServer.ts:311-329`). In dev it does not, so the player would appear twice in a lobby. **Untraced past this point.** Phase 1 should observe it.
- **Paths to the window that the code makes plausible (reasoned only):**
  1. **Public lobby card: join, then click again to leave** (`PublicLobby.ts:277-354`, 750 ms debounce). The leave is dropped when the window is longer than 750 ms. **This is not behind the private-lobby flag, so it already reaches every player** — but only on a slow network.
  2. **Private Join window: double-tap Join.** The Join button stays visible and clickable while the lookup is still being checked (`JoinPrivateLobbyModal.ts:174-180`, `joinLobby()` at `:314` has no in-flight guard). That gives two lookups and two `join-lobby` events with different clientIDs. They land in the window when the gap between taps is shorter than the `/cosmetics.json` fetch. **This is two joins — the case the brief asks about.**
  3. **Private Join or Create window: close it during the window.** This is `0335` case 1 (join plus leave).
  4. Public card, then Mission or Tutorial within about two round trips (less likely).
- **`0336` marker:** `beginJoiningLobby()` (`StartScreenPresence.ts`) is a presence **counter** only. It cannot cancel a join. Phase 2 keeps it as it is and adds cancel logic in a separate place, without a second presence marker. That is the reconciliation the brief's Notes ask for.

## 1. Comment fix R6 / R6b (docs only, done whatever phase 1 finds)

`Main.ts:178-185`:
- **R6:** reword the `joinGeneration` comment. It is the join-mint counter; `monitorGeneration` tracks who owns the live monitor.
- **R6b:** replace the stale in-code citation `(Main.ts:707)` with a name, not a number: "the Yandex-id await in `joinLobbyFromEvent`". If phase 2 moves that await, describe it where it ends up.
- No change to fields, guard or behaviour.
- **Leave the uncommitted `0415` hunks in `Main.ts` (`:250-254`, `:375-385`) alone.**

## 2. Phase 1 — try to reproduce it (no source change)

**Setup**
- Run `npm run dev` in the background. First check that ports 9000, 3001 and 3002 are free; if they are busy, stop and report.
- Drive Chromium with Playwright (MCP).
- **Slow-network emulation:** use a standard Chrome DevTools preset over CDP (`Network.emulateNetworkConditions`, "Slow 3G"/"3G" class) on the whole page. If that does not work, delay `/cosmetics.json` alone with `page.route`, and **record which one was used**.
- Every user action is a **real UI click or key press**. A console-dispatched `join-lobby` is a last resort and is labelled artificial.
- **Private lobbies in dev:**
  - Create is unlocked in dev (`PrivateLobbyAccess.isCreateLocked`).
  - If the row is hidden, set the tester marker (`isTesterMarkerSet`, `FlashistFacade.ts:515`) or use a `#join=<code>` link, which opens the Join window whatever the flags say.
  - The host runs in a second browser context.

**Scenarios** (3 tries each; record each try)

| # | Steps | Counts as reproduced if |
|---|---|---|
| S1 | Public card click, wait past 750 ms, click the card again (leave) — slow network on | after the leave, the card is not highlighted but the page keeps an open lobby WebSocket and/or `GET /<worker>/api/game/<id>` still lists our clientID; no `leaving lobby, cancelling game` log |
| S2 | Host creates a private lobby; joiner pastes the code and **double-taps Join** — first with no slowdown, then with it | two `join-lobby` events both get past the awaits (two `joining lobby: gameID` logs from `ClientGameRunner`, no `leaving game` between them); host list shows the joiner twice / two WebSockets; one transport never closed |
| S3 | Same as S2 setup; Join, then **Escape** right after "joined, waiting" (`0335` case 1) | joiner still in the host's player list after the window closed |
| S4 *(only if S1–S3 all fail)* | two `join-lobby` events from the dev console | labelled **artificial**; does not by itself satisfy "real repro" |

**Evidence captured:** console log order, WebSocket open and close (`page.on('websocket')`), the server's lobby player list, and screenshots. In the S2 write-up, say that dev does not kick a duplicate `persistentID` but `Prod` does, so the effect a player sees in production differs and is untraced.

**Then STOP and report** (the brief requires the finding before any fix). The finding goes into `worklog.md`:
- outcome — reproduced / not reproduced / undetermined
- for each scenario: natural or slowed or artificial
- the exact steps

Return to the driver:
- Not reproduced → hand back for cancelling; the task drops off the `0354` gate (2026-10-03 rulings).
- Reproduced → phase 2, after the owner says the repro counts (open question 1).

## 3. Phase 2 — only if phase 1 reproduces it

**Design: the latest join wins, and a leave cancels a join that is still being set up.** No flag that can get stuck, just a counter compare.

- **New module `src/client/LobbyJoinSequence.ts`**, pure with no DOM, in the style of `0333`'s `HostLobbyOpen.ts`. It owns the current stopper plus a join counter:
  - `beginJoin(): JoinTicket` — calls the current stopper if there is one **and sets it to null** (part (a), so it agrees with `handleLeaveLobby`), then bumps the counter and returns a ticket.
  - `ticket.isCurrent(): boolean` — false once a later join or a leave has happened.
  - `ticket.connected(stop)` — stores the stopper (only while current).
  - `leave(): "left" | "cancelled-setup" | "nothing"` — calls and clears the stopper, or bumps the counter to cancel a join that is still being set up (part (b)).
  - `isInLobbyOrJoining()` / `hasStopper()`.
- **`Main.ts`**
  - `joinLobbyFromEvent`: replace the guard with `beginJoin()` (`stopPerformanceMonitor()` stays where it is).
  - Move `const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId()` up **above** the mint (needed: an await inside the arguments cannot be checked before `joinLobby` runs).
  - After the last await: `if (!ticket.isCurrent()) { log; return; }`.
  - Then **the same `const joinGeneration = ++this.joinGeneration;` immediately followed by the synchronous `joinLobby(...)`**. The mint still comes right before the call, ownership is still claimed in `onJoin`, and the `onGameEnd` guard is unchanged (byte-identical `0227` seam apart from the hoisted await).
    ⚠️ The mint now happens after the third await instead of before it. This is deliberate and stated for the reviewer.
  - `this.gameStop` becomes a read through the sequence, or stays a field kept in sync. The choice that is simplest and keeps the many `gameStop !== null` readers unchanged is taken at build time and named in the worklog.
  - `handleLeaveLobby`: on `"cancelled-setup"`, return without the start-screen reset. `onPrestart` never ran, and `endJoining()` wakes the start-screen waiters.
  - `onHashUpdate` and `HostLobbyOpen`'s `isInLobby`: use "in lobby **or join being set up**", so their leave also cancels a join in setup. The `HostLobbyOpen.ts:24-25` comment that names 0228's window is updated.
- **Readers checked, left as they are:**
  - `beforeunload`: with the stopper null after a join-over there is no stale call; `logActiveMatchAbandon` was already a no-op there.
  - `citizenshipRestartOffer.isAwayFromStartScreen` and the login-restart `matchActive` now read "not away" during a join-over setup window — the same as a fresh join already does today.
  - Presence uses the `0336` counter, unchanged.
- **Closes or narrows?** It closes the **`Main`-level** window: the check sits synchronously right before `joinLobby()`, with no await between them. **It does not touch** a modal's own lookup window (S2's two lookups still both dispatch; the second simply wins), or any race inside `ClientGameRunner` after `joinLobby()`. The write-up states that scope.
- **Tests:** `tests/client/LobbyJoinSequence.test.ts`, run against the real ordering module that `Main` delegates to. Not a "null was added" test. Cases:
  - join, then leave before connect → the join is dropped and the stopper is never stored
  - two joins in setup → only the second connects; the first is never connected
  - join-over after connect → the old stopper is called once and cleared
  - leave after connect → called once; a second leave does nothing
  - leave, then a new join → the new ticket is current
  - a stale ticket's `connected()` is ignored
- **Proof the fix works:** re-run the phase 1 scenarios that reproduced, labelled natural, slowed or artificial exactly as before. Also check by hand: normal public join, leave, join-over (public → Mission), private Join/Create/close, reconnect banner rejoin.
- **Gates:**
  - `npm test` green — through the npm script, which takes the project lock; about 5 min at 1 worker.
  - `npm run lint` clean.
  - The worklog says plainly that the suite does not cover the live race.
  - If a supertest flake shows up, rule out `0197` first, then re-run and say so.

## 4. Rules

- **No analytics event added, renamed or removed** (none planned; recorded explicitly).
- No change to `0225`'s monitor path. `0227`'s seam is untouched apart from the hoisted await noted above.
- Not a monitor leak, nothing to do with `0224`.
- No secrets.
- No commits.
- No task-file moves.

## 5. Files

- **Phase 1:** `ai-agents/tasks/backlog/0228-…/worklog.md` only.
- **R6:** the `Main.ts` comment.
- **Phase 2:** `src/client/Main.ts`, `src/client/LobbyJoinSequence.ts` (new), `src/client/HostLobbyOpen.ts` (comment), `tests/client/LobbyJoinSequence.test.ts` (new); `tests/client/HostLobbyOpen.test.ts` only if its contract text changes.

## 6. Risks

- **Dev server cannot start** (port in use) → phase 1 is BLOCKED. Report it; do not change the webpack port.
- **Only S4 reproduces** → owner call; it is not proof on its own.
- **Moving the Yandex-id await** changes where the mint sits relative to that await → the reviewer should check this against `0227`'s R4 reasoning.
- **Latest-wins changes what happens on a double-tap of Join** (the second tap's join is the one kept, the first is dropped). The player sees no difference.
