**Plan for 0329. Planning only: no source, no files, no plan.md written.** I could not enter plan mode (I am a spawned agent), so this is a promise I kept, not something the runtime enforced.

- **Brief gap: revealing the card as soon as the flags arrive is not enough.** On a late recovery, the Yandex player object comes back on its own separate chain (`FlashistFacade.ts:953-967`). If the card reads the profile before that chain finishes, `loadPlayerProfileView()` sees "not logged in" and returns `null` (`PlayerProfileView.ts:80-83`). The card would then show the "Couldn't connect" guest state and publish a definite `not_citizen`. A paying citizen would still lose the private-lobby perk, now marked as not-citizen instead of `unknown`. **Plan:** the new "recovered" signal waits for the flags **and** for the player chain, with the player wait capped at 5 s (`PLATFORM_INIT_DEADLINE_MS`).
- **`FlashistFacade.ts`: 0328's line is untouched.** 0329 neither reuses nor replaces 0328's hook; the new signal sits next to it. Exact edits are in §3a below. They are a few lines away from 0328's hunk, so the chance of a clash is low.
- **One owner call (Q1):** when the hidden card should listen for recovery. Taken literally, the brief leaves a small timing gap that can leave the card hidden for the whole page. I recommend a race-free variant, which can never show a card whose flag is off.
- **0326's accepted residual ("a fast-failing newer read wins"): 0329 does not make it more common** (§6). Waiting for the player removes the one realistic source of a fast-failing read that 0329 would otherwise add.
- **0326's binding merge note is met with no extra helper.** The reveal after recovery reuses the existing reveal code as one extracted method. It reads only through `refreshProfile()`, so there is no second place that applies a read result.
- **Project rules:** no new analytics event, no user-visible text, no HTML change. So the enum, `translateText`, `en.json`/`ru.json` and two-template rules are not touched.

---

## 1. What the code does today (checked this turn, working tree including 0326 and 0328)

- **Card.** `CitizenshipCard.connectedCallback` (`:104-148`) waits for the gate and reads `isCitizenshipUiEnabled()` once.
  - If false: it adds `hidden` and returns for good.
  - If true: lines `:122-143` are the "normal reveal":
    - un-hide, set `isEnabled`;
    - add the reconciliation listener;
    - re-render when the payments catalog settles;
    - `requestUpdate` / `updateComplete`;
    - `maybeReportSeen()`;
    - `await refreshProfile()`;
    - `startTenureClaim()`.
- **0326's guard is in place** (`:164-183`): `profileReadsIssued` / `newestAppliedProfileRead` (option A). `refreshProfile()` is the only place that assigns `this.profile` and calls either publish function.
- **Late-recovery branch** (`FlashistFacade.ts:916-968`). It runs once, whenever `YaGames.init()` resolves, on the normal path as well:
  - 0328's `void this.initExperimentFlags().then(() => this.logPlatformRecoveredIfDegraded())` (`:935-937`);
  - badge re-prime;
  - `initPayments()`;
  - player recovery `void this.playerInitResultPromise?.catch(...).then(getPlayer…)` (`:953-967`). It is **unbounded**: a hung `getPlayer()` never settles.
- **How the code tells "degraded boot, recovered late" from "normal".** `playerInitResultPromise` is set only once stage 2 has run (`:776-781`, `:713-714`). The player recovery already uses this marker.
- **Nothing else waits for recovery.** `isYandexAuthorized()`, `getYandexUniqueId()` and `getCurPlayerName()` wait only for `yandexSdkInitPlayerPromise`, which is force-resolved at the deadline. After that they read `yandexSdkPlayerObject` directly (`:1411-1414`, `:1432+`).
- **Profile login is lazy and does not lock in "guest".** `ProfileSession.resolveSession` returns `null` for a not-authorized player without setting `loginFailed` (`ProfileSession.ts:117-123`). A read made after the player recovers therefore logs in normally.
- **The flag check does not block.** `checkExperimentFlag` → `loadExperimentFlags` waits for `yandexInitPromise`, which resolves at the deadline (`:686`). So the card's first check does not wait for a hung `init()`. It hides at the gate.
- **The wiki agrees.** `systems/flashist-init.md:44`: *"Boot-rendered UI keeps degraded values after late SDK recovery unless that UI explicitly re-queries the facade."* `:42`: late player rehydration updates `isYandexAuthorized()`.

## 2. Design

**The facade exposes a single-use signal that stays resolved once fired:** `whenPlatformRecoveredLate(): Promise<void>`.
- It is modelled on `whenPaymentsCatalogSettled()`: waiters are parked in a list created on first use, which is safe for the `Object.create` test facades.
- It resolves at most once per page, and only when all of these hold:
  1. `init()` settled **after stage 2 had already run**: a degraded boot, not the normal path;
  2. the flag re-fetch settled **and flags now exist**;
  3. the player recovery chain settled, **or** 5 s passed (`PLATFORM_INIT_DEADLINE_MS`, reused as a value, not changed).
- If flags never arrive, or `init()` never settles, the signal never resolves, so the card stays hidden. This keeps `0291`'s fail-closed rule.
- **Why a promise that stays resolved, not an event:** the card might start waiting only after the recovery has already happened, for example while its own first flag read is still settling. A promise that stays resolved cannot be missed; a window event can.

**Why "stage 2 had run" and not literally "the gate had resolved" (brief item 1).** Stage 2 always runs before the gate. The gap between the two only matters for a recovery landing between stage 2 and the gate. Then the card's own first check at the gate reads real flags (or joins the fetch still running), and it never needs the signal. The two conditions are therefore equivalent for the card. The stage-2 marker is what the neighbouring player-recovery code already uses, so no new gate state is needed.

**Card.**
- Move `:122-143` verbatim into `private async revealCard()`. Both the first check and the check after recovery call it, so there is one code path for showing the card (brief item 2).
- On the `!enabled` branch, after adding `hidden`, call `recheckWhenPlatformRecovers()`. The subscribe condition depends on Q1.
- On the signal, re-check whether the card is still wanted: same connection, `isConnected`, and `!isEnabled`.
- Then re-read `isCitizenshipUiEnabled()`. If that is true and the card is still wanted, `await revealCard()`.
- **Once only:** the promise resolves only once, and `isEnabled` (set synchronously at the start of `revealCard`) stops a card that is already shown.
- **"Unsubscribe on disconnect":** a promise cannot be unsubscribed. Instead, a `connectionGeneration` counter goes up in `disconnectedCallback`, and a waiter from an earlier connection does nothing.

## 3. Exact changes

### 3a. `src/client/flashist/FlashistFacade.ts` (for sequencing against 0328)
1. **Player-recovery statement (`:953`)**, outside 0328's hunk: `void this.playerInitResultPromise?.catch(() => {}).then(async () => {…})` → `const playerRecovery = this.playerInitResultPromise?.catch(() => {}).then(async () => {…});`. The body is unchanged.
2. **New statement straight after it**, still inside the `try`:
   ```ts
   // Task 0329: a degraded boot recovered late — let the citizenship card re-check its gate.
   // Waits for the player too, so the card's profile read is not a false "guest" (bounded).
   if (playerRecovery !== undefined) {
     void Promise.all([
       this.loadExperimentFlags(), // memoized: joins the re-fetch above, never a second getFlags()
       Promise.race([playerRecovery, new Promise<void>((resolve) => setTimeout(resolve, PLATFORM_INIT_DEADLINE_MS))]),
     ]).then(() => this.markPlatformRecoveredLate()).catch(() => {});
   }
   ```
3. **New block next to `whenPaymentsCatalogSettled` (`~:1215`)**, a region 0328 does not touch:
   - private `hasPlatformRecoveredLate?: boolean`;
   - private `platformRecoveredLateResolvers?: Array<() => void>`;
   - public `whenPlatformRecoveredLate()`;
   - private `markPlatformRecoveredLate()`, which returns early if `!this.yandexExperimentFlags` or if already fired, then wakes all waiters.
   - Doc comment: fires once, may never resolve, subscribe with `.then()`.
4. **Not touched:** 0328's `.then(() => this.logPlatformRecoveredIfDegraded())` line, its fields and its methods, the enum, the deadline, `changeHref`, `initializePlatform`, `runPlatformInit`.
   - **Why not reuse 0328's hook:** its state (`platformDegradedWithoutFlags`) is analytics bookkeeping inside a never-throw try/catch, it is set only when a cause is classified, it is under review, and it does not wait for the player.
   - **Sequencing:** land 0329 after 0328's review settles. If 0328 changes `:935-937`, 0329 is unaffected. If 0328 moves the player-recovery block, 0329's edit 1 moves with it.

### 3b. `src/client/CitizenshipCard.ts`
- Extract `revealCard()`, a verbatim move of `:122-143`.
- Add `private connectionGeneration = 0`, incremented in `disconnectedCallback`.
- Add `recheckWhenPlatformRecovers()` with its own `.catch` → `console.warn`.
- Add a short task-0329 comment on the flag-gate comment at `:81-84`.
- The `startTenureClaim` doc sentence "re-read with `refreshProfile()`, never a second `loadPlayerProfileView()` caller" stays true and unchanged.

### 3c. Tests
**`tests/client/CitizenshipCard.test.ts`**
- Add `whenPlatformRecoveredLate: jest.fn()` to the facade mock. The `beforeEach` default is a promise that never settles.
- New `describe("late platform recovery (task 0329)")`, with a deferred to control the signal:
  1. **The reveal. Must fail on today's code.** Flag `false` at the gate → hidden → signal resolves → flag now `true` → card shown (title rendered, no `hidden`), `Citizenship:Seen` fired, `loadProfile` called exactly once. Run it on the unchanged tree first and record the failing run in the worklog.
  2. **Status is published.** Citizen profile: `getCitizenshipStatus()` is `unknown` before recovery and `citizen` after.
  3. **Flag still off after recovery** → hidden, `loadProfile` not called, no analytics.
  4. **Never recovers** → hidden, one flag read, no profile read.
  5. **One read across a recovery** (the stand-in for `Citizenship:Earned:XP`, per 0326's owner ruling Q2; the event is dormant, 0250 S1 / D4):
     - `loadProfile` is called exactly once;
     - `maybeClaimTenureGrant` is called once;
     - a reconciliation event fired **while hidden** triggers no read; one fired after the reveal triggers one.
  6. **Already shown at the gate** → the recovery path does nothing extra: one read.
  7. **Disconnected before the signal**, and separately **disconnected while the second flag read is pending** → no reveal, no read.
  8. **Local `CITIZENSHIP_CARD_ENABLED` off** → the signal is never subscribed.
- Existing fail-closed tests (now at `:215-252`, the brief's `:174`/`:228`) stay unchanged and green.

**`tests/client/FlashistFacade.test.ts`** (not 0328's untracked `PlatformDegradedFacade.test.ts`)
- New `describe`, driving the real `yandexSdkInit` on an `Object.create` facade, following the pattern of the existing test "is actually called from the late-SDK recovery site" (`:417`):
  - **Late path** (`playerInitResultPromise` set), flags and player arrive → the signal resolves, both for a waiter added before and for one added after.
  - **Normal path** (marker unset) → never resolves.
  - **Late path, `getFlags` rejects** → never resolves.
  - **Late path, player pending** → still pending until the player resolves, then resolves.
  - **Late path, `getPlayer` hangs** (fake timers) → pending at 4,999 ms, resolved at 5,000 ms.
  - **`getFlags` called exactly once** across the branch (memo shared with 0328's call).

**Not added: a combined real-facade + real-card test.** The card suite mocks the facade module entirely, and joining them would need a new harness (gameanalytics, PlayerProfileView, ProfileSession mocks) for one assertion. The two seam suites above cover each side of the handoff. Say so in the worklog.

## 4. Order of work
1. Card-test mock and new card tests → run on the unchanged tree → record the failing run.
2. Facade signal and its tests.
3. Card `revealCard` / recheck → green.
4. Grep check: `loadPlayerProfileView` is still referenced only at `CitizenshipCard.ts` inside `refreshProfile` in `src/`.
5. Verification (§7). Worklog entries.

## 5. Edge cases considered
- **The flags arrive while the card's first check is still settling.** The card hides and subscribes; the signal is already resolved, so it re-checks straight away. This is safe under Q1 option A; under B it is the gap.
- **The player never recovers within 5 s.** The card reveals in the "SDK up, player missing" state: guest shell plus the degraded subtitle, the existing `0049` presentation (`CitizenshipCard.ts:359-419`). It publishes `not_citizen`, and the perk stays locked either way. If the player lands later, nothing re-reads. The same limitation already exists on a normal boot whose `getPlayer()` finishes after the deadline, so this is not new.
- **Tenure claim and reconciliation now also run on recovered boots.** That is the normal reveal path. `maybeClaimTenureGrant` is once per load; reconciliation is latched once per session and gated inside.
- **`Citizenship:Seen` (M7) will now count recovered page loads.** That is the intended effect, and useful for the owner's check after release (brief step 6). `Session:PlatformRecovered` (0328) fires on flags alone. The card may reveal up to 5 s later (player wait), or not at all if the flag is off. So Recovered ≥ reveals, by design.
- **Dev env:** `checkExperimentFlag` always returns true, so the card never hides and never subscribes. There is no change to `npm run dev`.
- **A read landing after disconnect** (0326 §6): unchanged. It does not matter more because of 0329: the card is static in both templates and is not disconnected in production. Recorded, not built. Note: 0326's suggested remedy ("bump `profileReadsIssued`") would **not** work under option A. It would need `newestAppliedProfileRead = ++profileReadsIssued`.

## 6. 0326's accepted residual: does 0329 make it common? **No.**
- The reveal after recovery issues the card's **first** read on the page. Nothing competes with it while the card is hidden: the listeners are not registered and the buttons are not rendered.
- The one read that can overlap it is reconciliation's: its listener is added at reveal, and on a recovered boot reconciliation is scheduled when the late catalog lands. That overlap has the same shape and likelihood as on a normal boot.
- The realistic way 0329 *could* have made fast-failing reads common: a read issued before the player object exists returns "not logged in" at once. Gating the signal on player recovery removes it.
- After the 5 s cap, every read on that page returns `null` quickly and consistently, so no read flips the card to a wrong answer.
- **Recommendation: do not re-raise.**

## 7. Verification
1. New card test 1 fails before the change and passes after. Both runs go in the worklog.
2. `npm test -- tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts`, plus:
   - `CitizenshipStatus`, `CitizenshipPurchase`, `CitizenBadge`, `CitizensOnlyModal`;
   - also `PlatformDegradedFacade`, `PlatformDegradedAnalytics` (0328), `TenureGrantClaim`, `PaymentsReconciliation`.
3. Test 5 proves one read per recovery. Worklog note: `Citizenship:Earned:XP` is dormant (fires zero times). This follows 0326's owner ruling Q2 and is not a new question.
4. Local browser check: `npm run build-prod`, serve `static/`, open `yandex-games_iframe-parent.html`. Expect a hang, the 5 s deadline, then the card hidden. The worklog will say plainly that this harness never recovers, so the reveal itself is proven by unit tests only, not live.
5. `npm run lint`, then full `npm test`. For the supertest flake: first rule out 0197 (SIGSEGV or `ClearStaleLeftTrimmedPointerVisitor`), then re-run and say that I re-ran.
6. Worklog decision log: record `none` for fixes applied without asking, unless there are some.

## 8. Out of scope
- SDK download retry (0330);
- any "couldn't load / retry" UI;
- in-page menu return (0252);
- the match-exit URL (0331);
- analytics reference changes;
- the wiki (after close, fkit-wiki should ingest this; `systems/flashist-init.md:44` becomes partly out of date);
- commits.

---

## Open questions

**NEEDS-DECISION Q1: when the hidden card listens for recovery**
- **question:** Should the card listen for the "platform recovered" signal every time the flag check hides it (A), or only when it can see that the flags were missing (B, the brief's wording)?
- **options (recommended first):**
  - **(A) (Rec) Listen whenever it hides.**
    - The signal itself fires only on a boot that recovered late, and the card re-reads the flag before it shows, so a card whose flag is really off still never appears.
    - On a healthy boot with the flag off, the signal never fires, so nothing extra happens.
    - Cost: on the rare recovered boot where the flag is really off, one extra, free flag check.
  - **(B) Listen only if the facade says "flags missing" right after the check** (brief item 2, literally).
    - Needs one more facade method.
    - Leaves a tiny timing gap: if the flags land in the few microseconds between the check and that follow-up question, the card thinks "flag is off", never listens, and stays hidden for the whole page, which is today's bug.
    - Rare, but real.
  - **Explain more, then ask again:** Give me more context in simple terms, then re-ask the question.
- **recommendation:** A. It covers everything B does, has no timing gap, and can never show a card that should be hidden.
- **context (plain words):** The citizenship card checks one Yandex setting ("is this card switched on?") when the page loads. If Yandex was slow to load, the answer is "don't know", and the card hides. This task makes the card check again when Yandex finally arrives. The brief says to listen only when the card hid because the answer was "don't know", not because it was a real "no". But the card finds out which one it was by asking a second question a moment later, and in that moment the answer can change, so the card may think it was a real "no" and never check again. Option A skips the second question: the card always listens, and when Yandex arrives it simply asks again. A real "no" is still "no", so the card stays hidden. Both options keep the rule that the card never shows unless Yandex really says it is on. A is just safer. Either way the scope is the same.

**Assumptions stated, no decision needed unless the owner disagrees:**
- The signal waits up to 5 s for the Yandex player as well as the flags (§2). Without that wait, the knock-on fix the brief promises (the paying citizen's perk) would not happen.
- "Only after the gate" is implemented as "only after stage 2 ran" (§2). This is equivalent for the card.

---

## Owner rulings (recorded by the driver, `fkit-sprint-ship-loop` / fkit-lead, 2026-09-28)

Given live in the `fkit lead` session via `AskUserQuestion` (ADR-021/037). Verbatim answers:

- **NEEDS-DECISION Q1 (when the hidden card listens):** "Always when hidden (Recommended)" ⇒ option (A): the card subscribes to `whenPlatformRecoveredLate()` whenever the flag check hides it; on the signal it re-reads the flag and reveals only if it is really on.
- **Stated assumptions** (player wait capped at 5 s; "after the gate" implemented as "after stage 2 ran"): approved with the plan (shown in the approval preview).
- **Amendment to §7 step 4 (driver-flagged, owner-approved):** the local check uses **`DEPLOY_ENV=dev npm run build-prod`** only — never a plain `npm run build-prod`, which defaults to `DEPLOY_ENV=prod` and sends real GameAnalytics events (the trap found in 0328's plan). The worklog must say the local harness never recovers, so the reveal is proven by unit tests only.
- **Sequencing:** build after 0328's review settled (it has — round 1 closed-out, comments only).
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
