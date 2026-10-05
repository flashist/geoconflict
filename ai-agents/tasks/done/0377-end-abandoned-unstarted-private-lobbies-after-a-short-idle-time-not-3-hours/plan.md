# Plan — 0377: end abandoned, unstarted private lobbies after a short idle time

**Summary**
- Server-only, about 15 lines in `src/server/GameServer.ts`, plus one new test file. No client change, no `src/core/` change.
- Rule: a private lobby that has **not started** and has had **no connected player for N minutes** is ended. Public lobbies and started games keep their exact current behaviour.
- Two owner questions must be answered before the build: the grace time N, and when the clock starts counting (see openQuestions).
- Planning only. No files were written.

## What the code does today (checked in the current tree)
- `GameServer.phase()`: for any non-public game that has not started, it always returns `Lobby`. Only the 3 h `maxGameDuration` check ends it. `GameManager.tick()` calls `phase()` once a second, and on `Finished` it calls `end()` and drops the game. `end()` skips archiving for an unstarted game ("game not started, not archiving game").
- "Connected" means being in `activeClients`. A player is removed from it when their socket closes, or in `phase()` after 60 s without a ping. Clients ping every 5 s from the moment they connect (`Transport.startPing`), so a host who is waiting in the lobby stays connected.
- No existing test checks `phase()` on a private game. Only `tests/server/PublicLobbyWindow.test.ts` (public) calls `phase()`.

## Changes — `src/server/GameServer.ts`
1. A new constant next to `maxGameDuration`: `privateLobbyIdleTimeout = N * 60 * 1000` (N is the owner's answer to Q1). A field, same style as `maxGameDuration`. No config or env plumbing.
2. A new field `lastClientSeenAt: number`, starting at `createdAt` (so the never-joined early-close case is counted from creation).
3. Update `lastClientSeenAt = Date.now()` in three places:
   - in `addClient`, at the point where the client is accepted (after the kicked-client early return, so a refused or kicked client does not count);
   - in the socket `close` handler, so the clock starts from the moment a player actually left, not from the last tick;
   - in `phase()`, after the stale-ping cleanup, whenever `activeClients` is not empty.
   (This follows Q2's recommendation. If the owner picks "from creation", items 2–3 shrink to: compare against `createdAt`, and only when nobody is connected.)
4. In `phase()`, inside the existing `gameType !== Public` branch, in the `!this._hasStarted` arm, before `return GamePhase.Lobby`: if `activeClients` is empty and `now - lastClientSeenAt > privateLobbyIdleTimeout`, log and return `GamePhase.Finished`. The 3 h check stays first and unchanged. The public branch and the started-private branch are untouched.
5. Log line (observability, brief item 5): `this.log.info("private lobby ended, no client connected", { gameID, idleMs, anyClientJoined: this.allClients.size > 0 })`. No player ids and no creator id. `anyClientJoined: false` picks out the "closed before the create answered" path from the "host joined, then left" path at no extra cost. Level `info`, because this is expected cleanup, not a fault (the 3 h line stays `warn`).

## What a late joiner sees (brief item 4) — no change
Once the lobby is ended, `GET /api/game/:id/exists` returns `false`. `JoinPrivateLobbyModal` then looks the game up in the archive. An unstarted lobby is never archived, so this is the same path as any missing lobby or a lobby that expired after 3 h today: "Lobby not found…" if the archive lookup returns 404, or the generic error otherwise. Client code is unchanged. ⚠️ The archive API's actual response for an unknown id was **not** checked live. It is the same path either way.

What the host sees if they come back to an ended lobby: the window's player poll gets a 404 and shows an empty list, and Start gets a 404, which shows the existing generic "couldn't start" message (0302 R3). Note: today a host whose socket timed out (closed with code 1000, which does not reconnect) already cannot start that lobby, because the start check needs the creator to be connected. So the lobby was already unusable for them.

## Tests — new file `tests/server/PrivateLobbyIdleEnd.test.ts`
Harness: copy `GameServerReconnect.test.ts` (MockWebSocket, `fakeConfig`, `jose` mock, real `GameServer`, explicit `createdAt`). Time is controlled with `jest.useFakeTimers()` + `setSystemTime`. Connected clients are kept alive with `ping` messages on the mock socket. Each test asserts the phase at the relevant moments:
1. **P3b shape:** private, zero clients ever. At creation + N − 1 s → `Lobby`. At creation + N + 1 s → `Finished`. The new log line is emitted with `anyClientJoined: false`. The "past max duration" warning is not emitted.
2. **A connected client keeps it:** one client joins and keeps pinging. At creation + 2N → `Lobby`.
3. **Counted from when the last player left:** a client joins and then closes its socket at +5 min. At leave + N − 1 s → `Lobby`. At leave + N + 1 s → `Finished`, with `anyClientJoined: true`. (Under the "from creation" option this test changes accordingly.)
4. **Leave and come back inside the grace time:** a client leaves, rejoins (new socket, `addClient`) before N, then leaves again. The lobby is still `Lobby` past the first deadline, and is only ended N after the second leave.
5. **Public lobby not affected:** a public game, no clients, config with a long `gameCreationRate`. At creation + N + 1 s it is still `Lobby` under the existing rule, and the new log line is never emitted.
6. **Started game not affected:** private, a client joins, the game is started, the client keeps pinging. At creation + 2N → `Active`. When the client leaves, it ends through the existing "private game complete" path, and the new log line is never emitted.
7. **Ping timeout counts as leaving:** a client stops pinging. It is dropped about 60 s later by the existing cleanup, and the lobby ends N after that drop.

## Edge cases considered
- **`start_game` race:** the citizen check needs the creator to be connected. While they are connected the idle clock keeps being reset, so a lobby cannot be ended during that check's wait (a few seconds, against a grace time of minutes). With the dev bypass (no creator needed), `start()` runs synchronously right after `gm.game()` found the lobby, so there is no gap.
- **Server games of type `Singleplayer`:** these exist only via a direct `create_game` call (real single-player runs locally). They already share the private branch, so they get the same rule. Assumed fine; flagging it.
- **One-second resolution:** `phase()` ticks once a second, so the end can come up to about 1 s after N. That does not matter.
- **Gauge:** `geoconflict.server.games.total` drops when the lobby ends. That is the intended effect.

## Verification
- `npm test -- tests/server/PrivateLobbyIdleEnd.test.ts`, then full `npm test` (includes the shell harnesses; watch for the known supertest flake), `npm run lint`, `npx tsc --noEmit`.
- `git diff` should touch only `src/server/GameServer.ts` and the new test.
- Brief step 5 (a live check after the weekend deploy) needs a deploy plus a check, so under the build/verify rule this task closes at build. The producer should file a separate verify task: "an abandoned test lobby is gone after N min, and the new log line appears". I will not file it myself.

## Out of scope
Client changes (`0353`, `0374`), a cancel-lobby endpoint, and the join race (`0228`).

---

## Owner rulings at approval (2026-10-04, live via `AskUserQuestion` in the `fkit lead` session, `fkit-sprint-ship-loop`)

- **Plan: APPROVED** — the plan above, with these answers.
- **Q1 (grace time N):** **30 minutes** — the owner's own value, typed as "Other" (not one of the offered 5 / 10 / 15). So `privateLobbyIdleTimeout = 30 * 60 * 1000`, and every "N" in the plan and its tests means 30 minutes.
- **Q2 (when the clock starts):** **A — from when the last person left** (or from creation if nobody ever joined). The plan's `lastClientSeenAt` design stands as written.
- Context the owner was given before answering: the rule applies only to lobbies with nobody connected; a lobby with anyone inside keeps today's 3-hour limit; started games and public lobbies are unaffected.
