# Verify 0437 live — exit confirm popup inside Yandex Games

## ID
0439

> ℹ️ **ID allocation, checked 2026-10-11 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0438`. `0439`: no task folder, no `## ID` hit, no task reference in
> `ai-agents/` or `.claude/` (the only string hits are inside the GameAnalytics game number (removed by `0459`), not a task), and no
> `tasks/*/0439` path in any branch's history.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-11, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead` to
> a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim: **"Close both
> (Recommended)"** — option text: *"The producer closes 0436 and 0437 (agent-closed) and files the 0437 live-check task
> for after the next deploy."* This applies the standing build/verify-split rule (owner ruling 2026-09-29): the build
> task closes, and its live check becomes its own task **at the top of the next sprint**, never blocking the current
> sprint's deploy.
>
> ⚠️ **Belongs at the TOP of the next sprint.** No next sprint board exists yet (Sprint 8 is the only sprint board), so it
> is filed on the Backlog board for now. Whoever creates the next sprint board should pull it in as that sprint's first
> row.

## Priority
Unscheduled *(belongs at the top of the next sprint — see above)*

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, by hand, inside the Yandex Games page, after the deploy that
carries `0437`. It needs the real Yandex ad, a phone and a desktop, and a human eye.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0433`.)*

## Context

**What this is, in plain terms.** [`0437`](../../done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md)
added a small in-game popup that asks the player to confirm before leaving a match (before it, one tap on the exit
button left at once). The popup appears from the sidebar exit button and from the exit button in the Settings window.
`0437` closed on 2026-10-11 as **built, not deployed** — `(agent-closed — not owner-verified)`. **This task is the live
check.**

**What `0437` already proved locally (dev build, both page templates, desktop English + phone Russian):** the popup
shows from both exit buttons, Stay / Escape / an outside tap close it, the popup sits over Settings, and Leave (from
Settings) returns to the start screen. Tests: 32 targeted, full `npm test` 4549 passed (one run), lint and `tsc` clean.

**What `0437` did NOT prove — the reasons this task exists:**
1. **The real Yandex interstitial ad was never shown.** Locally there is no Yandex SDK, so the ad step returns at once.
   After Выйти the game now waits for the ad and only then goes to the start screen — that path has only run without an
   ad.
2. **Leave from the sidebar popup was not clicked in a browser** — only from the Settings popup. The sidebar uses the
   same leave code and is covered by unit tests.
3. **Nothing ran inside the Yandex Games page itself**, on a real phone.

**Known limit, accepted by the owner (review R1).** After the first Выйти the popup will not open again. If the Yandex
ad ever fails to report that it closed, both exit buttons stay dead for the rest of that session. Owner ruling
2026-10-11: *"Accept the risk"* — *"Record it as a known limit. We revisit only if a player is seen stuck after pressing
Выйти."* This check is the first chance to see it. **Record it if seen; it does not fail the check on its own** — it
reopens the R1 question for the owner.

**Deploy timing.** `0437` ships in a weekend deploy slot (owner rule 2026-09-29) unless the owner says otherwise. Commit
and deploy are the owner's call; committed is not deployed. This task does not block the current sprint's deploy.

## What to build

Nothing to build. A short live checklist, run by the owner on the deployed game inside the Yandex Games page.

**Before you start:** note the game version live in production. Run the checks on a **phone** (Russian) and on a
**desktop**.

**Checks (in a match — Solo or Multiplayer):**
1. **Sidebar exit → popup.** Tap the sidebar exit button. **Pass:** the popup shows the Russian question
   (*"Вы уверены, что хотите выйти из игры?"*) with the buttons **Выйти** and **Остаться**; both buttons fully on
   screen; you are still in the match.
2. **Closing without leaving.** Open the popup three times and close it with **Остаться**, then **Escape** (desktop
   only), then a **tap outside** the popup. **Pass:** each time the popup closes and you stay in the match.
3. **Settings → Exit → popup over Settings.** Open Settings, tap its exit button. **Pass:** the popup appears over the
   Settings window; Остаться closes only the popup.
4. **Выйти → ad → start screen (the real ad path — never tested locally).** Tap **Выйти** from the sidebar popup in
   one match, and from the Settings popup in another. **Pass:** the Yandex interstitial ad shows (if Yandex serves one
   at that moment), and after it closes you land on the start screen. If no ad appeared, write that down — the check
   then proves the no-ad path only.
5. **Stuck after Выйти? (R1, accepted known limit.)** Across every Выйти above, note whether the game ever stayed in
   the match with the exit buttons doing nothing. **Record it if seen** (device, what was on screen, whether an ad had
   shown).

Record the result in this task's `worklog.md`: game version, date, device for each check (phone / desktop), each check
**pass / fail / not run**, whether an ad actually showed on each Выйти, and whether exit ever got stuck.

## Verification steps

1. The worklog names the deployed game version that includes `0437`.
2. Checks 1–5 are each recorded **pass**, **fail** or **not run**, for phone and for desktop. A check not run is never
   written as passed.
3. **Pass** = checks 1–4 pass on both phone and desktop, with at least one Выйти where the Yandex ad really showed and
   then the start screen appeared. If no ad was ever served, the worklog says so plainly: the pass then covers the
   popup and the no-ad path, not the ad path.
4. Check 5: "never stuck" or a description of each time it got stuck. A stuck exit is reported to the owner as a
   reopened R1 question, not silently passed.

## Notes

- **Depends on:** [`0437`](../../done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md)
  — committed and deployed to production (it was uncommitted and not deployed when it closed).
- **Blocks:** nothing. It must not block the current sprint's deploy (build/verify-split rule, 2026-09-29).
- Placement: **top of the next sprint**, once a next sprint board exists. On the Backlog board until then.
- No secrets, hosts or player ids in the worklog or screenshots.
- Filed 2026-10-11 by a spawned `fkit-producer` on the owner ruling above. ⛔ Not producer precedent.
