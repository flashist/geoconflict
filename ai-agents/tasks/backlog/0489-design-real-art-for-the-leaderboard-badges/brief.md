# Design: real art for the leaderboard badges (placeholders are used until it lands)

## ID
0489

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest existing ID across `backlog/`, `done/` and
> `cancelled/` (folder names and `## ID` fields agree): `0488`. `0489`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"Badges: who makes the badge art?"* in the `0482` talk, the
> owner typed, verbatim: *"#1, but brief a task for the art too, to be sure we don't forget about it."* (#1 =
> **"Placeholders, art later (Recommended)"** — *"Build with placeholder icons; real art is a separate design task.
> Build doesn't wait on art."*)
>
> ⚠️ **The placement is `fkit-lead`'s reading, not an owner ruling.** The owner asked only for the task to be
> briefed *"so we don't forget"*; he named no sprint. `fkit-lead` read that as the **Backlog board**, and that is
> where it is filed. Move it into a sprint only on an owner ruling.

## Priority
Unscheduled

(Backlog board, unranked by design. The board row is an **append** at the bottom of the Backlog board, not a merit
placement.)

## Status
🔲 Backlog

## Owner
fkit-producer

> Owner = `fkit-producer` because the art itself is made or sourced outside the code (by the owner, a designer, or a
> tool he chooses); the producer owns getting it specified, made and handed over. Putting the files into the game is
> coder work — see *What to build*, step 4.

## Context

**What this is.** The real art for the **leaderboard badges** — small icons shown next to a top player's name.
Badges are discussed in [`0482`](../../done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/brief.md)
(outcome **Park**, owner ruling 2026-10-24; see its [worklog](../../done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/worklog.md)).
**Meanwhile the badge build uses placeholder icons** (owner ruling above), so **the build never waits on this task.**

**Owner rulings from `0482` that bind the art** (all 2026-10-24, same channel as above; ⛔ not producer precedent):

- **Earned only, never sold** (batch 1, answer 3). The art must read as an **achievement**, not as a shop item.
- **Ship to all, with a quick off switch that hides only what players see** (batch 2, answer 3). The art is part of
  what that switch hides.
- **Which badges exist ("the tiers") is the owner's pick — still PENDING on 2026-10-24.** A proposal went to the owner
  via `fkit-lead` the same day. **The art set is one design per tier the owner picks** — read the final list from
  `0482`'s worklog before starting. Do not draw for the old prose's three tiers by default.

**Style reference: the citizen ★ ([`0068`](../../done/0068-citizen-verified-icon/brief.md)).** It is the one icon that
already sits next to player names in matches (the in-match leaderboard and the player panel). Badges will sit beside
it, so they must look like the same family and must not be confused with it.
- ⚠️ **The ★ is itself still a placeholder.** `0068` shipped a neutral text glyph `★` on purpose (owner ruling
  2026-08-28, `0068` plan amendment 3); *"the real icon design is a separate follow-up task"*. ⚠️ **No such follow-up
  brief was found** (searched `ai-agents/tasks/backlog/` 2026-10-24 for a citizen-icon design task — none). Raised to
  the owner as an open question in the report that filed this brief: should the citizen icon's real art be done
  together with this task? Until he rules, this task covers **badges only**.
- **Hard rule carried from `0068` amendment 3: no country or flag imagery.** Yandex bans real-country flags and names,
  and the `/flags` assets are deliberately switched off (project memory). Do not borrow from them.

**Technical unknown, not a dependency.** `0068` drew the ★ as **text** (no image file, no SVG), partly so neither HTML
template needed a change. Whether badges can be images, or must also be text-like glyphs, depends on how names are
drawn — the open question [`0485`](../0485-investigate-nickname-styles-one-shared-name-drawing-path-and-a-reusable-readability-approval-solution/brief.md)
is investigating for nickname styles (one shared name-drawing path?). **Read `0485`'s findings, or ask
`fkit-architect`, before fixing the file format** — so the art is not made in a format the game cannot show.

## What to build

1. **Get the tier list.** Read `0482`'s worklog for the owner's pick. If it is still pending, stop here and say so.
   📌 *2026-10-24: the tier choice now comes **after `0234`'s findings** (`0482` worklog, batch 3 — `fkit-lead`'s reading of the owner's answer).*
2. **Write a one-page art spec** in this folder (`art-spec.md`): one entry per tier — what it means to a player, how
   long it lasts (kept forever, or changes with rank), and how it must differ from the others and from the citizen ★.
   Plus the shared constraints: readable at **name-text size** in a busy match; works on light and dark backgrounds;
   no country or flag imagery; the file format confirmed per the *Technical unknown* above; any player-visible text
   (e.g. a tooltip or a month name on a kept-forever badge) goes through `translateText` with keys in both
   `resources/lang/en.json` and `ru.json`.
3. **Get the art made** to that spec, and record who made it and its licence in this folder (the `0066` licensing
   purge is the reason: no asset of unclear origin enters the repo).
4. **Hand it over.** If the badge build has not started, attach the art to it so it ships with real art. If the build
   has already shipped with placeholders, file a small `fkit-coder` swap task with `/fkit-task-brief` (placeholders →
   real art) and link it here.

## Verification steps

1. `art-spec.md` exists in this folder, with one entry per tier, and its tier list matches the owner's pick recorded
   in `0482`'s worklog.
2. One art file (or glyph choice) exists per tier, with its maker and licence written down in this folder.
3. The file format was confirmed with `0485`'s findings or `fkit-architect`, and that confirmation is quoted in this
   folder.
4. The art was shown to the owner next to the citizen ★, at name-text size, and he accepted it (dated, his words).
5. The hand-over is done: either the badge build's brief names this art, or a swap task is filed and linked here.
6. No country or flag imagery in any file.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- The badge **build** is **not filed yet** — `0482` was parked until the leaderboard is live
  ([`0234`](../0234-leaderboard-core-system-definition/brief.md), Sprint 9). By owner ruling **the build will not wait
  on this art**; it ships with placeholders if this task is not done.
- Starting this task early is possible, but step 1 needs the owner's tier pick, and step 2's file format is best
  confirmed after `0485`. Neither is a `Depends on:` — both are information this task reads, and nothing waits.
- **Related:** [`0482`](../../done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/brief.md) (the
  talk) · [`0068`](../../done/0068-citizen-verified-icon/brief.md) (the ★, style reference) ·
  [`0485`](../0485-investigate-nickname-styles-one-shared-name-drawing-path-and-a-reusable-readability-approval-solution/brief.md)
  (shared name-drawing path) · [`0234`](../0234-leaderboard-core-system-definition/brief.md) (core leaderboard) ·
  [`0066`](../../done/0066-licensing-remediation-proprietary-purge/brief.md) (licensing precedent).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
