# Investigation: nickname styles — is there one shared name-drawing path, and a readability / approval solution to reuse?

## ID
0485

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0484`. `0485`: no task folder and no task
> reference in `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/` (one hit in `dashboard.sh` is an example range in
> a comment, not a task).

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"Nickname styles: file the build, park it, or drop it?"*, the
> owner picked, verbatim, **"File (Recommended)"** — option text: *"Investigation + build tasks on the Backlog board;
> the build waits on them and on 0484 (Sprint 9). 0477 closes."* → Backlog board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design. The board row is an **append** at the bottom of the Backlog board, not a merit
placement.)

## Status
🔲 Backlog

## Owner
fkit-architect

This is an **investigation, not a build.** Its output is a findings report. **No code change ships from this task.**

## Context

**In plain terms.** The owner wants to sell **nickname styles** — paid looks for a player's name: a background colour,
a border, a text colour. Before anyone builds them, two facts are needed, because the owner's rulings depend on them:

1. **Where are names drawn?** A styled name must look the same everywhere a name shows: in the match (above the
   territory), on the leaderboard, in the post-match summary and in the diplomacy UI. The old plan made a single shared
   name-drawing path a **hard prerequisite**. Whether one exists today was **never checked**.
2. **Is there already a readability / approval solution?** The owner, verbatim (`0477` batch 2, answer 2): *"If there
   is already an implemented solution for that in the game (as for the patterns/flags), then I would like to reuse it.
   If not, hen option 1."* Option 1 = **a fixed set**: a small set of colours and borders the owner approves once on
   real maps, no free picker, no moderation. Which branch the build takes depends on this finding.

**Where this comes from.** The nickname-styling talk
[`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md) ended in **File** on
2026-10-24. Its [worklog](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md) holds
every ruling. The build is [`0486`](../0486-build-nickname-styles-paid-name-looks-behind-a-feature-flag/brief.md); it
waits on this task.

**What is known — start here, do not re-derive:**

- **The game draws with Canvas 2D**, not Pixi.js (`CLAUDE.md` § *Rendering*). The old prose's "Pixi.js" notes are
  stale.
- **Names in the match** are drawn by `NameLayer` (wiki: `tasks/map-troops-labels`). Whether the leaderboard,
  post-match summary and diplomacy UI share any code with it — they are likely Lit/HTML components, not canvas — is
  the open question.
- **What already decorates a name:** the ★ citizen icon (`0068`) and the approved name in matches (ADR-115). Both must
  stay visible under any style, as must future leaderboard badges (`0482`).
- **Flags and territory patterns are switched off today** (`0010`, `0011`; memory: the `/flags/*.svg` 404 is
  intentional). Pattern rendering is live in code, but its purchase and entitlement flows from upstream OpenFront are
  dead in the Yandex build (wiki: `systems/player-infrastructure`). A readability or approval solution may exist in the
  code without being in use — say which.
- **Cosmetic entitlements fail open** today (ADR-102, risk R5; task `0008`). Note in the findings whether a style would
  go through that same check.

## What to build

**Nothing is built.** Answer each question with code references (`src/...:line`), and say what was checked and what was
not.

1. **Name-drawing paths.** List every place a player's name is drawn: in match, leaderboard, post-match summary,
   diplomacy UI, and any other (chat, lobby, player panel). For each: the file, the technology (canvas or HTML), and
   whether it shares code with the others. **Verdict:** one shared path / several paths / partly shared.
2. **What it costs to style each.** For each path, a rough size (small / medium / large) of adding background, border
   and text colour — and whether the ★ icon and the approved name stay visible.
3. **Existing readability / approval solution.** Does the code (live or switched off) hold any solution for keeping
   cosmetics readable or for approving which looks are allowed — for patterns, flags or anything else? Name it, say
   whether it is live, and whether styles could reuse it. **Verdict:** reuse X / nothing to reuse (→ the owner's
   fixed-set branch).
4. **Entitlement path (note, not a design).** Where would "this player owns style X" be checked, and does it pass
   through the fail-open cosmetics check (ADR-102)? One paragraph.
5. **Custom fonts (note only).** Out of V1 scope. If the findings show the old "custom fonts are hard" reasoning is
   wrong for Canvas 2D, say so in one line; do not research further.
6. **Proposed split of the build.** Suggest how `0486` should be cut into independently shippable build briefs (for
   example: profile-server grant branch · drawing in one path · drawing in the others · buy entry point + feature
   flag). The producer files them; this task does not.

## Verification steps

1. A findings report exists at `ai-agents/knowledge-base/reports/<date>-0485-<slug>.md`, and this folder's `worklog.md`
   links it.
2. Question 1 lists every name-drawing place found, each with a `src/...` reference and its technology, and states one
   verdict.
3. Question 3 states one verdict — reuse a named solution, or nothing to reuse — with the code checked to reach it.
4. Questions 2, 4, 5 and 6 each have an answer, or say plainly why they could not be answered.
5. The findings are reviewed with the owner, and the owner's choice of branch for question 3 (reuse, or a fixed set)
   is recorded, dated, in this worklog — or explicitly carried into `0486`.
6. No source code changed (`git diff --stat -- src/` shows nothing from this task).

## Notes

- **Depends on:** nothing
- **Blocks:** 0486
- **From:** [`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md) (outcome
  File, 2026-10-24) — its to-discuss 2 (shared name-drawing path), 3 (custom fonts, note only) and the condition of 4
  (readability / approval) are carried here.
- **Related:** [`0484`](../0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md)
  (the shared purchase flow, Sprint 9), [`0483`](../0483-discussion-nickname-style-pack-offer-whether-to-sell-one-and-at-what-price/brief.md)
  (pack talk), [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md),
  [`0011`](../0011-re-enable-territory-patterns/brief.md), [`0008`](../0008-privilege-refresher-fail-closed-migration/brief.md),
  [`0068`](../../done/0068-citizen-verified-icon/brief.md), [`0482`](../../done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/brief.md).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
