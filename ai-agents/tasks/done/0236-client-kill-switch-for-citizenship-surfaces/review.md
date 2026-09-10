# Review — 0236-client-kill-switch-for-citizenship-surfaces

Task: `ai-agents/tasks/done/0236-client-kill-switch-for-citizenship-surfaces/brief.md` *(path updated on the 2026-09-10 close — the folder moved from `backlog/` to `done/`; no review content was altered)*
File(s) under review (working tree, 168 insertions / 5 deletions):
- `src/client/flashist/FlashistFacade.ts`
- `src/client/CitizenBadge.ts`
- `src/client/PaymentsReconciliation.ts`
- `src/client/Inbox.ts`
- `tests/client/CitizenBadge.test.ts`
- `tests/client/Inbox.test.ts`
- `tests/client/PaymentsReconciliation.test.ts`

Status: **closed-out** (round 2 verified the round-1 fixes; 4 new low findings, none high → routed to residuals per the owner's stopping rule; 0236 does not reopen)

> **Coder amendment to the above, for accuracy:** of round 2's four, **R6 was fixed inside 0236** — a
> lead's deliberate exception to the stopping rule (one-line comment; tracking it out would cost more
> than fixing it). **R7, R8 and R9 route out untouched.** See *Round 2 — coder response*.

Round 1 — reviewers run: **Claude (own pass)** + **Codex adversarial** (`codex-cli 0.152.0`, completed, exit 0). Full two-reviewer coverage; no degradation.
Round 2 — reviewers run: **Claude (own pass)** + **Codex adversarial** (`codex-cli 0.152.0`, completed, exit 0). Full two-reviewer coverage; no degradation.

Round 1 gates re-run independently by the reviewer: `npx tsc --noEmit` → exit 0. `npx jest tests/client/{CitizenBadge,Inbox,PaymentsReconciliation,FlashistFacade}.test.ts` → 4 suites / 58 tests passed.
Round 2 gates re-run independently by the reviewer: same four suites → **4 suites / 65 tests passed** (8 added, 1 removed). ⚠️ Codex could **not** run jest in round 2 — its read-only sandbox blocked the jest haste-map write (`EPERM`). The suite result is therefore the reviewer's own execution only, not corroborated by the second reviewer and not relayed from the coder.

### Round 2 — the owner's stopping rule, as applied

Owner-set for this task: **only a HIGH-SEVERITY defect reopens 0236**; anything lower becomes a recorded residual routed to a named task. Severities were assigned from the traced blast radius first and routed afterwards — **nothing was downgraded to fit the rule**.

| # | Severity | Affects production behavior? | Routed to |
|---|----------|------------------------------|-----------|
| R6 | low | No — comment only | Residual R-A → follow-up task (**id needed from producer**) |
| R7 | low | No — test comment + mutation gap | Residual R-B → follow-up task (**id needed from producer**) |
| R8 | low | No — test gap; production ordering verified correct by the reviewer | Residual R-C → follow-up task (**id needed from producer**) |
| R9 | low | No — test robustness | Residual R-D → follow-up task (**id needed from producer**) |

**Nothing at medium or above. 0236 closes.** The reviewer cannot name the follow-up task — task creation is the producer's under ADR-033 — so the id is left open in the four residuals below and must be filled in by the producer.

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | medium | `src/client/flashist/FlashistFacade.ts:588` + `:720` | The sync snapshot is primed **once** and never re-primed on late-SDK recovery, unlike every other capability at that recovery site. Degraded boot → prime resolves `false` → SDK recovers → `:720` refetches real flags → async consumers (Inbox, payments) see `true` while the badge's snapshot stays `false` for the whole session. The helper's two halves diverge. Raised by both reviewers. |
| R2 | 1 | low | `src/client/flashist/FlashistFacade.ts:917-921` | Comment "The pre-resolution window is empty on every real path anyway" is **false on two verified paths**: (a) the platform-init deadline path (`:577-580`, `:590`) — `fetchExperimentFlags()`'s own 5 s `getFlags()` race starts *after* the platform deadline and can outlive it, so the prime is still unresolved when Bootstrap imports `Main.ts`; (b) any throw in `runPlatformInit()` before `:588`, where the prime never runs at all. Behavior is fail-closed (correct); the *comment* is wrong, and it is the same assumption that produced R1. |
| R3 | 1 | low | `tests/client/CitizenBadge.test.ts:113-119` | "renders no badge before the snapshot resolves (fails CLOSED)" is byte-for-byte equivalent to the test above it — both `mockReturnValue(false)` against a fully-mocked module. It never builds a facade, never observes the `citizenshipSurfacesSnapshot = false` field default, never runs the prime, and stays green with R1 present. Its comment claims coverage it does not provide. Raised by both reviewers. |
| R4 | 1 | low | `tests/client/FlashistFacade.test.ts` (absent coverage) | Neither `isCitizenshipSurfacesEnabled()`, `isCitizenshipSurfacesEnabledSync()`, nor `primeCitizenshipSurfacesSnapshot()` is exercised anywhere — all three suites mock the whole facade module. The `layer1 && layer2` composition, including the **owner-ruled layer-1-absolute guarantee (2026-08-21)**, is enforced by no test. `FlashistFacade.test.ts` already builds bare-prototype facades and is the natural home. |
| R5 | 1 | low | `src/client/flashist/FlashistFacade.ts:862` | "No automated runtime verification is possible" is **understated, not wrong**. `checkExperimentFlag()` returns `true` unconditionally when `process.env.GAME_ENV === "dev"`, so layer 2 is hard-wired ON in every dev build — independent of citizen rows or 0217. The remote half of the kill switch cannot be exercised in dev **at all**; validating it needs a staging/prod build with the Yandex flag actually flipped. Record as the precondition before this switch is relied on at launch. |

| R6 | 2 | low | `src/client/flashist/FlashistFacade.ts:920` | The comment R2 was raised to fix is now **internally contradictory**: `:920` still says the snapshot is "Primed once during platform init", while `:931` — added in the same rewrite — says "a degraded boot that DOES recover **re-primes** from yandexSdkInit()". Round 2 created a second prime caller (`:588` and `:725`); the opening line was not updated with the rest. Raised by Codex. Comment only; no behavior. |
| R7 | 2 | low | `tests/client/FlashistFacade.test.ts:356-363` | "is false BEFORE priming — **the real field default**" does not test the real field default. `makeCitizenshipFacade()` uses `Object.create(FlashistFacade.prototype)` (`:300`), which skips class-field initializers — so the test observes `undefined === true`, **not** `citizenshipSurfacesSnapshot = false` (`FlashistFacade.ts:937`). It genuinely covers the `=== true` guard's fail-closed normalization (valuable, and it would go red if the guard were removed), but the `= false` initializer is uncovered: flipping it to `true` would not be caught here. The comment claims coverage it does not have — a milder recurrence of R3's shape. Raised by both reviewers. |
| R8 | 2 | low | `tests/client/FlashistFacade.test.ts:417-443` | The R1 wiring test asserts only that `primeCitizenshipSurfacesSnapshot` **was called**, not that it was called **after** `this.yandexGamesSDK = sdk` (`FlashistFacade.ts:707`) and after `initExperimentFlags()` (`:720`). It does exercise the real `yandexSdkInit()` and would go red if the `:725` call were deleted (the coder's claim, corroborated). But a future **reorder** — moving the prime above the SDK assignment — would leave the test green while silently reintroducing exactly R1: the prime would take `loadExperimentFlags()`'s no-SDK early return and write `false`. Production ordering is correct today (reviewer-verified). Raised by both reviewers. |
| R9 | 2 | low | `tests/client/FlashistFacade.test.ts:369-372, 383-386, 404-407` | The three snapshot tests drain the prime with exactly `await Promise.resolve(); await Promise.resolve();` — and the chain needs exactly two microtask turns (`await` the stubbed `isCitizenshipUiEnabled` → async return resolves → `.then` writes the field). They sit **precisely on the boundary**. Deterministic today (V8 microtask order is not random, so this is fragile, not flaky), but any added `await` in `isCitizenshipSurfacesEnabled()` breaks all three at once, and the failure presents as a confusing "snapshot is false" rather than "not enough ticks". `await new Promise(r => setTimeout(r, 0))` would drain unconditionally. Reviewer-only finding. |

### Round 2 — verified, no finding (do not chase)

- **The R1 fix's race analysis (push-hardest 1) — CORRECT, independently confirmed by both reviewers.** The reviewer enumerated the interleavings separately from the coder and reached the same conclusion. **The tighter argument, worth recording because the coder's wording is loose where it matters:** the boot prime's no-SDK chain is **entirely microtasks** (`loadExperimentFlags` → `await yandexInitPromise`, already resolved at `:543` → `if (!this.yandexGamesSDK) return`), so it completes inside the same microtask drain as `:588`. `yandexGamesSDK` is assigned from `await YaGames.init()`, which settles on **IO — a macrotask** — and a macrotask cannot interleave into an uninterrupted microtask drain. So the boot prime can never observe an SDK assigned after `:588`, and its `false` write **strictly precedes** any recovery write. The coder's phrasing ("strictly before `YaGames.init()` could have resolved") lands on the right conclusion but reads as a claim about wall-clock ordering; the microtask-drain property is what actually makes it safe. If this argument is ever revisited, use the tighter form.
  - Case (b) — SDK already present — is also correct: both primes await the same `??=`-memoized `yandexInitExperimentsPromise`, so the writes are value-identical and order is irrelevant.
  - **No double `getFlags()`**: `??=` is evaluated after the shared `await this.yandexInitPromise`, and microtask resumption is FIFO, so the first chain assigns the memo and the second sees it. **No double cohort logging**: `logExperimentEvents()` latches on `hasLoggedExperimentEvents` (`:833-840`).
  - The recovery prime also runs on the **normal** path (the recovery block is not conditional). Harmless — idempotent write of the same memoized value.
- **No monotonic "only ever set true" latch (push-hardest 2) — AGREE with the coder, emphatically.** No ordering produces a stale `false` over a fresh `true` (above). And a latch would be **actively wrong on a kill switch**: it would make the snapshot unable to return to `false`, so any future re-prime on a flag refresh would pin the switch permanently ON — defeating the one thing the feature exists to do. Declining the guard is the right call, not merely a defensible one.
- **R3 handled by deletion, not repair (push-hardest 3) — CORRECT, claim verified.** `tests/client/CitizenBadge.test.ts:14-20` replaces the whole `FlashistFacade` module with a factory exposing one `jest.fn()`. Nothing in that suite can reach the real class: observing the real field default would need `jest.requireActual` plus a real facade, whose constructor does the platform detection and analytics wiring that `FlashistFacade.test.ts`'s own header comment explains it avoids. The coverage was unreachable **by construction**, so removing it and pointing at its new home was correct. Confirmed by both reviewers. Not a deleted test.
- **The layer-1 absoluteness test (push-hardest 4) — CORRECT and materially stronger than a boolean assertion.** `FlashistFacade.test.ts:324-333` asserts `isCitizenshipUiEnabled` is **never called**. This is the right assertion because `&&` is commutative in its *result*: a broken `(await this.isCitizenshipUiEnabled()) && CITIZENSHIP_CARD_ENABLED` still returns `false`, so a boolean-only test would pass while the remote read — and behind it `checkExperimentFlag()`'s `GAME_ENV === "dev"` bypass — had already executed. Only the "never called" form detects that. Confirmed by both reviewers. This is the sole test anywhere enforcing the 2026-08-21 owner ruling, and it does enforce it.
- **The R1 wiring test (push-hardest 5) — the coder's claim holds for the regression it names.** The test invokes the real `yandexSdkInit()` (`:435-437`) and spies the prime as an own-property shadow, so deleting `:725` does fail it. The reviewer did not re-run the coder's remove-and-watch-it-go-red experiment, and says so; the assessment is from reading the test. Its residual weakness is the ordering gap → R8.
- **Record corrections are honest and complete**, with one exception (R6):
  - The `=== true` comment now reads "normalizes the type rather than changing behavior … `!undefined` is already truthy, so the only caller behaves the same either way" — **accurate**, and it is the reviewer's own round-1 correction adopted verbatim in substance.
  - The load-order argument is now scoped to the happy path with **all three** failing paths named (deadline, degraded, early-throw) — **complete**; the reviewer found no fourth.
  - R2's window scoping is **correct**.
  - The one flaw is the stale opening line → **R6**.
- **`brief.md` §3 LAUNCH PRECONDITION (R5) — verified, and sharper than the finding it answers.** It correctly identifies something the reviewer's R5 did not: the client bundle's `GAME_ENV` comes from **webpack mode** (`webpack.config.js:334` — `JSON.stringify(isProduction ? "prod" : "dev")`), **not** from the `cross-env GAME_ENV=dev` in the `dev`/`dev:staging`/`dev:prod` npm scripts, which only set it for the Node server process. Both claims independently confirmed. The gate's three validation conditions and the "independent of 0217" note are accurate.

### Verified — raised and DISPROVEN / confirmed-correct (no row; do not chase)

- **Sync-snapshot load-order claim (push-hardest 1) — PARTIALLY CORRECT.** The claim holds on the happy path: when `settledResults !== null`, flags are already loaded, the prime resolves in microtasks, and `runPlatformInit` still has `await getLanguageCode()` / `await getCurPlayerName()` plus Bootstrap's chunk fetch ahead of it. It does **not** hold on the deadline/degraded paths → R1, R2.
- **`=== true` guard (push-hardest 2) — NOT a defect, keep it.** The `Object.create(FlashistFacade.prototype)` premise is real (`tests/client/FlashistFacade.test.ts:17`, `:27`). Both reviewers cleared it. One correction: it is **type-normalizing, not behavior-critical** — removing it changes nothing observable (`!undefined` is already truthy at the only call site). The "load-bearing, do not tidy" wording overstates it slightly. Harmless; not worth a change.
- **Four-call-site coverage claim (push-hardest 3) — CORRECT.** All four are inline **child-position** ternaries: `HostLobbyModal.ts:546`, `JoinPrivateLobbyModal.ts:91`, `Leaderboard.ts:312`, `PlayerPanel.ts:442`. `nothing` is valid in each; none binds the result to a `TemplateResult`-typed variable. Independently confirmed by reviewer-run `tsc --noEmit` (exit 0) *and* by positional inspection — the type check alone would not have caught a child-vs-attribute position error, so the manual pass was needed and it also clears.
- **Inbox mirror-stub (push-hardest 4) — CORRECT as far as `Inbox.ts` goes.** `stubCitizenshipGate()` reads the mocked `CITIZENSHIP_CARD_ENABLED`, and the pre-existing test at `Inbox.test.ts:136` still mutates it, so `Inbox.ts`'s own gate is honestly tested. Codex concurs. The mirror is the right call over hard-coding `true`. What is genuinely missing is coverage of the **helper itself** → R4 (narrower claim than "the test is hollow").
- **Payments gate location — CORRECT.** `reconcilePurchases` is imported nowhere but `PaymentsReconciliation.ts:15`; `schedulePaymentsReconciliation()` is the only entry and is latched; the gate at `:57` precedes `getSignedPurchases()` and the `/reconcile` POST. Nothing bypasses it. Both reviewers agree.
- **Layer-1 absoluteness through `&&` — CORRECT.** `FlashistFacade.ts:907-910` evaluates `CITIZENSHIP_CARD_ENABLED` first; `false` short-circuits before `isCitizenshipUiEnabled()` — and therefore before `checkExperimentFlag()`'s `GAME_ENV === "dev"` bypass — is ever reached. The 2026-08-21 owner ruling is preserved in behavior (though now untested — R4).
- **Unhandled rejection in the prime — CORRECT, coder's reasoning holds.** `yandexInitPromise` is resolve-only (`:371-373`); `fetchExperimentFlags()` try/catches its own `getFlags()` throw and timeout (`:807-822`). Residual throw sites are the analytics wrappers, already uncaught at the pre-existing `void settledPromise.then(...)` on `:584` — so the prime adds no new risk class. Both reviewers independently cleared it. A `.catch()` would be free insurance; nit only, not required.
- **No missed surfaces.** `CitizenshipPurchase.ts`, `NameChangeRequest.ts`, `PlayerProfileView.ts` are reachable only through `CitizenshipCard.ts`, whose `connectedCallback` gate (`:76`) returns early and absolutely. `NewsButton.ts:49` / `NewsModal.ts:211,220` consume `InboxState.available`, so the gated `UNAVAILABLE` hides the tab strip — an effective kill, not a cosmetic one.

## Coder response

_(coder-owned — reviewer does not write here)_

Round 1 processed by the coder 2026-09-10. Every finding independently verified against the code
before any change; owner ruled all five live the same day. **No finding was accepted on deference.**

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | **Defect (mine)** | Re-prime the snapshot at the late-SDK recovery site in `yandexSdkInit()`, alongside the four sibling recoveries, following their `void this.initX()` convention. Verified independently: `:716-720` refetches flags for real after a degraded boot, and the snapshot was the only capability of the five not repeated there. | ✅ done |
| R2 | CORRECT | Defect (comment) | Rewrote the `citizenshipSurfacesSnapshot` doc comment: the empty pre-resolution window is now scoped to the **happy path**, and the deadline / degraded / early-throw paths are named as real windows where the snapshot stays `false` — deliberately, fail-closed. Design unchanged; only the false claim about it. | ✅ done |
| R3 | CORRECT | Defect (hollow test) | **Removed** the duplicate case. That suite mocks the facade module wholesale, so it can *never* observe the real field default or run the prime — the coverage was unreachable there by construction, not merely duplicated. Replaced by real coverage in `FlashistFacade.test.ts` (R4), and a comment at the removal site says where it went and why. | ✅ done |
| R4 | CORRECT | Missing coverage | Added 8 cases to `tests/client/FlashistFacade.test.ts` against real bare-prototype facades: layer-1 absoluteness **asserted as "the remote read never happens"**, both-layers composition, the sync getter before/after priming, the remote-off case, the R1 stale→fresh re-prime, and a wiring test that the recovery site calls the prime. **The wiring test was proven to fail with the R1 fix removed** — it is not another R3. | ✅ done |
| R5 | CORRECT | Launch precondition | Added **"§3 LAUNCH PRECONDITION"** to `brief.md`: layer 2 must be validated in a staging/prod build — flag ON, flag OFF, and propagation delay observed — **before** `CITIZENSHIP_CARD_ENABLED` is flipped `true`. Phrased as a gate on the launch. Notes it is independent of `0217` and of citizen rows. No code change. | ✅ done |

**Two reviewer corrections to the coder's own record, both accepted:**
- `=== true` comment **softened**: it is **type-normalizing, not behavior-critical** (`!undefined` is
  already truthy at the only call site). Guard kept; the overstated "load-bearing, do not tidy"
  wording is gone from both the code and the worklog. An overstated comment teaches the next reader
  something false.
- **The load-order argument is now recorded with its real scope** — sound on the happy path (the
  reviewer traced the microtask chain and concurs), **not** on the deadline/degraded paths, which is
  precisely R1/R2. The worklog no longer states it as universal.

### Round 2 — coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R6 | CORRECT | Defect (stale comment) | Verified: the doc comment opened *"Primed once during platform init"* while a later line of **the same comment** described the R1 re-prime — self-contradictory, and I introduced both in one rewrite. Opening line now reads *"Primed during platform init, and re-primed on late-SDK recovery from yandexSdkInit()."* One line, comment only. | ✅ done |
| R7 | — | — | **ROUTED OUT** to a follow-up task, not fixed here. | routed out |
| R8 | — | — | **ROUTED OUT** to a follow-up task, not fixed here. | routed out |
| R9 | — | — | **ROUTED OUT** to a follow-up task, not fixed here. | routed out |

> **R6 was taken inside 0236 as a deliberate EXCEPTION to the owner's stopping rule — the lead's call,
> not an owner ruling.** Reason, recorded so the exception is visible rather than silent: tracking a
> one-line comment fix through a follow-up task costs more than making it. **R7, R8 and R9 were left
> untouched** and route out with their re-raise conditions in this ledger; a producer files them.

**Round 2 findings: four, all LOW, none high. R1–R5 fixes all verified by both reviewers.**

> ⚠️ **VERIFICATION LIMIT — round 2's passing suite is SINGLE-SOURCE, not two-reviewer agreement.**
> **Codex could not run jest in round 2**: the read-only sandbox blocked the haste-map write (`EPERM`).
> The green result is the **Claude reviewer's single execution**. The *findings* had two-reviewer
> coverage; the *test execution* did not. Do not read round 2 as corroborated test verification.

**Race/double-fire analysis for the R1 fix** (the owner asked how I satisfied myself), recorded here
because it is the fix's correctness argument and should survive this round:
- **No double fetch.** The re-prime reaches `getFlags()` only through `initExperimentFlags()` →
  `loadExperimentFlags()`, whose `??=` memo is the same one the sibling `void this.initExperimentFlags()`
  assigns. Both chains await one promise.
- **No stale write, under any interleaving.** The initial prime can write only what
  `checkExperimentFlag` read. Either (a) it took the no-SDK early return — which happens promptly,
  since `yandexInitPromise` is already resolved by the time the prime is kicked off, and strictly
  before `YaGames.init()` could have resolved to create the re-prime at all; or (b) it did **not**
  take that return, meaning `yandexGamesSDK` was already set, so it awaits the **same memoized fetch**
  as the re-prime and writes an **identical** value. A late "stale" write in case (b) is
  value-identical and harmless.
- **No monotonic/latch guard was added**, deliberately: the analysis above shows no ordering produces
  a stale `false` over a fresh `true`, and a "only ever set true" guard would mask a future real bug
  rather than surface it. Flags are fetched once and memoized, so no legitimate `true → false`
  transition exists within a session.

> **Round 2 sharpened BOTH of the above. Same conclusions, better reasons — recorded because they are
> the arguments worth keeping:**
>
> - **The race guarantee is not wall-clock ordering, it is the event loop.** The no-SDK chain is
>   entirely **microtasks**, while `yandexGamesSDK` is assigned from an **IO macrotask**
>   (`await YaGames.init()`). A macrotask **cannot interleave into an uninterrupted microtask drain**,
>   so the initial prime's no-SDK read and its `false` write complete as one atomic run before any SDK
>   assignment is observable. That is a structural guarantee, not a timing argument — strictly
>   stronger than the ordering reasoning above it.
> - **A latch would not merely be unnecessary — it would be actively WRONG on a kill switch.** It
>   would make the snapshot unable to return to `false`, **pinning the switch permanently ON** if a
>   future re-prime were ever added on a flag refresh. That defeats the entire purpose of the feature.
>   The original "it would mask a bug" reasoning is true but far too weak.

## Accepted residuals (shared, do-not-re-litigate)

### Routed out of 0236 by the owner's round-2 stopping rule (all low; none reopens this task)

⚠️ **These four are ROUTED, not dismissed.** They need a follow-up task id, which only the producer may create (ADR-033). Until that id exists they live here.

- **R-A · "Primed once" comment is stale (R6)** — What: `FlashistFacade.ts:920` says the snapshot is primed once; `:931` in the same block says a recovering degraded boot re-primes. Two prime callers now exist (`:588`, `:725`). · Why (structural): comment-only, no behavior; the owner's stopping rule routes anything below high out of 0236. · Re-raise only if: it is still stale when someone next edits that comment block, **or** a third prime caller is added.
- **R-B · "Real field default" test does not cover the initializer (R7)** — What: `FlashistFacade.test.ts:356-363` observes `undefined` on an `Object.create` facade, not `citizenshipSurfacesSnapshot = false`. It does cover the `=== true` guard. · Why (structural): the real default is only observable on a real `new FlashistFacade()`, whose constructor does platform detection and analytics wiring that this suite deliberately avoids — so closing it means either a constructor-level harness or accepting the gap. Behavior is fail-closed either way. · Re-raise only if: the `=== true` guard is removed (the guard is what currently makes the uninitialized case safe), or a constructor-level test harness lands and makes the coverage cheap.
- **R-C · Wiring test does not pin the recovery ordering (R8)** — What: `FlashistFacade.test.ts:417-443` asserts the prime is called, not that it is called after `yandexGamesSDK = sdk` (`FlashistFacade.ts:707`). A reorder would pass the test and silently reintroduce R1. · Why (structural): production ordering is correct today and reviewer-verified; this is a guard against a future edit, not a live defect. · Re-raise only if: the recovery block at `:704-725` is reordered or refactored — **that edit is exactly what this residual is watching for**.
- **R-D · Snapshot tests sit exactly on the two-microtask boundary (R9)** — What: `FlashistFacade.test.ts:369-372, 383-386, 404-407` drain the prime with exactly two `await Promise.resolve()`, which is exactly what the chain needs. · Why (structural): deterministic, not flaky; a robustness nit, and the owner's rule routes it out. · Re-raise only if: an `await` is added anywhere in `isCitizenshipSurfacesEnabled()` / `isCitizenshipUiEnabled()`'s chain — all three tests then fail together and misleadingly.

### Pre-existing owner rulings (relayed into this ledger, not decided here)

- **CitizenshipCard fail-open carve-out** — What: `CitizenshipCard.ts:86-88` does not read the experiment flag when the Yandex SDK is degraded (`isYandexDegraded()`), so the card shows while the badge (which fails CLOSED) does not. · Why (structural): owner ruling **2026-09-10, KEEP AS-IS**, made in full knowledge that the flag is unread in degraded mode; an honest "couldn't connect" card was judged better than a silently missing surface. Each direction is implemented where it was ruled. · Re-raise only if: the owner reverses the 2026-09-10 ruling, **or** a session is found where the card offers a real purchase CTA while the kill switch is off (that is a different failure from the ruled-on one).
- **Server-side crediting stays ungated** — What: match-end XP crediting is not behind this switch. · Why (structural): 0236 is deliberately a **UI** kill switch; gating the server path is a different blast radius and a different task. · Re-raise only if: the scope is widened to a full citizenship kill switch.
- **Dead `citizenship-login-requested` event** — What: left in place, not removed by this change. · Why (structural): out of 0236's scope; removing it is unrelated cleanup. · Re-raise only if: it is found to have a live consumer.
- **`CITIZENSHIP_CARD_ENABLED` is `false` today** — What: every surface is off right now, so the switch is untestable end-to-end in production as shipped. · Why (structural): that is the pre-launch state the flag exists to hold; expected, not a defect. · Re-raise only if: the flag is flipped `true` without the R5 validation precondition being met first.
