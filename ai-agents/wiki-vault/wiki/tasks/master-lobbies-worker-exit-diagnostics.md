# Master Lobbies Body & Worker-Exit Diagnostics

**Source**: `ai-agents/tasks/done/0055-master-parseable-lobbies-body-and-worker-exit-diagnostics/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0055 / 2026-08-22 outage track (the unblocked half)

## Goal

Ship the half of the 2026-08-22 public-lobbies outage fix that needs no owner decision. During that outage, `/api/public_lobbies` served `200` with an empty body for ~3.5 hours, and the one log line that could have said why worker 16 died discarded its evidence. This task fixes defects **#5** and **#6** from the incident record; the real repair — restoring worker crash recovery and a survivable scheduling gate — is task `0056` (deliberately separate, gated on owner-ruled quorum/restart-cap decisions and on `0057`'s routing findings). Outage-track order: `0055` → `0057` → `0056`.

## Key Changes

Scope: `src/server/Master.ts` only, `+28/−8`. No control-flow changes; worker restarts deliberately **not** armed (that is `0056`'s job, and it must ship with a restart cap or it trades a silent outage for a fork loop).

- `publicLobbiesJsonStr` initialised to a serialised valid empty payload instead of `""`, mirroring the shape the lobby-fetch interval actually assigns — so a client hitting the endpoint before the interval installs parses an ordinary empty list instead of throwing in `response.json()` (`src/client/PublicLobby.ts`).
- The exit handler's `if (!workerId)` failure branch now logs `code`, `signal`, `worker.id`, and `worker.process.pid` at `error` level before returning, keeping the original "could not find id" text so incident-era log greps still match. Partly superseded when `0056` replaces the branch — accepted on purpose to buy diagnosability for the gap; `0056`'s brief carries the instruction to preserve these fields.
- New `tests/server/Master.test.ts` — the **first-ever test coverage of `Master.ts`** (3/3 passing, prove-red confirmed; full suite 89 suites / 701 tests green).

## Outcome

Review closed (`review.md` `Status: closed-out`; round 1 — 2 low defects fixed, 2 frontier-moves accepted as residuals by owner ruling). ⚠️ **Committed 2026-08-22 on the unpushed branch `fix/0055-master-parseable-lobbies-and-exit-diagnostics` (`419a116`) — not pushed, not deployed** at close time; verified locally and by review only. ⚠️ Codex review coverage was **partial**: findings on the test file only, no opinion on `Master.ts` itself. Until `0056` lands, production still runs with crash recovery disarmed — a repeat worker death would again stall the scheduling gate, but it would now log its cause and serve a parseable empty lobby list.

## Related

- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the outage investigation this task's two defects come from
- [[systems/networking]] — `Master.ts` worker coordination and the `/api/public_lobbies` surface
- [[decisions/sprint-4]] — the sprint board carrying the outage track (`0055`/`0056`/`0057`)
- [[decisions/sprint-backlog]] — the outage follow-ups that stayed unsprinted (`0058`, `0059`)
