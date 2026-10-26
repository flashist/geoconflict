# 0488 — worklog

## 2026-10-24 — Owner answers: the reward, where it appears and how often, who sees it

**Provenance.** OWNER ANSWERS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (each
typed, not a listed option), relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Quoted exactly as relayed. Recorded by
a spawned `fkit-producer`. The brief's *Owner rulings — 2026-10-24* section (R1–R3) carries the same text.

### R1 — "Rewarded ad: what does the player get for watching?" (owner question 1)

> *"For now only double match XP, without daily caps (the simplest possible implementation). In the future, as an
> additional monetization channel, we might give users an option for "testing" some customizations for the rewarded
> ads."*

⇒ **Settled:** double this match's XP; **no daily cap**.
⇒ The "testing customisations" idea: recorded as a **later idea, not in scope**. No brief filed.

### R2 — "Rewarded ad: where does the button appear, and how often?" (owner questions 2 and 3)

> *"End of match, not cap, can be shown after each match that gives XP (also will be very informative for users to
> tell them more about the XP, this popup will make it clear that they are given XP after losing/winning/match end),
> if we already have any popup that is shown at this moment in the game, we can reuse it and develop on top of it. "*

⇒ **Settled:** the end-of-match moment, after every match that gives XP; no cap of our own. Reuse the existing
end-of-match popup if there is one (the producer knows of `WinModal`; the coder confirms). The popup also explains XP —
that it comes after a win, a loss or a match end.
⇒ **Producer's reading, for the owner to confirm at plan approval (not a ruling):** at most one reward per match.
⇒ Yandex's own frequency and moderation rules still apply (plan check 3).

### R3 — "Rewarded ad: who sees the offer?" (owner questions 4 and 5)

> *"This popup should be shown only to non-citizens. The idea about showing it to guests is a good thing too. Players
> who are already citizens shouldn't show this popup."*

⇒ **Settled:** non-citizens only; citizens — paid and earned — never see it. Question 4 (paid citizens) is settled by
this: they do not see the offer at all.
⇒ **Settled:** guests see it too.
⇒ ⚠️ **OPEN design point (not a ruling):** a guest has no profile and no XP. The lead's reading: a "log in to get the
reward" prompt. A plain login prompt does not need `0484`; a seamless continue would. The coder's plan proposes one;
the owner confirms at plan approval.

### What was changed (2026-10-24, by the spawned producer)

- `brief.md`: added *Owner rulings — 2026-10-24* (R1–R3, verbatim); owner questions 1–5 marked settled, with the guest
  design point left open; the trade-off note records the no-cap choice; plan checks 3 and 5 annotated; analytics,
  out-of-scope, verification steps 1, 2 and 4, and Notes updated to match. Plan-step checks 1–6 kept.
- **Not changed:** the sprint board, this task's rank (18) and status (`🔲 Backlog`). Rank is being asked of the owner
  separately by the lead.

## 2026-10-24 — Plan approved

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (each a
listed option), relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with
no owner channel (ADR-021/037); ⛔ not producer precedent. Quoted verbatim as relayed. Recorded by a spawned
`fkit-producer`. The approved plan is [`plan.md`](plan.md) (not edited by this entry).

1. *"Approve the 0488 rewarded-ad plan?"* → **"Approve as planned (Recommended)"**: *"Includes: one reward per match,
   60 s gap before a forced ad, a lost reward is not retried on next page load."*
2. *"Guests (no XP to double): what do they see?"* → **"Plain 'log in' prompt (Recommended)"**: *"XP explainer + 'log
   in to earn and double XP'. No video. XP counts from their next match."*
3. *"Split the server part into its own Sprint 9 task?"* → **"Split it (Recommended)"**: *"New server task on Sprint 9;
   0488 (client) waits on it. Server deploys first. Nothing else waits on 0488."*
4. *"Add a remote on/off switch for the offer (Yandex console flag)?"* → **"Yes, starts off (Recommended)"**: *"Offer
   stays off until you turn it on in the Yandex console; turn off anytime without a deploy."*

⇒ Ruling 1 confirms the R2 reading (at most one reward per match). Ruling 2 settles the open design point under
question 5 (plain login prompt, not seamless; no video for guests).

### What was changed (2026-10-24, by the spawned producer)

- Server split filed as [`0491`](../../done/0491-profile-box-rewarded-ad-match-xp-grant-route-server-part-of-0488/brief.md)
  (plan Part S, steps 1–6 + Part S tests), Sprint 9, rank 20 (append rank), owner `fkit-coder`; `Depends on:` nothing,
  `Blocks:` 0488. Deploy order: profile box first, then this client.
- `brief.md`: `Depends on:` `nothing` → `0491` (ruling 3 quoted); build scope noted as plan **Part C** (steps 7–12 +
  client tests).
- Sprint 9 board: row, addendum and Notes line for `0491`. Placement check: none (checked: plan-sprint-9.md).
- **Not changed:** `plan.md`; this task's rank (18) and status (`🔄 In progress`). The brief's other "open" markers
  (question 5, R2 reading) are settled by rulings 1–2 above but were not rewritten in the brief.

## 2026-10-24 — Part C built (plan steps 7–12 + client tests)

**Provenance.** Spawned `fkit-coder`, **Build worker**, under the ADR-055 declared-approval marker from `fkit-lead`
(driving `/fkit-sprint-ship-loop` on Sprint 9). Approved plan: [`plan.md`](plan.md), blob
`3a2e4e5104bd151176219f3d1e0b9b1878df4eaa` (re-checked with `git hash-object` before building). Owner approval quoted in
the 2026-10-24 *Plan approved* entry above. Nothing committed or pushed. Part S (0491) files not touched.

### Change surface
- `src/client/flashist/FlashistFacade.ts` — the `Ad:Rewarded:*`, `Ad:RewardedSuppressed:Citizen` and
  `Ad:InterstitialSuppressed:AfterRewarded` event keys; the `rewarded_video` flag constants + `isRewardedVideoEnabled()`;
  `isRewardedVideoAvailable()` (sync); `showRewardedVideo(onRewarded, setGameSoundMuted)`; a module-level
  last-rewarded timestamp (`INTERSTITIAL_GAP_AFTER_REWARDED_MS` = 60 s) read by `showInterstitial()` after the no-SDK
  return and after the unchanged 0248 paid-citizen check; `resetRewardedVideoForTests()`.
- `src/client/RewardedMatchXpOffer.ts` (new, pure) — `deriveRewardedOffer()` → `hidden` / `watch` / `log_in`, plus an
  `isSuppressedForCitizen` flag for the citizen event.
- `src/client/RewardedMatchXpClaim.ts` (new) — `claimRewardedMatchXp(gameId)`: `profileFetch` POST with `{ gameId }`
  only, per-`gameId` latch (a second call returns the first promise), retries after 2 s / 5 s / 10 s, never throws, one
  `Ad:Rewarded:Reward:*` event per match. Reuses 0491's `RewardedMatchXpResponseSchema`.
- `src/client/graphics/layers/WinModal.ts` — the offer section (XP explainer, watch button or guest login, result
  text), shown with the buttons after the existing 3 s delay (timer body moved into `revealButtons()`); per-`gameId`
  state shared by the death and match-end popups; `_handleExit` waits ≤ 5 s for a running claim; Howler muted/unmuted
  through the facade hook.
- `resources/lang/en.json`, `ru.json` — 11 new `win_modal.*` keys (the plan's 10 + `rewarded_claiming`).
- `ai-agents/knowledge-base/analytics-event-reference.md` — the AfterRewarded row, a "Rewarded video (task 0488)" block
  in Ad Events, and `rewarded_video` in the feature-flag list.
- Tests (new): `tests/client/RewardedVideo.test.ts`, `RewardedMatchXpOffer.test.ts`, `RewardedMatchXpClaim.test.ts`,
  `InterstitialAfterRewarded.test.ts`. Extended: `tests/client/WinModal.test.ts` (mocks for the new facade methods,
  `howler` and the claim; `createGame` gains `gameID()` / `isReplay()`; 9 new cases).
- HTML templates: **no change**, confirmed — `<win-modal>` is in `index.html` and `yandex-games_iframe.html`, once each.

### Commands and results
- Targeted: `npm test -- tests/client/RewardedVideo.test.ts tests/client/InterstitialAfterRewarded.test.ts
  tests/client/RewardedMatchXpOffer.test.ts tests/client/RewardedMatchXpClaim.test.ts` → 4 suites, 39 tests passed.
  `npm test -- tests/client/WinModal.test.ts` → 16 passed (first run: 6 of the new cases failed — the component did not
  re-render on the new `@state` fields under jest; fixed by calling `requestUpdate()` after each change, the file's own
  existing pattern in `show()`/`hide()`).
- Full: `npm test` (one run, via the npm script / project lock) → **234 suites, 4859 tests passed**, 95.7 s, exit 0; no
  skipped tests, no supertest flake, no re-run.
- `npx tsc --noEmit` → clean. `npm run lint` → clean.
- Prettier: new files formatted; `FlashistFacade.ts` and `WinModal.test.ts` were prettier-clean at HEAD and are again.
  `WinModal.ts` was already unformatted at HEAD; only my hunks were formatted, the old drift was left alone.

### Skipped
- `npm run test:integration` — no DB code touched in Part C.
- Live run on the Yandex template (SDK call, callback order, sound pause) — the verify task's job; not runnable locally
  (the standalone page has no SDK, so the offer never shows in local dev).

### Decision log (obvious-winner calls, each within the plan's intent)
1. **Mute hook instead of importing Howler into the facade.** `showRewardedVideo` takes `setGameSoundMuted`; `WinModal`
   passes `Howler.mute`. Why: `FlashistFacade` is in the boot bundle (`Bootstrap.ts`), Howler only in the app chunk —
   importing it would add Howler to every page's first load. Behaviour is the plan's (muted on `onOpen`, unmuted on
   close/error).
2. **Retries also on network errors and 5xx**, not only `not_credited`. Why: the plan's edge case says "in-session
   retries only" for a network failure after `onRewarded`; the server's primary key makes a retry unable to double-pay.
   4xx, no session and a bad body are final (`failed`), never retried.
3. **`duplicate` shows the granted text.** Why: the plan has no duplicate key; to the player it means "this match was
   already rewarded". The event stays distinct (`Ad:Rewarded:Reward:Duplicate`).
4. **One extra lang key, `win_modal.rewarded_claiming`** ("Adding XP…"). Why: a claim can take up to ~20 s with
   retries, and the plan's keys have no in-progress text.
5. **No login-restart event from the guest prompt.** Why: the plan says a mid-match login gets no reload and the session
   starts on the next load; dispatching the card's `citizenship-login-succeeded` would add `Profile:Login:Restart:*`
   events that belong to the card's funnel. Exit's navigation is a full page load.
6. **The interstitial gap starts when a video that reached the screen settles** (`onOpen`, `onRewarded` or `onClose`
   seen); a video that only errored does not block the next interstitial. Why: "back-to-back" needs an ad on screen.
7. **`onRewarded` after `onClose` still grants** (once). Why: Yandex counted the impression, and rule 4.5 says a
   completed watch is rewarded; the latch keeps it to one claim.
8. **`error` and `unavailable` share the "no ad right now" text** — the plan's result list names one "no ad" text.

No fix applied without asking outside these; no Part S file changed.

## 2026-10-24 — Review round 1 processed (spawned Process-review worker, fkit-lead / sprint ship loop)

- `review.md`: R1 and R2 verified at file:line, both CORRECT, severity low (mine). Both owner-ruled not to fix
  (2026-10-24, `AskUserQuestion` in the fkit-lead session: R1 "No, page-only"; R2 "No, accept it"). Coder response
  rows written as `won't fix (frontier)`; two Accepted residuals added; ledger `Status: closed-out`.
- No code change. No tests run: ledger-only change, so no full `npm test` was needed.

### Decision log (review round 1)
- Fixes applied without asking: **none**.
- Obvious-winner calls: **none**.
