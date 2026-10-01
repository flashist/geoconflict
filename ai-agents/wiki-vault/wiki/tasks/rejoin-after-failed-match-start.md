# A Refresh After a Failed Match Start Can Rejoin the Match (task 0347)

**Source**: `ai-agents/tasks/done/0347-a-refresh-after-a-failed-match-start-can-rejoin-the-match/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 22 (append rank; owner-ruled **top** of Sprint 7) / task `0347`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `9cb8ee4`; **not in any deploy yet**
> (the latest game tag is `0.0.155`). Local proof only — no production check was filed (the brief says a verify
> task is the owner's call after the deploy).

## Goal

The owner spotted it live (R1, verbatim): *"the reconnect (restore) connection doesn't work anymore after
connecting to a match > having error during connection > refreshing the page"*. Owner ruling R2, *"Rejoin + fix
the timeout (Recommended)"*, was split by the producer into three tasks, worked in order and confirmed by the
owner (Q2, *"Keep 3 tasks"*): **this one** (the rejoin) → [[tasks/worker-start-failure-reporting]] (`0348`) →
[[tasks/worker-reuses-page-map]] (`0035`).

**Root cause (coder's reading, 2026-09-29).** `saveReconnectSession` (localStorage key `reconnect-session`) had
**one** caller in `ClientGameRunner.ts`, reached only after the game worker started. A worker start failure
returned early, so nothing was saved and a refresh had nothing to restore. **Not a regression** from the
2026-09-29 deploy — the restore files were byte-identical to `0.0.154`; the gap dates from commit `026701c`
(2026-03-07). The restore path itself (`/api/game/<id>/active` → `ReconnectModal` → a Rejoin **click**) worked.

## Key Changes

- **`src/client/ClientGameRunner.ts` (`joinLobby`)** — the session is now saved as soon as the server's `start`
  reaches the lobby handler, **before** `createClientGame(…)` builds the worker; multiplayer only
  (`!transport.isLocal && !left`). The runner's own later save is kept ("Re-save on (re)connect").
- The lobby-phase `error` branch clears the session — **only** if this join saved it **and** the stored
  `gameID` + `clientID` are still this join's (review R2: another tab may have written it), and only **after**
  `transport.leaveGame()` / `onGameEnd()` (review R1: a throwing storage call must not skip the teardown).
- **`src/client/ReconnectSession.ts`** — `saveReconnectSession` wraps `localStorage.setItem` in `try/catch`
  (no storage → Rejoin is simply not offered).
- **No event added or changed.** `analytics-event-reference.md` gained a *"Since task `0347`"* note in
  Reconnection Events (see [[systems/analytics]]). No `src/core/`, server or text change.

## Outcome

- **Live checks (Playwright, local dev, worker bundle blocked to force the failure):** baseline refresh-and-rejoin
  **PASS**; failed start → refresh → Rejoin into the same match **PASS** (back in the spawn phase ~5.5 s after the
  failure); a **second** failure keeps the session and nothing retries without a click **PASS**; explicit exit
  clears it **PASS**; singleplayer never writes it **PASS**.
- ⚠️ **Not run / partial:** check C (the same flow on old code shows no prompt) — **NOT RUN live**, static proof
  only; game over — only the elimination case was observed, a match played to its end **NOT RUN**; the
  lobby-phase `error` branch after review — **unit tests only** (no cheap local trigger).
- **Full `npm test`:** first run red on one `supertest` suite (`RouteMetrics`, `socket hang up` — the known flake
  family, untraced shape; `0197` ruled out); **re-ran green**, 181/181 suites. After review: 181/181, 3232 tests.
- **Accepted residuals (owner, 2026-09-30):** **Q1** — a rejoin after the ~20 s spawn phase lands as a
  **spectator** (documented, not widened); **Q2** — a rejoin-after-failed-start match never emits `Game:Start`;
  `Game:End` fires more than once against zero `Game:Start`, and `Match:Duration` / `Match:Spawned` do not fire.
- **Related, not fixed:** `0256` (a server kick leaves a stale `reconnect-session`) — saving earlier widens that
  window; this task was told not to make it worse on its own paths, not to fix it.

## Related

- [[features/reconnection]] — the feature this repairs
- [[tasks/worker-start-failure-reporting]] — task `0348`, second in the reconnect run
- [[tasks/worker-reuses-page-map]] — task `0035`, third in the reconnect run
- [[systems/analytics]] — the Reconnection Events caveats this task documented
- [[systems/client-game-teardown]] — the init-failure path (site B) this task's save now precedes
- [[decisions/sprint-7]] — the board; owner-ruled top of the sprint
