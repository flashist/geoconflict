# Verify 0301 live — the citizenship explainer popup works in production

## ID
0401

> ℹ️ **ID allocation, checked 2026-10-06 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0400` (folder names and `## ID` fields agree). `0401`: no task folder, no hit under
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Sprint 8

## Priority
13

> ⚠️ **Priority 13 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0398`**, because the owner's standing build/verify-split rule (2026-09-29)
> puts a verify task *"on top of the next sprint"*, and `0301` cannot be deployed without `0248` (already in `dev`),
> whose own live check is `0398` — so both are naturally checked in the same slot. "Top" conflicts with ADR-035: ranks
> 2–4 (and 8–9) are closed rows, and a new row always appends; a spawned producer never re-ranks. Appending lands it
> directly below `0400`, in the same group of verify rows. Nothing renumbered.
>
> ⚠️ **Sprint placement is an open question to the owner** — see *Notes*.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The deploy, the real purchase and every check inside the
Yandex Games shell are the owner's. The local look (check 5) can be run by an agent session with a browser, or by the
owner.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0398`](../0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md).)*

## Context

**Filed 2026-10-06 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0301`'s close, relayed by
`fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 7.** ⛔ Not producer precedent. Authority: the owner's standing
build/verify-split rule (2026-09-29) — *close the build task on build + review; file a verify task at the top of the
NEXT sprint; it must not block the current sprint's deploy*. `0301`'s approved `plan.md` § 8 names these checks as
belonging to a separate verify task.

**What this is, in plain terms.**
[`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) added a *"What is citizenship?"*
popup. It says what citizenship gives and how to earn it free, and offers a Buy button (or a login button for a guest).
It opens three ways: a link on the citizenship card, a *Citizenship* section in Instructions, and a tap on the locked
Create Lobby button (this replaced `0302`'s interim "citizens only" popup). The card stays the only owner of purchase
state: the popup's Buy button runs the card's own buy path. `0301` is built, reviewed and closed on that
(`(agent-closed — not owner-verified)`). **This task is the proof in the real game.**

**State at filing (2026-10-06).** `0301`'s code is in the working tree — **not committed and not deployed**. Unit tests
cover the logic (full `npm test` green on re-run, 202/202 suites; the first run was red on two failures outside the task
— a `0197` SIGSEGV and a supertest-family failure; the Docker secret-boundary harness was **skipped, not passed**). The
owner already confirmed in production that the ★ badge and the name change work (owner ruling Q5, *"Both work — close
it"*). What the build **could not** prove, and this task exists for:
1. A **real purchase** from the popup, with the card switching to the citizen state **without a reload**.
2. The **guest login** from the popup, inside Yandex.
3. The popup inside the **real Yandex iframe** (`yandex-games_iframe.html` is the template production serves).
4. The **locked-tap path** for a tester — unreachable in dev (`isCreateLocked()` is false there), unit tests only.
5. **Nobody has looked at it by eye.** Plan § 6 step 11 (the local look in `npm run dev`: layout, ru and en, no raw
   keys) was **not done** before close.

**Release facts that bind the deploy:**
- Any deploy of `0301` also deploys [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md)
  (already in `dev`, commit `91eb99a`), so `0248`'s deploy conditions apply: [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
  passed, and [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) live or in the same
  deploy (`0248` owner ruling R3, 2026-10-06).
- `0354`'s release gate item 5 is met only when `0301` is **deployed**.

## What to build

Nothing in source. A look, then a deploy, then live checks — in this order.

### 1. Before the deploy — the local look (check 5, the step `0301` skipped)
In `npm run dev` (all flags read true there), on a real browser:
- Card link → popup opens → Close works.
- Instructions → *Citizenship* section → link → popup opens **above** Instructions.
- Switch language ru ↔ en: every line renders, no raw `citizenship_explainer.*` keys, no clipped or overlapping text,
  usable at phone width.
- Record yes/no per item. If something looks wrong, file a defect task before deploying — do not deploy a broken look.

### 2. Gates — before deploying
1. Check 1 above passed (or its defects are fixed).
2. `0248`'s gates: `0396` passed; `0397` live or in the same deploy.
3. `0301`'s code is committed — only on the owner's explicit ask.
4. A weekend slot (owner's standing rule, 2026-09-29).

### 3. The deploy — game client
- Client-only (`build-deploy.sh`). Record in this folder's `worklog.md`: date, UTC time, version tag, rollback target.

### 4. The owner's live checks — production, inside the Yandex Games shell
Fresh page load for each. Do checks 2–4 **before** check 1 on the same account, because a purchase makes that account a
citizen for good and the locked button then unlocks.
1. **Real purchase from the popup** (non-citizen, logged in): card link → popup → Buy → complete the Yandex purchase.
   The card shows the citizen state **without a reload**, and the popup closes. In GameAnalytics:
   `Citizenship:Explainer:Opened:CardLink`, `UI:Tap:PurchaseCitizenshipExplainer`, then
   `Purchase:Started:Citizenship` and `Purchase:Completed:Citizenship`.
2. **Guest login from the popup** (logged out, inside Yandex): the popup shows a login button, not Buy. Tap it → the
   Yandex login runs; `UI:Tap:CitizenshipLoginExplainer` arrives.
3. **The popup inside the real iframe:** it opens, reads correctly in ru, closes; nothing is cut off by the frame.
4. **Locked-tap path, as a tester** (`0302`'s tester marker set, account **not** a citizen): the Create Lobby button
   shows `0302`'s locked look; a tap opens **this** popup (never the host modal, never the old "citizens only" popup).
   `LockedFeature:Tap:PrivateLobby` then `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby` arrive.
- ⛔ **Never paste a token, a response body, a player id, a purchase token or a URL** — not in chat, a worklog, a
  brief, or any tool. Yes/no answers, counts, dates and times only.

### 5. ⛔ Rollback
- Client rollback returns the previous client (no popup; the interim locked popup comes back). It also rolls back
  `0248` — say so if it is used.
- A purchase taken in check 1 is real and stays; rollback does not undo it.

## Verification steps

1. **Local look recorded** (§ 1) in `worklog.md`: yes/no per item, ru and en, phone width, date.
2. **Gates recorded** before the deploy entry: `0396` pass and date; `0397` live or same deploy; the weekend slot.
3. **Deploy recorded:** date, UTC time, version tag, rollback target.
4. **Check 1 recorded:** purchase completed (yes/no); card switched without reload (yes/no); popup closed (yes/no); the
   four events seen (yes/no each), date.
5. **Check 2 recorded:** login button shown instead of Buy (yes/no); login ran (yes/no); event seen (yes/no).
6. **Check 3 recorded:** opens, ru text correct, closes, nothing clipped — yes/no each.
7. **Check 4 recorded:** locked look unchanged (yes/no); tap opens this popup (yes/no); both events seen (yes/no).
8. **If any check fails:** file a new task with the readings — do not reopen `0301` silently. This task still closes,
   with its result recorded as a failed verification pointing at that task. If a check could not be run (no suitable
   account, owner declines a real purchase), record it as **not checked live**, never as passed.
9. **No secret leaks:** no token, session, response body, player id, key, host, IP or full URL in any artifact.

## Notes

- **Depends on:** [`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (hard — the build,
  committed and deployed), [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (hard — ships in
  the same deploy), [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
  (hard — `0248`'s deploy gate), [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) (hard —
  live or in the same deploy, `0248` owner ruling R3)
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29). Natural to run in the same slot as
  [`0398`](../0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md).
- **Placement:** Sprint 8 per the owner's 2026-09-29 rule. ⚠️ **Open question:** like `0396`/`0398`, the deploy may
  fall inside Sprint 7's time window.
- ⚠️ **Open question — the real purchase.** Check 1 spends real money and turns the test account into a citizen for
  good. Which non-citizen account does the owner use, and is a real purchase acceptable? If not, check 1 is recorded as
  *not checked live*.
- ⚠️ **Open question — the tester account for check 4.** It must carry the tester marker and **not** be a citizen.
- ⚠️ **Open question — who runs the local look (§ 1).** An agent session with a browser can do it before the deploy;
  otherwise the owner.
- **Related:** `0301` (the build) · `0302` (locked look, tester marker) · `0303` (card updates without reload) ·
  `0248`/`0398` (same deploy) · `0354` (release gate item 5) · `0238` (the kill switch).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
