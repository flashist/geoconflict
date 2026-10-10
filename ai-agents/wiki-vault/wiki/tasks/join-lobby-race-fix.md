# `handleJoinLobby()` Stale `gameStop` Race — Reproduced and Fixed (task 0228)

**Source**: `ai-agents/tasks/done/0228-handlejoinlobby-stale-gamestop-race/brief.md` (`worklog.md`, `plan.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 28 (ADR-035 append rank; moved in from the Backlog board 2026-10-09) / task `0228`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner ruling *"Close it (Recommended)"*
> (live `AskUserQuestion`, relayed by `fkit-lead`). **Reproduced 9/9 with real clicks on a slowed network, and fixed in
> code.** Code committed in `bcc9bf0` ("Sprint push", 2026-10-10); `git tag --contains bcc9bf0` → **no tag**, so
> **committed, NOT deployed** (checked 2026-10-10). Live check: `0433` (owner-run, Backlog on Sprint 8).

## Goal

Find out whether the window inside `handleJoinLobby()` (three awaits before the new game's stopper is stored, with the
old `gameStop` called but never cleared) can really be hit, and fix it **only if reproduced** (owner rulings 2026-10-03:
*"Only if it's proven"*, *"No, needs a real repro"*). It was found as "F4" during `0225`'s audit
([[tasks/orphaned-performance-monitors-lobby-rejoin]]), recorded in `0227`'s notes ([[tasks/crashed-game-teardown-seam]]),
and gained its first user-reachable path from `0335` case 1 ([[tasks/lobby-close-leftovers-investigation]]). It is
**item 3 of the private-lobby release gate** ([[tasks/private-lobby-tester-default]]).

⛔ Not a monitor leak — the monitor half was fixed by `0225`. No relation to `0224`'s analytics volume.

## Key Changes

**Phase 1 — reproduction (worklog §2).** Headless Chromium driven by the repo's `playwright`, every action a real click
or key press, Chrome's "Slow 3G" emulation switched on only on the acting player's page. The deciding finding:
`/cosmetics.json` is served with a 5-minute browser cache lifetime (`src/server/Master.ts`), so the window is wide only
for a player who has sat **more than 5 minutes** on the start screen (the next join re-checks it over the network). The
counted runs idled 310 s first.

| Path | Result (3 tries each) | What happened |
|---|---|---|
| S1 — public card join, then leave | **3/3** | the leave click was silently dropped; the player who pressed "leave" was put into the match |
| S2 — private Join, human double-tap (150 ms) | **3/3** | two joins both reached `joinLobby()`; the joiner listed **twice** in the host's window |
| S3 — private Join, then Escape | **3/3** | window closed, leave dropped, joiner still listed — `0335` case 1, now observed |

Owner ruling during the run: the slowed-network repro **counts** as a real repro (*"Yes, it counts"*). S1 is not behind
the private-lobby switch, so it reaches every player.

**Phase 2 — the fix.**
- New `src/client/LobbyJoinSequence.ts` — a small pure module that owns join order: the latest join wins, and a leave
  cancels a join that is still being set up. `beginJoin()` returns a ticket (`isCurrent()`, `connected(stop)`,
  `abandon()`); `runJoin(...)` wraps the setup in `try/finally abandon()` so a throw cannot leave a join "being set up"
  forever (review R1).
- `src/client/Main.ts` — `gameStop` is now a read-only getter over the sequence; the three setup awaits moved into one
  helper; an `isCurrent()` check sits right before the synchronous `joinLobby(...)`. **`0227`'s generation mint stays
  immediately before `joinLobby(...)`** and the `onGameEnd` guard is unchanged.
- `src/client/HostLobbyOpen.ts` — comments only. Comment residuals R6 / R6b carried from `0227` fixed.
- Tests: new `tests/client/LobbyJoinSequence.test.ts`; `tests/client/HostLobbyOpen.test.ts`'s harness now drives the real
  module (review R2, R3). **No analytics event added, renamed or removed.**

**Scope:** closes the `Main`-level window. Does **not** touch the Join window's own lookup window, nor anything inside
`ClientGameRunner` after `joinLobby()`.

## Outcome

- After-fix browser re-run: **9/9 clean** (same method). Manual checks — normal join/leave, join-over, private
  create + join + close, reconnect rejoin — all OK.
- Review: stateful, 3 rounds; R1–R3 (all low) fixed on owner rulings (*"Fix both now"*, *"Fix the test now"*). Last full
  `npm test`: 222 suites, 4529 passed, 1 skipped (the Docker harness, Docker down — skipped, not passed; run alone later
  with Docker up: passed). Lint and `tsc` clean.
- ⚠️ **NOT proven:** (1) the browser proof **predates the R1 fix** (same logic, unit-tested only; owner chose no browser
  re-run); (2) no real phone, no Yandex iframe, no Tutorial or Solo start; (3) production's duplicate-`persistentID`
  kick is untraced (moot on the fixed path, which sends one join). How often real players hit it is **not measured**.
- 🚦 **Gate item 3** is now: code done — waits on **deploy** and the owner-run live check **`0433`**; `0428` (the
  everyone-flag) waits for `0433`.
- Side finding filed: **`0432`** (Backlog board, low) — a stopped `Transport` keeps its `EventBus` listeners and can
  leave a CONNECTING socket open after a join-over. Pre-existing; reasoned from code, not re-run on an old build.

## Related

- [[systems/client-game-teardown]] — the teardown family this closes the last join-race item of
- [[tasks/orphaned-performance-monitors-lobby-rejoin]] — task `0225`, where it was found (monitor half fixed there)
- [[tasks/crashed-game-teardown-seam]] — task `0227`, the generation-guarded seam this had to keep intact
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, whose case 1 is S3
- [[tasks/private-lobby-tester-default]] — task `0354`, release gate item 3
- [[tasks/private-lobby-citizen-perk]] — the feature the gate guards
- [[tasks/host-window-poll-before-lobby]] — task `0353`, the other host-window join-setup fix
- [[decisions/sprint-8]] — the board (rank 28); `0433` at 34
- [[decisions/sprint-backlog]] — side finding `0432`
- [[systems/weekend-deploy-window]] — committed `bcc9bf0`, waiting for a game deploy
- [[tasks/private-lobby-production-test]] — task `0376`, the gate item checked live the same day (no `0228` glitch seen)
