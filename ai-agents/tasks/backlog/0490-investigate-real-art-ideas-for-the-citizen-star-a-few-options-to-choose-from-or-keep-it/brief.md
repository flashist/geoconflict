# Investigate: real-art ideas for the citizen ★ — a few options to choose from, keeping today's ★ is one of them

## ID
0490

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest existing ID across `backlog/`, `done/` and
> `cancelled/` (folder names and `## ID` fields agree): `0489`. `0490`: no task folder and no task reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/` (one unrelated hit: a hash string in `0218`'s worklog).

## Sprint
Backlog

> 📌 **Filed on an OWNER ANSWER of 2026-10-24**, typed live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"The citizen ★ is still a placeholder. What about its real
> art?"* (in the `0482` badges talk), the owner typed, verbatim:
>
> > *"To be honest, I kind of like it. I suggest adding a brief to backlog about INVESTIGATING / BRAINSTORMING ideas
> > for the real art: this task is supposed to give us few options to choose from, but at the end, it's gonna be my
> > call about using something new or keeping the current star-icon."*
>
> The owner named the board: **"backlog"** — the Backlog board.

## Priority
Unscheduled

(Backlog board, unranked by design. The board row is an **append** at the bottom of the Backlog board, not a merit
placement.)

## Status
🔲 Backlog

## Owner
fkit-producer

> Owner = `fkit-producer` because the job is to gather and present options for a product call the owner makes. No code
> is written here. Any swap of the ★ after the owner picks is a separate `fkit-coder` task (see *What to build*,
> step 5).

## Context

**What this is.** A **brainstorm / investigation**, not a build. It gathers **a few options** for the real art of the
citizen ★ — the mark next to a citizen's name — and puts them to the owner. **Keeping today's ★ is always one of the
options.** **The final call is the owner's** (his words above: *"it's gonna be my call about using something new or
keeping the current star-icon."*). He also said *"I kind of like it"* — so "keep it" is a real option, not a straw man.

**Where the ★ is today.**
- Shipped by [`0068`](../../done/0068-citizen-verified-icon/brief.md) (citizen verified icon) as a **neutral
  placeholder text glyph `★`** — on purpose, by owner ruling 2026-08-28. `0068`'s
  [plan amendment 3](../../done/0068-citizen-verified-icon/plan.md) says *"the real icon design is a separate
  follow-up task"*. ⚠️ **That follow-up was never filed** — checked 2026-10-24 (searching `ai-agents/tasks/backlog/`
  for a citizen-icon design task found none). **This brief is that follow-up**, in the shape the owner asked for:
  options first, his call after.
- It is **text, not an image**: one `<span>` holding the `★` character, styled amber, with an accessible label and
  tooltip through `translateText`. No SVG, no image file, no custom element — so neither HTML template needed a
  change. It lives in **one helper**, `src/client/CitizenBadge.ts`, which `0068` built so that a new icon is a
  one-file change.
- It shows on **four surfaces**: the host-lobby and join-private-lobby player lists, the in-match leaderboard, and the
  player panel. It is behind the citizenship kill switch (`0236`): when citizenship surfaces are off, the ★ is not
  drawn.

**Hard rule carried from `0068` amendment 3: no country or flag imagery.** Yandex bans real-country flags and names,
and the `/flags` assets are deliberately switched off (project memory). No option may use them.

**Style family — the leaderboard badges ([`0489`](../0489-design-real-art-for-the-leaderboard-badges/brief.md)).**
Badges (earned only, from the `0482` talk) will sit next to names **beside the ★**. `0489` uses the ★ as its style
reference and must not be confused with it. So every option here must say how it would sit next to a badge, and must
stay clearly different from one. Neither task waits on the other; the badge set itself is not chosen yet (it comes
after [`0234`](../0234-leaderboard-core-system-definition/brief.md)'s findings — see `0482`'s
[worklog](../../done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/worklog.md), batch 3).

**Technical unknown, not a dependency: text or image?** An option that is an image (SVG or bitmap) instead of a text
glyph may need more than the one-file change. How names are drawn is what
[`0485`](../0485-investigate-nickname-styles-one-shared-name-drawing-path-and-a-reusable-readability-approval-solution/brief.md)
is investigating (one shared name-drawing path?). **For any non-text option, read `0485`'s findings or ask
`fkit-architect`** for a rough cost, so the owner sees the real price of each option.

## What to build

**Nothing is built from this brief.** Its output is an options page and the owner's pick.

1. **Look at today's ★ as players see it.** Screenshot it on the four surfaces, at name-text size, on the light and
   dark backgrounds it actually appears on. These go next to every option.
2. **Brainstorm a few options — about 3 to 5 — and write them in `options.md` in this folder.** **Option 1 is always
   "Keep today's ★, unchanged."** The others are real alternatives (for example: a restyled ★, a different neutral
   mark, a small custom emblem — these are examples, not a required list). For **each** option write:
   - a picture or mock-up, at name-text size, beside a player name;
   - what it says to a player (what a citizen is), and why it fits Geoconflict;
   - its format: text glyph, SVG, or image — and the rough cost of the change (one-file swap, or more: per the
     *Technical unknown* above);
   - how it reads on light and dark backgrounds, and in a busy match;
   - how it would sit next to a leaderboard badge (`0489`) without being confused with one;
   - where it comes from and its licence, if it is not made from scratch (the
     [`0066`](../../done/0066-licensing-remediation-proprietary-purge/brief.md) licensing precedent: no asset of
     unclear origin);
   - a one-line pro and con.
3. **Put the options to the owner** (in a session with `AskUserQuestion`, or as a `NEEDS-DECISION` if run spawned),
   keep-today's-★ included, and recommend one if there is a clear case. **The owner picks.**
4. **Record his pick in `worklog.md`**, dated, with his words.
5. **After the pick:**
   - **Keep today's ★** → record it and close. Nothing else is filed.
   - **Something new** → file the follow-up with `/fkit-task-brief`: making the final art (if not already final), and
     a small `fkit-coder` swap in `src/client/CitizenBadge.ts` (plus anything the cost check found). Link it here.

## Verification steps

1. `options.md` exists in this folder with **at least 3 options**, and **option 1 is "Keep today's ★, unchanged"**.
2. Every option has all the fields in step 2: picture, meaning, format and rough cost, light/dark and busy-match
   readability, fit beside a `0489` badge, source and licence, pro and con.
3. Every non-text option's cost was checked with `0485`'s findings or `fkit-architect`, and that check is quoted in
   `options.md`.
4. No option uses country or flag imagery.
5. The owner's pick is recorded in `worklog.md`, dated, in his words.
6. If he picked something new: the follow-up brief(s) are filed and linked here. If he kept the ★: the worklog says
   so and nothing was filed.
7. No source code or asset was changed by this task.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Split:** one brief. The options and the owner's pick are one unit: an option list without the pick decides
  nothing, and there is no build to split until he picks. The build (if any) is filed afterwards, per step 5.
- `0068` amendment 3's *"separate follow-up task"* is discharged by this brief being filed; it is answered when the
  owner picks.
- **Related:** [`0068`](../../done/0068-citizen-verified-icon/brief.md) (the ★) ·
  [`0489`](../0489-design-real-art-for-the-leaderboard-badges/brief.md) (badge art — same style family) ·
  [`0485`](../0485-investigate-nickname-styles-one-shared-name-drawing-path-and-a-reusable-readability-approval-solution/brief.md)
  (shared name-drawing path) ·
  [`0482`](../../done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/brief.md) (the talk
  where this was asked) · [`0066`](../../done/0066-licensing-remediation-proprietary-purge/brief.md) (licensing
  precedent).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
