# 0273 — S4: client login session and Bearer token — worklog

Built by `@fkit-coder`, spawned by `fkit-sprint-ship-loop` under its declared-approval marker
(owner approved `plan.md`, blob `b161e4bb476f910cad3884cda93b14c65c3017e9`, via `AskUserQuestion`
in the driver session, 2026-09-16). Plan carry verified with `git hash-object` before any source
was written; `plan.md` is byte-unchanged (re-verified at the end of the run).

Built the approved plan's §4.4 steps 1–7, in order, RED-first. Nothing was committed or pushed;
no task file was moved; no status was set; `ai-agents/wiki-vault/` was not touched. The four files
reserved for the parallel producer (`ai-agents/sprints/plan-sprint-4.md`,
`ai-agents/sprints/backlog.md`, `0273/brief.md`, `0274/brief.md`) were not edited — they already
carried the producer's uncommitted changes before this run started.

---

## Change surface

### New source

| File | What it is |
|---|---|
| `src/client/ProfileSession.ts` | The login session. `startProfileSession()` (boot kick-off, never throws), `ensureSession()`, `profileFetch()`, `getLoginOutcome()`, `resetProfileSessionForTests()`. Memory-only token, one shared in-flight login, D3 failure latch, 401 → one re-login → one retry. |
| `src/client/GameRestart.ts` | `requestGameRestart({matchActive, reload, storage, fallback})` plus the `PROFILE_LOGIN_RESTART_LATCH_KEY` constant. Pure function with injected dependencies (the `StartScreenControls.ts` shape). |

### Modified source

| File | Change |
|---|---|
| `src/client/PlayerProfileView.ts` | `GET /v1/profile` goes through `profileFetch`; no `yandexPlayerId` in the URL. Still reads the Yandex id locally for the earned-at storage key. Dropped its own base-URL resolution (`profileFetch` owns it). |
| `src/client/Inbox.ts` | `GET /v1/messages` and `PATCH /v1/messages/read` go through `profileFetch`; PATCH body is `{}` or `{ids}`. Removed the module-level `session` variable. `unconfigured` → `UNAVAILABLE`; `no_session`/`network_error` → `failedState()`. |
| `src/client/NameChangeRequest.ts` | `postJson` now wraps `profileFetch`; both calls send no id (`{requestedName}` / `{}`). Dropped its `resolveApiBase` and its `getYandexUniqueId` reads. |
| `src/client/PaymentsApiClient.ts` | `createPurchaseIntent(productId)` — signature lost its `yandexPlayerId` argument — goes through `profileFetch`. `completePurchase` / `reconcilePurchases` are **unchanged** and still carry no `Authorization`. |
| `src/client/CitizenshipPurchase.ts` | No longer reads the Yandex id; calls `createPurchaseIntent("citizenship")`. |
| `src/client/CitizenshipCard.ts` | New exported `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` + `CitizenshipLoginSucceededDetail`. `onLoginCtaTap` fires `Restart:Cancelled` when the dialog fails, otherwise fires `Restart:Requested` and dispatches the event carrying its own `fallback` (`refreshProfile`). The existing `CITIZENSHIP_LOGIN_REQUESTED_EVENT` is untouched. |
| `src/client/Main.ts` | `void startProfileSession()` at the top of `startClient()`, after `startBuildVersionChecker()`. One `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` listener in `Client.initialize()` passing `matchActive: this.gameStop !== null`. New module-level `readSessionStorage()` helper (guards the property access itself, which can throw). |
| `src/client/flashist/FlashistFacade.ts` | 11 new `analyticEvents` entries (6 session + 5 restart). New `reloadApp()` next to `changeHref`. |
| `src/core/profile/PaymentsContract.ts` | `PurchaseIntentRequestSchema` → `{ productId }` only. |
| `src/core/profile/InboxContract.ts` | `MarkReadRequestSchema` → `{ ids? }` only; removed the now-unused local `PlayerIdSchema`. |
| `src/core/profile/NameChangeContract.ts` | `NameChangeRequestSchema` → `{ requestedName }`; `NameChangeCancelRequestSchema` → `z.object({})`; removed the now-unused local `PlayerIdSchema`. |
| `src/profile-server/Routes.ts` | The legacy-fallback removal — see the region list below. |

### `src/profile-server/Routes.ts` — exactly which regions changed

Asked for explicitly because `0274` and `0276` also edit this file.

1. **Imports** — dropped `z` (zod) and `PLATFORM_YANDEX_GAMES`; both were used only by the legacy branch.
2. **`ProfileRepo` doc comment** — added the note that no route calls `findPlayerByIdentity` any more, and why it is still declared.
3. **`SessionConfig` doc comment** — "there is no fallback behind it".
4. **Deleted `LegacyCallerIdSchema`** (was immediately above `BEARER_PREFIX`).
5. **`CallerResolution`** — collapsed to `{status:"ok"; playerId} | CallerFailure`. Dropped the `unknown` and `bad_request` members and the `via` discriminator (with a comment telling `0274` not to build `legacy_fallback_used` against it).
6. **`sendCallerFailure` doc comment** — rewritten for the two-outcome world.
7. **`resolveCaller`** — the legacy branch is gone; the header now decides alone; header-less is 401 before the `sessionEnabled` check. **Kept `async`** so `0267`'s signature check still drops in there without touching 6 call sites.
8. **`profileReadLimiter` comment** — the enumeration rationale no longer applies; the cap is now about the read itself.
9. **`toPublicProfile` doc comment** — "needs a session token but the token is `vfy:false`".
10. **`GET /v1/profile` handler** — dropped the `bad_request` branch and the `caller.status === "ok" ?` ternary; a missing profile row is still 404.
11. **`POST /v1/payments/yandex/intent`** — dropped the `caller.status !== "ok"` 404 branch and rewrote its preamble comment. The FK → 404 path is unchanged.
12. **`GET /v1/messages` and `PATCH /v1/messages/read`** — dropped the `bad_request` and `unknown` branches.
13. **`POST /v1/profile/name-change-request` and `-cancel`** — dropped the `caller.status !== "ok"` 403 branches; rewrote the cancel route's griefing-vector comment (the vector now costs one `POST /v1/login`).

Nothing else in the file was touched: the error handler, the login route, both internal resolve/credit routes, the payments complete/reconcile routes, the inbox send route and the name-change decide route are byte-identical.

### Tests

| File | Change |
|---|---|
| `tests/client/ProfileSession.test.ts` | **New**, 30 tests. Every case in the plan's step-1 table, each written against the mutation it must catch. |
| `tests/client/GameRestart.test.ts` | **New**, 9 tests, including the "NEVER reloads while a match is running" guard. |
| `tests/client/support/profileSession.ts` | **New** harness: `primeProfileSession()` logs in with a throwaway stub so each caller suite's own stub only answers its own route, plus `EXPECTED_BEARER` / `loginResponseBody()`. |
| `tests/profile-server/support/sessionToken.ts` | **New** shared "sign a test token" helper (`TEST_SESSION_SECRET`, `TEST_SESSION_CONFIG`, `bearerFor`) over the real `signSessionToken`. |
| `tests/client/PlayerProfileView.test.ts` | Primed session; asserts the URL is `/v1/profile` with `Authorization: Bearer …`. |
| `tests/client/Inbox.test.ts` | Primed session; Bearer + id-free bodies; **new describe** for the 401 → re-login → retry path end to end through a real caller. |
| `tests/client/NameChangeRequest.test.ts` | Primed session; the "no Yandex id" case became "no session"; Bearer + id-free bodies. |
| `tests/client/PaymentsApiClient.test.ts` | Primed session; new `createPurchaseIntent` signature; **new test** that complete/reconcile send no `Authorization`. |
| `tests/client/CitizenshipPurchase.test.ts` | Dropped the Yandex-id mock and its no-id test (folded into the null-intent case). |
| `tests/client/CitizenshipCard.test.ts` | The "transitions to logged-in after login" test split into three: the restart is requested once; its `fallback` transitions the card; a dismissed dialog requests nothing and fires `Restart:Cancelled`. |
| `tests/profile-server/{Routes,InboxRoutes,NameChangeRoutes,PaymentsRoutes,SessionRoutes}.test.ts` | Migrated onto `bearerFor`. Every legacy case flipped to a **401 removal proof**; `SessionRoutes`'s `unknownStatus` became `missingPlayerStatus` + `rigMissingPlayer`, which proves the 404/403 the plan says to KEEP. |
| `tests/core/profile/{InboxContract,PaymentsContract}.test.ts` | Legacy-field cases replaced by "strips a legacy `yandexPlayerId` from the parsed output". |
| `tests/integration/{Routes,NameChange,Login}.it.test.ts` | Migrated onto real signed tokens; added legacy-401 cases over real Postgres. `Login.it.test.ts` was **not** in the plan's migration list — the integration gate caught it (see the decision log). |

### Docs

`ai-agents/knowledge-base/analytics-event-reference.md` — two new sections ("Profile Session Events",
"Profile Login Restart Events") covering all 11 events, with the ⚠️ that the six session events are
**not** gated by `CITIZENSHIP_CARD_ENABLED` and will be the first profile events to fire for real
players, and the note that exactly one `Failed:*` can fire per page load (D3).

---

## Gate results

| Gate | Result |
|---|---|
| `npm test` | **130 suites / 1602 tests, all passed** (~35 s, shell harnesses included). No re-run needed — no flake hit this run. |
| `npm run test:integration` | **9 suites / 104 tests, all passed** (~5 s) against the local throwaway Postgres on 5433. |
| `npx tsc --noEmit` | exit 0, no output. |
| `npm run lint` | exit 0, no output. |
| `npx prettier --check` | Clean for every file this task touched. |

---

## Decision log — what was decided without asking

Under ADR-019's discipline as it transfers to the sprint-loop Build worker: each of these is
mechanical/localized or an obvious winner, and inside the approved plan's intent.

1. **Kept `Inbox.ts`'s `getYandexUniqueId() === null → UNAVAILABLE` check** (plan §1.6 / step 3).
   The plan only said the id stops being *sent*. Removing the read would route an authorized player
   with a broken SDK player object into `no_session` → `failedState()`, firing a spurious
   `Inbox:LoadFailed` and flipping a previously quiet "unavailable" into an "error". Keeping it is a
   zero-behaviour-change diff. Obvious winner within the plan's intent.
2. **Removed `Inbox.ts`'s module-level `session` variable entirely**, where the plan said it "keeps
   only `base`" (§1.6). With `profileFetch` resolving the base per call, a retained `base` would be
   dead data, and `markInboxRead`'s `session !== null` guard is exactly equivalent to
   `cachedState.available` (session was only ever set on the same success path). Obvious winner;
   the plan's point — the id is gone from it — holds either way.
3. **Kept `resolveCaller` `async` in `Routes.ts`** even though it no longer awaits anything. Making
   it synchronous would have churned 6 call sites and then forced `0267` to churn them back when it
   adds the signature check the function's own comment promises drops in there. Lint is unaffected
   (`tseslint.configs.recommended`, so no `require-await`). Obvious winner.
4. **Kept `findPlayerByIdentity` in `Routes.ts`'s `ProfileRepo` interface** (the plan said it stays
   "in the repository"). Removing it from the structural interface would have forced edits to five
   test mock literals *and* removed the `expect(findPlayerByIdentity).not.toHaveBeenCalled()`
   assertions, which are the regression guard for the whole removal. Documented in place as
   uncalled-by-any-route and kept for `0274`. In-plan, mechanical.
5. **Carried the restart's "no reload" behaviour on the event's `detail.fallback`** rather than
   having `Main.ts` reach into the card. The plan's §4.2 left the mechanism open ("keep
   `refreshProfile()` as the fallback for the suppressed cases"); this keeps `refreshProfile`
   private and gives the listener no card reference. Mechanical, localized.
6. **`requestGameRestart` refuses to reload when storage throws or is `null`** (plan §3.4 said only
   "a throw degrades to 'no reload'"). Extended to a `null` storage for the same reason: with no
   latch the once-per-load cap cannot hold, and an unbounded reload loop is far worse than no
   restart. In-plan, same posture as `Bootstrap.ts:83-90`.
7. **Fixed `tests/integration/Login.it.test.ts`** — its "the legacy fallback for an unknown id is
   404" test was **not** in the plan's step-6 migration list (the plan named `Routes.it` and
   `NameChange.it` only). The integration gate failed on it, so it was flipped to a 401 removal
   proof covering both a known and an unknown id. Mechanical, and the alternative was a red gate.
8. **Formatted only the 8 files my change made prettier-dirty.** `src/client/CitizenshipPurchase.ts`
   was already prettier-dirty at `HEAD` in a region I did not touch, so it was left alone rather
   than mixing unrelated reformatting into this diff.

Nothing here was a frontier-move, a regression, a disputed severity, or outside the approved plan,
so nothing was escalated as `NEEDS-DECISION`.

---

## Residuals and caveats

1. **The restart is unverifiable in production until `0054`** (plan risk 7, unchanged).
   `CITIZENSHIP_CARD_ENABLED: false` is absolute with no dev bypass, so the login button does not
   exist anywhere today. Its whole evidence at ship time is jest plus a local flag flip — and **the
   local flag flip was not performed in this run.** Nothing was observed in a browser.
2. **`Main.ts`'s new listener and `startProfileSession()` call are covered by no test.** There is no
   `Main.test.ts` in this repo and creating a harness for that module was outside the plan. The two
   pieces it wires are each fully tested (`GameRestart.test.ts`, `ProfileSession.test.ts`); the
   wiring itself is proven only by `tsc`.
3. **`FlashistFacade.reloadApp()` is covered by no test** — it is a one-line
   `window.location.reload()` and `tests/client/FlashistFacade.test.ts` does not exercise navigation.
4. **The card-side tests were written AFTER the card edit, not RED-first.** `ProfileSession`,
   `GameRestart` and every server/contract/caller test in steps 1, 3, 4 and 6 *were* confirmed red
   before their source change (recorded in the run). The three new `CitizenshipCard.test.ts` cases
   were not — they were added once the dispatch already existed. They are not vacuous (the event
   count and `loadProfile` call count would both fail without the change), but the ordering claim
   does not hold for them.
5. **No `NameChangeContract` contract test was added** for the `yandexPlayerId`-stripping guarantee.
   No `tests/core/profile/NameChangeContract.test.ts` exists, and the stripping behaviour for both
   name-change bodies is proved end to end instead by the new 401 cases in
   `NameChangeRoutes.test.ts` and `NameChange.it.test.ts`. `InboxContract` and `PaymentsContract`
   did get the explicit stripping tests the plan asked for.
6. **Mutation-sensitivity was spot-checked, not exhaustively verified.** One deliberate mutation was
   run (`Bearer ` → `bearer `), which turned 3 tests red as designed. The rest rest on the tests
   having been observed red before their implementation, which is weaker evidence than a full
   mutation sweep.
7. **The D1 deploy hole from the plan (§4.6) is unchanged and was not re-investigated.** The profile
   box was not contacted during this build, so "such calls had no live server to reach" is still
   unverified. Blast radius stays a zero-state card and an unavailable inbox.
8. **Plan risk 3 is now real in code:** a misconfigured `PROFILE_SESSION_SECRET` breaks *every*
   player-facing profile call, not just login, until a redeploy. That is the intended direction, but
   it is a genuine widening — the box has no fallback identity path any longer.
9. **`0274` must not implement `session.rejected reason=legacy_fallback_used`** (plan §4.7). The
   `via` field it would have hooked no longer exists; `Routes.ts`'s `CallerResolution` comment says
   so in place. The producer still needs to strike it from `0274`'s brief — not done here (that
   brief is one of the four files reserved for the parallel producer).
10. **`tests/integration/Login.it.test.ts`, `tests/profile-server/SessionRoutes.test.ts` and several
    other files I edited are still untracked** (they arrived with S1–S3 in this shared uncommitted
    working tree). My edits sit on top of uncommitted work; nothing was committed.
11. **The shell-harness suite adds ~35 s to `npm test` on this host** — CLAUDE.md's recorded figure
    is ~22–25 s at 113 suites / 1185 tests. The suite is now 130 / 1602. Not a regression from this
    task, but the documented numbers are stale.

---

# Round 1 review response — 2026-09-16

Processed `review.md`'s Round-1 *Reviewer findings* with the `fkit-process-stateful-review` method,
as `fkit-sprint-ship-loop`'s Process-review worker under the loop's declared-approval marker (owner
approved `plan.md`, blob `b161e4bb476f910cad3884cda93b14c65c3017e9`, via `AskUserQuestion` in the
driver session). Plan carry re-verified with `git hash-object` before any source was written;
`plan.md` is byte-unchanged. The *Coder response* and *Accepted residuals* sections of `review.md`
carry the full verdict table; this is the decision log.

Nothing was committed or pushed. No task file was moved, no status was set. `ai-agents/wiki-vault/`
was not touched. The producer's four reserved files (`plan-sprint-4.md`, `backlog.md`,
`0273/brief.md`, `0274/brief.md`) were not edited. **`src/profile-server/Routes.ts` was not touched
at all this round** — no region, not one byte — so `0274` and `0276` see no new movement in it.

## Change surface this round

`src/client/ProfileSession.ts` · `src/client/GameRestart.ts` ·
`src/client/flashist/FlashistFacade.ts` (one enum entry) · `src/core/profile/NameChangeContract.ts`
(comment only) · `tests/client/ProfileSession.test.ts` · `tests/client/GameRestart.test.ts` ·
`ai-agents/knowledge-base/analytics-event-reference.md`.

## Gate results (all four rerun after the changes)

| Gate | Result |
|---|---|
| `npm test` | 130 suites / **1605** tests, all passed, 49.89 s |
| `npm run test:integration` | 9 suites / 104 tests, all passed, 5.242 s |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` | exit 0, no output |
| `npx prettier --check` (touched files) | clean |

**No flake hit** — no `supertest` timeout, no "did not exit", no `SIGSEGV`. Nothing was re-run
because nothing needed re-running.

## Decision log — what was decided without asking (continues the build's log)

9. **R1 — `Profile:Session:Relogin` fired once per concurrent 401, not once per re-login.**
   Verified against `ProfileSession.ts` (the event sat outside the `if (session !== null)` block, so
   a second caller finding `session === null` fired again and then joined the same login). Rewrote
   `relogin()` so the event lives inside the branch that actually discards the stale token; a later
   401 finding `session === null` joins `ensureSession()` silently. **Qualified to apply unattended:**
   reviewer-marked CORRECT, inside the approved plan (plan §4.1 specifies exactly one shared
   re-login), mechanical and confined to one function. Mutation-proven both ways.

10. **R2 — the "two simultaneous 401s share ONE re-login" test was vacuous.** Verified: the second
    caller asked for an unrouted `/v1/messages`, the stub threw, `send()` turned it into
    `network_error`, so only one caller ever reached the 401 path. Replaced it with **two** tests,
    because the plan's mutation needs a shape the old test could not reach even once fixed:
    (a) genuinely simultaneous 401s (both routes 401, the login route spans a macrotask) asserting
    one re-login **and one event**; (b) a 401 arriving on an **already-replaced** token, gated so the
    ordering is deterministic — the only shape that catches *"drop the stale-token comparison"*.
    **Mutation executed as instructed:** deleted the comparison → test (b) red
    (`Tests: 1 failed, 32 passed`), restored → 33/33, file byte-compared back. **The plan's 15
    mutations are now 15/15 caught.** **Qualified:** CORRECT, test-only, inside the plan's §4.4
    step-1 table.

11. **R3 — stale comment in `NameChangeContract.ts:121`.** Verified untrue after S4 (`GET /v1/profile`
    needs a Bearer token; `SessionRoutes.test.ts:321` proves a legacy id 401s). Corrected the
    sentence **and kept the residual it justifies**: the token is `vfy:false`, so anyone can mint one
    for an asserted id and the projection is still effectively enumerable — only the cost of one
    `POST /v1/login` was added. The `⚠️ ACCEPTED RESIDUAL` block below it is untouched.
    **Qualified:** CORRECT, comment-only, in-plan.

12. **R4 — sixth restart event added. ⚠️ OWNER RULING, and a deliberate deviation from the approved
    plan §3.6, which names FIVE restart events.** Not my call to make and not made unattended: the
    owner chose option (a) on 2026-09-16 after the reviewer put both dispositions to them. Added
    `PROFILE_LOGIN_RESTART_SUPPRESSED_NO_STORAGE` → `Profile:Login:Restart:Suppressed:NoStorage`,
    fired on **both** storage-less paths (`storage === null` and a throwing storage) through one
    `reportNoStorage()` helper. **Reason recorded:** `0274` (S5) is about to build monitoring on
    these events, and a `Restart:Requested` with no outcome event would be unexplainable on a
    dashboard — while hiding exactly the population (private mode / iframe storage policy) it would
    matter for. Also corrected two false doc claims in `analytics-event-reference.md`: "exactly one
    of the **three** outcomes" → four, and the `Suppressed:Latched` row's claim to cover the
    storage-unavailable case, which the code never did. The deviation is flagged in the code
    comment, in the reference doc, and in `review.md`'s accepted residuals (AR-8). Three tests
    assert the new event; silencing the helper turns all three red.

13. **R5 — `outcome` was never cleared, so `getLoginOutcome()` could return a previous account's
    values.** Verified; nil today (`0253` unbuilt) and fixed anyway as instructed. `outcome` is now
    cleared at both sites that discard a session: the Yandex-id change in `resolveSession()` and the
    stale-token discard in `relogin()`. **Qualified:** CORRECT, mechanical, in-plan (§4.1 defines
    `getLoginOutcome` and its "null when there is no session" contract).

14. **R5, follow-on — removed a third `outcome = null` I had first written on `login()`'s failure
    path, because the mutation proved it dead.** I added it, then mutated it away and **the suite
    stayed green**: `login()` is only ever reached with `session === null`, and both discard sites
    already clear the outcome, so nothing stale can survive to that point. Keeping an unkillable
    line is the exact defect R2 is about, so it went, replaced by a comment saying why it is absent
    and why the invariant still holds (`session` and `outcome` are written together with no `await`
    between them). The two clears that remain are each individually mutation-proven red.
    **Qualified:** mechanical, inside the same finding, and strictly evidence-driven — the
    alternative was shipping a line no test can defend.

15. **R6 — accepted, no code written.** Owner ruled it a settled accepted residual
    (`Main.ts:304` vs `:709-716`: `gameStop` is assigned after two awaits, so a sub-millisecond
    join-setup window reads `matchActive: false`). Recorded verbatim-in-substance as **AR-1** in
    `review.md`'s accepted-residuals section with the owner's reason: no live match exists in that
    window, plan §3.5's guarantee is met exactly, the worst case is a lost lobby slot, and a
    `joining` flag would add state for a case with no live match. **Do not re-litigate.**

16. **Carried the build's six standing residuals into the ledger** (AR-2 … AR-7) so they are not
    lost at close: no production evidence for the restart until `0054` and the local flag flip was
    not performed; `Main.ts` wiring and `reloadApp()` covered by no test; three `CitizenshipCard`
    cases not RED-first; no `NameChangeContract` contract test; plan risk 3 now real; the plan §4.6
    D1 deploy hole unchanged and the profile box never contacted. Recording only — nothing was
    fixed, nothing was softened.

17. **Formatted only the three files my edits made prettier-dirty** (`GameRestart.ts`,
    `ProfileSession.test.ts`, `analytics-event-reference.md`). Same posture as the build's entry 8 —
    no unrelated reformatting mixed into this diff.

Nothing this round was a frontier-move, a regression, an oscillation, a disputed severity or outside
the approved plan, so nothing was escalated as `NEEDS-DECISION`. The one deviation from the plan
(entry 12) is an owner ruling, not a unilateral call.

## Still open after this round

- **`review.md`'s header still reads `Status: in-review`.** I deliberately did not change it: the
  convergence call belongs to the reviewer and the driver, not to the author of the code.
- **`0274`'s brief still needs `session.rejected reason=legacy_fallback_used` struck** (plan §4.7,
  build residual 9). That brief is one of the producer's reserved files; untouched here.

---

# Round 2 review response — 2026-09-16

Converged round. Two leftovers: R7 applied, R8 recorded as an owner ruling. The reviewer independently
re-executed 8 mutations in an isolated copy (source copied, `node_modules` symlinked, no project file
modified) and reproduced every round-1 claim exactly, including M1's `1 failed, 32 passed`; it
confirmed the plan's mutation sweep at **15/15**, confirmed `src/profile-server/Routes.ts` byte-identical
(`git hash-object` = `634d1d9092b4c292b79494a8121d61ac8c8628a7`), and attacked the inverse of the R1
fix (can `Profile:Session:Relogin` now be *missed*? it cannot).

## Decision log (continues)

18. **R7 — corrected a test comment that named the wrong mutation.**
    `tests/client/ProfileSession.test.ts`'s "returns null after a re-login fails" case was labelled as
    guarding a clear on `login()`'s failure path — the dead line removed in round 1 (entry 14). The
    reviewer's M3 proves it actually guards the `outcome = null` inside `relogin()`. Left as written,
    the comment was a trap: a maintainer could have satisfied it by re-adding unreachable code.
    Rewritten to name the real mutation, and to say plainly that the login-failure clear is
    unreachable and **must not be re-added**, with the invariant behind it (`login()` has one call
    site and is only reached with `session === null`; all three `session = null` sites clear `outcome`
    with it, no `await` between ⇒ `session === null ⟺ outcome === null`) and the evidence that
    re-adding it is inert (mutation-tested twice: round 1, and the reviewer's M5).
    **Qualified to apply unattended:** reviewer-marked CORRECT, comment-only, one block, inside the
    approved plan's §4.4 step-1 test. No assertion changed.

19. **R8 — ⚠️ OWNER RULING: record as a known limit, do NOT fix. No code behaviour changed.**
    Codex-raised, low; reviewer verdict PARTIALLY CORRECT. `ProfileSession.ts`'s already-replaced-token
    branch returns the fresh token **without** re-checking it was minted for the same Yandex account.
    **The missing check is real; the exploit path is unreachable in today's code** — the reviewer
    traced all three `yandexSdkPlayerObject` assignments: only guest → B is possible in-page, never
    A → B, and a guest holds no token so `relogin()` is never reached.
    **Owner's reason for accepting:** no in-page authorized-account switch exists (late-SDK recovery
    only fills an empty slot, `initPlayer` is one-shot, and the auth dialog is reachable only from the
    guest-only login button), and `0267` reworks this whole identity funnel anyway.
    **RE-RAISE TRIGGER, recorded verbatim in substance: re-raise if a logout or switch-account surface
    appears, or if `0267` re-binds identity mid-load.**
    Recorded in the ledger by the reviewer as **AR-9**. I added a pointer comment at that branch in
    `ProfileSession.ts` naming AR-9 and the re-raise trigger, because that is where a future reader
    needs it — comment only, no behaviour touched. **This was not my call:** it is the owner's ruling,
    applied as given.

20. **Did NOT re-add the line removed in round 1 (entry 14).** The reviewer verified the reachability
    claim two ways — M5 (re-adding it) was inert, and it proved the `session === null ⟺ outcome === null`
    equivalence — and stated that declining to ship unkillable code was right. Recording this so the
    deletion is not "restored" later by someone reading only entry 14.

21. **`0274`'s brief item is CLOSED, and not by me.** The parallel producer already struck
    `session.rejected reason=legacy_fallback_used` from it with a do-not-re-add note naming
    `0273`/D1. Build residual 9 and round-1's "still open" item are both discharged; that brief stays
    the producer's and was not touched here.

## Change surface, round 2

`src/client/ProfileSession.ts` (one comment block, no code) ·
`tests/client/ProfileSession.test.ts` (one comment block, no assertion) · this worklog · the ledger's
*Coder response* section. Nothing else.

`src/profile-server/Routes.ts` still hashes `634d1d9092b4c292b79494a8121d61ac8c8628a7`; `plan.md` still
hashes `b161e4bb476f910cad3884cda93b14c65c3017e9` — both re-verified after these edits. Nothing
committed or pushed, no task file moved, no status set, no `ai-agents/wiki-vault/` write, the
producer's four reserved files untouched, and neither the ledger's *Reviewer findings* section nor its
`Status:` header was edited.

## Gate results (all four rerun after the round-2 edits)

| Gate | Result |
|---|---|
| `npm test` | 130 suites / 1605 tests, all passed, 43.419 s |
| `npm run test:integration` | 9 suites / 104 tests, all passed, 4.49 s |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` | exit 0, no output |
| `npx prettier --check` (touched files) | clean |

**No flake hit** — no `supertest` timeout, no "did not exit", no `SIGSEGV`, no
`ClearStaleLeftTrimmedPointerVisitor` crash report. Nothing was re-run because nothing needed it.

⚠️ **`npm run test:integration` is coder-reported and unverified by the reviewer** — it holds no
`TEST_DATABASE_URL`, and the run drops and recreates the schema of the local throwaway Postgres
(`gc-0012-it-pg`, port 5433). The line above is the only evidence for that gate.

## Still open after round 2

- **`review.md`'s `Status:` header** — still the reviewer's and the driver's call, not mine.
- **Everything in AR-2 … AR-9 stands**, in particular: the restart has no production evidence until
  `0054` and the local flag flip was never performed; the profile box has still never been contacted
  (plan §4.6 D1 hole).
