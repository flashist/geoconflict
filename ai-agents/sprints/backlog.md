# Backlog — the default home for unsprinted task briefs

This is **not a sprint**. It is the board every task brief lands on when no sprint was named for it.

The filename is deliberately `backlog.md` and **not** `sprint-backlog.md`: `/fkit-status` finds the
active sprint by globbing `sprint-*.md`, and a board of explicitly unscheduled work must stay outside
that glob or it can be reported as the active sprint.

> ⚠️ **A second, older board exists** at [`sprint-backlog.md`](sprint-backlog.md) — ~23 entries of
> unsprinted work, and its filename *is* inside the glob. Task `0001` consolidates the two boards and
> retires it. Until that ships, **both files must be read** to see all unsprinted work.

The **Priority** column reads `—` for every row: this board is unranked by design. Needing a rank is
the signal to pull the task into a sprint.

## Status

| Status | Priority | Task | Brief |
|---|---|---|---|
| 🔲 Backlog | — | Migrate `tasks/backlog/` to the fkit task-folder convention | [`0002-migrate-backlog-tasks-to-folders`](../tasks/backlog/0002-migrate-backlog-tasks-to-folders/brief.md) |
| 🔲 Backlog | — | Migrate `tasks/done/` and `tasks/cancelled/` to the fkit task-folder convention | [`0003-migrate-done-cancelled-tasks-to-folders`](../tasks/backlog/0003-migrate-done-cancelled-tasks-to-folders/brief.md) |
| 🔲 Backlog | — | Consolidate unsprinted work onto `backlog.md` and retire `sprint-backlog.md` | [`0001-consolidate-unsprinted-work-onto-backlog-board`](../tasks/backlog/0001-consolidate-unsprinted-work-onto-backlog-board/brief.md) |
| 🔲 Backlog | — | Reconcile legacy status markers in the sprint plans to the canonical vocabulary | [`0004-reconcile-legacy-status-markers-in-sprint-plans`](../tasks/backlog/0004-reconcile-legacy-status-markers-in-sprint-plans/brief.md) |
| 🔲 Backlog | — | `ADMIN_TOKEN`: fail closed on a missing secret, and compare in constant time *(prod verified clean 2026-08-10 — normal-priority hardening, not an incident)* | [`0005-admin-token-fail-closed-and-constant-time-compare`](../tasks/backlog/0005-admin-token-fail-closed-and-constant-time-compare/brief.md) |
| 🔲 Backlog | — | Investigation: `SLOW_TURN_THRESHOLD_MS` vs the 66.7 ms turn interval | [`0006-investigate-slow-turn-threshold-vs-turn-interval`](../tasks/backlog/0006-investigate-slow-turn-threshold-vs-turn-interval/brief.md) |
| 🔲 Backlog | — | Investigation: blast radius of the `src/core` → `src/client` imports | [`0007-investigate-core-to-client-import-coupling`](../tasks/backlog/0007-investigate-core-to-client-import-coupling/brief.md) |
| 🚧 Blocked — needs 0009 findings **and** the first paid entitlement (by design) | — | Migrate `PrivilegeRefresher` to fail-closed | [`0008-privilege-refresher-fail-closed-migration`](../tasks/backlog/0008-privilege-refresher-fail-closed-migration/brief.md) |
| 🔲 Backlog | — | Self-host the upstream OpenFront API dependency (findings phase) — **pull ahead of any cosmetics monetization work** | [`0009-self-host-upstream-openfront-api-dependency`](../tasks/backlog/0009-self-host-upstream-openfront-api-dependency/brief.md) |
| 🚧 Blocked — 0009 findings + payment infra + owner decision on the design set | — | Re-enable flags as a paid non-country cosmetic (Task 9) | [`0010-re-enable-flags-paid-non-country-cosmetic`](../tasks/backlog/0010-re-enable-flags-paid-non-country-cosmetic/brief.md) |
| 🚧 Blocked — 0009 findings + payment infra + owner rulings (pattern set, ad coupling) | — | Re-enable territory patterns (Task 9a) | [`0011-re-enable-territory-patterns`](../tasks/backlog/0011-re-enable-territory-patterns/brief.md) |

**Execution order** for the migration set is `0002 → 0003 → 0001 → 0004`, which is dependency order,
not ID order. `0005`–`0009` are independent of it and of each other.

`0008` is **deliberately blocked** on two conditions, not one: `0009`'s findings, **and** the first
paid entitlement going live (paid citizenship, Task 9 flags, or Task 9a patterns). It is the
pre-committed migration from the owner's `adr-102` ruling, filed now so the commitment is a scheduled
task rather than a promise inside a document.

⚠️ **`0009` grew teeth on 2026-08-09.** Cosmetic entitlements (`flares`) come from the **upstream
OpenFront API**, not from Geoconflict's own infrastructure — so it blocks the cosmetics monetization
path, not just the archive task. The board is unranked by design, so there is no rank to raise; the
owner's ruling is that `0009` is **pulled into a sprint ahead of any cosmetics monetization work**,
and that ordering takes effect at pull time.

IDs were allocated when each brief was written; ordering lives in each brief's `**Depends on:**` line.

## The cosmetics monetization chain

`0010` (flags) and `0011` (patterns) are the **root** of a dependency chain that two later sprints
already assume is done:

```
0009 (entitlement origin)  →  0010 flags + 0011 patterns
                                   ↓
                    Sprint 5 Task 8a (nickname styling)
                    Sprint 5 Task 15 (custom uploaded flags/patterns)
                                   ↓
                    Sprint 6 paid map packs (purchase surface)
```

Until 2026-08-09 neither root had a brief, a sprint, or an owner — the chain rested on nothing.
`plan-index.md:87-88` assigns both to Sprint 4, but neither appears in the Sprint 4 plan document.
Both are now briefed and blocked, which is honest; previously they were invisible.

## Provenance

`0001`–`0004` were written during project initiation (2026-08-08). `0005`–`0011` came out of the
open-questions interview and its follow-ups on 2026-08-09, each authorised by an owner ruling
recorded in that session.
