# Sprint 8 retro — feedback for the fkit framework

**Date:** 2026-10-16 · **Project:** Geoconflict (an fkit-managed repo) · **Sprint:** Sprint 8, board created 2026-09-29,
started 2026-10-12, closed 2026-10-16.
**Who:** the project owner, with a Claude Code session leading the retro. The owner chose what went well, what hurt and
which fixes to propose. Anything marked *observation* comes from the session, not the owner.
**Audience:** agents who maintain and improve the fkit framework (roles, skills, movers, board conventions).
**Status:** proposals only. Per the owner, nothing in this project's instructions or fkit setup was changed because of
this retro.

---

## 1. Sprint 8 at a glance

| Measure | Value |
|---|---|
| Rows on the board | 55 — **39 done**, 1 cancelled, 15 moved out (7 of them to Sprint 9 at close) |
| "Verify …" tasks (live checks split from builds) | **25 of 55** |
| Board file size at close | **1,872 lines** (earlier sprints: S4 1,628 · S5 658 · S6 1,204 · S7 1,313) |
| Lines that are notes/addenda (`> ` blockquotes) | **1,500 of 1,872** |
| Rows longer than 2,000 characters | **47 of 55** |
| Sprint goal | **none** (the name was not a goal) |
| Gap between board created and started | 13 days |

Shipped: SSH key login, password login off and login alerts on every server box; private lobbies for everyone, with
analytics; profile-backend alarms with every drill watched; a Postgres image lock; player UI polish; a news update.

---

## 2. What went well — owner's picks

1. **Security work end to end.** A chain of small tasks (key login → password off → alerts → cleanup) went from idea to
   live on every box, and each step was checked before the next.
2. **Private lobbies shipped.** Turned on for everyone, with funnel analytics and a wrong-code fix, all live.
3. **Profile alarms really tested.** Every alarm was triggered on purpose and seen arriving; the owner had ruled earlier
   that the task stays open until then.

**fkit mechanics that helped** *(observation)*:
- The **build / verify split** (proof on the live system is its own task) kept build tasks closable on their tests, and
  made "deployed and seen working" explicit.
- **Worklogs with owner-run evidence** (pasted output, owner-confirmed screenshots, no secrets) made live checks easy
  to audit later.
- **Owner present for box steps:** the agent guides, the owner runs. This held up well.

---

## 3. What hurt — owner's picks, with evidence and causes

### 3.1 Board text is stale and huge

**Evidence**
- The board grew to 1,872 lines; 1,500 are notes and 47 of 55 rows are over 2,000 characters.
- **Stale status misled an agent.** In this session, a Claude Code agent told the owner that task `0219` still needed
  owner setup work. It had read that from the board row's status cell. The task's brief and worklog showed all of that
  work done two days earlier; only one dependency was left. The agent had to correct itself.
- A second row (`0426`) said "Built, NOT committed" after the code was committed. The wiki agent caught it.

**Causes** *(observation)*
- **The same state lives in two places**, the brief's `## Status` and the board row's status cell, and both carry free
  text ("Left: …"). Work updates the brief and worklog; the board row is updated only when a producer touches it.
- **Rows only grow.** Every owner ruling is written in full, with authority text, into the row *and* into a dated
  addendum, and the keep-history rule (strike, never delete) means nothing ever leaves. Each move or rank change adds
  more text (`➡️ Moved …`, `~~old~~`, *"append rank, NOT a merit ranking — flagged for owner confirmation"*).
- The existing drift check compares status **tokens** only, so stale free text in a status cell is never flagged.

### 3.2 A long tail of waiting checks

**Evidence**
- 25 of 55 tasks were verify tasks. Many could only run after a deploy slot (the owner deploys on weekends by default)
  or after **several full days** of analytics data.
- At close, 7 rows moved to Sprint 9. Five were only waiting for the clock: a nightly backup at a set time, a daily
  report at a set time, a 24-hour quiet window, a fail2ban re-check a few hours after deploy, and tasks that depend on
  those.
- With **no sprint goal**, there was no clear finish line. "Can we close?" needed a manual sweep of every open row.

**Causes** *(observation)*
- The build/verify split, which works well, roughly doubles the task count, and the verify half is often time-gated.
- Nothing on the board shows *when* a waiting task can earliest finish, so waiting work and stuck work look the same.
- Starting a sprint does not require a goal.

---

## 4. Proposals — owner's picks

### P1 — Short board rows
A board row holds only the **status token, the date, and one line on what's left**. Rulings, evidence and authority
text live in the brief and worklog, and the row links there. Rows stop growing, and the board stays readable.

### P2 — One home for status
The brief's `## Status` is the **only** source of truth. The board row mirrors its token (plus at most the one "left"
line from P1). The drift check flags any mismatch, ideally the "left" text too, not just the token.

### P3 — Sprint goal before starting
Starting a sprint (the step that flips the banner to `🔄 In progress`) asks for a **one-line goal**: what "this sprint is
done" means. The close step checks against it.

### P4 — "Earliest finish" on time-gated tasks
Any task waiting on time shows its **earliest possible finish** in UTC (e.g. *"earliest: 2026-10-17 08:10Z — daily
report"*) on the board row and in the brief. A status helper can then sort waiting from stuck, and closing a sprint can
show "everything left is waiting until X".

---

## 5. Other observations from this session — not picked by the owner, for the fkit team's judgment

- **Many small confirmation questions.** Each new or moved row lands at "append rank" with a flag asking the owner to
  confirm the order. In this session the owner was asked to confirm rank three separately (`0343`, `0455`, `0470`),
  each needing a new round trip. The owner did **not** pick this as a pain point; noted only because it adds board text
  (see 3.1).
- **Rule conflict on re-ranking.** A spawned producer re-ranked rows because the relayed owner ruling named that exact
  point, although its skill says a spawned producer never re-ranks. It handled the conflict correctly and recorded it,
  but the skill could state the owner-ruling exception directly.
- **Mover default vs. reality.** When `/fkit-sprint-done` relocates open rows, its default resets them to `🔲 Backlog`.
  Three of the five were genuinely `🔄 In progress`, so the producer deliberately kept their status. The mover could
  keep the existing status by default.
- **Link churn on moves.** Closing the sprint moved the board file into `done/`, which repointed **168 links in 52
  files**. Task closes cause the same churn on a smaller scale (backlog → done). A stable path, or links that don't
  include the board folder, would avoid it. Repo link checks also referenced a test file that doesn't exist in this
  repo, so only the producer's own check ran.
- **Wiki sync reads commits only.** Board work that isn't committed yet is invisible to `/fkit-wiki-sync`. In this
  session that was fine (the owner committed first), but the calling agent wrongly assumed the opposite. A one-line
  "uncommitted ai-agents changes: N files" warning in the sync report would help.

---

## 6. Not in scope

No change to this project's `CLAUDE.md`, skills, agents or fkit config was made because of this retro (owner's
instruction). Sprint 9 runs under the current conventions until the fkit team decides on these proposals.
