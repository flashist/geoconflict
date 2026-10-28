# Private Lobbies — Analytics Events for a Full Usage Funnel (task 0451)

**Source**: `ai-agents/tasks/done/0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 45 (ADR-035 append rank; on merit directly above `0426`) / task `0451`

> ✅ **2026-10-28 sync (`7a2ef92`) — the arrival check is DONE.** `0455` closed 2026-10-28
> ([[tasks/private-lobby-gameanalytics-funnel]]): **11 of 16** `PrivateLobby:*` events seen over 17–19 Oct; the 5 unseen
> are all failure/fallback paths (zero is plausible, not proof). Two funnels ("Private lobby: host" / "Private lobby:
> guest") and a "Private lobbies" dashboard saved in GameAnalytics; the owner has seen them. The "Not checked" notes below
> are history.

> 🚀 **2026-10-16 sync, third run (`29811f0`) — DEPLOYED:** `daa1bcc` is in game prod **`0.0.165`** (2026-10-16 ~12:17Z, mid-week), checked by me with
> `git tag --contains`; the client events ship with the game image. The "NOT deployed" line below is history.
> **Not checked:** that any `PrivateLobby:*` event has arrived in GameAnalytics — that is `0455`, now
> [[decisions/sprint-9]] rank 8, which needs several full days of data first (owner ruling).

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-14. Code committed in `daa1bcc` (2026-10-14);
> `git tag --contains` → **none** ⇒ **committed, NOT deployed** — no `PrivateLobby:*` event has reached GameAnalytics.
> The funnel itself is built in GameAnalytics, and the events confirmed arriving, by task **`0455`** (Sprint 8, rank
> 49, time-gated on this task's deploy; owner's Chrome, owner logged in).

## Goal

Owner, 2026-10-13, typed live: *"private_lobbies_all - this is on for everybody. Brief a task for the current sprint ot
add missing events."* With private lobbies visible to every player since `0428`
([[tasks/private-lobbies-everyone-flag-flip]]), the owner wants the step-by-step usage in GameAnalytics. Before this
task only the Private tab tap (`UI:Tap:PrivateTab`, [[tasks/start-screen-private-tab]]), the locked-button tap
(`LockedFeature:Tap:PrivateLobby`, [[tasks/private-lobby-citizen-perk]]), the citizenship popup, the win-condition
events and the cohort marker existed. Creating, copying the invite, joining, Start, and a private match starting or
ending sent nothing — and `Game:Mode:Multiplayer` fires for public and private matches alike.

## Key Changes

**16 new events** (owner decision at the plan gate: *"Add both failure events"*), all through `src/client/PrivateLobbyAnalytics.ts`,
which maps fixed buckets to enum keys in `flashistConstants.analyticEvents` — no name is ever built from a string:

| Funnel step | Events |
|---|---|
| Create | `PrivateLobby:Created`, `PrivateLobby:CreateFailed` |
| Invite copied | `PrivateLobby:InviteCopied:{Link\|Code}`, `PrivateLobby:InviteCopyFailed` |
| Friend joined | `PrivateLobby:Joined:{Link\|Code}`, `PrivateLobby:JoinFailed:{NotFound\|Error}` |
| Host Start | `PrivateLobby:Start:Tapped`, `PrivateLobby:Start:Failed` (value = HTTP status) |
| Match started | `PrivateLobby:MatchStarted:{Host\|Guest}` — fired **after** an unchanged `Game:Mode:Multiplayer` |
| Match ended | `PrivateLobby:MatchEnded` (value = match seconds) |
| Gave up waiting | `PrivateLobby:Left:{Host\|Guest}` |

- Hooks: `HostLobbyModal.ts` (create, copy, Start, close), `JoinPrivateLobbyModal.ts` (join by link vs typed code,
  failures, close), `MatchStartAnalytics.ts` (private start and end; reconnects and replays already skipped),
  `ClientGameRunner.ts` passes the client id. **Host vs guest:** the host window remembers the last-created client id.
- **Counted once, for the right person:** copy events latch once per window opening (a failed copy has its own latch,
  so a failed-then-successful copy counts both); a double-tapped Start counts once; the host is never a guest.
- **Privacy:** no lobby code, link, game id, client id or name in any name or value — tests check it.
- **Budget:** 16 new distinct names; at most about 7 events per host lobby cycle and about 3 per guest; nothing on a
  timer or per tick (the host window's 1 s player poll sends none).
- Documented in `ai-agents/knowledge-base/analytics-event-reference.md` § *Private Lobby Events* — rows, a funnel note,
  a gating note, accepted residuals. Summary in [[systems/analytics]].

## Outcome

- **Review R1 — where `JoinFailed:NotFound` is decided:** production's archive lookup answers **200 with the site's
  HTML page**, not 404 (checked by the reviewer with one read-only request, 2026-10-13), so every wrong code would have
  counted `Error`. Fixed: `NotFound` is decided by our own worker's `/exists` answering `exists: false`. R2: a non-OK
  `/exists` reply now counts `Error`, not `NotFound`. R3: doc rows reworded. **The player-facing side** (a wrong code
  showed the generic error) was kept out of this task by owner ruling and became `0454` —
  [[tasks/private-lobby-wrong-code-not-found]].
- **Local walk-through** (Playwright, three browser contexts): the full funnel fired in order with no duplicates and no
  host-as-guest event, including a lowercase dashed code. **Not walked live:** the win-modal finish path, the Yandex
  portal-link copy and invite-payload join, `CreateFailed`, `Start:Failed` — unit-tested only.
- Tests: new `HostLobbyAnalytics`, `JoinPrivateLobbyAnalytics`, `PrivateLobbyAnalyticsNames` suites (the names test
  pins the mock helper to the real registry). Full `npm test` after the review round: one `Exceeded timeout of 5000 ms`
  in `SessionRoutes.test.ts` — the known supertest flake shape, no `SIGSEGV`; that suite re-run alone green. The build
  round's red run came from a stray gitignored probe file of task `0353`, since gone.
- **Accepted residuals** (reference doc): a standalone `#join=` refresh rejoins and counts again; `Joined:*` means join
  sent, not confirmed; a hash-change leave, a kick and a tab close send no `Left`; `InviteCopied` means "copied at least
  once"; `Joined:Link` can come from players whose private row is hidden.
- Found while planning: the host copy button can copy the **previous** lobby's code while a new lobby is being created
  — filed as `0457` (Backlog board).
- 🔗 This task joins `0426`'s wait set (the news entry waits on every Sprint 8 build task in the final deploy); these
  events are invisible to players.

## Related

- [[systems/analytics]] — the analytics system; *Private Lobby Events* summary
- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428`, why the funnel matters now
- [[tasks/private-lobby-wrong-code-not-found]] — task `0454`, the player-facing fix this task's review R1 surfaced
- [[tasks/start-screen-private-tab]] — task `0412`, `UI:Tap:PrivateTab`, the funnel's first step
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the locked Create button and its event
- [[tasks/gameanalytics-event-limit-recurring-spikes]] — task `0456`, which budgeted these events against the 500-per-user limit
- [[decisions/sprint-8]] — the board (rank 45; `0455` at rank 49)
- [[decisions/sprint-backlog]] — `0457` (copy button copies the previous lobby's code)
- [[decisions/sprint-9]] — where the GameAnalytics funnel task `0455` moved (rank 8)
- [[systems/weekend-deploy-window]] — the 2026-10-16 mid-week deploy that shipped it
