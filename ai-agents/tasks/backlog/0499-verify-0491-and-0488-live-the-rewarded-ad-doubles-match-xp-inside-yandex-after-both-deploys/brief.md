# Verify 0491 + 0488 live: the rewarded ad doubles match XP inside Yandex after both deploys

## ID
0499

> ℹ️ **ID allocation, checked 2026-10-25 before filing.** Highest existing ID `0498` (all three boards, folder names
> and `## ID` fields agree, base-10) → `0499`.

## Sprint
Sprint 9

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"Where should the rewarded-ad live check (0491 + 0488)
> go?"*, the owner picked, verbatim, **"Sprint 9 (Recommended)"** — option text: *"Same as the purchase-flow checks.
> Nothing waits on it; it closes only after both deploys happen."*
>
> ⚠️ **This ruling overrides the standing build/verify rule for this task.** The owner's rule (2026-09-29) puts a
> verify task at the top of the **next** sprint; `0488`'s own brief and plan said the same. The ruling puts it on
> **Sprint 9**. If either deploy misses Sprint 9, this task cannot close in Sprint 9; the roll-over is the producer's.

## Priority
28

> ⚠️ Priority 28 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0488`**, because it checks that build's deploy (and `0491`'s with it) and
> nothing else gates it. Appended after the board's highest rank (27), never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Live check of the opt-in Yandex rewarded video: the profile-box route
[`0491`](../../done/0491-profile-box-rewarded-ad-match-xp-grant-route-server-part-of-0488/brief.md) (migration `009`,
`POST /v1/profile/rewarded-match-xp`) and the game client
[`0488`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md) (the offer on
the end-of-match popup, `WinModal`). Both are built, reviewed and closed (agent-closed — not owner-verified). Neither is
committed or deployed as of their closes.

**What the builds could not prove locally** (`0488` worklog, *Skipped*; plan § *Edge cases*): the standalone page has
no Yandex SDK, so the offer never shows in local dev. The SDK call, the callback order, the sound mute and the events
firing were checked against Yandex's docs and by tests only. This task carries `0488`'s live verification steps
(brief steps 2, 3, 6 and 7, their live parts) to the real Yandex template.

- **Entry gate:** `0491` deployed to the profile box, **then** `0488` deployed to the game. That order is mandatory:
  an old profile box answers the client's claim with 404 (`Ad:Rewarded:Reward:Failed`).
- **Who does what:** owned by the producer; **the owner runs the live steps** — both deploys, the Yandex console flag,
  the watches on the Yandex template, and the GameAnalytics / YAN reads. An agent may run read-only checks only where
  the owner allows it.
- **The remote flag.** `rewarded_video` (Yandex console experiment flag, value `enabled`) **fails closed**: the offer
  stays off until the owner turns it on (owner ruling *"Yes, starts off (Recommended)"*, 2026-10-24). Turn it on only
  after both deploys. It can be turned off again at any time without a deploy.

### ⚠️ Moderation note from the approved plan (Yandex rule 4.7; plan § *3*)

Rule 4.7 asks that game sound **and gameplay** are paused during an ad. Sound is muted (Howler, on `onOpen`). **Gameplay
cannot be paused in a multiplayer match** — the server only relays turns. The offer shows only on the end-of-match popup,
when this player's own play is over (eliminated, or the match decided); today's interstitial plays at the same moment
under the same condition. This is a **known moderation risk, not a new one**. If Yandex moderation flags it, record the
exact wording in the worklog and bring it to the owner; do not fix it inside this task.

### Accepted residuals — do NOT fail this check on these

Both owner-ruled *"won't fix"* on 2026-10-24 (`0488` [`review.md`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/review.md),
*Accepted residuals*):

- **R1 — the 60 s no-interstitial gap is page-only.** After a watch, Exit does a full page load and the gap is forgotten,
  so the next page's lobby/start interstitial may show within 60 s of the rewarded video. That is expected. What counts
  as a failure is an interstitial on the **same page** right after a rewarded video (step 6 below). ⚠️ Re-raise
  trigger, from the ledger: *if the verify task's live run flags back-to-back ads after a rewarded video* — record what
  was seen, and the owner decides whether R1 is re-opened.
- **R2 — the sidebar/settings exit does not wait for a running bonus claim.** Leaving through the sidebar or settings
  while a claim is still running can lose that match's 1 bonus XP. Expected; not a failure. (Its re-raise trigger is a
  material share of `Ad:Rewarded:Watched` with no `Ad:Rewarded:Reward:*` event — note the counts if visible.)

## What to build

Nothing. A live check, recorded in this folder's `worklog.md`:

1. Deploy `0491` to the profile box (weekend slot, owner rule), then `0488` to the game client (weekend slot).
2. Turn on `rewarded_video` in the Yandex console.
3. On the Yandex template (`yandex-games_iframe.html`, the page served for geoconflict.ru), run the checks in
   *Verification steps*.
4. Read the YAN statistics and record the licensing model (step 8).

**If a live restore drill of the profile box is planned in the same window:** run it only **after** migration `009`
is on the box — the runbook says so
([`profile-backup-restore-runbook.md`](../../../knowledge-base/profile-backup-restore-runbook.md), the note *"Run a
live drill only after migration `009` is deployed to the box (task `0491`)"*). The drill is not part of this task.

## Verification steps

1. Both deploys done, profile box first; the worklog records the date and deployed version of each.
2. `rewarded_video` turned on in the Yandex console; the worklog records the date.
3. **XP doubles, once.** As a logged-in **non-citizen**, after a multiplayer match that gives XP, the end-of-match popup
   shows the XP explainer and the watch button; watching to the end grants the extra XP (the popup says so, and the
   player's XP rises by this match's XP once more). Pressing again, or reopening the popup in the same match, grants
   nothing more.
4. **A citizen does not see the offer** (a paid or earned citizen account): the popup shows no watch button.
5. **A guest sees the log-in prompt**: the XP explainer plus "log in to earn and double XP", and **no video**.
6. **Sound mutes during the ad** and comes back after it.
7. **No back-to-back interstitial on the same page**: pressing Exit / Keep / Spectate within 60 s of a rewarded video
   shows no interstitial on that page. (An interstitial on the **next** page after Exit is residual R1, not a failure.)
8. **YAN statistics:** in the YAN partner interface → Statistics, filters "Site / App" + **"Ad unit name"** (not "Ad
   unit type" — every Games block is typed "Banner"), the rewarded unit shows separately from the fullscreen one.
   **Record which licensing model applies** — the doc says this route is for developers **not** under the "unified
   licensing model", and which model we are on is unknown (plan check 6). If the split is not available, say so.
9. **GameAnalytics:** the `Ad:Rewarded:*` events appear — at least `Ad:Rewarded:OfferShown`, `Ad:Rewarded:Pressed`,
   `Ad:Rewarded:Opened`, `Ad:Rewarded:Watched`, `Ad:Rewarded:Reward:Granted`; plus `Ad:RewardedSuppressed:Citizen`
   (step 4) and `Ad:Rewarded:LoginOfferShown` (step 5). Event names per
   [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md).
10. The worklog records each result and date. No connection strings, endpoints, keys or player ids in it.

## Notes

- **Depends on:** 0491, 0488 (and both deploys — profile box first, then the game client)
- **Blocks:** nothing
- **Owner ruling, placement:** see `## Sprint` above (*"Sprint 9 (Recommended)"*, 2026-10-24).
- **Deploys** in weekend slots unless urgent (owner rule); committed is not deployed. Nothing is committed or pushed
  without the owner's explicit ask.
- **Spec:** `0488`'s owner-approved
  [`plan.md`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/plan.md) —
  § *3. Frequency rules, and keeping interstitials away*, § *6. Revenue and impression data*, § *Build vs verify,
  deploy*.
