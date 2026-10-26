# 0488 — Opt-in Yandex rewarded video (double this match's XP): implementation plan

## Summary
- **It works, but it needs a server part.** Yandex has `ysdk.adv.showRewardedVideo({callbacks:{onOpen,onRewarded,onClose,onError}})`. The extra XP must be granted by the **profile box** through one new route and one new database table. The game server does not change.
- **Faking a watch gains nothing extra.** The server adds XP only for a match that **already credited XP** to this same player, and at most once per match. So a client that lies about watching gets exactly what an honest watcher gets: the ad-free path, not more XP. Yandex documents **no server-side proof** of a rewarded view, so we cannot do better than this.
- **Recommend splitting** the server part into its own task (the brief's Notes expected this). The client part (this task) then waits on it.
- **The end-of-match popup is the right place.** `WinModal` already shows on a win, a loss, an opponent's win, and your own elimination. The offer and the XP explainer go inside it. No HTML template change is needed: `<win-modal>` is already in both templates, once each.
- **All citizens, paid and earned, are hidden by `getCitizenshipStatus()`.** The 0248 `is_paid_citizen` gate lives only inside `showInterstitial()`, so it does not touch the new rewarded path.
- **Ads never run back to back.** After a rewarded video, any interstitial request in the next 60 s is skipped, with its own event.
- **Revenue:** the Yandex console shows only combined ad revenue. A rewarded vs interstitial split is in the **Yandex Advertising Network (YAN) partner interface**, filtered by "Ad unit name". Our own new events give the funnel.
- ⚠️ **Not verified live.** The SDK call, the callback order and the sound-pause rule are checked against Yandex's docs (fetched 2026-10-24), not run on the Yandex template. That live run belongs to the verify task.

## Answers to the six plan-step checks

### 1. Does Yandex rewarded video work in our build, including degraded mode and the standalone page?
- **The SDK call** (Yandex SDK docs, `sdk-adv` page, fetched 2026-10-24): `ysdk.adv.showRewardedVideo({ callbacks })`.
  - `onOpen`: "the video ad is shown on the screen".
  - `onRewarded`: "a video ad impression is counted. This function should specify a reward".
  - `onClose`: the ad closes.
  - `onError`: an error happened.

  It is the same `adv` object we already call for interstitials (`FlashistFacade.ts:2552`, `showFullscreenAdv`).
- **The Yandex template** (`yandex-games_iframe.html`) loads the same `sdk.js` (line 24, plus the fallback loader at line 217). Nothing extra is needed there. ⚠️ Not run live: that needs a Yandex draft/console upload, which is the verify task.
- **Degraded mode and the standalone page:** both mean `FlashistFacade.yandexGamesSDK` is null (`index.html` has no SDK). A new sync check `isRewardedVideoAvailable()` (true only if the SDK and `adv.showRewardedVideo` both exist) hides the button. If the SDK recovers late, the next render picks it up.
- **Fail-safe even if the button is somehow shown:** `showRewardedVideo()` returns `unavailable` and nothing is granted.
- **Logged-in players need a profile session.** Without one (`profileFetch` reports `unconfigured`/`no_session`), the offer is hidden.

### 2. Is the reward given only on the rewarded callback?
- Yes. The grant is started **only** from `onRewarded`, and at most once (a latch).
- `onOpen`, `onClose` without `onRewarded`, `onError`, a throw from `showRewardedVideo`, and a missing SDK all grant nothing.
- The grant starts at `onRewarded`, not at `onClose`. So an SDK that never calls `onClose` still pays out.
- Tests cover each path (see Tests).

### 3. Frequency rules, and keeping interstitials away
**Yandex docs:**
- Rewarded: *"You can call rewarded video ads as often as you want."*
- Interstitial: *"frequency … is controlled by Yandex Games"*. The SDK declines with `onClose(wasShown=false)`.

**Yandex moderation requirements** (requirements page, fetched 2026-10-24) that this build must meet:
- **4.5** The player watches only if they want to, via a button, and must get a reward. ✔ Opt-in button, and the server grants the reward.
- **4.5.1** The button or its text must say it is an ad **and** name the exact reward. ✔ The button reads "Watch an ad: double this match's XP (+1 XP)".
- **4.5.2** The reward is an extra bonus that does not block play. ✔ XP.
- **4.7** Game sound and gameplay are paused during the ad.
  - ✔ Sound: Howler is muted on `onOpen` and unmuted on `onClose`/`onError`.
  - ⚠️ Gameplay: a multiplayer match cannot be paused (the server only relays turns). The offer only shows while the end-of-match popup is up, when this player's own play is over (eliminated, or the match is decided). Today's interstitial plays at the same moment under the same condition. This is a **moderation risk the owner should know about**, not a new one.
- **4.4** Ads only in logical pauses. ✔ The end of a match.
- **1.16** No fake ad units. ✔ The SDK's own unit.
- **1.2.1** A login prompt must say what it gives. ✔ The guest text names the benefit.

**No back-to-back ads:**
- `WinModal.hide()` (Exit / Keep / Spectate) and `MatchExit.leaveMatch()` both call `showInterstitial()`.
- Plan: `showInterstitial()` skips the request if a rewarded video closed **less than 60 s ago**. This is one module-level timestamp, so it covers every call site. It fires the new `Ad:InterstitialSuppressed:AfterRewarded` event.
- ⚠️ 60 s is my number, not a Yandex figure.
- The other order (an interstitial just before a rewarded video) cannot happen: the rewarded video is started by the player from the open popup, and interstitials fire only when the popup is closed or on lobby/menu paths.
- Cost: one fewer interstitial impression per rewarded watch.

### 4. XP crediting trust (0217 / `getCreditableYandexId`)
**Today:**
- Base match XP is credited by the **game server**: `GameServer.creditMatchXp` → `selectMatchCredits` (`src/core/profile/MatchQualification.ts`) → `POST /internal/v1/credit`.
- It is idempotent on `(game_id, player_id)` (`player_match_xp_credits`, `migrations/006_player_identity.sql:117`; `CREDIT_SQL` in `PlayerProfileRepository.ts`).
- It fires at the winner vote, or mid-match at the player's elimination (0211).
- The ad is watched **after** that, so the extra XP is a **second, later grant**.

**Who vouches for the watch:** nobody can. The Yandex docs mention no server-side proof of a rewarded view, and I did not assume one exists. So the design caps what a lie can gain:
- **New route `POST /v1/profile/rewarded-match-xp`, body `{ gameId }`:**
  - Bearer session, using the same `resolveCaller` and `publicCors("POST")` as `/v1/profile/tenure-grant`.
  - The profile box (one transaction, `players` row locked first, the same lock order as `creditMatchXp` and `recordTenureCheck`):
    - (a) reads the **base credit row** `(gameId, callerPlayerId)` from `player_match_xp_credits`;
    - (b) if there is none → `not_credited`, nothing written;
    - (c) inserts into a new ledger `player_rewarded_match_xp (game_id, player_id, xp_awarded, granted_at, PK (game_id, player_id))`; a conflict → `duplicate`;
    - (d) adds **the base row's `xp_awarded`** to `players.xp`. That is literally "double this match's XP", and it stays right if `XP_PER_MATCH` ever changes;
    - (e) runs the same earned-citizenship crossing and post-commit inbox hook as `creditMatchXp`.
  - Response `{ status: granted | duplicate | not_credited, xpAwarded, xp }`, with `xp` passed through `xpForCaller` (the equalisation for unverified callers from 0250).
  - Logs carry the outcome and amount only. A metrics counter by outcome is added, mirroring `tenureClaim`.
- **What a faked watch can gain:** at most +`XP_PER_MATCH` per match the server **really credited to this player**, once. That is identical to an honest watcher. It cannot mint XP for a made-up `gameId` (no base row), for someone else's match (the base row is keyed to the session's player), or twice (primary key).
- What it costs us: the ad impression, so lost ad revenue from cheaters only.
- **No change to `src/server` / `getCreditableYandexId`.** A player who spoofed an id on the game server sent the base XP to the victim's id, so their own session finds no row → `not_credited`. No new hole.
- **Split, recommended.** The route, migration, repository method, shared contract and their tests are a separate, deployable server task. It does nothing until a client calls it. **Deploy order:** profile box first, then the client (both in weekend slots).

### 5. Does the 0248 `is_paid_citizen` gate interfere? How are ALL citizens hidden?
- **The gate does not apply.** It is `isInterstitialSuppressedForPaidCitizen()`, called only inside `showInterstitial()` (`FlashistFacade.ts:2496–2541`). The new `showRewardedVideo()` never calls it, by construction.
- The gate is also the wrong tool: it covers **paid** citizens only, and only from a **verified** read.
- **The check that hides the offer from every citizen** is `getCitizenshipStatus()` (`src/client/CitizenshipStatus.ts`, "the page's one answer", task 0302). It returns `citizen` for an authoritative read with `isCitizen` (paid **and** earned) or a confirmed paid grant.
- Offer rules:
  - Hide on `citizen`.
  - Hide on `unknown`: fail closed. This also covers the citizenship kill switch being off and degraded boots.
  - Hide on `read_failed` (from `getProfileVerificationStatus()`): this could be a citizen whose read failed.
- A citizen who reaches the popup fires `Ad:RewardedSuppressed:Citizen`.
- **The server does not refuse citizens.** If a stale page shows the offer to a player who just became a citizen and they watch, they still get the XP. Yandex rule 4.5 says a completed watch is rewarded.

### 6. Revenue and impression data
- **Yandex developer console:** Metrics → Monetization metrics → Revenue is **combined ad income, with no split by format** (console `adv-monetization` doc, fetched 2026-10-24).
- **Split by format:** in the **YAN partner interface** → Statistics → filters "Site / App" + "Ad unit name" (e.g. `rewarded`, `fullscreen`). Do **not** use "Ad unit type": every Games block is typed "Banner". Statistics appear only after publish, once real blocks exist. The doc says this route is for developers **not** under the "unified licensing model". ⚠️ Which model we are on is unknown: the owner checks in the console.
- **Our analytics:** the new `Ad:Rewarded:*` funnel below: offer shown → pressed → opened → watched → reward granted, plus the drop-offs. No revenue numbers come from the SDK.
- Rating impact is read in the Yandex console: rating and reviews, as today.

## Open points for the owner at plan approval (my recommendations, labelled as mine)

1. **Guests. My recommendation: (a), a plain "log in" prompt, not seamless.**
   - The guest sees the XP explainer plus: "Log in with Yandex to earn XP for your matches and double it with an ad". The button opens the Yandex login (`FlashistFacade.openYandexAuthDialog`, the existing flow).
   - **No video for guests.** There is nothing to reward, and Yandex 4.5 says a watch must be rewarded.
   - After login mid-match, the existing restart logic suppresses a reload (`GameRestart.requestGameRestart`, matchActive). The session starts on the next page load (Exit navigates to the root). XP counts **from the next match**.
   - **Why not (b):** this match's XP is already lost for a guest.
     - The elimination and winner-vote credits ran with no identity.
     - A mid-match login sends no `update_identity`: `Transport.maybeRefreshYandexIdentity` and `maybeSendLateProfileSession` run only on connect.
     - The page has no session token until it reloads.
     - Seamless would need new plumbing plus a retroactive credit for a game played as a guest. That is a new trust surface and leans on 0484.
   - **Which guest matches count (my rec):** the same rule a logged-in player is credited by, minus the server-only checks: a **multiplayer** match (public or private lobby; not single-player, tutorial or replay, which give no XP because they run on `LocalServer`), where the guest **spawned** and was alive at the end or was eliminated. That is `qualifiesForMatchXp` from `src/core/profile/MatchQualification.ts` on the player's own state.
2. **At most one reward per match.** My rec: **yes**. The server enforces it with the primary key, and the client keeps a per-match latch. "Double this match's XP" has nothing left to double after one watch.
   - Closing early, an error or no ad available grants nothing. The button stays so they can try again, still with at most one reward.
3. **The no-cap trade-off, restated:**
   - Base 1 XP per match + 1 XP for the ad = 2 XP per match → earned citizenship in **as few as 50 qualifying matches instead of 100**.
   - A player who also got the maximum tenure grant (50 XP) needs **as few as 25 instead of 50**.
   - Free citizenship then competes harder with the 249-Yan paid citizenship: more ad income, possibly fewer purchases. This is already owner-ruled (R1), so it is restated, not re-asked.
4. **(Extra) A Yandex remote on/off switch for the offer. My rec: yes.**
   - A new experiment flag `rewarded_video` = `enabled`, read like `email_subscribe_button` / `citizenship_ui`. It **fails closed**, so the offer is off until the owner sets it in the Yandex console.
   - This lets the owner launch after both deploys and turn it off without a deploy.
   - Cost: one console step at launch (the verify task). Say no and I drop it.
5. **(Placement) Split the server part into its own task? My rec: yes, in Sprint 9.**
   - Knock-on: **0488 (client) would wait on the new server task, both in Sprint 9.** No other open task depends on 0488 (checked: no `Depends on: 0488` anywhere under `ai-agents/tasks`).
   - Keep it in one task instead: no knock-on, but one larger change that touches two deploy targets.

## Step-by-step plan

### Part S — profile box (proposed split task; the producer files it)
1. `src/core/profile/RewardedMatchXpContract.ts` (new):
   - zod `RewardedMatchXpRequestSchema { gameId: string 1..128 }`, the same bound as `CreditItemSchema.gameId`;
   - `RewardedMatchXpResponseSchema { status: enum, xpAwarded: int ≥0, xp: int }`;
   - a statuses const.
2. `migrations/009_player_rewarded_match_xp.sql` (new): the table above, with FK `players(id) ON DELETE CASCADE` so erasure keeps working. Tester-role snapshots do not touch the per-match ledgers, so no change is needed there.
3. `src/profile-server/PlayerProfileRepository.ts`: `grantRewardedMatchXp(gameId, playerId)`, built from the patterns of `recordTenureCheck` and `creditMatchXp`: lock → read base row → insert ledger → add XP → citizenship crossing → post-commit inbox hook. It returns `not_found` when no player row exists.
4. `src/profile-server/Routes.ts`: an optional `rewardedMatchXp` repository in the options, mirroring `tenureGrant`. With no repository → `503 rewarded_match_xp_unavailable`.
   - 200 statuses as above; 400 `bad_request`; 401 through the `sendCallerFailure` path; 404 `not_found`; 500 `internal_error`.
   - No ids, tokens or game ids in logs.
5. `src/profile-server/Server.ts`: wire `profiles` in. `src/profile-server/Telemetry.ts`: a counter by outcome.
6. Nginx: no change. The profile box's `location /` catch-all already reaches `/v1/*`, and the `/internal/` allowlist is not involved. No new env vars, so `check:config-parity` is unaffected.

### Part C — client (this task, 0488)
7. `src/client/flashist/FlashistFacade.ts`:
   - `isRewardedVideoAvailable()` (sync).
   - `showRewardedVideo(onRewarded: () => void): Promise<"watched" | "closed_early" | "error" | "unavailable">`. It resolves once, at `onClose`/`onError`/a throw. `onRewarded` fires the callback once. Howler is muted on `onOpen` and unmuted on close/error. The video is wrapped in `beginPlatformDialog()` so the forced refresh popup (0404) waits. Analytics calls are wrapped in try/catch, as in the interstitial pattern.
   - Record `lastRewardedClosedAt`. `showInterstitial()` skips the request if a rewarded video closed less than 60 s ago, with its own event. This check comes after the existing no-SDK return, and it sits next to the 0248 check without changing it.
   - The new event keys and the experiment flag constants plus `isRewardedVideoEnabled()`.
8. `src/client/RewardedMatchXpOffer.ts` (new, pure): `deriveRewardedOffer(inputs) → "hidden" | "watch" | "log_in"`. Inputs:
   - flag on, citizenship surfaces on, SDK available;
   - multiplayer, not tutorial, not replay;
   - own participation qualifies (`qualifiesForMatchXp`);
   - `getCitizenshipStatus()` and `getProfileVerificationStatus()`;
   - whether this match is already claimed.

   Mapping:
   - citizen → hidden, and the suppressed-citizen event;
   - `unknown` or `read_failed` → hidden;
   - `guest` → `log_in`;
   - `verified` or `unverified` non-citizen → `watch`.
9. `src/client/RewardedMatchXpClaim.ts` (new, the `TenureGrantClaim.ts` pattern, never throws):
   - `claimRewardedMatchXp(gameId)` uses `profileFetch`;
   - a per-`gameId` latch;
   - on `not_credited` it retries 3 times with backoff (about 2 s, 5 s, 10 s), because the base credit can land a moment after the popup (the resolve-then-credit path, 0272);
   - it maps results to UI states and fires the reward events.
10. `src/client/graphics/layers/WinModal.ts`: an offer section shown together with the buttons (after the existing 3 s delay):
    - the XP explainer line: XP after a win, a loss or an elimination; 100 XP = citizenship;
    - then the watch button or the guest login button;
    - result text (granted / closed early / no ad / not recorded / failed).

    Offer state is per `gameId` and survives re-shows: the death popup, then the match-end popup. `_handleExit` waits for a claim that is still running, at most about 5 s, before navigating, so a claim is not cut off. Citizens see `WinModal` exactly as today.
11. `resources/lang/en.json` and `ru.json`, new keys under `win_modal`: `xp_explainer`, `rewarded_watch_button` (with `{xp}`), `rewarded_granted`, `rewarded_closed_early`, `rewarded_unavailable`, `rewarded_not_credited`, `rewarded_failed`, `guest_login_text`, `guest_login_button`, `guest_logged_in`. Everything goes through `translateText`.
12. `ai-agents/knowledge-base/analytics-event-reference.md`: a new "Rewarded video" block in Ad Events. Proposed strings (no ids, hosts or URLs, no value unless stated; collected from all builds):
    - `Ad:Rewarded:OfferShown`: the watch button rendered, once per match.
    - `Ad:Rewarded:Pressed`.
    - `Ad:Rewarded:Opened`: `onOpen`, the video started.
    - `Ad:Rewarded:Watched`: `onRewarded`, the Yandex-counted impression.
    - `Ad:Rewarded:ClosedEarly`: close without `onRewarded`.
    - `Ad:Rewarded:Error`: `onError` or a throw.
    - `Ad:Rewarded:Unavailable`: pressed with no SDK.
    - `Ad:Rewarded:Reward:Granted` (value = XP, only after the server confirmed), `Ad:Rewarded:Reward:Duplicate`, `Ad:Rewarded:Reward:NotCredited`, `Ad:Rewarded:Reward:Failed`.
    - `Ad:RewardedSuppressed:Citizen`: the popup would have offered, but the player is a citizen (paid or earned; it cannot tell them apart, on purpose).
    - Guests: `Ad:Rewarded:LoginOfferShown`, `Ad:Rewarded:LoginPressed`, `Ad:Rewarded:LoginCompleted`.
    - `Ad:InterstitialSuppressed:AfterRewarded`.

    These stay outside the `Ad:Interstitial:*` names, which 0299 reserves.

## Tests
New test files (approval of this plan covers them):
- `tests/core/RewardedMatchXpContract.test.ts`: schema bounds. Required, because Part S adds a `src/core` file.
- `tests/profile-server/RewardedMatchXpRoutes.test.ts` (supertest): 400 / 401 / 503 / 404 / 200 for each status, `xp` equalisation for unverified callers, no id in logs.
- `tests/integration/RewardedMatchXp.it.test.ts` (real Postgres):
  - no base row → `not_credited` and no write;
  - granted adds the base `xp_awarded`;
  - a second call → `duplicate`;
  - another player's game → `not_credited`;
  - 99 → 101 crosses into earned citizenship and fires the inbox hook once;
  - player erasure cascades.
- `tests/client/RewardedVideo.test.ts` (stub SDK):
  - `onRewarded` then `onClose` → watched, reward callback called once;
  - close without reward → `closed_early`, no callback;
  - `onError` / throw / no SDK → no callback;
  - double `onClose`;
  - mute and unmute.
- `tests/client/RewardedMatchXpOffer.test.ts`:
  - paid citizen **and** earned citizen → hidden;
  - unknown / read_failed → hidden;
  - guest → `log_in`;
  - single-player / tutorial / replay / not spawned → hidden;
  - no SDK or flag off → hidden;
  - already claimed → hidden.
- `tests/client/RewardedMatchXpClaim.test.ts`: each status, retry on `not_credited`, once per `gameId`, never throws, events.
- Extended: `tests/client/WinModal.test.ts` (the section renders for a non-citizen and not for a citizen; exit waits for the claim) and `tests/client/InterstitialPaidCitizenGate.test.ts` or a new `tests/client/InterstitialAfterRewarded.test.ts` (an interstitial is skipped within 60 s of a rewarded close, and not after).

Checks to run:
- targeted `npm test -- <file>` while building;
- then **one** full `npm test` through the npm script (project lock);
- `npm run lint`;
- `npm run test:integration` **only if** `TEST_DATABASE_URL` and the `gc-0012-it-pg` container are available. Otherwise it is reported **skipped**, not passed.

Shell harnesses: no watched file is touched. A single `Exceeded timeout of 5000 ms` in a supertest suite is judged by the known-flake rule.

## Edge cases and failure modes
- **The base credit lands after the watch** (slow resolve, 0272): handled by the retries. If the profile box is down, the player watched and gets "this match's XP wasn't recorded". ⚠️ This conflicts with Yandex 4.5 in that rare case. Accepted residual.
- **A network failure after `onRewarded`:** in-session retries only. A grant lost to a page close or a failed network is not retried on the next load. ⚠️ Residual: say if you want a retry on the next load, at the cost of a small localStorage queue.
- **The popup shows twice in one match** (death, then match end), or after a reconnect: the state is per `gameId`, and the server primary key is the backstop. Two tabs: the server primary key.
- **The player becomes a citizen with this very match:** the status is still `not_citizen` in this page, so the offer shows, and watching gives 101 XP. Harmless.
- **Exit pressed while a claim is running:** the exit waits up to about 5 s.
- **Local development:** the standalone page has no SDK, so the offer never shows locally. Live behaviour is checked in the verify task (Yandex draft). I have not checked Yandex's local SDK dev proxy, so I am not relying on it.
- **Deploy skew:** an old profile box answers 404 → `failed`. The remote flag keeps the offer off until both deploys are done.

## Build vs verify, deploy
When this closes, a live verify task goes at the top of the next sprint (owner rule): deploy both parts, turn on the flag, run it on the Yandex template, read the events and YAN statistics. Weekend deploy slots. Nothing is committed without the owner asking.

## Not in scope
Coins and any currency; the purchase flow (0484); "testing customisations" with rewarded ads (a later idea); any change to interstitials beyond the 60 s after-rewarded skip; the old Task 6 row in `sprint-backlog.md` (a producer follow-up).
