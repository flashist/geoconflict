# Private Lobbies — A Wrong Code Shows "Lobby Not Found" (task 0454)

**Source**: `ai-agents/tasks/done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 48 (ADR-035 append rank; on merit directly below `0451`) / task `0454`

> ✅ **2026-10-26 sync (`4e9160a`) — the live check `0461` is CLOSED** (agent-closed — not owner-verified). Agent-run in
> the owner's Chrome 2026-10-20, game `0.0.165`, made-up codes only: inside Yandex the Russian message reads *«Лобби не
> найдено…»* (not the generic error); on the game's own site the English *"Lobby not found…"*; the network showed only
> the lobby-exists check — **no** archive request and **no** `/commit.txt`. The optional real-lobby join was not run.

> 🚀 **2026-10-16 sync, third run (`29811f0`) — DEPLOYED:** `2d2ab4a` (client, `JoinPrivateLobbyModal.ts`) is in game prod **`0.0.165`** (2026-10-16
> ~12:17Z, mid-week), checked by me with `git tag --contains`. The "NOT deployed / production still shows the generic
> error" line below is history as of that deploy. ⚠️ **Not checked live** — live check `0461` is still `🔲 Backlog` on the
> Backlog board ([[decisions/sprint-backlog]]).

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-14. Code committed in `2d2ab4a` (2026-10-14);
> `git tag --contains` → **none** ⇒ **committed, NOT deployed** — production still shows the generic error for a wrong
> code. Live check: **`0461`** (Backlog board; goes to the top of Sprint 9 under the standing build/verify-split rule).
> Same act: backlog task **`0292` cancelled as absorbed** — see [[decisions/cancelled-tasks]].

## Goal

Owner ruling 2026-10-13, *"Separate small task (Recommended)"*: in production a player who types a lobby code that does
not exist (typo, stale link, finished game) saw the generic `private_lobby.error` — *"An error occurred…"* — instead of
`private_lobby.not_found`. **This pre-dated `0451`.**

**Why (found by `0451`'s review R1):** after our worker's `/exists` says `exists: false`, `checkArchivedGame()` fetched
`${getApiBase()}/game/<code>` — the old match-archive read. Archiving is off everywhere (`archiveEnabled()` is a hard
`false`, [[decisions/adr-104-archiving-disabled]]), so nothing serves that path; in production the request lands on the
Master's page catch-all, which answers **200 with the site's HTML**. Only a 404 counted as not-found, so `.json()`
threw on the HTML and the `catch` showed the generic error. Locally the same symptom came from a refused connection.

🔴 **This refutes an older vault claim** that the ungated client archive read was *"benign — the 404 is handled as
not-found"* ([[tasks/archive-endpoint-failures]], [[decisions/adr-104-archiving-disabled]],
[[systems/match-logging]]). Production never answered 404 there. Dated corrections added on those pages.

## Key Changes

- **`src/client/JoinPrivateLobbyModal.ts` only:** `joinLobby()` reads the server config once and, **while
  `archiveEnabled()` is false, skips the archive lookup entirely** (no `/game/<code>` and no `/commit.txt` request) and
  shows the result straight from the worker's answer. One new helper, `showJoinFailed(notFound)`, sets the message and
  fires the matching `PrivateLobby:JoinFailed:{NotFound|Error}` together, so **the screen and the event always agree**.
- **The existing switch is reused, never a second flag;** its value stays `false` (flipping it is `0030`'s job). No new
  text — `private_lobby.not_found` already existed in both languages.
- **Real failures stay errors:** `/exists` rejecting, non-OK or not JSON → `private_lobby.error` + `JoinFailed:Error`.
- **Chosen for `0030` to inherit:** once archiving is on again, an archive answer that is not a real archive answer,
  after the worker said `exists: false`, shows "not found" and counts `NotFound`.
- Left alone: the bad-format path (already `not_found`), the live-join path, the close-while-in-flight guards
  (`0327`), the joining mark (`0336`/`0374`).
- `analytics-event-reference.md` §4 (owner decision *"Fix the stale sentences"*): `JoinFailed:NotFound` now says the
  player sees the matching line; the residual says there is no archive step while archiving is off.

## Outcome

- Tests use realistic mocks (production's 200-HTML archive answer, not a 404). **Negative control:** the new tests run
  against the old modal → 6 failures. Targeted Join suites 64/64; `tsc` and eslint clean; `git diff resources/lang/`
  empty; `archiveEnabled` still has one definition and one interface line.
- Full `npm test`: 226/227 suites — one `socket hang up` in `SessionRoutes.test.ts` (a supertest suite this task does not
  touch; the "seen, never traced" flake shape, no `SIGSEGV`) — likely the known flake, not proven; that suite re-run
  alone 124/124.
- **Local browser check:** a made-up valid code shows the not-found line in Russian and English, with only the
  `/exists` request in the network log; a live code from a second tab joins.
- Review R1 (doc clause still describing production's HTML answer as current) and R2 (a close-guard test that could
  pass for the wrong reason) — both low, both fixed.
- **Not checked live:** production — `0461`.

## Related

- [[tasks/private-lobby-funnel-events]] — task `0451`, whose review found the cause and whose event this screen now matches
- [[tasks/archive-endpoint-failures]] — task that gated the archive writes; its "benign read" claim corrected
- [[decisions/adr-104-archiving-disabled]] — the one switch; this task completes its client-read leg
- [[decisions/adr-118-archive-read-through-game-server]] — the future read path `0030` must build
- [[systems/match-logging]] — its "archive read is still live" claim is now history
- [[decisions/cancelled-tasks]] — `0292`, absorbed by this task
- [[decisions/sprint-8]] — the board (rank 48)
- [[decisions/sprint-backlog]] — verify task `0461`; `0030` (archiving, postponed)
- [[systems/weekend-deploy-window]] — the 2026-10-16 mid-week deploy that shipped it
