# Review — 0273

Task: `ai-agents/tasks/backlog/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md`
Plan under review: `plan.md` (owner-approved, blob `b161e4bb476f910cad3884cda93b14c65c3017e9`)
File(s) under review: the S4 surface only — `src/client/ProfileSession.ts`, `src/client/GameRestart.ts`,
`src/client/{PlayerProfileView,Inbox,NameChangeRequest,PaymentsApiClient,CitizenshipPurchase,CitizenshipCard,Main}.ts`,
`src/client/flashist/FlashistFacade.ts`, `src/core/profile/{PaymentsContract,InboxContract,NameChangeContract}.ts`,
`src/profile-server/Routes.ts` (the 13 legacy-removal regions only), and the new/migrated test suites.
Status: closed-out

> **Closed out by the reviewer, round 3, 2026-09-16.** No confirmed defect is open. Every Round-1 and
> Round-2 finding is fixed-and-mutation-proven, or owner-ruled into *Accepted residuals* (AR-1 … AR-9).
> ⚠️ **Closeout is a REVIEW verdict, not a ship verdict.** **Eight** residuals survive it (AR-7 was
> closed outright on 2026-09-16 — see below).
>
> 🚨 **AR-2 stands completely alone at the top, and nothing has reduced it:** the login-button restart
> has **zero production evidence**, the local flag flip was **never performed**, and nothing was
> observed in a browser by the builder or by any review round. First observable at `0054`. It is the
> single loudest thing a deploy decision on `0273` has to carry.
>
> Also standing and unreduced: **`npm run test:integration` was coder-reported only across all three
> rounds** — this session holds no `TEST_DATABASE_URL` and that run drops and recreates the schema, so
> the DB-backed legacy-401 proofs were never reviewer-executed.
>
> **AR-7** (the plan §4.6 D1 deploy hole) was reduced and then **CLOSED on 2026-09-16**, after
> closeout, by four independent legs — neither the local nor the remote gate flag was ever enabled, the
> database has never held a row, and no browser ever sent a legacy-shaped request. The decisive leg is
> **owner-reported, not agent-measured.** Read the *Residuals surviving closeout* list below before
> deploying anything.
>
> **These post-closeout edits added evidence to an accepted residual and then closed it. They reopened
> no finding, and no review round was run for any of them.**

> 🚩 **ADDENDUM 2026-09-16, noticed while making the AR-7 edit — `src/profile-server/Routes.ts` HAS
> MOVED since this review verified it, and the hash assertions below are now HISTORICAL.**
>
> This ledger states twice (Round 2, and the Round-3 spot-check table) that `Routes.ts` was
> byte-identical at `634d1d9092b4c292b79494a8121d61ac8c8628a7`. **That was true when measured and is no
> longer current state:** the file now hashes `a6fc5ffd641221aa9e39fc6060cd622bf6291aaa`. **`0274`
> (S5) has since landed its session-rejection metric into the same shared uncommitted working tree** —
> `resolveCaller` now routes every 401 through a new `rejectCaller(code, reason)` funnel with reasons
> `absent` / `invalid` / `expired`. This is exactly the shared-file hazard plan §4.7 named ("`0274` +
> `0276` + this removal all touch `Routes.ts`; sequence them one at a time").
>
> **What I checked, and what this does NOT mean.** S4's conclusion is **unaffected**: the legacy branch
> is still gone, `LegacyCallerIdSchema` is still absent, `findPlayerByIdentity` is still called by no
> route, and the wire behaviour S4 depends on is unchanged (no header → 401 `session_invalid`; no usable
> secret → 503; non-Bearer → 401; expired → 401 `session_expired`). `0274` also honoured `0273`'s
> constraint in place — a ⛔ comment states there is no `legacy_fallback_used`. I re-ran S4's
> server-side proofs against the changed file: **`tests/profile-server` + `tests/core/profile` → 27
> suites / 572 tests, all passed**, including the four legacy-removal 401 proofs in
> `SessionRoutes.test.ts`.
>
> ⚠️ **I have NOT reviewed `0274`'s changes.** They are outside S4's scope and belong to `0274`'s own
> review. This addendum records only that the file moved, that S4's guarantees survive it, and that any
> future reader must not treat `634d1d9…` as the current state of `Routes.ts`.

**Round 1 — 2026-09-16. Reviewers: fkit-reviewer's own pass + Codex adversarial pass
(`codex exec --sandbox read-only`), exit 0, 2 findings returned. Both reviewers ran; coverage is
NOT partial.**

Reviewer test run (read-only): `npx jest` over the 8 S4 client suites + `tests/profile-server` +
`tests/core/profile` → **32 suites / 654 tests, all passed**, 0.96 s. No flake hit, so no re-run
was needed.

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | `src/client/ProfileSession.ts:237` | `Profile:Session:Relogin` fires once per concurrent 401, not once per re-login — N simultaneous 401s on one stale token produce N events and 1 login. |
| R2 | 1 | medium | `tests/client/ProfileSession.test.ts:413-435` | The "two simultaneous 401s share ONE re-login" test never produces a second 401 — `/v1/messages` is unrouted, so that caller returns `network_error`. The plan's named mutation is not caught. |
| R3 | 1 | low | `src/core/profile/NameChangeContract.ts:121` | Stale comment: "`GET /v1/profile` is unauthenticated and enumerable by a non-secret player id" — untrue since S4; three other comment blocks in this same file were updated. |
| R4 | 1 | low | `src/client/GameRestart.ts:70-73`, `:84-90` | Two restart outcomes (null storage, throwing storage) fire no analytics at all, so `Restart:Requested` can have no follow-up — contradicting `analytics-event-reference.md:392`. |
| R5 | 1 | low | `src/client/ProfileSession.ts:71`, `:164-167`, `:308-311` | `outcome` is never cleared, so `getLoginOutcome()` can return a previous account's `{created, grantChecks}` while there is no session — its own doc (`:307`) says "Null when there is no session". |
| R6 | 1 | low | `src/client/Main.ts:304` vs `:709-716` | `matchActive: gameStop !== null` has a join-setup gap: `gameStop` is assigned only after two `await`s. **Frontier-move, not a defect** — no live match exists in that window. |

### Detail

**R1 — Defect (low). In-plan fix.** `relogin` (`ProfileSession.ts:230-241`) fires the analytics event
at `:237`, *outside* the `if (session !== null)` block. Traced: caller A nulls `session` at `:235`,
fires event #1, and `ensureSession()` (`:99-110`) sets `inflight` synchronously; caller B then finds
`session === null`, skips the whole block, fires event #2, and joins the same `inflight`. Behaviour is
correct (one login); the **count** is inflated by the concurrency factor. This feeds S5 (`0274`)
monitoring and contradicts `ai-agents/knowledge-base/analytics-event-reference.md:371`. Traced from
code, not executed — no test asserts the event count on this path (see R2).

**R2 — Defect (medium, test). Raised by Codex, verified and extended here. In-plan fix.**
`routedFetch` (`tests/client/ProfileSession.test.ts:82-105`) throws on an unrouted path (`:92-95`);
the test's routes are `/v1/login` and `/v1/profile` only, but the second caller requests
`/v1/messages` (`:430`). That throw is caught by `send()` (`ProfileSession.ts:297`) and becomes
`network_error`, so the second caller never reaches the 401 path. The assertion `loginCalls === 2`
is then satisfied by one caller alone. Consequences:
- The plan's §4.4 step-1 mutation *"drop the stale-token comparison → red"* is **not** caught.
- The real reason that comparison exists is also untested: a 401 arriving on an **already-replaced**
  token must return the fresh token (`:232-233`) rather than null the good session and start a third
  login. Dropping the comparison breaks that case, and nothing goes red.
- This gap is also why R1 went unnoticed.

**R3 — Defect (low, doc). Raised by Codex, verified. In-plan fix.** After S4, `GET /v1/profile`
requires a valid Bearer token (`Routes.ts:475-480`) and a legacy `?yandexPlayerId=` is 401
(`tests/profile-server/SessionRoutes.test.ts:321`). The residual the comment justifies still stands —
the token is `vfy:false`, so anyone can mint one for an id they assert — so only the stated *reason*
is wrong, not the conclusion. Do not weaken the residual while fixing the sentence.

**R4 — Defect (low, telemetry blind spot + false doc claim).** `GameRestart.ts` has four outcomes but
fires an event for only three. `storage === null` (`:70-73`) and a throwing storage (`:84-90`) run the
fallback silently. `analytics-event-reference.md:392` claims "Exactly one of the three outcomes below
follows" — false on those two paths, and the affected population (private mode / iframe storage
policy) is exactly the one this would hide. `tests/client/GameRestart.test.ts:116`, `:133`, `:150`
assert no reload and no throw, but assert nothing about analytics. **Two dispositions, and the choice
is the owner's:** adding a sixth event deviates from plan §3.6 (which names five); correcting the doc
claim does not.

**R5 — Defect (low, latent). In-plan fix.** `outcome` (`:71`) is written on every successful login
(`:164-167`) and cleared only by `resetProfileSessionForTests()` (`:74-79`). After a successful login
followed by a failed re-login, or after a Yandex-id change whose new login fails, `session` is null
and `loginFailed` is true while `outcome` still holds the **previous account's** values.
`getLoginOutcome()` (`:308-311`) then returns them. `0253` is the only consumer and is not built, so
today's impact is nil. `tests/client/ProfileSession.test.ts:488` covers only the never-logged-in case.

**R6 — Frontier-move (low), NOT a defect. Recommend recording as an accepted residual, not fixing.**
`handleJoinLobby` sets `gameHasStarted = false` (`Main.ts:698`) and assigns `this.gameStop` only at
`:716`, after `await getServerConfigFromClient()` (`:709`) and `await fetchCosmetics()` (`:711`).
Between the `join-lobby` event and `:716`, `matchActive` reads `false`. The plan's stated guarantee
(§3.5 — never reload out of a **live** match) still holds: no match is running in that window, and the
cost of hitting it is a lost lobby slot, not an interrupted game. Reaching it needs the Yandex auth
dialog to resolve inside a window that is normally sub-millisecond (both awaits are memoized). Closing
it means a separate "joining" flag — new state for a case with no live match.

### Re-litigates settled decisions (suppressed)

None. Neither reviewer raised the strict `Bearer ` spelling (`0271` residual R3), D3's no-retry rule,
memory-only token storage, `vfy:false`, the missing login rate limiter, `resolveCaller` staying
`async`, or the `0272` over-count-by-one residual.

### Checked, no defect (not recorded as rows)

- **`profileFetch` genuinely never throws.** `FlashistFacade.isYandexAuthorized()`
  (`FlashistFacade.ts:1208-1211`) awaits with `.catch(() => {})` and delegates to `isYandexLoggedIn()`
  (`:1200-1206`), which is fully try/caught; `getYandexUniqueId()` (`:1250-1269`) likewise;
  `resolveApiBase()` (`ProfileSession.ts:138-148`) catches the config read. So no caller can take a
  rejection into the game. (This was my own suspected high-severity finding — **disproven**.)
- **Token leakage: none found on any path.** No `console` or logger call exists in
  `ProfileSession.ts`; the token appears only in the `Authorization` header built at `:283-285`;
  analytics take an event string only; `ProfileSession` is imported by exactly five client modules
  (grep across `src/`) and never by `Transport.ts` or `src/server/`. Error paths (`:217-218`,
  `:297-298`) carry no token. `tests/client/ProfileSession.test.ts:450-471` spies
  `Storage.prototype.setItem` and `document.cookie`.
- **D3 latch: no way around it found.** `loginFailed` is set on every non-`ok` attempt (`:158-161`)
  and checked before the base resolve (`:128-129`); the boot kick-off and an early caller share
  `inflight` (`:99-110`); no rejection path skips `login()`'s latch. Unconfigured deliberately does
  not latch, which is in-plan (§4.1).
- **401 bound holds.** `profileFetch:261-272` retries exactly once and returns a second 401 as-is;
  `relogin` never re-enters `profileFetch`. A permanently-401ing server costs 2 logins **per request**
  — bounded per call, as plan §4.1 specifies; no polling caller exists to make it unbounded over time.
- **Legacy removal on the server is clean.** `resolveCaller` (`Routes.ts:383-408`) reads the header
  alone; every player-facing route calls it and `sendCallerFailure` before touching a repository
  (`:477`, `:669`, `:857`, `:882`, `:999`, `:1049`); `LegacyCallerIdSchema` and the `via` / `unknown` /
  `bad_request` members are gone. The three `/internal/v1/*` routes still sit behind `internalAuth`
  (`:560`, `:590`, `:921`) and are never CORS-enabled. `SessionRoutes.test.ts:295`, `:321`, `:332`,
  `:341` prove an invalid Bearer never falls back to a valid legacy id, a known id alone 401s, and a
  malformed one is 401 rather than 400.
- **CORS survives the new preflights.** `GET /v1/messages` was a simple request before S4 and is
  preflighted now that it carries `Authorization`. `publicCors` (`:175-187`) sets
  `Access-Control-Allow-Headers: Content-Type, Authorization` and answers OPTIONS 204, and is mounted
  on `/v1/profile` (`:474-475`), `/v1/login` (`:505`), `/v1/payments` (`:651`), `/v1/messages`
  (`:844-849`) and both name-change paths (`:980-985`).
- **Fail-soft mapping matches the plan exactly**: profile → zero-state (`PlayerProfileView.ts:89-92`,
  `:146-163`); inbox `unconfigured` → `UNAVAILABLE`, everything else → `failedState()`
  (`Inbox.ts:161-168`); name change → `error` (`NameChangeRequest.ts:39-58`); intent → `null`
  (`PaymentsApiClient.ts:68-82`).
- **Guests make no call.** `resolveSession()` returns before any fetch on `isYandexAuthorized() ===
  false` or a null id (`:113-119`); tested at `ProfileSession.test.ts:133`, `:143`. A degraded boot
  leaves `yandexSdkPlayerObject` unset so `isYandexLoggedIn()` is `false`. The late-SDK case is plan
  scenario 5, accepted by ruling.
- **Worklog residual 5 (no `NameChangeContract` stripping test) is NOT a defect.**
  `tests/profile-server/NameChangeRoutes.test.ts:112`, `:221` and
  `tests/integration/NameChange.it.test.ts:165` each send a legacy-shaped body and assert 401, which
  proves both halves of the guarantee: the body parses (rather than 400s) and then 401s. The plan step
  is satisfied by different evidence, not skipped.
- **Plan §4.5 respected**: `CITIZENSHIP_CARD_ENABLED` is still `false` (`FlashistFacade.ts:210`);
  `Transport.ts` and `src/server/` untouched by S4; `complete`/`reconcile` still carry no
  `Authorization` (`PaymentsApiClient.ts`, asserted by a new test).
- **Builder claim 3 (card tests written after the edit)** — test authoring order is not verifiable
  from the tree; taking the worklog's own admission at face value. The three
  `CitizenshipCard.test.ts` cases are not vacuous (they count the dispatched event and the fallback's
  effect).

### Mutation table verdict (plan §4.4) — which mutations a test that EXISTS actually catches

| Plan mutation | Caught? | By |
|---|---|---|
| remove the `isYandexAuthorized` check | ✅ | `ProfileSession.test.ts:133` |
| drop the shared in-flight promise | ✅ | `:153` |
| swallow a failure event / let the rejection escape | ✅ | `:252-306` (5 cases), `:276`, `:288` |
| **[D3]** restore the on-demand retry | ✅ | `:309` |
| remove the config try/catch | ✅ | `:218`, `:230` |
| change the `Bearer ` prefix spelling | ✅ | `:336` — and the builder executed this mutation (3 red) |
| turn the 401 retry into a loop | ✅ | `:373` |
| **drop the stale-token comparison** | ❌ **NOT caught** | `:413` is vacuous — **R2** |
| remove the Yandex-id comparison | ✅ | `:199` |
| any storage/cookie write of the token | ✅ | `:450` |
| leave the `?yandexPlayerId=` query/body field in | ✅ | exact-URL/body assertions: `Inbox.test.ts:215`, `:441`; `NameChangeRequest.test.ts:75-78`, `:181` |
| remove the latch write (at-most-once cap) | ✅ | `GameRestart.test.ts:61` |
| **drop the match guard — "must never regress"** | ✅ | **`GameRestart.test.ts:78`** — asserts `reload` never called, `fallback` once, `Suppressed:InMatch` fired, latch untouched |
| remove the storage try/catch | ✅ | `GameRestart.test.ts:116`, `:133` |
| restore the server legacy fallback | ✅ | `SessionRoutes.test.ts:321`, `:332`, `:341`, `:295` |

**One of fifteen is not caught.** The one the plan names as must-never-regress **is**.

### Builder's own flags — verified

1. Restart unverified in production, flag not flipped locally — **confirmed, unchanged.** Not a
   finding; it is plan risk 7 and an owner-accepted consequence of `CITIZENSHIP_CARD_ENABLED: false`.
2. `Main.ts` wiring untested — **confirmed.** No `Main.test.ts` exists (glob returns nothing). The
   listener at `:296-310` and `void startProfileSession()` at `:1051` are proven only by `tsc`.
   `reloadApp()` (`FlashistFacade.ts:716-718`) is a one-line `window.location.reload()`, untested.
   Judged acceptable: both wired units are fully tested, and a `Main.ts` harness was outside the plan.
3. Card tests not RED-first — see above; not vacuous.
4. No `NameChangeContract` contract test — **not a defect**, see above.
5. Mutation sweep spot-checked only — **the sweep result is in the table above.** 14/15 caught.
6. Plan risk 3 real in code — **confirmed**: `resolveCaller` has no path to `ok` without a usable
   secret (`Routes.ts:388-390`), so a misconfigured `PROFILE_SESSION_SECRET` 503s every player-facing
   route. Intended direction; a genuine widening; already recorded as plan risk 3.
7. `Login.it.test.ts` flipped to a 401 proof though not in the plan's migration list — **confirmed,
   and correct.** Mechanical, and the alternative was a red integration gate.
8. `resolveCaller` kept `async` — settled by the plan and the worklog decision log; not re-raised.

---

**Round 2 — 2026-09-16. Reviewers: fkit-reviewer's own pass + Codex adversarial pass
(`codex exec --sandbox read-only`), exit 0, 1 finding returned. Both reviewers ran; coverage is
NOT partial.**

Owner rulings arrived with this round and are recorded, not re-litigated: **R4 → option (a)**, the
sixth event (deliberate deviation from approved plan §3.6); **R6 → accepted residual, settled**
(AR-1 below).

### Verification method — mutations EXECUTED, not reasoned

The plan's mutation table was re-run **by execution**, in an isolated copy of the tree under the
session scratchpad (`src`, `tests`, config copied; `node_modules` symlinked). **No project file was
modified at any point.** Post-run integrity check: `git hash-object` →
`src/client/ProfileSession.ts` `815213f…`, `src/client/GameRestart.ts` `8582702…`,
`src/profile-server/Routes.ts` `634d1d9…`.

| # | Mutation applied to the isolated copy | Result |
|---|---|---|
| M1 | delete `if (session.token !== staleToken) { return session.token; }` from `relogin()` | `Tests: 1 failed, 32 passed, 33 total` — red: *"a 401 on an already-replaced token re-uses the fresh one"* |
| M2 | move `Profile:Session:Relogin` back outside the discard (the R1 defect) | `1 failed, 32 passed` — red: *"two simultaneous 401s … share ONE re-login and fire ONE event"* |
| M3 | drop `outcome = null` in `relogin()` | `1 failed, 32 passed` — red: *"returns null after a re-login fails…"* |
| M4 | drop `outcome = null` on the Yandex-id change (`:131`) | `1 failed, 32 passed` — red: *"returns null once the Yandex id changes…"* |
| M5 | **re-add** `outcome = null` on `login()`'s failure path (the line the coder deleted) | `33 passed, 33 total` — observationally inert, confirming the line is dead |
| M6 | silence `reportNoStorage()`'s event | `3 failed, 6 passed, 9 total` — all three storage cases red |
| M7 | delete the `matchActive` guard | `1 failed, 8 passed` — red: *"NEVER reloads while a match is running"* |
| M8 | silence only the **null**-storage path (leave the throwing path reporting) | `1 failed, 8 passed` — only the null case red, proving the two paths are covered independently |

**M1 reproduces the coder's reported numbers exactly** (`1 failed, 32 passed, 33 total`, same test,
same `Expected: 200 Received: 401` shape). Its claim is verified, not taken on trust.

**Mutation sweep over the plan's 15: now 15/15 caught** (Round 1 was 14/15). The one gap — *drop the
stale-token comparison* — is closed by `tests/client/ProfileSession.test.ts:466`, and M1 proves it is
the **only** test that closes it: the simultaneous shape (`:436`) stays green under that mutation, so
the coder's structural argument for needing two tests is correct.

### Reviewer gate re-runs (independent)

| Gate | Reviewer result | Coder claim | Match? |
|---|---|---|---|
| `npm test` | `130 passed / 130` suites · `1605 passed / 1605` tests · 44.6 s | 130 / 1605 · 49.89 s | ✅ counts identical |
| `npx jest tests/client/ProfileSession.test.ts` | `33 passed, 33 total` | 33 | ✅ |
| `npx jest tests/client/GameRestart.test.ts` | `9 passed, 9 total` | 9 | ✅ |
| `npx tsc --noEmit` | exit 0 | exit 0 | ✅ |
| `npm run lint` | exit 0 | exit 0 | ✅ |
| `npm run test:integration` | **not re-run** — needs `TEST_DATABASE_URL`, which this session does not hold, and the run is destructive | 9 / 104 | **unverified (coder-reported)** |

**No flake hit any run.** No `supertest` timeout, no "did not exit", no `SIGSEGV` — so no `0197`
signature to rule out, and nothing needed re-running. Nothing was re-run.

### `src/profile-server/Routes.ts` — confirmed untouched

`git hash-object` gives `634d1d9092b4c292b79494a8121d61ac8c8628a7`, which is exactly the post-image
SHA in the Round-1 diff header (`index d168912..634d1d9`). **Byte-identical to what Round 1
reviewed.** `0274` and `0276` see no new movement in the file they share.

### R1–R5 — verified fixed

- **R1 ✅ fixed.** `ProfileSession.ts:248-262`: the event now sits only on the branch that discards
  the token; `session === null` joins the in-flight login silently (`:249-253`). Traced *and* M2-proven:
  N concurrent 401s on one token ⇒ 1 event, 1 login. **Attacked for the inverse failure** (can the
  event now be *missed* when a re-login really happens?) — no: the only silent path is one where
  another caller already counted the same discard, and a genuinely separate later re-login on a
  *different* token takes the discard branch and fires. No regression.
- **R2 ✅ fixed.** Both replacement tests are non-vacuous. `:436` routes `/v1/profile` **and**
  `/v1/messages` (`:446-447`), so both callers really 401 — the Round-1 defect is gone; the
  `setTimeout(0)` inside the login route (`:443`) makes the overlap deterministic, not timing-flaky.
  `:466` gates the inbox call on explicit promises (`:468-475`, `:492-499`) rather than timing. Both
  are order-independent. M1 confirms `:466` is the guard for the named mutation.
- **R3 ✅ fixed, not overstated.** `NameChangeContract.ts:117-128` now says the route needs a Bearer
  token **and** that the projection stays effectively enumerable because the token is `vfy:false` —
  only the cost of one `POST /v1/login` was added. The `⚠️ ACCEPTED RESIDUAL` block beneath it
  (`:130-137`) is untouched, so the justification was corrected rather than deleted.
- **R4 ✅ fixed.** All five `requestGameRestart` outcomes now emit: `Suppressed:InMatch` (`:62-65`),
  `Suppressed:NoStorage` on the null path (`:71`) and on the throwing path (`:88`) via one
  `reportNoStorage()` (`:105-111`), `Suppressed:Latched` (`:76-79`), `Performed` (`:92`). **No silent
  outcome remains**, and no path can emit two (each `return`s after its report). M6 and M8 prove both
  storage paths are independently covered. Enum entry at `FlashistFacade.ts:166-167`; **referenced
  only through the enum** — `grep '"Profile:'` over `GameRestart.ts`, `ProfileSession.ts` and
  `CitizenshipCard.ts` finds **zero** inline literals.
- **R5 ✅ fixed, and the deletion the coder made is correct.** `outcome` is cleared at both discard
  sites (`:130-131`, `:256-257`), each M3/M4-proven. **The reachability claim for the removed third
  clear is VERIFIED**, two ways: (1) M5 — re-adding the line leaves the suite at 33/33, so it is
  observationally inert; (2) proof — `session` is assigned `null` at exactly three places (`:80`,
  `:130`, `:256`), each immediately pairing `outcome = null`, and `session`/`outcome` are written
  together at `:174-177` with no `await` between, so `session === null ⟺ outcome === null` holds
  everywhere; `login()` has exactly **one** call site (`:140`) and every path to it passes either an
  already-null `session` or the `:130-131` clear. The line was genuinely dead. **Declining to ship
  code no test can kill is the right call here, not a defect.**

### New findings this round

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R7 | 2 | low | `tests/client/ProfileSession.test.ts:565-566` | The mutation comment names the wrong line — it says "drop `outcome = null` on the login-failure path", but M3 proves the test guards the `relogin()` clear (`ProfileSession.ts:257`); the login-failure line was deliberately deleted as dead. |
| R8 | 2 | low | `src/client/ProfileSession.ts:253-255` | `relogin()`'s already-replaced-token fast path returns `session.token` without checking it was minted for the **same Yandex account**, so a request composed under account A could be retried under account B. **Unreachable in today's code** — see verdict. |

**R7 — Defect (comment). In-plan, one-line fix, coder may apply unattended.** The risk is concrete and
cheap: a maintainer reading `:565-566` would believe a clear on `login()`'s failure path is
load-bearing and re-add the dead line that M5 shows is inert — reintroducing exactly the unkillable
code the coder correctly refused. The coder's own ledger prose (*"drop the `relogin()` clear → …
red"*) is right; only the in-test comment is wrong.

**R8 — Raised by Codex. Verdict: PARTIALLY CORRECT. The missing check is real; the exploit path is
not reachable in this codebase.** I traced every way the Yandex unique id can change in one page load:
`yandexSdkPlayerObject` is assigned at exactly three sites in `FlashistFacade.ts` — `:785` (late-SDK
recovery, guarded by `if (this.yandexSdkPlayerObject || !this.yandexGamesSDK) return;` at `:781-783`,
so it can only fill an **empty** slot), `:1195` (`initPlayer`, one-shot/memoized), and `:1227`
(`openYandexAuthDialog`, reachable only from `CitizenshipCard.onLoginCtaTap`, whose button renders
**only** inside `renderGuest()` — `CitizenshipCard.ts:238`, `:242`, `:290`). So the only in-page
transition possible is **guest → B**, never **A → B**; and a guest never held a token, so `relogin()`
is never reached on that path (`profileFetch` returns `no_session` before sending). The same reasoning
makes the id-mismatch branch at `:130-131` defensive rather than live. Codex's stated impact (a
mutation composed under A retried under B) would be correct **if** an A→B switch existed.
**Classification: frontier-move, owner's disposition** — the fix is not a one-liner (the account must
be threaded through `ensureSession`/`profileFetch`, whose exported signature returns a bare
`string | null`), and `0267` reworks this funnel anyway.

### Re-litigates settled decisions (suppressed)

None. Codex was primed with the settled list and respected it: it explicitly reported "R2 clean. R3
clean. R4 clean. R5 clean." and raised nothing against strict `Bearer `, D3, memory-only token,
`vfy:false`, the absent login rate limiter, `async resolveCaller`, AR-1's join window, or AR-8's plan
deviation.

### Checked this round, no defect

- **The reference doc is now true.** `analytics-event-reference.md:391` reads "Exactly one of the four
  outcomes below follows", and the reading note at `:399-400` states the identity exactly:
  `Requested = Performed + Suppressed:InMatch + Suppressed:Latched + Suppressed:NoStorage`. Five rows
  follow `Requested`, but `Cancelled` is self-labelled *"Fires instead of Requested, not after it"*
  (`:393`) and the code agrees — `CitizenshipCard.ts:200-207` fires `Cancelled` and returns **before**
  `Requested` at `:215`. The `!this.isConnected` path (`:208-210`) fires neither, so it is not a
  `Requested` without an outcome. The false half of the `Suppressed:Latched` row is gone.
- **Event-name convention.** `Profile:Login:Restart:Suppressed:NoStorage` is PascalCase,
  colon-separated, no underscores. It carries five segments where the project rule names
  `Category:Action` / `Category:Subcategory:Value` — but its two siblings (`Suppressed:InMatch`,
  `Suppressed:Latched`) already do, and they were approved in plan §3.6. **Consistent with the
  established family**; not a new deviation.
- **R4's "three tests"** are three *extended* existing cases, not three new ones — self-disclosed by
  the coder at `:279-280` and consistent with `GameRestart.test.ts` staying at 9 tests. Accurate.
- **No regression in the R1 fix's neighbourhood**: `profileFetch`'s 401 bound is unchanged (one
  re-login, one retry, a second 401 returned as-is); `resolveSession`'s D3 latch ordering is unchanged;
  the guest and unconfigured short-circuits are unchanged. Full suite green at 130/1605.

### Convergence call — the reviewer's, and it is a call to finish, not to loop

**Converged on substance.** Round 1's six findings are all settled: five fixed and each proven by an
*executed* mutation, one owner-accepted as AR-1. Nothing this round re-litigates a residual, and
neither new finding is a behaviour defect — R7 is a wrong comment, R8 is a missing guard on a path no
code in this repo can reach. **Do not run a third adversarial round.** Two things stand between this
and closeout, and they are named exactly:

1. **R7** — in-plan, one-line, the coder may apply unattended. No re-review needed beyond confirming
   the comment names `relogin()`.
2. **R8** — one owner disposition: fix it, or record it as an accepted residual with a re-raise
   trigger. Recommendation: **accepted residual**, re-raise only if an in-page switch between two
   authorized accounts ever becomes possible (a logout / switch-account surface, or `0267` re-binding
   identity mid-load).

`Status` stays `in-review` **only** because R8 is an undisposed owner question — not because any
defect is open. On R7 applied + R8 disposed, this closes out with no further review pass.

---

**Round 3 — 2026-09-16. Record-and-close only. Reviewer: fkit-reviewer's own pass. Codex was NOT
run, deliberately**: convergence was called in Round 2, R8 was an owner disposition rather than a code
question, and R7 was comment-only. **This is a declared omission, not a silent one** — it does not make
the review partial, because no new code behaviour entered this round (proven below).

### 1. R7 — landed as described, and no assertion was weakened

The one way a comment-only fix can hide a regression is a quietly softened assertion, so I did not
read for it — I **re-ran the mutations those assertions are the only guards for**, in an isolated
scratchpad copy (`node_modules` symlinked). **No project file was modified.**

| Mutation | Round 2 | Round 3 (after R7) | Verdict |
|---|---|---|---|
| M1 — delete the stale-token branch | `1 failed, 32 passed, 33 total` | `1 failed, 32 passed, 33 total` — red: *"a 401 on an already-replaced token…"* | unchanged ✅ |
| M3 — drop `outcome = null` in `relogin()` | `1 failed, 32 passed` | `1 failed, 32 passed` — red: *"returns null after a re-login fails…"* | unchanged ✅ |
| M4 — drop `outcome = null` on the id change | `1 failed, 32 passed` | `1 failed, 32 passed` — red: *"…once the Yandex id changes…"* | unchanged ✅ |

Same suite size (33), same tests red, same counts. **The assertions are intact — not one was
weakened, removed or loosened.** I also read the test body directly
(`tests/client/ProfileSession.test.ts:576-597`): the three assertions and the `routedFetch` routes are
byte-for-byte what Round 2 reviewed; only the comment above them changed.

⚠️ **One methodological note, recorded because it nearly produced a false pass.** M1's first re-run
did **not** apply — its text anchor no longer matched, because the coder inserted the AR-9 pointer
comment *inside* that branch. The suite came back green, which would have read as "the guard is gone"
had I not checked that the mutation landed. It was retargeted at the post-R7 text and then went red as
above. **The green was a no-op, not a result.**

- **The R7 comment is now correct** (`:564-575`): it names the `relogin()` clear as the mutation the
  test catches, cites M3, and carries an explicit ⛔ that the `login()`-failure clear is unreachable
  and must not be re-added, with the `session === null ⟺ outcome === null` invariant and the
  twice-tested inertness. This is exactly the re-adding risk R7 was filed against.
- **The AR-9 pointer comment in `src/client/ProfileSession.ts`** sits inside the
  `if (session.token !== staleToken)` branch. I read `relogin()` in full: the control flow is
  identical to Round 2's — three branches, same order, `return session.token;` unchanged. **Comment
  only; no behaviour touched.** `src/client/GameRestart.ts` is byte-identical to Round 2
  (`8582702d6fbe96ad40258ede977e19b9233f5d47`).

### 2. Hash spot-checks — both confirmed

| Artifact | Expected | Measured | |
|---|---|---|---|
| `src/profile-server/Routes.ts` | `634d1d9092b4c292b79494a8121d61ac8c8628a7` | `634d1d9092b4c292b79494a8121d61ac8c8628a7` | ✅ untouched since the build; `0274` / `0276` see no movement |
| `plan.md` | `b161e4bb476f910cad3884cda93b14c65c3017e9` | `b161e4bb476f910cad3884cda93b14c65c3017e9` | ✅ the approved plan is byte-unchanged |

### 3. Gates — independently re-run this round

| Gate | Reviewer result | Coder claim | |
|---|---|---|---|
| `npm test` | `130 passed / 130` suites · `1605 passed / 1605` tests · 37.4 s | 130 / 1605 · 43.419 s | ✅ counts identical |
| `npx tsc --noEmit` | exit 0 | exit 0 | ✅ |
| `npm run lint` | exit 0 | exit 0 | ✅ |
| `npx jest tests/client/ProfileSession.test.ts` | `33 passed, 33 total` | 33 | ✅ |
| `npm run test:integration` | **NOT RUN** | 9 / 104 · 4.49 s | 🚩 **see below** |

**No flake hit any run** — no `supertest` timeout, no "did not exit", no `socket hang up`, no
`SIGSEGV`, so no `0197` signature to rule out. **Nothing was re-run, in any of the three rounds.**

🚩 **The one gate this review cannot stand behind: `npm run test:integration` is UNVERIFIED —
coder-reported only, across all three rounds.** This session holds no `TEST_DATABASE_URL`, and the run
is destructive (it drops and recreates the `public` schema, per CLAUDE.md / task `0270`), so it was
never independently executed. The DB-backed legacy-401 proofs in
`tests/integration/{Routes,NameChange,Login}.it.test.ts` therefore rest on the coder's report, not on
a reviewer run. Everything else in this ledger was executed by the reviewer.

### 4. Producer follow-through — verified read-only

`0274`'s brief now carries the block at
`ai-agents/tasks/backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md:54-58`:
*"⛔ `reason=legacy_fallback_used` is REMOVED from this metric — do not re-add it"*, citing ruling D1
and noting `expired` / `invalid` stay. Confirmed present. **Build residual 9 is discharged.**

### 5. Closeout call

**Closed out.** Nothing is open. Round 1 raised six findings and Round 2 two more; five were fixed and
each proven by an executed mutation, one (R7) was a comment fix verified by re-running its guards, and
two (R6, R8) were owner-ruled into residuals. No finding in any round was left unresolved, and none
re-litigated a settled decision. **Do not open a fourth round.**

### Residuals surviving closeout — in order of loudness

🚨 **AR-2 now stands COMPLETELY ALONE at the top. Nothing has reduced it.** AR-7, which used to sit
beside it, was **closed outright on 2026-09-16** — see the struck entry below; **eight** residuals
survive, not nine.

1. 🚨 **AR-2 — the restart has ZERO production evidence, and the local flag flip was never
   performed.** `CITIZENSHIP_CARD_ENABLED: false` is absolute with no dev bypass, so the login button
   exists nowhere today, dev included. Its entire evidence is jest. Nothing was observed in a browser
   by the builder or by any review round. First observable at `0054`. **Nothing has reduced this one —
   it is the single loudest thing a deploy decision on `0273` has to carry.**
2. ~~**AR-7 — the plan §4.6 D1 deploy hole.**~~ **CLOSED 2026-09-16.** It was correctly open when it
   was written and through two evidence rounds; the last leg landed after closeout. Full reasoning and
   provenance under AR-7 below. Not a surviving residual.
3. **AR-6 — a misconfigured `PROFILE_SESSION_SECRET` now 503s every player-facing profile route**, not
   just login, until a redeploy. No fallback identity path is left. Intended direction; a real widening.
4. **AR-9 — `relogin()` reuses a replaced token without re-checking the account** (see below).
5. **AR-1 — `Main.ts`'s join-setup window reads `matchActive: false`** (owner-ruled, settled).
6. **AR-3 — `Main.ts`'s wiring and `reloadApp()` are covered by no test**; proven only by `tsc`.
7. **AR-8 — the sixth restart event is a deliberate, owner-approved deviation from plan §3.6.**
8. **AR-5 — no `NameChangeContract` contract test**; the guarantee is proved end-to-end instead.
9. **AR-4 — three `CitizenshipCard.test.ts` cases were written after the card edit, not RED-first.**

Plus the gate flag above: **`npm run test:integration` is coder-reported, never reviewer-run.**

## Coder response

<!-- CODER-OWNED. The reviewer does not write this section. -->

**Round 1 — 2026-09-16, `@fkit-coder` spawned by `fkit-sprint-ship-loop` as its Process-review
worker, under the loop's declared-approval marker** (owner approved `plan.md`, blob
`b161e4bb476f910cad3884cda93b14c65c3017e9`, via `AskUserQuestion` in the driver session). Plan carry
re-verified with `git hash-object` before any source was written; `plan.md` is byte-unchanged.
R4 and R6 arrived already ruled by the owner. Every claim below was verified against the code before
anything changed. **No finding was refuted** — all six stand as written.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | defect (low) | `relogin()` now fires `Profile:Session:Relogin` only in the branch that actually discards the stale token; a later 401 finding `session === null` joins the login in flight silently. Mutation-proven. | **fixed** |
| R2 | CORRECT | defect (medium, test) | The vacuous test is replaced by **two** real ones: two genuinely simultaneous 401s (both routes 401), and the already-replaced-token case the comparison exists for. The named mutation was **executed** and went red. | **fixed** |
| R3 | CORRECT | defect (low, doc) | `NameChangeContract.ts` comment corrected: the route needs a Bearer token since S4, **but the token is `vfy:false`**, so the projection is still effectively enumerable by anyone who knows the id — only the cost of one `POST /v1/login` was added. The residual is kept, not weakened. | **fixed** |
| R4 | CORRECT | defect (low, telemetry) | **Owner ruling, option (a): sixth event added.** `PROFILE_LOGIN_RESTART_SUPPRESSED_NO_STORAGE` → `Profile:Login:Restart:Suppressed:NoStorage`, fired on **both** storage-less paths. Reference doc corrected (the "three outcomes" claim and the false half of the `Suppressed:Latched` row). Three tests assert it. ⚠️ **Deliberate owner-approved deviation from approved plan §3.6** (five events) — flagged in code, in the doc, and in the worklog decision log. | **fixed** |
| R5 | CORRECT | defect (low, latent) | `outcome` is now cleared wherever a session is discarded — the Yandex-id change in `resolveSession()` and the stale-token discard in `relogin()`. Both clears mutation-proven. See the note below on a third, redundant clear I did **not** keep. | **fixed** |
| R6 | CORRECT as a frontier-move | frontier-move — **not** a defect | **Owner ruling: accept, do not fix.** No code changed. Recorded in *Accepted residuals* below as settled. | **accepted residual** |

### Detail

**R1 — `src/client/ProfileSession.ts`.** Traced and confirmed exactly as claimed. The fix inverts the
guard so the event lives with the discard:

- `session === null` ⇒ another caller's 401 already discarded this token and already counted it;
  join `ensureSession()` (or its D3 failure) **silently**.
- `session.token !== staleToken` ⇒ the token was already replaced; return the fresh one (unchanged).
- otherwise ⇒ discard `session` **and** `outcome`, fire **one** `Profile:Session:Relogin`, re-login.

N concurrent 401s on one token now read as 1 re-login, which is what `0274` will count.
**Mutation run:** restored the old shape (event outside the discard) → the new
"two simultaneous 401s … fire ONE event" test went red; restored.

**R2 — `tests/client/ProfileSession.test.ts`.** The diagnosis is exactly right: `/v1/messages` was
unrouted, the stub threw, `send()` turned it into `network_error`, and `loginCalls === 2` was
satisfied by one caller alone. Two things had to be separated, because they are different shapes:

1. **Simultaneous** (both 401 before either re-login resolves) — the login route now spans a
   macrotask, so both callers provably reach the 401 path first. Asserts both callers end at 200,
   exactly 2 logins, exactly **1** `Profile:Session:Relogin`. This is the R1 regression guard.
2. **Already-replaced** (a 401 arriving on a token that has since been swapped) — the inbox call is
   held open by a gate until the profile call has completed its re-login, so the late 401 genuinely
   lands on a replaced token. **This is the case the stale-token comparison exists for, and the only
   one that catches the plan's mutation.** The first shape does not: with the comparison dropped, a
   simultaneous second caller still finds `session === null` and still only costs one login.

**Mutation executed, as asked.** Deleted the three lines
`if (session.token !== staleToken) { return session.token; }` from `relogin()`:

```
● profileFetch — Bearer and the 401 refresh › a 401 on an already-replaced token re-uses the fresh one
  expect(received).toBe(expected)  Expected: 200  Received: 401
Tests: 1 failed, 32 passed, 33 total
```

Exactly one test red, and it is the new one. Restored, re-ran, 33/33 green, file byte-compared back
to its pre-mutation copy. **The plan's 15-mutation sweep is now complete: 15/15 caught.**

**R3 — `src/core/profile/NameChangeContract.ts:121`.** Confirmed stale. Corrected in place; the
`⚠️ ACCEPTED RESIDUAL` block below it is untouched, and the new wording carries the reason it still
holds (`vfy:false` ⇒ identity asserted, not proven) rather than quietly deleting the justification.

**R4 — `src/client/GameRestart.ts`.** Confirmed: four outcomes, three events; and
`analytics-event-reference.md`'s `Suppressed:Latched` row additionally **claimed** to cover the
storage-unavailable case, which the code never did. Both storage-less paths now route through one
`reportNoStorage()` helper. Doc: "three outcomes" → "four", the false half of the `Latched` row
removed, a `NoStorage` row and a reading note added, and the plan deviation stated in the doc itself.
**Mutation run:** silenced `reportNoStorage()` → all three storage tests red; restored.

**R5 — `src/client/ProfileSession.ts`.** Confirmed. The invariant is now explicit: `outcome` is
non-null only while `session` is non-null (they are written together with no `await` between them,
and cleared together at both discard sites).

⚠️ **One thing I did differently from the obvious fix, on evidence.** I first also cleared `outcome`
on `login()`'s failure path — then ran the mutation and **it did not go red**: `login()` is only ever
reached with `session === null`, so by the time a login fails there is nothing stale left to clear.
Rather than keep a line no test can kill (the exact complaint R2 makes), I removed it and left a
comment saying why it is absent. The two clears that **are** load-bearing are each mutation-proven:

- drop the `relogin()` clear → "returns null after a re-login fails…" red;
- drop the `resolveSession()` id-change clear → "returns null once the Yandex id changes…" red.

**R6 — no code changed.** Recorded below.

### Gates — rerun in full after the changes, verbatim

| Gate | Result |
|---|---|
| `npm test` | `Test Suites: 130 passed, 130 total` / `Tests: 1605 passed, 1605 total` / `Time: 49.89 s` |
| `npm run test:integration` | `Test Suites: 9 passed, 9 total` / `Tests: 104 passed, 104 total` / `Time: 5.242 s` |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` | exit 0, no output |
| `npx prettier --check` (touched files) | `All matched files use Prettier code style!` |

**No flake was hit — no `supertest` timeout, no "did not exit", no `SIGSEGV`. Nothing needed a
re-run, so nothing was re-run.** Test count moved 1602 → 1605 (+2 new `ProfileSession` outcome cases,
+1 net from replacing one vacuous 401 test with two real ones; the three `GameRestart` NoStorage
assertions went into existing cases).

### Change surface this round

`src/client/ProfileSession.ts` · `src/client/GameRestart.ts` ·
`src/client/flashist/FlashistFacade.ts` (one enum entry) · `src/core/profile/NameChangeContract.ts`
(comment only) · `tests/client/ProfileSession.test.ts` · `tests/client/GameRestart.test.ts` ·
`ai-agents/knowledge-base/analytics-event-reference.md`.

**`src/profile-server/Routes.ts` was NOT touched this round** — no region of it, not one byte. It
stays as the build left it, so `0274` and `0276` see no new movement in the file they share.
Nothing was committed or pushed, no task file was moved, no status was set, `ai-agents/wiki-vault/`
was not touched, and the producer's four reserved files
(`plan-sprint-4.md`, `backlog.md`, `0273/brief.md`, `0274/brief.md`) were not edited.

### Round 2 — 2026-09-16

Two leftovers, both handled. R8 arrived already ruled by the owner.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R7 | CORRECT | defect (low, test comment) | `tests/client/ProfileSession.test.ts` — the comment named a mutation the test does **not** catch. Rewritten to name the one it does (the `outcome = null` inside `relogin()`, per the reviewer's M3), plus an explicit ⛔ that the login-failure clear is unreachable and **must not be re-added**, with the reason. | **fixed** |
| R8 | CORRECT as a known limit (reviewer: PARTIALLY CORRECT — missing check real, exploit path unreachable) | frontier-move | **Owner ruling: record, do not fix. No code change.** A pointer comment added at `ProfileSession.ts`'s already-replaced-token branch naming AR-9 and the re-raise trigger — comment only, no behaviour touched. | **accepted residual (AR-9)** |

**R7.** Confirmed by reading the test: it primes a session, 401s, and the re-login then fails — so the
value it protects is the clear inside `relogin()`. The old comment pointed at the login-failure line I
deleted in round 1, which is exactly the trap it warned about: a maintainer could have "satisfied" it
by re-adding dead code. The new comment states the invariant that makes that line unreachable —
`login()` has one call site and is only reached with `session === null`; all three `session = null`
sites clear `outcome` with it, with no `await` between — and records that re-adding it was
mutation-tested twice (mine in round 1, the reviewer's M5) and was inert both times. Comment only; no
assertion changed.

**R8.** No code behaviour changed. The comment sits where a future reader needs it — the
`session.token !== staleToken` branch — and carries the owner's re-raise trigger in substance:
**re-raise if a logout or switch-account surface appears, or if `0267` re-binds identity mid-load.**

### Gates — all four rerun after the round-2 edits, verbatim

| Gate | Result |
|---|---|
| `npm test` | `Test Suites: 130 passed, 130 total` / `Tests: 1605 passed, 1605 total` / `Time: 43.419 s` |
| `npm run test:integration` | `Test Suites: 9 passed, 9 total` / `Tests: 104 passed, 104 total` / `Time: 4.49 s` |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` | exit 0, no output |
| `npx prettier --check` (touched files) | `All matched files use Prettier code style!` |

**No flake was hit — no `supertest` timeout, no "did not exit", no `SIGSEGV`, no
`ClearStaleLeftTrimmedPointerVisitor` report. Nothing needed a re-run, so nothing was re-run.**
⚠️ `npm run test:integration` remains **coder-reported**: the reviewer holds no `TEST_DATABASE_URL`,
so this line is the only evidence for it. It ran against the local throwaway Postgres in
`gc-0012-it-pg` on port 5433, which the run drops and recreates.

### Change surface, round 2

`src/client/ProfileSession.ts` (one comment block, no code) ·
`tests/client/ProfileSession.test.ts` (one comment block, no assertion).

Nothing else. `src/profile-server/Routes.ts` still hashes to
`634d1d9092b4c292b79494a8121d61ac8c8628a7`, and `plan.md` to
`b161e4bb476f910cad3884cda93b14c65c3017e9` — both re-verified with `git hash-object` after these
edits. Nothing committed or pushed, no task file moved, no status set, no `ai-agents/wiki-vault/`
write, the producer's four reserved files untouched, and neither the *Reviewer findings* section nor
this ledger's `Status:` header was edited.

## Accepted residuals (shared, do-not-re-litigate)

**AR-1 — `Main.ts`'s join-setup window reads `matchActive: false` (was R6). Owner-ruled 2026-09-16:
accept, do not fix. SETTLED — do not raise again.** `gameStop` is assigned at `Main.ts:716`, after
two `await`s, so between the `join-lobby` event and that assignment a restart would not be
suppressed. Reason recorded: **no live match exists in that window**, so plan §3.5's guarantee
("never reloads out of a live match") is met exactly; the worst case is a lost lobby slot; and a
`joining` flag would add new state for a case with no live match. Reaching it needs the Yandex auth
dialog to resolve inside a normally sub-millisecond window (both awaits are memoized).

**AR-2 — the restart has no production evidence until `0054`.** `CITIZENSHIP_CARD_ENABLED: false` is
absolute with no dev bypass, so the login button exists nowhere today, dev included. Its whole
evidence is jest — **and the local flag flip was not performed in this run either.** Nothing was
observed in a browser. Plan risk 7, unchanged.

**AR-3 — `Main.ts`'s wiring and `reloadApp()` are covered by no test.** No `Main.test.ts` harness
exists in this repo and creating one was outside the plan. The listener, the
`void startProfileSession()` call and the one-line `window.location.reload()` are proven only by
`tsc`. Both units they wire are themselves fully tested.

**AR-4 — three `CitizenshipCard.test.ts` cases were written AFTER the card edit, not RED-first.**
They are not vacuous (event count and `loadProfile` call count would both fail without the change),
but the RED-first claim does not hold for them. Everything else in steps 1, 3, 4 and 6 was confirmed
red before its implementation.

**AR-5 — no `NameChangeContract` contract test for the id-stripping guarantee.** No such test file
exists in the repo. The guarantee is proved end to end instead by the new 401 cases in
`NameChangeRoutes.test.ts` and `NameChange.it.test.ts` (a legacy-shaped body parses, then 401s).
`InboxContract` and `PaymentsContract` did get the explicit stripping tests.

**AR-6 — plan risk 3 is now real in code.** A misconfigured `PROFILE_SESSION_SECRET` 503s **every**
player-facing profile route, not just login, until a redeploy. There is no fallback identity path
left. The intended direction, and a genuine widening.

**AR-7 — the plan §4.6 D1 deploy hole. ✅ CLOSED 2026-09-16.** No longer a surviving residual.

> **History, kept deliberately.** This residual was open and correct as written from the plan, through
> the build, and through all three review rounds. It was then **reduced** by a live read-only box check
> (2026-09-16), and **closed** the same day when the owner checked the one thing no agent can reach.
> The record below shows it being closed by new evidence — it was never a false alarm.

### Why it is closed — four independent legs, and the chain is complete

| Leg | Evidence | Who established it |
|---|---|---|
| The **local** flag `CITIZENSHIP_CARD_ENABLED` was never `true` in any commit | `git log --all -S'CITIZENSHIP_CARD_ENABLED: true'` → no commits | verified during planning (in-repo, re-checkable) |
| The **remote** `citizenship_ui` experiment flag was **never set** in the Yandex Games console | owner, 2026-09-16, verbatim: *"I've just checked it - the flag never has been set in Yandex.Games Console."* | **owner-reported, NOT agent-measured** — see provenance below |
| The profile database has **never held a row**, and only migration `006`'s tables exist | `players` / `player_identities` / `player_match_xp_credits` all 0; no old-schema table survives | owner's read-only box check, 2026-09-16 |
| **Zero** browser-originated legacy-shaped requests | retained nginx window 2026-09-06 00:27 → 2026-09-16 08:02 UTC, 15 rotated files: exactly 2 `yandexPlayerId` hits, both our own `curl/8.7.1` probes a minute apart | owner's read-only box check, 2026-09-16 |

**The two flags were the only two gates on every legacy call site.** With neither ever enabled, **no
released game build could ever have reached the legacy path** — so the hole plan §4.6 described is not
"empty so far", it is **closed**. The rotated-away log window no longer matters: it was only ever a
proxy for the question the flag check answers directly.

> ⚠️ **Provenance, stated plainly. The decisive leg — the remote flag — is OWNER-REPORTED, not
> agent-measured.** No agent can reach the Yandex Games console, so it is not independently
> re-checkable by this review or by a later one, and it leaves no artifact in the repo. It is the
> strongest evidence obtainable, and this ledger records it as a report rather than as a measurement.
> The box legs are likewise owner-run, read-only; the reviewer gathered none of it. Host, address and
> identifiers are deliberately omitted throughout.
>
> *Reported by the driver, not verified here:* this same check had stood open in a related form as
> question 3 of `monitoring-alert-bot-findings-2026-06-04.md` for about three months.

### The evidence as it was recorded when AR-7 was merely REDUCED (kept for the record)

**✅ What the evidence settles.**
- **The database has never held a row.** `players`, `player_identities` and
  `player_match_xp_credits` are all at **0**. The tables present are exactly migration `006`'s set
  and **no old-schema table survives**, so nothing was ever created by a legacy-shaped call.
- **No browser has ever sent a legacy-shaped request in the retained log window.** Retained host
  nginx access logs — 15 rotated files covering **2026-09-06 00:27 UTC → 2026-09-16 08:02 UTC** —
  hold exactly **2** hits for `yandexPlayerId`, both on **2026-09-12 14:40 UTC**, both from
  `curl/8.7.1` a minute apart: our own testing. **Zero browser-originated legacy requests.** The
  `profile-api` container log has **0** hits.
- Both services are healthy (postgres up ~43 h, profile-api up ~21 h, container created
  2026-09-15 10:54 UTC).
- **So the blast radius plan §4.6 described is not merely bounded — across the whole retained window
  it is empty.**
- *Reviewer inference, not a measurement:* those two curl probes answered **403** and **404**, which
  is what the **pre-S4** code returns for an unknown legacy id (`not_citizen` / `not_found`) — not the
  401 the removal produces. That is consistent with the box still running the pre-removal build, i.e.
  profile-box deploy 1 has not happened yet, exactly as plan §4.6 expects.

**⚠️ What that evidence did NOT settle — both points are now SUPERSEDED, kept to show what closed
them.**
- ~~The log window begins 2026-09-06; everything earlier has rotated away and cannot be checked, so
  the pre-10-September "no live server to reach" claim rests on project memory (`0215`), not
  evidence.~~ **Superseded:** the flag check makes the rotated window moot. It was only ever a proxy
  for "did a real client ever call the legacy path", and with neither flag ever enabled, none could.
  The project-memory claim is no longer load-bearing for anything.
- ~~The July–August remote `citizenship_ui` flag is unreadable from the repo, so a stale tab from that
  era stays theoretically possible.~~ **Superseded and answered directly:** the owner checked the
  console on 2026-09-16 — **the flag was never set.** That was the open question, and it is closed.

**What would have closed AR-7 fully:** exactly the check that was run — the Yandex Games console's
historical `citizenship_ui` flag state across `45e7113` (2026-07-01) → `e4f01e6` (2026-08-21).
Owner-only, since no agent can reach that console. **It was never enabled, so the hole closed
outright.**

**AR-8 — `Profile:Login:Restart:Suppressed:NoStorage` is a deliberate deviation from approved plan
§3.6**, which names five restart events. Owner-approved 2026-09-16 (this round, R4). Reason: `0274`
builds monitoring on these events and a `Requested` with no outcome would be unexplainable on a
dashboard. Recorded here so it is not read later as unplanned scope.

**AR-9 — `relogin()` hands back a replaced token without re-checking the account (was R8, raised by
Codex). Owner-ruled 2026-09-16, review round 2: record as a known limit, no code change. SETTLED —
do not raise again.**

- **What:** `src/client/ProfileSession.ts:253-255` — when a 401 arrives on a token that has since been
  replaced, `relogin()` returns the current `session.token` without verifying it was minted for the
  **same** Yandex account. In principle a request composed under account A could be retried under
  account B, and no `Profile:Session:Relogin` would be counted for it. A pointer comment naming this
  entry sits on that branch in the source.
- **Why (structural):** **the path is unreachable in today's code.** The Yandex unique id cannot
  change from one authorized account to a *different* authorized account within one page load.
  `yandexSdkPlayerObject` is assigned at exactly three sites in `FlashistFacade.ts`: `:785` (late-SDK
  recovery, guarded by `if (this.yandexSdkPlayerObject || !this.yandexGamesSDK) return;` at `:781-783`,
  so it can only fill an **empty** slot), `:1195` (`initPlayer`, one-shot / memoized), and `:1227`
  (`openYandexAuthDialog`, reachable only from `CitizenshipCard.onLoginCtaTap`, whose button renders
  **only** inside `renderGuest()` — `CitizenshipCard.ts:238`, `:242`, `:290`). So the only in-page
  transition is **guest → B**, never **A → B**; and a guest holds no token, so `relogin()` is never
  reached on that path. The same reasoning makes the id-mismatch branch at `:130-131` defensive rather
  than live. `0267` reworks this whole identity funnel anyway.
- **Rejected alternative:** thread the account through `ensureSession()` / `profileFetch()` and
  compare `yandexId` in the fast path. Not a one-liner — `ensureSession()`'s exported signature
  returns a bare `string | null`, so it is a small refactor plus roughly six test call sites, spent on
  a case no code can reach and that `0267` will rewrite.
- **Re-raise only if:** a **logout or switch-account surface appears**, or **`0267` re-binds identity
  mid-load**.
