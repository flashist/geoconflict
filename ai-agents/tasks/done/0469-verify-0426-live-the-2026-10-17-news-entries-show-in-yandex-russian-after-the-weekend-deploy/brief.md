# Verify 0426 live — the 2026-10-17 news entries show in Yandex (Russian) after the weekend game prod deploy

## ID
0469

> ℹ️ **ID allocation, checked 2026-10-16 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest `## ID` across
> `backlog/`, `done/` and `cancelled/` before this run: `0468`. `0469`: no task folder, no board hit.

## Sprint
Sprint 9

> ✅ **PLACEMENT RULED 2026-10-16 — moved to [Sprint 9](../../../sprints/plan-sprint-9.md), rank 1.** OWNER RULING given
> in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ not producer precedent. The owner was asked via `AskUserQuestion`: *"0469 is the check that the news shows correctly
> inside Yandex after Saturday's deploy. Your usual rule puts check tasks at the top of the NEXT sprint, but there's no
> Sprint 9 board yet, so it's on the Backlog board. The check happens on Saturday, inside Sprint 8. Where should it go?"*
> — and answered in their own words (free text, not a listed option), verbatim: ***"Create Sprint 9 board and move the
> task there"***. The Sprint 9 board was created for it (`🔲 Backlog`, not started), and this task sits at its top per
> the standing build/verify-split rule (2026-09-29). The check still runs on deploy day (Saturday 2026-10-17), while
> Sprint 8 is the active sprint — the owner chose this knowing that. The Backlog-board row is kept as `➡️ Moved`. The
> flag below is history: true from filing until this ruling.

> ~~⚠️ **PLACEMENT FLAGGED FOR THE OWNER.**~~ *(history)* The owner's standing build/verify-split rule (2026-09-29) puts a verify task
> **at the top of the next sprint**, and `0426`'s plan §5 says the same. **No Sprint 9 board exists yet** (checked
> 2026-10-16: `ai-agents/sprints/` holds only `plan-sprint-8.md` as a sprint board), and a spawned producer does not
> create sprints. So this task sits on the [Backlog board](../../../sprints/backlog.md) until the owner places it.
> The owner has bent the rule before and put verify tasks in the **same** sprint as their build task
> (`0445`/`0449`/`0450`/`0452`/`0385` in Sprint 8). That was **not** assumed here — whether to pull this into Sprint 8
> (the deploy is 2026-10-17, inside Sprint 8) or into Sprint 9 once it exists is the owner's call.

## Priority
6

> 📌 **2026-10-16, later — was 1, now 6.** Moved down five on the [Sprint 9 board](../../../sprints/plan-sprint-9.md) by the OWNER-RULED order *"At the top (Recommended)"*, which put the five rows relocated from Sprint 8 above it. Not a merit change for this task. The note(s) below are kept as written (ADR-035).

## Status
✅ Done (agent-closed — not owner-verified)

*(Status until 2026-10-24, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, inside the Yandex Games iframe, after the deploy. A producer
records the result. No agent can do this check: it needs the real game inside Yandex Games and a Russian reader's eye.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0429`.)*

## Context

**What this is, in plain terms.** [`0426`](../../done/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md)
added two new entries to the news window (the bell on the start screen) in `resources/announcements.json`, telling
players what shipped since the last news entry (`2026-06-06-game-update`):
- **A** — id `2026-10-17-citizenship`, badge `new`, title «Гражданство уже в игре» / "Citizenship is here";
- **B** — id `2026-10-17-game-update`, badge `update`, title «Обновление игры» / "Game update".

Both are dated `2026-10-17`. The text is the owner-approved 2026-10-12 text (see `0426`'s `draft.md` and `worklog.md`).
`0426` closed on **local** evidence only (2026-10-16, agent-closed — not owner-verified): tests green, and a local look
in en + ru on the **standalone** template — **not** inside Yandex Games. Its brief left the live look open (its
*Verification steps*, step 6); this task is that check.

**Why this needs a commit check.** `build-deploy.sh` builds the image from the local working tree but commits and tags
only `package.json`. So the news can reach players even if the `0426` change was never committed — and then the
release tag would not contain it. `0426` was **not committed and not deployed** at close. The owner must commit it
before running `build-deploy.sh prod`.

**Expected, not a bug:**
- A returning player sees **both** new entries as unread; opening the window marks the newest (A) as seen and clears the
  dot. The dot is per device (`0304`, known).
- The window's own heading for custom games still says «Одиночная игра» / "Single Player" while news entry B says it is
  now "Custom Game" — a known, owner-accepted residual from `0426`'s review (R1); the fix is
  [`0468`](../../backlog/0468-rename-the-custom-game-window-title-to-match-the-start-screen-button/brief.md). Do not fail this
  check for it.

**Deploy timing.** Planned for the Saturday 2026-10-17 game prod deploy slot (with `0449` / `0452`). **If the deploy
slips to Sunday 2026-10-18 or later,** `0426`'s plan allows the `date` and both ids to be changed before the commit —
check against whatever date actually shipped, and note it in the worklog.

## What to build

Nothing to build. A short live checklist, run by the owner on the deployed game, inside Yandex Games, in **Russian**:

1. **Release check** — confirm the deployed game version's release tag contains the `0426` commit (the
   `resources/announcements.json` change with the two `2026-10-17` entries). Record the version and how it was checked.
2. **Bell dot** — as a returning player (a browser/device that last saw an older news entry), open the game inside
   Yandex Games: the unread dot shows on the bell.
3. **Entries render** — open the bell: entry A is first with the "new" badge, entry B second with the "update" badge,
   both dated 2026-10-17 (or the actual shipped date), titles correct, bullet line breaks readable, older entries
   follow.
4. **Russian reads naturally** — the owner reads both entries in Russian and confirms the text is natural and has no
   typos or leftover English.
5. **Dot clears** — close the window: the dot is gone.

Record the result in this task's `worklog.md`: game version, date, how the release tag was checked, and pass/fail for
each item; for any fail, what was seen and where.

## Verification steps

1. The worklog names the deployed game version and shows that its release tag contains the `0426` commit. **If it does
   not, this is a fail** even if the news shows in the game — the release record is wrong.
2. Items 2–5 above were checked inside the Yandex Games iframe in Russian, each with pass/fail in the worklog.
3. **Pass** = all five items pass. **Any fail** = the worklog says what was seen, and a follow-up task is filed (this
   task does not fix code or text).

## Notes

- **Depends on:** `0426`, plus the owner's commit of it and the weekend game prod deploy that carries it
- **Blocks:** nothing
- Build task: [`0426`](../../done/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md)
  (closed 2026-10-16, agent-closed — not owner-verified). Its plan (§4 V5, §5), worklog and review are in its folder.
- Related: [`0468`](../../backlog/0468-rename-the-custom-game-window-title-to-match-the-start-screen-button/brief.md) (window title
  fix — the accepted residual above).
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise. Committed is not deployed.
- No ids, hosts, URLs or secrets belong in this brief or its worklog.
- Filed 2026-10-16 by a spawned `fkit-producer` (no owner channel, ADR-021/037) at `0426`'s close, at the request of
  `fkit-lead` driving `fkit-sprint-ship-loop`, on the owner's standing build/verify-split rule (2026-09-29). Placement
  was flagged at filing, then ruled the same day (moved to Sprint 9, rank 1 — see `## Sprint`). ⛔ Not producer precedent.
