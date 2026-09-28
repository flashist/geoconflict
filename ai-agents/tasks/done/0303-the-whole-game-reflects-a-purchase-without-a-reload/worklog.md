# 0303 — worklog (build, 2026-09-28)

Built by `fkit-coder` as the **Build worker** of `fkit-sprint-ship-loop` (driven by `fkit-lead`), under
the declared-approval marker: approved plan = `plan.md` (blob `480e5d841fea610233ad1dfd6cb936a0516b9731`,
17355 bytes, re-hashed before building — match). `plan.md` and every status were left untouched. Nothing
committed.

## Owner rulings (quoted verbatim from `plan.md`)

### Round 1 — 2026-09-28, live via AskUserQuestion in the `fkit lead` session, relayed by fkit-lead
- **Q1** (how the game catches up): **"'Restart to apply' popup"**. Option text: *"After paying, a popup offers a restart. Covers everything, but an extra tap + up to ~5 s reload in Yandex; needs new text, a popup, 3 analytics events."* This was **not** the recommended option. The owner chose (B), **not** "Both".
- **Q2** (the free tenure-gift citizenship): **"Yes, same signal (Recommended)"**. Option text: *"~10 extra lines + tests. Free and paid citizens behave the same — which the privacy fix also needs."* ⚠️ This was asked under the (A) framing, so its meaning under (B) is unclear. It goes back to the owner as **NEEDS-DECISION Q-A**. It is not guessed here.
- **Q3:** **"Accept, ★ from next match (Recommended)"**.
- **Q4:** **"Tests + next real purchase (Recommended)"**.

### Round 2 — 2026-09-28, live via AskUserQuestion in the `fkit lead` session, relayed by fkit-lead
- **Q-A (the free tenure gift under the popup):** "Same restart popup after (Recommended)" — After they close the thank-you popup, the same restart popup appears — only for players the gift made citizens. ~15 lines + tests. Two popups in a row, once ever. ⇒ Build step 9 applies, option 1 (`TenureGrantModal.show()` gets `onClosed`).
- **Q-B (popup text):** "Approve as written (Recommended)" — the table above, en + ru, exactly.
- **Q-C (optional extras):** "Leave both out; file (ii) (Recommended)" — 0303 stays exactly as ruled; the producer files (ii) (the stale-read race) as its own small task.
- **Plan approval:** "Approve (Recommended)" — with the Q-A to Q-C answers built in and the four "Decided without asking" items as described.

## Step 0 — inventory (round-1 table, copied unchanged as the plan requires)

Step 0 — inventory. Read from the tree on 2026-09-28, game version 0.0.154 (`package.json:3`). It includes the uncommitted 0302/0314/0250-S1 work.

**Where purchases and grants happen (client)**
- Buying is possible from one place only: the card's buy button, `CitizenshipCard.ts:581-637`, which runs `runCitizenshipPurchase()` (`CitizenshipPurchase.ts:27-88`). 0301's popup will reuse the same function; 0301's brief already says "the card listens for the grant".
- Server-confirmed grant paths:
  - **(a) Purchase.** Returns `"granted"` (`CitizenshipPurchase.ts:76-88`).
  - **(b) Start-of-session reconciliation.** Fires `PURCHASES_RECONCILED_EVENT` (`PaymentsReconciliation.ts:24` and `:78`). It sits behind the kill switch at `:57-59`.
  - **(c) Tenure grant (earned).** Handled at `CitizenshipCard.ts:187-205`; it can turn a player into a citizen mid-session.
  - **(d) Match-end XP (earned).** Not a mid-session case: leaving a match reloads the page (`WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160`, `Main.ts:700`, all through `changeHref`).
- Server side: the inbox message is sent after the database commit and **not awaited**. Purchase: `PaymentsRepository.ts:171-185, 197-210`. Earned: `PlayerProfileRepository.ts` around `:379`. So a client re-read made straight after "granted" can arrive before the message row exists.

**How each surface behaves after a purchase, with no reload**

| Surface | Where it reads | When it reads | Updates? |
|---|---|---|---|
| Card: citizen state, full bar, buy button gone | `CitizenshipCard.ts:90` (`paidGrantConfirmed`); `:356` (`isCitizen`); `:419` (buy-button rule) | On init (`:140`), after a purchase (`:625-629`), on reconciliation (`:125-128`, `:156-160`), after a tenure grant (`:201`) | **Yes.** Seen live in 0.0.154 (0297 worklog §3). |
| Card XP figure | `:407` `profile.xp` | Same as above | Under S1 every citizen reads 100 / 100. **If the re-read fails, it shows "0 / 100" next to a full bar** (the zero-state comes from `PlayerProfileView.ts:80-86`). |
| Name-change control | `CitizenshipCard.ts:426` (`isCitizen && isAuthoritative`) | Same as above | Yes if the re-read works. **No if it fails**: the empty fallback profile is not trusted (`isAuthoritative: false`), so the control stays hidden until a reload. |
| Private-lobby Create lock (0302) | `PrivateLobbyAccess.ts:36-46`, subscribed at `:67-68` to `CitizenshipStatus.ts:37-64` | Whenever the card publishes (`CitizenshipCard.ts:164`, `:170-174`, `:627`) | **Yes.** Already live, so 0302 is folded in. |
| Bell unread dot | `NewsButton.ts:77-81`, reading the `Inbox.ts` cache | Once at init (`NewsButton.ts:48-52`) and on reconciliation (`:44-47`, `:73-75`) | **No.** Confirmed live in 0.0.154. Also affected by the race above. |
| Personal tab in the news popup | `NewsModal.ts:70-75`, `:211`, `:220` | Opening the popup refreshes (`NewsModal.ts:349`) | Yes, **but it appears late**: the popup opens with the stale cache and the tab appears when the fetch returns. Same race. |
| Inbox welcome message (content) | `PublicProjection.ts:99-123` | — | Under S1 the neutral `citizenship_granted` text. Only the oldest citizenship message is kept, so a player whose first citizenship message is not this one gets no new dot. That is by design (S1). |
| ★ badge, in match (leaderboard, player panel) | `Leaderboard.ts:316`, `PlayerPanel.ts:442`, from `GameView.ts:342/466/503/553` | Fixed when the match starts (`GameServer.ts:542-544`) | **No** for the current match. Yes from the next one. |
| ★ badge in lobby lists (host / join-private) | `HostLobbyModal.ts:556`, `JoinPrivateLobbyModal.ts:91`, from server lobby info (`GameServer.ts:1040/1144`) | Server looks it up once per join (`GameServer.ts:1369-1391`; only ever sets true; carried across reconnect at `:277-279`) | **No** for the current lobby. The only late re-lookup is `update_identity` (`:424-437`), and that only fires when the id was unknown at join. |
| Private-match start check (server) | `GameServer.ts:956-966` | Looks the creator up again on demand | Yes. It heals itself. |
| Can the player buy while in a lobby or match? | `Main.ts:704-790` | — | **Public lobby: yes, from reading the code.** The start screen stays usable until the pre-start step hides the controls, around `Main.ts:751`. **Private-lobby popups: probably covered by the popup overlay.** **In a match: no** (a full-screen canvas covers the card; see `GameRestart.ts:59-61`). The browser check is still to do. |
| Kill-switch snapshot | `CitizenBadge.ts:31`, `FlashistFacade.ts:1057` | Primed at init | Reads the **on/off flag**, not the player's status. Not stale. The brief's correction stands. |
| Saved local match record | `ClientGameRunner.ts:469` | End of match | Display data from the roster fixed at match start. Not a gap. |
| Single-player citizen flag | `SinglePlayerModal.ts:554-555`, `Main.ts:872-873/948-949`, `LocalServer.ts:284-285` | — | Always false (0068 residual 3). Unchanged. |
| Ad-free (0248), archive (0030), the 0301 popup, name perks 0321/0322/0323 | — | — | **Not built.** Future perks. |
| Anything that reads status once at platform init and never again? | — | — | **None found.** Init-only reads are the on/off flags (`FlashistFacade.ts:685/832`, `PrivateLobbyAccess.ts:57-59`); status itself is always live. The login profile (`ProfileSession.ts:44`) exposes only `created` and `grantChecks`. |

**What 0250 S1 changes**
- For every citizen, the profile says `is_citizen: true`, `xp` is exactly 100, and `citizenship_earned_at` is null. The fields `is_paid_citizen` and `citizenship_purchased_at` are absent (`PublicProjection.ts:38-75`).
- So after a purchase the client learns "citizen", never "paid". The only local sign of payment is `paidGrantConfirmed` in the card, which is held in memory for that page load only.
- A reload therefore reveals **no** paid state until S3b, which needs 0325. Paid-only perks such as 0248 wait for S3b under either option.
- The 0017 `Citizenship:Earned:XP` event stays dormant (`PlayerProfileView.ts:102-106`). This task does not touch it.

## What was built

| Plan step | Where |
|---|---|
| 1 — offer logic | `src/client/CitizenshipRestartOffer.ts` (new) |
| 2 — purchase signal | `src/client/CitizenshipPurchase.ts` — `dispatchCitizenshipGrantedMidSession("purchase")` right before `return "granted"`, nowhere else |
| 3 — popup | `src/client/CitizenshipRestartModal.ts` (new), `<citizenship-restart-modal>` |
| 4 — wiring | `src/client/Main.ts` — controller field, `window` listener beside the login-restart listener, `onMatchStarting()` in the pre-start step, tag in the close list, `onBackOnStartScreen()` at the end of `handleLeaveLobby` |
| 5 — HTML | `src/client/index.html` and `src/client/yandex-games_iframe.html`, next to `<tenure-grant-modal>` |
| 6 — language redraw | `src/client/LangSelector.ts` |
| 7 — analytics | 3 keys in `flashistConstants.analyticEvents` (`FlashistFacade.ts`); 3 rows in `analytics-event-reference.md` § *Citizenship Events* |
| 8 — text | `citizenship_restart_modal.{title,body,restart,later}` in `en.json` and `ru.json`, exactly the Q-B table |
| 9 — tenure (Q-A option 1) | `src/client/TenureGrantModal.ts` (`show(params, onClosed?)`, called from the CTA); `src/client/CitizenshipCard.ts` `startTenureClaim` |

Not touched, as the plan says: `GameRestart.ts`, `PaymentsReconciliation.ts`, `NewsButton.ts`, `Inbox.ts`,
and the card's post-purchase branch.

## Decision log

### Carried from the plan (recorded here as step 10 asks)
- **Naming.** Element, keys and events are "citizenship restart", not "purchase restart", because the
  tenure gift can trigger the popup too (Q-A). Events `Citizenship:RestartPrompt:{Shown,Restart,Later}`,
  not split by source; `Purchase:*:Citizenship` unchanged.
- **`requestGameRestart` not reused.** Its events are the login restart funnel (`Profile:Login:Restart:*`)
  and would pollute 0274's monitoring; it refuses to reload without sessionStorage (a tapped button would
  do nothing in private mode); its latch guards an automatic reload loop, which this is not. Reused
  instead: `reloadApp()` and the same `gameStop !== null` match check.
- **No popup on session-start reconciliation.** Page just loaded; the surfaces read before the grant
  already listen to `PURCHASES_RECONCILED_EVENT`; a quick Restart could leave the consume unfinished and
  chain a second popup. Guarded by a new test in `PaymentsReconciliation.test.ts`.
- **Dropped from (A):** stale-read guard in `refreshProfile` (Q-C: producer files it separately),
  "threshold not 0" on a failed re-read (Q-C: left out), the `PURCHASES_RECONCILED_EVENT` rename, the
  failed re-read retry, the live bell refresh after purchase.

### Made at build time (all inside the plan; none changes behaviour the plan describes)
- **`restart()` returns a boolean** (true = reloading). The plan says a live match means "no reload, just
  hide" but gives the controller no hide dependency. The modal hides itself when `restart()` returns
  false. The modal receives the restart handler through `show(onRestart)`, which Main passes as
  `() => offer.restart()`.
- **`Restart` is logged by the controller, not the modal** (plan step 1 and step 7: "right before the
  reload"), so it never fires on a refused restart. The modal test therefore wires a real controller to
  check "Restart calls `restart()` and logs `Restart`".
- **`onGranted()` is a no-op once the popup has shown** (checked before and after the kill-switch
  await), so a second grant in the same load (purchase and gift) cannot re-show it.
- **`wasCitizen` is read before the claim** (plan wording), using the card's own
  `deriveCitizenshipStatus(profile, paidGrantConfirmed)`. After the re-read the same check decides. A
  failed re-read returns the non-authoritative fallback, which reads as not-citizen, so no offer.
- **Order of the two tenure conditions.** The card waits for the re-read first, then for the thank-you
  popup's close, so the signal fires whichever finishes last. Tested both ways.
- **No `<tenure-grant-modal>` in the page** (only possible in a broken page or a test): treated as
  already closed, so a gift that made a citizen still offers the restart.
- **`onClosed` fires from the CTA only, once** (cleared after the call). `hide()` alone does not call it,
  so nothing else can trigger the restart offer.
- **Main listener catches** a rejected `onGranted()` and logs a warning, instead of `void`, so an
  unexpected kill-switch error cannot become an unhandled rejection.
- **Formatter drift reverted.** `prettier --write` also reflowed unrelated lines in `LangSelector.ts` and
  one call in `CitizenshipPurchase.ts`; those were put back so the diff holds only 0303's change.
- **Analytics doc wording:** "gift count = Shown − Purchase:Completed" is written as approximate,
  because a purchase whose waiting popup was dropped by a match start has a Completed but no Shown.

### Unattended fixes applied as a review worker
- none (this was the Build step, not a review round).

## Verification

- `npx tsc --noEmit` — exit 0.
- `npx eslint` over every touched source and test file — exit 0.
- `npm run lint` (whole repo) — **1 error, not from 0303**: a parsing error on
  `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` ("not found by the project service"). That file is
  untracked, belongs to task 0325, and appeared in the tree during this build. Left alone.
- Touched suites (8): 153/153 pass.
- `npm test` (full, including the shell harnesses) — **162 suites, 2745 tests, all pass, first run**. No
  supertest flake occurred, so no re-run was needed.
- Mutation check on the tenure tests: removing the wait for the thank-you close, or the `wasCitizen`
  check, each turns one new test red.

## Not verified
- **The `Main.ts` wiring** (listener, `onMatchStarting`, `onBackOnStartScreen`, close list) has no unit
  test — no `Main.ts` test setup exists. Covered only by the owner's live check (Q4).
- **Live behaviour in the Yandex iframe**: the popup appearing, Restart reloading inside the iframe, the
  bell dot lit after the reload, and the three events arriving. Owner's check at the next real purchase
  (Q4).
- **Whether Yandex shows its own ad on the reload** (plan risk) — not checked.
- **The tenure → restart path live**: needs a player whose gift crosses the threshold; unit-tested only.

## Review round 1 — process-review (2026-09-28)

Done by `fkit-coder` as the **Process-review worker** of `fkit-sprint-ship-loop` (driven by `fkit-lead`),
under the declared-approval marker; approved plan blob re-hashed before starting (match). Ledger:
`review.md`, findings R1–R3. `plan.md`, statuses and *Reviewer findings* untouched. Nothing committed.

### Owner rulings — 2026-09-28, live via AskUserQuestion in the `fkit lead` session, relayed by fkit-lead (verbatim)
- **R1:** **"Accept in 0303, file bug (Recommended)"** — Option text: "No change to 0303; the 'closing doesn't leave' bug becomes its own task and is fixed where it belongs."
- **R2:** **"Accept as harmless (Recommended)"** — Option text: "No change. A proper fix needs the server to say 'this gift made you a citizen' — outside 0303."
- **R3:** **"Tiny fix in 0303 (Recommended)"** — Option text: "A few lines: if restart is refused, keep the offer waiting for the start screen (or log it). Easy test."

### Correction (2026-09-28) — the private-lobby close path is NOT covered
The plan's Build step 4 says calling `onBackOnStartScreen()` at the end of `handleLeaveLobby` covers
"closing a private lobby (`JoinPrivateLobbyModal.ts:138`)". **That is wrong.** `:138` sits inside
`closeAndLeave()`, which has no callers anywhere in `src/client`. The window's real close,
`JoinPrivateLobbyModal.close()`, sends no `leave-lobby`, so `handleLeaveLobby` never runs, `gameStop`
stays set, and a grant made there stays pending for the page load (review R1). The cause predates 0303.
Owner accepted it for 0303 (ruling above); the producer files the "closing doesn't leave" bug separately.
Recorded as an accepted residual in `review.md`. `plan.md` is left as approved.

### Decision log — fixes applied without per-fix approval, and obvious-winner calls
- **R3 → fix applied.** Finding: a grant landing while `handleJoinLobby` is still awaiting its setup
  (before `this.gameStop` is set) shows the popup as the player enters the lobby; Restart is then refused,
  the popup hides, and `Shown` has no outcome. What changed:
  - `src/client/CitizenshipRestartOffer.ts` — a refused `restart()` sets `pending = true`;
    `onBackOnStartScreen()` shows a pending offer directly (not through the once-only guard), because
    `pending` is only ever set before the first show or by that re-arm. `onMatchStarting()` still clears
    it; `onGranted()` still returns once shown, so a second grant cannot add a show.
  - `src/client/CitizenshipRestartModal.ts` — `Shown` is logged once per page load (a `shownLogged`
    flag), so the re-shown offer counts as one offer: one `Shown`, then one `Restart` / `Later`.
  - `ai-agents/knowledge-base/analytics-event-reference.md` — `Shown` and `Restart` rows describe the
    re-show and the refusal case.
  Why it qualified: verified `CORRECT` against `Main.ts`; owner ruled this exact shape ("keep the offer
  waiting for the start screen"); a few lines in the plan's own offer/modal modules; keeps plan step 1's
  "at most once per page load" for the offer and step 7's "Shown fires when the popup actually appears"
  for the first appearance.
- **Obvious-winner call — log `Shown` once, not on every appearance.** The alternative (log on each
  appearance) would leave the first `Shown` with no outcome — the exact analytics gap R3 names — and
  would inflate the plan's "gift count ≈ Shown − Purchase:Completed". Stays within the plan's intent.
- **R1, R2 → no code change** (owner rulings above; accepted residuals in `review.md`).

### Verification (this round)
- Touched suites (8): 156/156 pass (was 153; +3 new tests).
- Mutation check: removing the re-arm in `restart()` or the once-only `Shown` guard each turns a new test
  red (2 failed), restored → green.
- `npx tsc --noEmit` — exit 0. `npx eslint` on the 4 touched files — exit 0. Prettier check clean.
- `npm test` (full, with shell harnesses) — 162 suites, 2748 tests, all pass, first run; no flake, no re-run.
- `npm run lint` (whole repo) — still 1 error, the known untracked 0325 `s0-hmac-check.mjs` parsing
  error; not 0303's, left alone.
- Not verified: the R3 path live (needs a purchase finishing within about a second of a lobby click);
  `Main.ts` still has no unit test setup.
