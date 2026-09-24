# 0020 — investigation findings and plan (tier-free baseline only)

## Summary
- Planning only. No files written, no plan.md, nothing committed. (Spawned consult, so there was no EnterPlanMode; I followed the plan-only instruction by hand.)
- **The brief's premise is false today: no ad suppression exists for any tier.** Every call site calls `showInterstitial()` without any condition. Suppression is task `0248` (Backlog, its Step-1 decision gate is still open). So right now `Ad:Interstitial:PaidCitizen` would not be a bug guard. Any paid citizen would fire it.
- **Banners: our code never shows a banner.** The Fuse script is commented out in both templates. `GutterAds` returns early inside the iframe. Nothing calls Yandex `showBannerAdv`. So `Ad:Banner*` has no impression point to hook. If Yandex sticky banners run, they are set up in the Yandex console, which I cannot see from the repo.
- **Tier inside the client:** guest vs logged-in is available now and synchronously. Earned and paid are not available at the moment an ad shows (details below).
- 🚨 **Found along the way: paid state leaks through the public profile.** `is_citizen && citizenship_earned_at === null` means "paid, never crossed the XP threshold", because only two code paths ever set `is_citizen`. This defeats the "don't leak who paid" redaction. It is not in scope here, but the owner/architect need to see it (open question 4).
- **Worth building now:** a small tier-free baseline, one event `Ad:Interstitial` fired on a real impression. About 1 h plus tests. The tier events are deferred behind `0250` (paid) and `0273` deploy plus a profile read cache (earned). Banners are not buildable (open question 2).

## Investigation findings

### Q1 — How can the client learn the tier?
- **Guest / logged-in: available now, synchronous.** `FlashistFacade.isYandexLoggedIn()` at `src/client/flashist/FlashistFacade.ts:1216-1222` (`yandexSdkPlayerObject?.isAuthorized()`). On a degraded boot (player object missing) it reads as not-logged-in. `resolveYandexLoginStatus()` at `:686-694` has the separate "unknown" state.
- **Profile read: now Bearer-authenticated in code, but paid is still stripped.** `GET /v1/profile` goes through `resolveCaller` with a Bearer session (`src/profile-server/Routes.ts:630-653`). `toPublicProfile()` drops `is_paid_citizen` and `citizenship_purchased_at` (`Routes.ts:322-347`). Its comment explains why: the token is `vfy:false`, so anyone can mint one for an id they merely assert, and the fix is deferred to `0267`. The shared schema does the same omit (`src/core/profile/PlayerProfile.ts:65-68`). ⚠️ That schema's doc comment still says "Sprint 4's read is unauthenticated", which is stale. On the client, `PlayerProfileView.ts:116-121` records "paid state is invisible client-side".
- **`0273` (Bearer client session) is code-complete but the client is NOT deployed.** Its brief Status says the server half is live and proven by a 401 without a token, and the client has zero production evidence (`0273/brief.md:77`).
- **No profile read happens in production at all today.** The only caller of `loadPlayerProfileView()` is `CitizenshipCard` (`CitizenshipCard.ts:153`). That is gated off by `CITIZENSHIP_CARD_ENABLED: false` (`FlashistFacade.ts:226`, checked at `CitizenshipCard.ts:97-100`) until the `0065` flip. The read is also async, and nothing caches a tier on the facade, so the brief's "synchronous at ad time" rule is not met for earned or paid.
- **Earned:** `citizenship_earned_at` is in the public projection. Only the XP-crossing SQL stamps it (`PlayerProfileRepository.ts:105-113`). Using it needs: `0273` client deployed, the `0065` flip (or a read outside the card), and a sync cache such as `getPlayerTier()`. Ads shown before the first read completes would need an `Unknown` bucket.
- **Paid, the proper path is `0250`** (Backlog, owner = producer; its phase 1 is a design decision for architect + owner; possibly gated on `0267` identity verification and the payments secret key). None of it exists. `0250`'s candidate 3 (read ownership from Yandex `getPurchases()` on the client) is effectively dead as the code stands: the citizenship purchase is consumed after grant (`CitizenshipPurchase.ts:85`, `PaymentsReconciliation.ts:81`), so it no longer appears in `getPurchases()`. Reviving it would reverse `0018`'s consume step. I did not re-check the Yandex docs this turn.
- 🚨 **Paid is derivable from what is already public.** Only two code paths set `is_citizen = true`: the paid grant (`PaymentsRepository.ts:46-52`, sets `is_paid_citizen` and not `earned_at`) and the XP crossing (`PlayerProfileRepository.ts:105-113`, sets `earned_at`). The DB checks agree (`migrations/006_player_identity.sql:81,85`). So `is_citizen && citizenship_earned_at === null` ⇒ paid and not earned. Anyone who mints a `vfy:false` token for another player's asserted id can learn that player paid. The same projection is returned by login (`Routes.ts:726`). Technically this gives 0020 a paid tier without `0250`, but building on it would cement a leak that `0250` says must not exist. **I do not recommend it.**

### Q2 — Is there ad suppression for citizens today?
- **None.** `showInterstitial()` (`FlashistFacade.ts:1289-1334`) calls `adv.showFullscreenAdv` with no check of tier, citizenship or anything else.
- The six call sites have no tier check either: `PublicLobby.ts:339` (time and open-slots gate only), `Main.ts:899` (mission), `HostLobbyModal.ts:803`, `SinglePlayerModal.ts:501`, `WinModal.ts:326` (skipped only for tutorial), `GameRightSidebar.ts:130` (exit).
- `window.enableAds` is written by `GutterAds.ts:38,42` (upstream flares logic) and never read.
- Suppression is task `0248` (Backlog), paid-only by owner ruling 2026-09-12, hard-blocked on `0250`.

### Q3 — Which events can be built without a tier?
- **`Ad:Interstitial` (baseline): yes.** Seam: `showInterstitial()`'s `onClose(wasShown)`. The SDK reports `wasShown=false` when it did not show an ad, for example when its own frequency cap refuses. So firing only on `wasShown === true` counts real impressions, not attempts.
- **`Ad:Banner` (baseline): no.** There is no banner show call to hook. Fuse is commented out (`index.html:96`, `yandex-games_iframe.html:170`). `GutterAds.show()` returns in an iframe (`GutterAds.ts:63-66`). `AdTimer` only destroys a Fuse sticky (`AdTimer.ts:19-24`). There are no `showBannerAdv` or `getBannerAdvStatus` calls. The only proxy would be polling `getBannerAdvStatus()`, which says "a banner is showing now", not "an impression happened", because Yandex rotates banners itself. That would not honestly measure impressions.
- **`:Guest` could be built now** (sync auth state). **`:Free` could not:** "logged-in non-citizen" needs the profile. Labelling every logged-in player `Free` would silently go wrong the moment citizens exist.
- **`:EarnedCitizen` / `:PaidCitizen`:** deferred, see Q1.
- Event budget: interstitials are rare (≤ a few per match cycle, and Yandex caps frequency), so there is no real pressure on GameAnalytics' 500 events/user/day limit.

## Plan — tier-free baseline only (for approval)

**Scope:** one event, `Ad:Interstitial`, fired once per real interstitial impression. No tier, no banner. No `src/core` change and no UI text, so no en/ru edits.

1. **Enum.** In `src/client/flashist/FlashistFacade.ts` `flashistConstants.analyticEvents`, add a short commented group near the other P1 groups:
   `AD_INTERSTITIAL: "Ad:Interstitial",` with the comment "fired on a real impression (onClose wasShown === true), not per attempt; no tier dimension; tiered variants are deferred, task 0020".
2. **Instrument `showInterstitial()`** (`FlashistFacade.ts:1289-1334`):
   - Inside the `new Promise` executor, add `let impressionLogged = false;`.
   - In `onClose: (wasShown) => {...}`: `if (wasShown === true && !impressionLogged) { impressionLogged = true; flashist_logEventAnalytics(flashistConstants.analyticEvents.AD_INTERSTITIAL); }`, then `resolve(wasShown)` as today.
   - No event in `onError`, in the `catch`, or on the no-SDK early return.
   - The return value and resolve behaviour stay unchanged. None of the six call sites change.
   - Why `onClose` and not `onOpen`: it is the path the code already trusts, and `wasShown` is authoritative. The cost is that an ad left by closing the tab mid-ad goes uncounted (under-count, never over-count). This is stated in the reference doc.
   - The strict `=== true` protects against a non-boolean value from the untyped SDK (`yandexGamesSDK: any`, `:395`). The guard protects against a double callback.
3. **Reference doc**, `ai-agents/knowledge-base/analytics-event-reference.md`:
   - New `### Ad Events` section with the table row: key, string, fire condition (wasShown only, once per show, under-counts tab-close mid-ad, dev builds log to console only).
   - One-line note: tiered `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen}` and all `Ad:Banner*` are deferred (task 0020), with the reason.
   - Add the key to the `## TypeScript Enum` section (`:528`).
4. **Tests.** New `tests/client/InterstitialAnalytics.test.ts` (jsdom):
   - `jest.mock("gameanalytics")`, and set `process.env.DEPLOY_ENV="prod"` per test, restored afterwards, so `GameAnalytics.addDesignEvent` receives the call.
   - Facade built with the existing `Object.create(FlashistFacade.prototype)` pattern and a fake `yandexGamesSDK.adv.showFullscreenAdv` that invokes the callbacks.
   - Cases:
     - `onClose(true)` → exactly one `addDesignEvent("Ad:Interstitial", …)`, resolves `true`.
     - `onClose(false)` → none, resolves `false`.
     - `onError` → none, resolves `false`.
     - `showFullscreenAdv` throws → none, resolves `false`.
     - No SDK → none, resolves `undefined`, no throw.
     - `onClose(true)` twice → one event.
     - Non-boolean truthy `wasShown` → none.
     - Every fired string equals `flashistConstants.analyticEvents.AD_INTERSTITIAL`.
   - The existing `WinModal.test.ts:64` and `HostLobbyModalUrl.test.ts:28` mock `showInterstitial`, so they are unaffected.
5. **Verify:**
   - `npm test -- tests/client/InterstitialAnalytics.test.ts`
   - full `npm test` (about 22–25 s with the shell harnesses; re-run on the known supertest flake and say so)
   - `npx tsc --noEmit`
   - `npm run lint`
   - Manual (dev build logs to console): trigger a mission start and confirm one `Ad:Interstitial` log per shown ad and none when the SDK declines. ⚠️ A real impression is only observable inside Yandex Games (draft or prod). In local dev there is no SDK, so it takes the early-return path.
6. **Brief bookkeeping is not the coder's.** The brief's `## Verification` items 1–4 all test tiers. The producer should mark them deferred when closing or splitting.

**Risks and edge cases:**
- The SDK calls both `onError` and `onClose` → covered (fires only on `onClose(true)`).
- A frequency-capped call → `wasShown=false` → not counted, which is correct.
- Once `0248` ships, suppression will live upstream of `showFullscreenAdv`, so the baseline keeps counting only real impressions with no change needed.
- Deploy timing: Sprint 4 closes at the 2026-09-26 deploy (runbook W12: work in progress must sit on a branch). The baseline is only useful as *pre-citizenship* data if it rides that deploy. It must be done and reviewed before then, or it goes to a branch and loses that value.

**Out of scope, deferred and named plainly:**
- All `Ad:Banner*`: no hook exists.
- `:Free`, `:EarnedCitizen`, `:PaidCitizen`, and `getPlayerTier()`: these need `0273` client deployed + the `0065` flip or a profile read outside the card + a sync tier cache (earned), and `0250` (paid).
- The PaidCitizen "guard" meaning: needs `0248`.
- `0018`-dependent work: none of it is built here.

---

## Owner approval — 2026-09-24, live via `AskUserQuestion` in the `fkit lead` session (relayed by `fkit-lead`, `fkit-sprint-ship-loop`)

Approved: owner chose *"Yes, baseline only"* — build the tier-free `Ad:Interstitial` baseline exactly as planned above (no `:Guest`/`:LoggedIn` split), aiming to finish before the 2026-09-26 deploy. The plan's other open questions were answered at the same time and are **records for the producer, not build steps**: banners — *"Drop it"* (remove `Ad:Banner*` from `0020`, record why); tiered events — *"New task, close 0020"* (split into a new task; `0020` closes on the baseline); the paid-state leak — *"Must-fix in 0250"*. **Build nothing beyond the baseline.**

Note for the build: `CLAUDE.md` no longer states an `npm test` duration (the §5 "about 22–25 s" figure is stale; it is about a minute now).
