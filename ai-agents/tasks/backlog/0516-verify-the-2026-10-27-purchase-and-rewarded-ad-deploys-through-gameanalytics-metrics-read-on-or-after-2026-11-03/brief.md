# Verify the 2026-10-27 purchase and rewarded-ad deploys through GameAnalytics metrics (read on or after 2026-11-03)

## ID
0516

> ℹ️ **ID allocation, checked 2026-10-28 before filing.** Highest existing ID `0515` on all three boards (folder names
> and `## ID` fields agree, base-10) → `0516`.

## Sprint
Sprint 9

> 📌 **Filed 2026-10-28 on OWNER RULINGS** given in the `fkit-lead` session and relayed to a spawned `fkit-producer`
> with no owner channel (ADR-021/037); ⛔ not producer precedent.
> - Typed by the owner, verbatim: *"cancel the verification by hand task, brief a task to verify it by metrics after
>   some amount of time (e.g. by checking the GameAnalytics metrics)"*.
> - *"Which hand-run check tasks should the producer cancel?"* → **"The 4 purchase ones (Recommended)"** — option text:
>   *"Cancel 0493, 0498, 0499, 0512. Keep 0511 (server checks, no purchase); their server-side steps move into 0511.
>   Knock-on: none (checked)."*
> - *"How long after the 27 Oct deploy should the metrics be read?"* → **"1 week, ~3 Nov"**.
> - *"Where should the new metrics-verification task go?"* → **"Sprint 9 (Recommended)"** — option text: *"Stays
>   visible. Knock-on: Sprint 9 can't close until the read date; no other task waits on it."*

## Priority
42

> ⚠️ Priority 42 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0511`**, because it replaces the cancelled checks of the same 2026-10-27
> deploys, and `0511` carries the server half of them. Appended after the board's highest rank (41), never inserted
> (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **NEEDS THE OWNER'S CHROME.** GameAnalytics (game 330439) is read in the owner's Chrome with the
owner logged in himself, as in
[`0418`](../../done/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)
and [`0455`](../../done/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md).
The lead may drive GameAnalytics through that Chrome. Editing or saving any GameAnalytics asset only on the owner's yes.

## Context

**What this is, in plain terms.** On 2026-10-27 three bundles of work went live: the profile box (B1/B4/S1 —
[`0492`](../../done/0492-profile-box-product-grant-registry-becamepaidcitizen-and-per-entry-reconcile-b1/brief.md), [`0496`](../../done/0496-durable-items-base-entitlements-migration-item-grant-branch-private-ownership-and-already-owned-refusal-b4/brief.md), [`0506`](../../done/0506-build-stop-consuming-permanent-purchases-citizenship-per-the-0505-design/brief.md),
[`0491`](../../done/0491-profile-box-rewarded-ad-match-xp-grant-route-server-part-of-0488/brief.md)) and then the game
client ([`0495`](../../done/0495-client-guest-log-in-and-buy-continues-straight-into-the-purchase-citizenship-first-b3/brief.md)
guest "Log in and buy", [`0510`](../../done/0510-client-stop-consuming-permanent-purchases-held-elsewhere-offer-and-coordinator-end-state-s2/brief.md)
stop-consuming, [`0488`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md)
rewarded video). Four hand-run live checks were filed for them. Most of their remaining steps needed a **real paid
purchase on a non-citizen account**, which the owner does not have. The owner cancelled them and asked for this one
task instead: **read the real players' numbers in GameAnalytics a week after the deploy**.

**Replaces (cancelled 2026-10-28):**
[`0493`](../../cancelled/0493-verify-0492-live-citizenship-purchases-still-grant-after-the-b1-profile-box-deploy/brief.md) (B1v),
[`0498`](../../cancelled/0498-verify-0495-live-inside-yandex-guest-log-in-and-buy-opens-the-payment-window-with-no-second-tap/brief.md) (B5),
[`0499`](../../cancelled/0499-verify-0491-and-0488-live-the-rewarded-ad-doubles-match-xp-inside-yandex-after-both-deploys/brief.md) (rewarded ad),
[`0512`](../../cancelled/0512-verify-0510-pre-release-checks-t1-t3-on-the-yandex-test-copy-then-live-after-the-game-deploy-s2v/brief.md) (S2v).
Their **server-side, read-only** steps moved into
[`0511`](../../done/0511-verify-0506-live-the-profile-box-answers-held-purchases-quietly-and-says-consume-false-for-citizenship-s1v/brief.md)
(its steps 8–12). Their worklogs stay in their folders under `cancelled/`.

### What the hand-run checks already proved live on 2026-10-27 (from their worklogs — not to be redone)

- **Citizenship purchase grants on the new box with the new client** (`0493` step 1, grant half): account B bought at
  ~15:03 UTC; the box's newest `processed_purchases` row is that purchase. 2–3 reloads afterwards were quiet (no restart
  popup, no card redraw, no inbox message) — `0512` T1 met by owner ruling *"Count the live checks (Recommended)"*.
- **T3, purchase scope across accounts** (`0512` step 3): in the same browser, account A loaded its own profile;
  `purchase_holder_sightings` stayed 0. Caveat kept: only catches the failure if A's session is verified.
- **Guest "Log in and buy" opens the payment window with no second tap** (`0498` step 2, spec §1(a) item i): owner,
  verbatim, *"Payment opened by itself"*. The 15 s deadline held on that one run. No payment was made.
- **Rewarded video doubles XP** (`0499` step 3, first half): offer shown to a logged-in non-citizen, ad played to the
  end with sound off, XP doubled (owner: *"Offer showed, XP doubled"*). `rewarded_video` is **on in production, on
  purpose** (owner: *"yes, and it's fine"*).
- **Box side** (`0511`): migrations `009`–`012` applied; `purchase_holder_sightings` 0; boot log reads
  `payments consume-permanent: OFF (ConsumePermanentSetting.ts)`.

### Baseline already read (by the lead, 2026-10-28, for 27 Oct — about half a day after the deploy)

| Area | 27 Oct counts |
|---|---|
| Rewarded (logged-in) | 150 offer → 32 pressed → 32 opened → 30 watched → 30 `Reward:Granted`; `Error` 1; no `ClosedEarly`, `Duplicate`, `NotCredited`, `Failed` |
| Rewarded guest login offer | 154 → 14 → 1 |
| Guest "Log in and buy" | 1 tap → `Login:Requested` → `Login:Cancelled` |
| Suppressed | `Ad:RewardedSuppressed:Citizen` 109 · `Ad:InterstitialSuppressed:AfterRewarded` 18 · `Ad:InterstitialSuppressed:PaidCitizen` 57 |
| Citizenship purchases | 51 `Started`, 48 `Abandoned`, 1 `Completed` |

**Box-side data point for the purchase checks (step 2):** 61 `/intent` vs 1 `/complete` since the deploy (27–28 Oct,
nginx on the profile box, read 2026-10-28; recorded in
[`0511`'s worklog](../../done/0511-verify-0506-live-the-profile-box-answers-held-purchases-quietly-and-says-consume-false-for-citizenship-s1v/worklog.md)).

### GameAnalytics assets already built (2026-10-27, game 330439)

- **Funnels:** "Ads: Rewarded Video (logged-in)", "Ads: Rewarded Video (guest login offer)", "IAP: Guest 'Log in and
  buy' Citizenship".
- **Dashboards:** "Ads: Rewarded Video" (new); "IAP: Citizenship" (3 new widgets at the bottom).
- ⚠️ **Some event names in these were typed by hand and are unconfirmed until they fire.** Exact names per
  [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md):
  `Purchase:Login:Succeeded:Citizenship`, `Purchase:Continue:Ready:Citizenship`,
  `Purchase:Continue:NeedsTap:Citizenship`, `Purchase:Blocked:AlreadyOwned:Citizenship`,
  `Purchase:Blocked:EarlierPurchasePending:Citizenship`, `Purchase:Blocked:OtherProfile:Citizenship`,
  `Purchase:HeldOnOtherProfile:Citizenship`, `UI:Tap:TelegramLinkHeldElsewhere`, `UI:Tap:VkLinkHeldElsewhere`.

### What metrics CANNOT prove — stated up front

GameAnalytics counts client events. It cannot see Yandex billing or the profile box. These stay **unproven** unless
`0511` covers them:

| Not provable by metrics | Where it stands |
|---|---|
| **Only one charge** per purchase (Yandex billing) | **Accepted as unproven.** GameAnalytics sees grants, not charges. |
| **`consume:false`** — the purchase stays in Yandex's purchase list | Server answer: `0511` step 2 (needs a purchase; may stay unproven). The Yandex-list half: **unproven.** |
| Reconcile answers a held token quietly; a stray purchase is still granted by reconcile | `0511` steps 3 and 11 (11 = passive counter evidence, no purchase). |
| Server counters, log-line leak check, reconcile 500s / `reconcile entry failed`, box and game versions | `0511` steps 4, 5, 8, 9, 10. |
| The grant lands on the **account** that just logged in | **Partly.** A per-player funnel shows the same GameAnalytics player went Login → Completed; it cannot name the account. |
| T2 (tab closed before `/complete`), T4 (held on another profile, live) | **Unproven** (T4 is covered by `0510`'s tests only). |
| Sound mutes/unmutes; no watch button rendered for citizens; no interstitial on the **same page** right after a rewarded video (residual R1) | **Indirect only:** suppression counts show the gates fire; what the player saw is not measured. |
| Restart popup's buttons work; cancelling login gives exactly one reload | **Indirect only** (`Citizenship:RestartPrompt:*`, `Purchase:Login:Cancelled:Citizenship` counts). |

### Expected volume — low

About **1** guest "Log in and buy" tap and about **1** completed citizenship purchase **per day**. Several checks below
may not get enough data in one week. "Too little data" is defined per check below (thresholds: the producer's
proposal, not owner-ruled). **What happens then is owner-ruled (2026-10-28, see `## Notes`): a thin check is re-read
once ~2026-11-10; whatever is still thin then is accepted as unproven.** A thin check is never recorded as a pass.

## What to build

Nothing in code. One GameAnalytics read in the owner's Chrome, on or after **2026-11-03**, recorded in this folder's
`worklog.md`.

- **Read window:** the full UTC days from **2026-10-28** to the last full day before the read (at the earliest
  28 Oct – 2 Nov, six days). 27 Oct is a part-day around the deploy: report it separately, never inside the window.
  Record GameAnalytics' time zone setting.
- **Comparison window (for purchases and interstitials only):** the seven full days before the deploy,
  **2026-10-20 – 2026-10-26**.
- **Which client was live:** the repo has version-bump commits `0.0.166` and `0.0.167` (27 Oct, ~14:28 and ~14:33 UTC);
  which one is live is unconfirmed. If GameAnalytics offers a build filter, read the build split for the window. The
  box-side read is `0511` step 9.
- ⛔ **Never copy a GameAnalytics user id, session id, token or URL** into chat, a worklog, a brief or any tool. Event
  names, counts, dates and the names of saved funnels/dashboards only.

The thresholds below are the **producer's proposal**, not owner-ruled; the owner may change any of them at the read.

## Verification steps

1. **Event names confirmed.** For each hand-typed name listed in *Context*, record: fired in the window (yes/no, count),
   and whether the saved funnel/widget step uses exactly the name in the event reference. A name that never fired is
   **"unconfirmed — never fired"**, not a pass. A wrong name in a saved asset is fixed only on the owner's yes.
2. **Citizenship purchases still complete** (replaces `0493` steps 1–2, `0512` steps 6–7 at the client level). Daily
   `Purchase:Started`, `:Completed`, `:Abandoned` (all `:Citizenship`) for the window and the comparison window.
   - **Pass:** `Completed` ≥ 3 in the window, and `Completed` + `Abandoned` ≈ `Started`.
   - **Fail:** `Completed` = 0 while `Started` ≥ 30 in the window.
   - **Too little data:** anything between.
   - **Flag to the owner (not a fail):** the window's Completed/Started rate is under half the comparison window's.
   - Also record `Citizenship:RestartPrompt:Shown` and `:Restart` counts. ADR-125: every purchase ends in a restart
     prompt, so `Shown` should be roughly ≥ `Completed`; a clear shortfall is flagged.
3. **Guest "Log in and buy" works in the wild** (replaces `0498`). From the funnel "IAP: Guest 'Log in and buy'
   Citizenship" and Explore: counts of `UI:Tap:PurchaseLoginCitizenshipExplainer` → `Purchase:Login:Requested` →
   `Login:Succeeded` → `Continue:Ready` → `Started` → `Completed`, plus the side exits `Login:Cancelled`,
   `Login:ProfileFailed`, `Continue:NeedsTap`, and the three `Blocked:*`.
   - **Pass:** at least one player completes the whole chain to `Purchase:Completed:Citizenship`.
   - **Flag (fail candidate):** `Login:Succeeded` ≥ 3 and `Continue:Ready` = 0 while `Continue:NeedsTap` > 0 — the
     auto-continue the owner saw on 27 Oct is not working for players.
   - **Too little data:** `Login:Succeeded` < 3 in the window.
   - Record the `Purchase:Continue:Ready:Citizenship` **value** (ms, login to payment): count, mean and maximum, if
     GameAnalytics shows them. This is the data spec §15.2 item 1 needs to tune `AUTO_CONTINUE_DEADLINE_MS` (15 s),
     carried from `0498` step 6.
4. **No unexpected blocks or "held elsewhere" spikes** (replaces `0512` T4 at the client level, `0498` side exits).
   Daily counts of `Purchase:Blocked:AlreadyOwned`, `:EarlierPurchasePending`, `:OtherProfile`,
   `Purchase:HeldOnOtherProfile` (all `:Citizenship`), `UI:Tap:TelegramLinkHeldElsewhere`,
   `UI:Tap:VkLinkHeldElsewhere`.
   - **Expected:** near zero. A few `HeldOnOtherProfile` are the designed path for players with two profiles (the
     2026-10-26 incident, tasks `0502`–`0504`), not a defect.
   - **Flag to the owner:** any of them above 3 on one day, or above 10 across the window.
5. **Rewarded video pays out** (replaces `0499` steps 3 and 9). From "Ads: Rewarded Video (logged-in)" and Explore:
   `Ad:Rewarded:OfferShown`, `Pressed`, `Opened`, `Watched`, `ClosedEarly`, `Error`, `Unavailable`, and
   `Reward:Granted`, `Reward:Duplicate`, `Reward:NotCredited`, `Reward:Failed`.
   - **Pass:** `Reward:Granted` within 5 % of `Watched`, and `NotCredited` + `Failed` ≤ 2 % of `Watched`.
   - **Fail:** `NotCredited` + `Failed` above 2 % of `Watched`.
   - **Too little data:** `Watched` < 20 in the window.
   - **Residual R2 trigger** (`0488` review ledger): if `Watched` minus all four `Reward:*` outcomes is above 5 % of
     `Watched`, report it to the owner as R2's re-raise trigger.
6. **Rewarded gates fire** (replaces `0499` steps 4–5, indirectly). `Ad:RewardedSuppressed:Citizen` > 0 and
   `Ad:Rewarded:LoginOfferShown` > 0 in the window; record `LoginPressed` and `LoginCompleted` from "Ads: Rewarded Video
   (guest login offer)". A zero in either gate count is flagged.
7. **Interstitial suppression after a rewarded video is sane** (replaces `0499` step 7, indirectly).
   - **Pass:** `Ad:InterstitialSuppressed:AfterRewarded` > 0 and ≤ 2 × `Ad:Rewarded:Opened` in the window.
   - **Flag:** above that ratio (the 60 s gap may be swallowing more interstitials than intended).
   - **Too little data:** `Ad:Rewarded:Opened` < 20.
   - Also record daily `Ad:Interstitial` for the window and the comparison window; flag a drop of more than 20 % in the
     daily average to the owner (income check; it may have other causes — not investigated here).
8. **YAN statistics** (carried from `0499` step 8 — a metrics read, not a purchase). In the YAN partner interface →
   Statistics, filtered by "Site / App" + **"Ad unit name"**: does the rewarded unit show separately from the
   fullscreen one, and which licensing model applies. If the split is not available, say so.
9. **Verdict.** One line per step 1–8: pass / fail / flag / too little data. Every fail and flag put to the owner, with
   the owner's answer in his words (or recorded as still open).
10. **No secrets:** no id, token, session, URL, connection string or player id in any artifact.

## Notes

- **Depends on:** 0488, 0491, 0495, 0506, 0510
- **Blocks:** nothing
- **Time-gated — the real gate:** all five builds are closed and deployed (2026-10-27), so the board may show this task
  as ready. **It is not ready before 2026-11-03** (owner ruling *"1 week, ~3 Nov"*). Reading earlier gives a short
  window and must say so.
- **Knock-on (stated in the owner's option):** Sprint 9 cannot close until the read date; no other task waits on this
  one.
- ✅ **Too little data — OWNER RULING, 2026-10-28**, given via `AskUserQuestion` in the `fkit-lead` session, relayed to
  a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Asked *"If a 0516 check has too little data on
  3 Nov, what happens?"* → **"Re-read ~10 Nov (Recommended)"** — option text: *"Thin checks get one more week, then
  whatever is left is accepted as unproven. Knock-on: 0516 stays open until ~10 Nov, so Sprint 9 can't close before
  then; no other task waits."* So: at the 3 Nov read a thin check is recorded "too little data — re-read ~10 Nov";
  at the ~10 Nov re-read (window extended to the last full day before it) a still-thin check is recorded "accepted as
  unproven", and the task can close. ⚠️ The thresholds themselves (fewer than 3 completed purchases, 3 guest logins,
  20 rewarded watched, 20 rewarded opened — steps 2, 3, 5, 7) were shown to the owner in the lead's explanation but
  **not ruled on separately**: they stay the producer's proposal.
- ✅ **Step 8 (YAN) kept — OWNER RULING, 2026-10-28**, same channel (relayed; ⛔ not producer precedent). Asked *"Keep
  the Yandex ad-network (YAN) stats step in 0516?"* → **"Keep it (Recommended)"**. It was not in the original spawn's
  list of criteria; it is carried over from `0499` step 8.
- **Related:** `0511` (server half, steps 8–12 folded in from the cancelled tasks), `0455` (the GameAnalytics session
  model), `0418`.
- **Specs:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §1(a), §11, §15.2;
  [`2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../../../knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md)
  §10.3, §12; `0488`'s [`plan.md`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/plan.md).
- **ADRs:** [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md),
  [ADR-126](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md).
- **One task, not several:** one read session, one tool, one window; the steps share the same data. Splitting by area
  would mean several sessions in the owner's Chrome for no independent result.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
