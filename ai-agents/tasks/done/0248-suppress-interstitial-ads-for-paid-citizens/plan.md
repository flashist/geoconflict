## Plan: 0248 Suppress interstitial ads for paid citizens

### Goal
Paid citizens see no interstitial ad from any of the six placements. Everyone else is unchanged. There is one source of truth for "the current player is a paid citizen" and one gate that reads it. Every unknown means the ad shows.

### Owner rulings this plan follows (2026-10-06)
- All six placements are turned off for paid citizens. No subset, no per-placement logic, no measuring first.
- One place says "paid", and one place turns the ads off.
- `PROJECT.md` is not edited.
- Deploy only after `0396` passes, together with the new verified-status display task. That gates the deploy, not this build.

### Facts checked in code this turn
- `src/client/PlayerProfileView.ts:144`: `isPaidCitizen = isOwnerView && profile.is_paid_citizen === true`. It is false on every fallback path: guest, failed or timed-out read, a body that fails the schema, an unverified (`vfy:false`) session, and a server older than S3b.
- `src/client/CitizenshipCard.ts:239-249`: `refreshProfile()` is the only place the profile is read. It already guards against stale reads (task `0326`) and already publishes `CitizenshipStatus` and the approved name. Every re-read runs through it: first load, purchase, reconciliation (`PURCHASES_RECONCILED_EVENT`), tenure gift, name change.
- `src/client/CitizenshipCard.ts:115` and `:120-125`: the card only reads the profile after `CITIZENSHIP_CARD_ENABLED` **and** `isCitizenshipUiEnabled()` both pass. If either is off, nothing is ever published.
- `src/client/CitizenshipStatus.ts`: a store with no runtime imports (only a type import), so importing it from `FlashistFacade.ts` creates no import cycle. Today it is used by `CitizenshipCard.ts` and `PrivateLobbyAccess.ts`.
- `src/client/flashist/FlashistFacade.ts:1522`: `isCitizenshipSurfacesEnabledSync()` is synchronous, defaults to false (fail-closed for citizenship surfaces), and is primed during platform init and again on late recovery.
- The six call sites: `PublicLobby.ts:339`, `Main.ts:945`, `SinglePlayerModal.ts:501`, `HostLobbyModal.ts:975`, `WinModal.ts:326`, `GameRightSidebar.ts:130`. Each one does `await showInterstitial()` and ignores the result.
- The module-level store survives the card being hidden during a match, so the two exit ads (`WinModal`, `GameRightSidebar`) still see the paid answer.

### Step 1 — the single source of truth: extend `src/client/CitizenshipStatus.ts`
`CitizenshipStatus.ts` already presents itself as "the page's one answer" about citizenship and the card already writes to it, so the paid answer goes in the same module. The `CitizenshipStatus` union type is **not** changed, so `PrivateLobbyAccess` and the existing `=== "citizen"` checks are untouched. Additions:
- `derivePaidCitizenship(profile: PlayerProfileView | null): boolean` returns `profile !== null && profile.isAuthoritative && profile.isPaidCitizen === true`. The strict `=== true` covers older test stubs that leave the field out.
- A module-level `let currentPaidCitizenship = false`.
- `publishPaidCitizenship(isPaidCitizen: boolean): void`.
- `isCurrentPlayerPaidCitizen(): boolean`. This is the one function that says whether the current player is a paid citizen.
- `resetCitizenshipStatusForTests()` also resets the paid value to false.
- No subscribe API. The only reader is the ad gate, and it reads synchronously at ad time.
- A doc comment covering:
  - The card is the only writer, so there is no second profile read and `Citizenship:Earned:XP` cannot fire twice.
  - Paid comes from the verified owner view only (ADR-116 D4).
  - false = "not paid, or unknown". The ad gate treats it as "show the ad".

### Step 2 — the card publishes the paid answer: `src/client/CitizenshipCard.ts`
- In `refreshProfile()`, next to `this.publishCitizenshipStatus()` (after the stale-read guard), publish `derivePaidCitizenship(this.profile)`.
- **Every applied read republishes, including a failed one.** A later failed re-read publishes false, so ads come back until the next good read. That is the brief's "fail open on every unknown", and it matches how `CitizenshipStatus` already behaves (a failed read gives `not_citizen`). It differs from the approved name, which keeps the last good value. I chose ads-first, per the brief.
- **`paidGrantConfirmed` is not used for the paid answer** (default; see open question 1). After a purchase the card already calls `refreshProfile()`. In a verified session that re-read says `isPaidCitizen: true`, so ads stop without a reload.
- No other card changes. No new render path, text or HTML.

### Step 3 — the single ad gate: `src/client/flashist/FlashistFacade.ts`
- Import `isCurrentPlayerPaidCitizen` from `../CitizenshipStatus`.
- Add a private `isInterstitialSuppressedForPaidCitizen(): boolean` that returns `this.isCitizenshipSurfacesEnabledSync() && isCurrentPlayerPaidCitizen()`. The kill switch is checked at ad time: with citizenship off, ads show even if a paid value were somehow set.
- In `showInterstitial()`, **after** the existing "no SDK" early return and **before** `showFullscreenAdv`:
  - Wrap the check in `try/catch`. A throw counts as "not suppressed", so the ad shows (fail-open).
  - If the player is suppressed: fire the suppression event inside its own `try/catch` (same pattern as the `Ad:Interstitial` logging at `:2145-2156`, so analytics can never break the flow), log to the console, and `return false`. The return value means "no ad was shown". The callers ignore it, so the six flows go on exactly as after a declined ad.
- The check goes after the "no SDK" return on purpose. Without the SDK no ad would show anyway, so the suppression event counts only requests that really would have gone to Yandex.
- `Ad:Interstitial` itself is unchanged. It does not fire for a suppressed request, because no ad was shown.

### Step 4 — analytics
- New enum key in `flashistConstants.analyticEvents`, placed under `AD_INTERSTITIAL` with a short comment: `AD_INTERSTITIAL_SUPPRESSED_PAID_CITIZEN: "Ad:InterstitialSuppressed:PaidCitizen"`.
  - The name deliberately sits **outside** the `Ad:Interstitial:*` subtree. `0299` reserves `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen,Unknown}` for ads that were **shown**. Putting a suppression event under that parent would mix it into the shown-ad counts in GameAnalytics' hierarchy and clash with `0299`'s `:PaidCitizen`.
  - No value, and no placement (default; see open question 2).
- Update `ai-agents/knowledge-base/analytics-event-reference.md`, section *Ad Events*:
  - Add a row for the new event. When it fires: once per interstitial **request** that the paid-citizen gate suppressed (SDK present, citizenship surfaces on, verified paid owner view).
  - ⚠️ It counts **requests**, while `Ad:Interstitial` counts ads **shown**. Some suppressed requests would have been declined anyway by Yandex's own frequency cap, so this event **overstates** the impressions actually given up. It is an upper bound.
  - Amend the `AD_INTERSTITIAL` row's "Not fired…" list: "…or when suppressed for a paid citizen (task 0248)".
  - Add a one-line note on the `0299` blockquote: since `0248`, a verified paid citizen's shown ads are nearly always zero. A future `:PaidCitizen` tier would only catch the cases where the gate does not apply.

### Step 5 — tests (all client-side; jsdom where needed)
1. `tests/client/CitizenshipStatus.test.ts`:
   - `derivePaidCitizenship` cases:
     - null gives false;
     - not authoritative but `isPaidCitizen: true` gives false;
     - authoritative but not paid gives false;
     - authoritative earned-only citizen (`isCitizen: true`, `isPaidCitizen: false`) gives false;
     - authoritative and paid gives true;
     - field left out gives false.
   - Publish/get round trip; the default is false; the reset sets it back to false.
2. `tests/client/CitizenshipCard.test.ts`, new block `publishes paid citizenship (task 0248)`:
   - A paid owner view publishes true. Guest, failed read and earned-only citizen publish false.
   - `CITIZENSHIP_CARD_ENABLED` false: nothing is published, the value stays false.
   - `citizenship_ui` off: the value stays false.
   - A later failed re-read flips true to false.
   - A superseded (stale) read does not overwrite a newer one (the existing `0326` pattern).
   - After a purchase, the re-read publishes true.
3. New `tests/client/InterstitialPaidCitizenGate.test.ts`, using the bare-prototype facade pattern from `InterstitialAnalytics.test.ts` and setting `citizenshipSurfacesSnapshot` by hand:
   - Paid + surfaces on: `showFullscreenAdv` **not** called; resolves `false`; exactly one suppression event; no `Ad:Interstitial`.
   - Paid + surfaces off (kill switch): the ad is requested.
   - Not paid: the ad is requested.
   - Nothing published yet (unknown): the ad is requested.
   - Earned-only citizen: the ad is requested.
   - No SDK + paid: resolves `undefined`; no suppression event.
   - The suppression analytics throws: still resolves `false` and does not hang.
   - Both directions are required. A gate tested only on the paid side might be off for everyone.
4. Existing suites (`InterstitialAnalytics`, the HostLobby suites, `WinModal`, `PrivateLobbyAccess`, `CitizenshipCard`) must stay green unchanged. `InterstitialAnalytics.test.ts` facades have no snapshot set (it reads `undefined`, so `=== true` gives false), which means they keep requesting ads.
5. Run: the focused files first, then `npm test` (shell harnesses included; the known `supertest` flake gets a re-run, and I will say so if I re-run), `npm run lint`, and `npx tsc --noEmit`.

### Files touched
- `src/client/CitizenshipStatus.ts`
- `src/client/CitizenshipCard.ts`
- `src/client/flashist/FlashistFacade.ts`
- `ai-agents/knowledge-base/analytics-event-reference.md`
- `tests/client/CitizenshipStatus.test.ts`
- `tests/client/CitizenshipCard.test.ts`
- `tests/client/InterstitialPaidCitizenGate.test.ts` (new)

Nothing under `src/core/`, no server code, no translation text, no HTML templates, no `PROJECT.md`. The six call sites are untouched.

### How the brief's verification steps are covered
- **Steps 1–3 (paid sees none; non-paying and earned-only still see ads):** unit-proven at the single gate. Because there is one gate, one test covers all six placements. **Live check per placement: not possible in this build** (see below).
- **Step 4 (fail-open):** unit-proven for "never published" (stands in for an unreachable profile, since a failed read publishes false), "no SDK", "kill switch off" and "check throws".
- **Step 5 (kill switch):** unit-proven for the local flag and for the remote-flag snapshot. ⚠️ The **remote** `citizenship_ui` half cannot be exercised in `npm run dev` (`0238`), so it is recorded as unverified there.
- **Step 6 (unit tests):** Step 5 above.
- **Step 7 (event fires):** unit-proven. **It does not carry the placement**; see open question 2.
- **Step 8 (revenue framing put to the owner):** done before this plan. The 2026-10-06 step-1 report went to the owner and the owner ruled "all six, no measuring". The close should cite that.

### Accepted gaps (owner-accepted; planned around, not fixed)
- Unverified (`vfy:false`) sessions still see ads.
- An ad requested before the card's first profile read returns still shows. Example: a Mission click right after a reload.

### Further residuals to know about (not fixed here)
- **Yandex's own fullscreen ads** (for example at game launch), if Yandex shows any, are outside our code and cannot be gated. This is unverified and was raised in the step-1 report for an owner check in the Yandex console.
- **An in-session purchase in an unverified session** stays ad-supported until a verified read. This follows from Step 2's default.
- **A transient failed re-read mid-page** brings ads back until the next good read. This is fail-open by design.

### Live verification — outside this build
Live per-placement proof needs a deployed S3b, a verified paid account on Yandex, and the real SDK. By the standing owner rule (split build and verify), it belongs in a verify task run after `0396`, together with the verified-status display task the owner ruled on. Filing it is the producer's call; I am flagging it, not filing it.

### Effort
About half a day of build plus tests.

### Open questions (defaults as planned)
1. Ad-free after an in-session purchase in an UNVERIFIED session? Default: **verified read only** (ADR-116 D4) — no.
2. Suppression event names the placement? Default: **no placement** — one event `Ad:InterstitialSuppressed:PaidCitizen`; brief verification step 7's "carries the placement" consciously waived.
