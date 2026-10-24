# Verify 0350 on the profile box: decide waiting name changes with the walk-through command

## ID
0463

> ℹ️ **ID allocation, checked 2026-10-15 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (working tree, folder names and `## ID` fields agree) was `0462`. `0463`: no task folder, no reference in
> `ai-agents/` (wiki vault excluded) or `.claude/`, and no `tasks/*/0463*` path in any branch's history.

## Sprint
Backlog

> 📌 **Goes to the TOP of Sprint 9 when Sprint 9 is planned.** This is the standing build/verify-split rule (OWNER
> RULING 2026-09-29: if proof needs a deploy + an owner check, close the build task and file a verify task at the top
> of the NEXT sprint; it must not block the current sprint's deploy), applied as written. Filed 2026-10-15 by a spawned
> `fkit-producer` (no owner channel, ADR-021/037) at `0350`'s close, in a `fkit-sprint-ship-loop` run driven by
> `fkit-lead`; ⛔ **not producer precedent.**
>
> It sits on the Backlog board only because **no Sprint 9 board exists yet**; the producer did not create one — same
> placement as `0460` and `0461`. Whoever plans Sprint 9 must pull this task in near its top, next to them.

## Priority
Unscheduled

(Backlog board, unranked by design. On the rule above, it goes to the top of Sprint 9.)

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** It needs a profile-server deploy and checks run by hand on the
profile box over SSH. An agent may not claim any step below (the runbook says so: *"never claimed by an agent"*).

## Context

**In plain terms.** Before `0350`, deciding a player's name-change request meant copying a ready-made command line
from Telegram (or hand-building one from the daily list, with Cyrillic names typed as `\uXXXX` codes) and pasting it
on the profile box. `0350` adds one command, `npm run -s name-change:review`, run on the profile box. It shows the
waiting requests one by one, oldest first, and asks **approve / reject / skip / quit** for each. It fills in the exact
name itself, so nothing is copied or typed as codes. Every decision still goes through the existing decide route, with
the same `expectedName` check.

`0350` is proven by tests only (full `npm test` green, 228/228 suites, 4757/4757 tests, after the review fixes;
integration 13 suites / 181 tests green; a non-terminal smoke run refused as designed). It has **not** been deployed or
run on the real box. This task is that check.

See [`0350`](../../done/0350-name-change-moderation-without-copy-and-paste/brief.md) and its `plan.md` (§ *Known
limits, unverified until the box*), `worklog.md` and `review.md`. The owner steps are in
`ai-agents/knowledge-base/name-change-digest-runbook.md` § *Deciding everything waiting: the walk-through command
(task `0350`)* → *Verification the owner must do on the real box — never claimed by an agent (task `0350`)*.

**Placement rulings that apply (OWNER RULING 3, 2026-10-15, live `AskUserQuestion`, recorded on the Sprint 8 board;
⛔ not producer precedent):** `0350` is not player-facing (a tool only the owner uses), so it ships in **its own
weekend profile-server deploy**. It does **not** hold back the final Sprint 8 deploy or `0426`, and neither does this
task.

**Prerequisite:** `0350`'s code is committed and deployed to the profile box. Committed ≠ deployed (owner deploys in
weekend slots).

> 🚀 **2026-10-15 — `0350` IS NOW DEPLOYED** to the profile box: `npm run deploy:profile` → **`0.0.164-profile.1`**,
> exit 0, `/health` ok — the profile deploy made for [`0449`](../../done/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/worklog.md).
> 📌 **OWNER RULING 2026-10-15**, live `AskUserQuestion` in the main session, relayed by `fkit-lead` to a spawned
> `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim selection: **"Deploy now,
> ship both (Recommended)"** — ship `0350` early in that deploy instead of its own weekend profile deploy (this
> supersedes, for this one deploy, the "own weekend profile-server deploy" placement above).
> - **Step 1 below (the deploy) is therefore already done.** The prerequisite is met; the box checks (steps 2–4) can
>   run **any time** — no weekend slot needed.
> - The deploy-time digest reported **3 name requests waiting** (count only; who and which names not recorded).
> - Recorded from `fkit-lead`'s relay; the producer did not see the deploy output itself. Verification step 1's
>   second half — the walk-through command actually starting on the box — is **not yet checked**.
> - Status unchanged: `🔲 Backlog`.

## What to build

Nothing. Deploy + verification only.

1. ✅ **Done 2026-10-15** — `npm run deploy:profile` → `0.0.164-profile.1`, not in a weekend slot, by owner ruling (see
   the deployed note in *Context*). Original step, kept for the record: ~~**Deploy (owner).** In a weekend slot, run the
   profile deploy (`./build-deploy-profile.sh`, runbook § *Deploy*).~~
   Note that every profile deploy sends one extra digest on purpose (runbook § *Deploy*) — expected, not a fault.
2. **Runbook checks (owner).** On the profile box, run the five steps of the runbook's *Verification the owner must
   do on the real box — never claimed by an agent (task `0350`)*:
   1. With **3 or more** requests waiting — one with a **Cyrillic** name, one with a **hidden character** (e.g. a
      no-break space) — decide all of them with the walk-through. No copy-paste, no hand-typed `\uXXXX`.
   2. Show a request; before answering, change its name from the player side (withdraw, ask for a different name);
      approve the shown card.
   3. Check the internal token appears nowhere in the terminal output, for every answer seen.
   4. Check **Ctrl-C** at a question, and type a Cyrillic **reject reason** into the prompt.
   5. Record the date in this task's `worklog.md`.
3. **Box-only limits from `0350`'s `plan.md` § *Known limits* (owner).** While doing step 2, also note:
   - **Ctrl-C through the whole chain** (SSH → `docker compose exec` → `npm run`): it reaches the walk-through as a
     keypress, not as a signal that kills npm.
   - **Typing over that chain:** the question prompt reads keys normally and a Cyrillic reason arrives as UTF-8
     text.
   - **Start-up on the low-RAM box:** roughly how long the command takes to show its first card, and that it does
     not fail for lack of memory.
   - **SSH drop in the middle of a decision** — *optional, the owner's call; do not force one.* If the connection
     does drop mid-decision, that decision's outcome is unknown; check it with the runbook's read-only query
     (§ *Confirming the outcome (read-only)*).
4. **Record** the results in this task's `worklog.md`: date, pass/fail per check, start-up time.
   ⛔ **No host, IP, token, player id or player name written** (runbook step 5).

## Verification steps

1. **Pass (deploy):** the profile deploy finishes and the walk-through command starts on the box (it shows a card, or
   says nothing is waiting).
2. **Pass (no copy-paste):** every waiting request is decided from the walk-through alone. The Cyrillic name reads as
   letters; the hidden character shows as a `⟨U+…⟩` code with the ⚠️ line.
3. **Pass (name changed mid-way):** approving the stale card answers `HTTP 409 name_mismatch` and applies nothing;
   the new name then comes up as its own card.
4. **Pass (token):** the token is printed nowhere.
5. **Pass (Ctrl-C):** Ctrl-C at a question sends nothing and the run stops with exit 130.
6. **Pass (Cyrillic reason):** the typed Cyrillic reject reason reaches the player's inbox as typed.
7. **Pass (start-up):** the first card appears without a memory failure; start-up time recorded.
8. Results recorded in `worklog.md` with the date; nothing written names a host, IP, token, player id or name.

**If a check fails:** record what was seen and route it to the producer. A failure on Ctrl-C or Cyrillic input over
the SSH + docker chain is exactly what `0350` could not prove off the box — it becomes a new fix task, not a reopen
of `0350`.

## Notes
- **Depends on:** `0350` (done, agent-closed — not owner-verified) — and a ~~weekend~~ profile-server deploy of it
  (✅ deployed 2026-10-15, `0.0.164-profile.1`, owner ruling *"Deploy now, ship both (Recommended)"* — see *Context*).
- **Blocks:** nothing. Per OWNER RULING 3 (2026-10-15) it does not hold back the final Sprint 8 deploy or `0426`.
- **Related:** `0361` (Telegram confirmation when a name change is decided — builds on `0350`'s shape A1). Later
  additions named in `0350`'s brief, not part of this check: a one-word laptop wrapper over SSH, and Claude's question
  popup driving the walk-through (A2).
- Sources: `0350` `brief.md`, `plan.md` (§ *Known limits*), `worklog.md`, `review.md`;
  `ai-agents/knowledge-base/name-change-digest-runbook.md` (§ walk-through verification, § *Deploy*, § *Confirming the
  outcome (read-only)*) — read 2026-10-15.
