# Sprint 9 *(no theme name yet)*

**Date**: 2026-10-16
**Status**: proposed *(page-type field, kept while the sprint is open; the board is **`🔲 Backlog — 2026-10-16`** — created, NOT started)*

> Source: `ai-agents/sprints/plan-sprint-9.md` (and its row in `ai-agents/sprints/plan-index.md`).

## Context

On 2026-10-16 `0426`'s live check, **`0469`**, was filed on the Backlog board because no Sprint 9 board existed. The
owner's standing build/verify-split rule (2026-09-29) puts a verify task at the top of the **next** sprint. Asked where
it should go — noting that the check itself runs on Saturday 2026-10-17, inside Sprint 8 — the owner answered in free
text, verbatim: ***"Create Sprint 9 board and move the task there"*** (relayed by `fkit-lead` to a spawned
`fkit-producer`; ⛔ not producer precedent).

## Decision

- The Sprint 9 board was created, **not started** (line-3 banner `🔲 Backlog — 2026-10-16`).
  [[decisions/sprint-8]] stays the only `🔄 In progress` sprint.
- **1 row, 1 open:** `0469` — *Verify `0426` live: the 2026-10-17 news entries show in Yandex (Russian) after the
  weekend game prod deploy* — `🔲 Backlog`, rank 1. Moved in from [[decisions/sprint-backlog]] (that row is kept as
  `➡️ Moved`). Owner executes inside Yandex Games, a producer records; includes a check that the release tag contains the
  `0426` commit. See [[tasks/news-catch-up-2026-10-17]].
- ⚠️ **No theme name, no goal, no scope** — all the owner's to set; the producer invented none.

## Consequences

- ⚠️ **Timing oddity, stated by the board, not resolved:** `0469` runs on deploy day while Sprint 8 is still active.
  The owner chose this knowing it; doing it before Sprint 9 starts is not drift.
- Other verify tasks already flagged "top of Sprint 9" — `0460`, `0461`, `0463` — are **still on the Backlog board**;
  the owner's ruling moved only `0469`. Whether they follow is not recorded.

## Related

- [[decisions/sprint-8]] — the active sprint, whose final deploy `0469` checks
- [[decisions/sprint-backlog]] — where `0469` was filed, and where `0460`/`0461`/`0463` still wait
- [[tasks/news-catch-up-2026-10-17]] — task `0426`, the build `0469` verifies
- [[decisions/product-strategy]] — `plan-index.md`, which lists this board
- [[decisions/adr-108-active-sprint-pointer]] — the active-sprint rule; this board is not active
- [[systems/weekend-deploy-window]] — the 2026-10-17 game prod deploy `0469` checks
