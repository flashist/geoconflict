# Sprint 8 — Paid Citizenship Perks and More Content

**Date**: 2026-09-29
**Status**: proposed *(page-type field; the board is **`🔲 Backlog — 2026-09-29` — created, NOT started**)*

> Source: `ai-agents/sprints/plan-sprint-8.md`.
>
> 🆕 **2026-10-01 (latest, `4f9f857`): 4 rows — 4 `🔲 Backlog`; 4 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Verify task **`0363`** — for [[tasks/telemetry-deploy-version-tags]] (`0356`) — was filed 2026-10-01 and placed
> at **rank 1** by `fkit-lead` at `0356`'s close, on the owner's standing build/verify-split rule (appended at 4, then
> moved up; no closed row exists here, so none was renumbered). Owner-run after the weekend telemetry deploy: the
> deploy printed a `<base>-telemetry.<N>` name and succeeded; the annotated git tag is on origin at the deployed
> commit; the box marker and the local deploy record show the same version and commit; Uptrace still answers.
> ⚠️ Preconditions: `0356` **committed** and deployed. Does not block Sprint 7's deploy. **New order: `0363` 1 ·
> `0358` 2 · `0351` 3 · `0343` 4.** ⚠️ `0363` above `0358` is **placement, not merit** — two short owner checks on
> different boxes, runnable in either order. The line-3 banner was not touched.
>
> *History — `49a419d`:* **3 rows — 3 `🔲 Backlog`; 3 OPEN; still NOT started.** ⚠️ Counted by me
> this run, by each row's leading status glyph. Two **verify tasks** were filed on 2026-09-30 and placed at the top,
> on the owner's standing build/verify-split rule (*"verify task on top of the next sprint"*; it must not block
> Sprint 7's deploy):
>
> | Rank | Task | Status |
> |---|---|---|
> | 1 | **`0358`** — verify [[tasks/profile-deploy-version-tags]] (`0355`) in production: after the weekend profile deploy (next slot 2026-10-03/04), the deploy printed a `<base>-profile.<N>` name and succeeded, `/health` reports it, the annotated git tag is on origin at the deployed commit, the registry holds the name, and telemetry shows it *if observable*. Placed by `fkit-lead` at `0355`'s close (standing rule, not a fresh owner ruling) | Backlog |
> | 2 | **`0351`** — verify [[tasks/worker-reuses-page-map]] (`0035`) on the dev box: a public match starts and each map file downloads once. Owner ruling *"File a verify task for Sprint 8"* | Backlog |
> | 3 | `0343` discussion: eight parked features (was rank 1, then 2) | Backlog |
>
> ⚠️ `0358` above `0351` is **placement, not merit** — both are short owner-run checks on different boxes. The line-3
> banner was not touched.
>
> *History:* at `b434732` the board had 1 row (`0343`), 1 open.

## Context

The board was **created on 2026-09-29** by a spawned `fkit-producer`, on an owner ruling given live in the
`fkit lead` session and relayed by `fkit-lead` (ADR-021/037; ⛔ not producer precedent). The ruling: split
[[decisions/sprint-6]]'s **11 brief-less rows** into discussion briefs — *"each brief should have a list of the
things that should be discussed (not implemented, but discussed)"* — and *"is the task related to the paid
citizenship? If yes, put this brief into Sprint 8. If no — put it into Backlog."* The owner **delegated that
test to the producer**.

- **Named 2026-09-29 — owner ruling D**, exact wording: *"Paid Citizenship Perks and More Content"*.
- ⚠️ **No goal set.** The producer did not invent one; the name is not a goal.
- **Not started** — the owner did not start this sprint.

## Decision

| Rank | Task | Status |
|---|---|---|
| ~~1~~ **3** *(first row of a new board — a position, not a merit rank; moved down by the two verify tasks above, 2026-09-30)* | `0343` **Discussion: eight parked features** — paid-citizenship perks and more | Backlog |

**What `0343` holds:**

- **Five placed by the producer's "tied to paid citizenship" test** (the owner may overrule):
  - Paid Campaign Map Packs — *borderline: a separate product, but a pack purchase grants citizenship*;
  - Nickname Styling System;
  - Map Voting for Verified Players — *borderline: "verified" = citizens, earned vs paid not stated*;
  - Replay Access as Premium Feature — *borderline: "premium tier" read as citizenship*;
  - Custom Uploaded Flags & Patterns — Paid Citizens Only.
- **Three moved in by owner ruling C**, verbatim *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that
  to the Sprint 8."*: Leaderboard — Rewards Layer, Coin Economy + Rewarded Ads, Clans. This **overrules** the
  producer's borderline "no" calls on them; they had first gone to `0342`. `0343` was retitled; its folder was
  not renamed.

The other brief, `0342` (**three** items NOT tied to paid citizenship: server restart UX, mobile warning, free
historical maps), sits on the Backlog board — see [[decisions/sprint-backlog]].

## Consequences

- Every item here is a **discussion**, not a build: nothing is scoped for implementation yet.
- Most items were Sprint 5 plan tasks carried to Sprint 6 on 2026-09-26; the Sprint 5 plan's task prose stays
  where it is, with a pointer to `0343` (see [[decisions/sprint-5]]).

## Related

- [[decisions/sprint-6]] — the closed board whose brief-less rows became `0342` / `0343`
- [[decisions/sprint-7]] — the active sprint
- [[decisions/sprint-5]] — the original home of most of these items; its prose now points at `0343`
- [[decisions/sprint-backlog]] — `0342`, the "not tied to paid citizenship" discussion brief
- [[decisions/product-strategy]] — `plan-index.md` lists this board and repoints the priority table to `0342` / `0343`
- [[tasks/profile-deploy-version-tags]] — task `0355`, verified by `0358` (rank 1)
- [[tasks/worker-reuses-page-map]] — task `0035`, verified by `0351` (rank 2)
- [[tasks/telemetry-deploy-version-tags]] — task `0356`, verified by `0363` (rank 1)
