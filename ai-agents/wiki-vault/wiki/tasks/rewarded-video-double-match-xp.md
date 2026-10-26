# Opt-In Yandex Rewarded Video — Watch an Ad, Double This Match's XP (task 0488)

**Source**: `ai-agents/tasks/done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 18 (ADR-035 append rank; placement is `fkit-lead`'s reading of the owner's "now") / task `0488` — client part (plan Part C); server part is `0491`

> ✅ Closed 2026-10-25. Plan owner-approved 2026-10-24; full `npm test` 234 suites / 4859 tests green; tsc and lint
> clean; stateful review closed (R1, R2 owner-ruled won't fix — accepted residuals).
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `a3c32b4`; `git tag --contains` → none ⇒ NOT deployed.** The offer
> also stays **off** until the owner sets the `rewarded_video` flag in the Yandex console. Live check: `0499`
> (Sprint 9, `🔲 Backlog`). ⚠️ The SDK call, callback order and sound pause were checked against Yandex's docs only,
> **never run on the Yandex template** — the standalone page has no SDK, so the offer never shows locally.

## Goal

An **opt-in** Yandex rewarded video to *"improve our rating and income"* (owner, 2026-10-24). The player presses a
button, watches a video ad, and gets a reward. It never plays by itself, unlike the interstitials. Split out of the
coin-economy talk `0480`, which the owner put **on hold** (*"Park it indefinitely in backlog"*) — so no coins, no
currency.

## Key Changes

**Owner rulings (2026-10-24, typed in the lead session, relayed):**
- **R1 reward:** *"For now only double match XP, without daily caps (the simplest possible implementation)."* A later
  idea — letting players "test" customisations for a rewarded ad — is **out of scope**, not briefed.
- **R2 where:** the end-of-match moment, after every match that gives XP, reusing the existing popup; the popup also
  explains XP (after a win, a loss or a match end).
- **R3 who:** non-citizens only — **no citizen, paid or earned**, sees it; guests too.
- **Plan approval:** **"Approve as planned (Recommended)"** (one reward per match; a 60 s gap before a forced ad; a lost
  reward is not retried on the next page load) · guests: **"Plain 'log in' prompt (Recommended)"** (no video; XP counts
  from their next match) · **"Split it (Recommended)"** (server part → `0491`) · remote switch **"Yes, starts off
  (Recommended)"**.

**Built (Part C):**
- `FlashistFacade.ts` — `isRewardedVideoAvailable()`, `showRewardedVideo()` around `ysdk.adv.showRewardedVideo`
  (reward started **only** from `onRewarded`, at most once; game sound muted on `onOpen`, restored on close/error;
  wrapped in the platform-dialog guard); the `rewarded_video` flag (fails closed); `showInterstitial()` skips a request
  within `INTERSTITIAL_GAP_AFTER_REWARDED_MS` (60 s — our number, not Yandex's) of a rewarded video.
- `RewardedMatchXpOffer.ts` (pure) — `hidden` / `watch` / `log_in`. Every citizen is hidden through
  `getCitizenshipStatus()`; `unknown` and `read_failed` are hidden too (fail closed). The `0248` paid-citizen ad gate
  sits only inside `showInterstitial()` and does not touch this path.
- `RewardedMatchXpClaim.ts` — calls `POST /v1/profile/rewarded-match-xp`; per-match latch; retries ~2 s / 5 s / 10 s
  (the base credit can land a moment after the popup); never throws.
- `WinModal.ts` — the offer section (XP explainer, watch or login button, result text) after the existing 3 s delay;
  state per `gameId` survives the death popup → match-end popup; Exit waits ≤ 5 s for a running claim.
- 11 new `win_modal.*` keys (en + ru); the `Ad:Rewarded:*` events ([[systems/analytics]]). No HTML template change.

## Outcome

- **The no-cap trade-off, owner-ruled (R1) and restated at plan approval:** 1 XP + 1 XP per match ⇒ earned citizenship in
  as few as **50 qualifying matches instead of 100** (25 instead of 50 with the maximum tenure grant). Free citizenship
  competes harder with the 249-Yan paid tier: more ad income, possibly fewer purchases.
- **Moderation:** Yandex 4.7 asks for gameplay to pause during an ad; a multiplayer match cannot pause. The offer shows
  only once this player's own play is over (same moment as today's interstitial) — a **known moderation risk**, not new.
- **Revenue:** the Yandex console shows only combined ad revenue; a rewarded vs interstitial split is in the YAN partner
  interface by "Ad unit name". ⚠️ Which licensing model the game is on is unknown — the owner checks.
- **Accepted residuals:** a watch whose base credit never arrives gets *"this match's XP wasn't recorded"* (rare; in
  tension with Yandex 4.5); a reward lost to a page close is not retried on the next load; review R1/R2 (owner: *"No,
  page-only"*, *"No, accept it"*).
- ⚠️ **Board follow-up not done:** `sprint-backlog.md`'s old unbriefed row *"Task 6 — Rewarded Ads: Minimal Version"*
  is still `🔲 Backlog` (re-checked at `4e9160a`) — the brief left it as a producer follow-up.

## Related

- [[tasks/rewarded-match-xp-grant-route]] — task `0491`, the server part this calls
- [[decisions/adr-112-free-xp-grants]] — amended 2026-10-24: the ad bonus has its own ledger
- [[tasks/paid-citizen-ad-free]] — task `0248`, the interstitial gate this path does not use
- [[tasks/profile-p2-wire-game-server]] — task `0217`, the base match-XP crediting this doubles
- [[systems/analytics]] — the `Ad:Rewarded:*` events and the `rewarded_video` flag
- [[systems/shared-purchase-flow]] — **not** used: a rewarded ad is not a purchase; shares the single-flight login dialog
- [[decisions/paid-items-purchase-rules]] — why the purchase rules do not apply
- [[decisions/sprint-9]] — the board (rank 18); live check `0499` at 28
- [[decisions/sprint-backlog]] — the old unbriefed *Task 6* row on `sprint-backlog.md`, not yet updated
- [[tasks/parked-paid-features-discussion]] — task `0343`: item G (coins + rewarded ads), from which this was split
