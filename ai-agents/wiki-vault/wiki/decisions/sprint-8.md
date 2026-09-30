# Sprint 8 — Paid Citizenship Perks and More Content

**Date**: 2026-09-29
**Status**: proposed *(page-type field; the board is **`🔲 Backlog — 2026-09-29` — created, NOT started**)*

> Source: `ai-agents/sprints/plan-sprint-8.md`.
>
> **Counted at `HEAD` = `b434732`, by each row's leading status glyph: 1 row — 1 `🔲 Backlog`; 1 OPEN.**
> ⚠️ Counted by me this run. [[decisions/sprint-7]] is the active sprint.

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
| 1 *(first row of a new board — a position, not a merit rank)* | `0343` **Discussion: eight parked features** — paid-citizenship perks and more | Backlog |

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
