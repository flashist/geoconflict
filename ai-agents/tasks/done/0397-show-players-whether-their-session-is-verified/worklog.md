# Worklog — 0397 Show players whether their session is verified (0278 folded in)

## 2026-10-06 — Build + Verify (spawned `fkit-coder`, Build worker of `fkit-sprint-ship-loop`)

Written at `2026-10-06T13:12Z` (from `date -u`), on `dev` at `91eb99a`, working tree. **Nothing committed or pushed.**

**Authority.** Spawned by `fkit-sprint-ship-loop` (driven by `fkit-lead`, Sprint 7) under its declared-approval
marker: the approved plan is [`plan.md`](plan.md) (blob `177a27f777e5f2ec2cf9e99fba4f4f7b75935e7e`, 25,033 bytes —
re-checked with `git hash-object` before any edit; it matched). The owner approved it via `AskUserQuestion` in the
`fkit lead` session on 2026-10-06 (*"Approve (Recommended)"*). `plan.md`, the brief's `## Status`, and the sprint
board were not edited. The `0248` build was already committed on `dev` (`git status` showed no `src/` changes at the
start), so every `src/`/`tests/` diff below is this task's.

### Change surface

**Source (client only — no server, schema or `src/core` change; no new custom element, so neither HTML template
changes):**
- `src/client/PlayerProfileView.ts` — new `isVerifiedRead: boolean` (doc comment: verified owner view only;
  display-only, never a grant, ADR-116 D4). `false` in the zero-state, `isOwnerView` on success. Nothing else.
- `src/client/CitizenshipStatus.ts` — additive: `ProfileVerificationStatus` (`unknown | guest | read_failed |
  unverified | verified`), `deriveProfileVerificationStatus` (`=== true` on `isVerifiedRead`), deduped
  `publishProfileVerificationStatus`, `getProfileVerificationStatus`, `subscribeProfileVerificationStatus`; reset
  extended. ⛔ `CitizenshipStatus` (3 values), `derivePaidCitizenship` / `publishPaidCitizenship` /
  `isCurrentPlayerPaidCitizen` untouched (pinned by tests).
- `src/client/CitizenshipNotice.ts` (new) — `CitizenshipNotice`, `deriveCitizenshipNotice` (plan table B),
  `reportCitizenshipNoticeShown` (once-per-page latches; `read_failed`/`still_failing` share one), test reset.
- `src/client/ProfileReadRestart.ts` (new) — `restartAfterProfileReadFailure` (start screen only; marker → event
  → reload; a refused press does nothing), `wasRestartedAfterProfileReadFailure` (read once, removed at once,
  memoized; any error → false), test reset. Not `requestGameRestart()`, not the `Profile:Login:Restart:*` funnel.
- `src/client/StartScreenPresence.ts` — `isOnStartScreen()` = `!isAwayOrJoining()`.
- `src/client/flashist/FlashistFacade.ts` — 3 enum keys (`CITIZENSHIP_STATUS_UNVERIFIED` / `_READ_FAILED` /
  `_RESTART`) under the `0303` block; `whenYandexAuthorizedLate()` + `markYandexAuthorizedLate()` (lazy resolvers,
  once per page); `runPlatformInit` records `wasYandexAuthorizedAtBoot = isYandexLoggedIn()` right after
  `yandexSdkInitPlayerPromiseResolve()` and chains `.then(mark).catch(() => {})` on the boot
  `playerInitResultPromise`; the late-SDK `playerRecovery` calls `mark` right after its `getPlayer()` assignment.
  Not called from `openYandexAuthDialog()`.
- `src/client/CitizenshipCard.ts` — `refreshProfile()` publishes the verification status and reports the notice
  (inside the existing guard, after the paid publish; guard, paid publish and its comment unchanged);
  `currentNotice()`; `sessionStorageOrNull()`; `rereadWhenYandexAuthorizesLate()` subscribed in `revealCard()`;
  `render()` → `renderChecking()` for `checking`; `renderStatusNotice()` under the XP bar (+ `renderStatusLine`);
  `onStatusRestartTap` with an in-flight guard; class doc comment updated. All strings via `translateText()`.
- `src/client/ProfileSession.ts`, `src/client/GameRestart.ts` — **comments only**: the D3 header comments now name
  the one widened button (owner ruling Q3, 2026-10-06), per the brief's binding notes.
- `resources/lang/en.json`, `resources/lang/ru.json` — new `citizenship_status` section (6 keys), owner-approved text
  verbatim (checked cell-by-cell against the brief's *Approved wording* table by script: 12/12 equal).
- `ai-agents/knowledge-base/analytics-event-reference.md` — three rows after `Citizenship:RestartPrompt:Later`.

**Tests:**
- `tests/client/CitizenshipStatus.test.ts` — table A for every input incl. a stub without `isVerifiedRead`; store
  publish/dedupe/get/subscribe/unsubscribe/reset; regression pins that flipping `isVerifiedRead` changes neither
  `derivePaidCitizenship` nor the 3-value status. `profile()` fixture gained `isVerifiedRead: false`.
- `tests/client/PlayerProfileView.test.ts` — `isVerifiedRead` true for owner views (payer and non-payer), false for
  unverified view and every zero-state path. **Deliberate updates:** 7 full-object `toEqual` expectations + the
  `ZERO_STATE` constant gained `isVerifiedRead` (`true` only for the two `ownerProfile()` bodies).
- `tests/client/CitizenshipNotice.test.ts` (new) — all 80 input combinations against an independent copy of table B;
  `verified_paid` only for verified + paid; once-per-page latches; `none`/`checking`/`verified_paid` log nothing.
- `tests/client/ProfileReadRestart.test.ts` (new) — refusal (no reload/event/marker); accepted (order marker →
  event → reload); throwing / null storage still reloads; marker read once, removed, memoized; errors → false.
- `tests/client/StartScreenPresence.test.ts` — `isOnStartScreen()` (unregistered / away / back / join set-up).
- `tests/client/FlashistFacade.test.ts` — new `whenYandexAuthorizedLate (task 0397)` block: case (a) via
  `runPlatformInit` with the boot `getPlayer()` landing after the 5 s deadline; real late guest, rejected
  `initPlayer()`, healthy boot (logged-in and guest), guest's own auth-dialog login → no fire; case (b) via the
  `0329` recovery harness (logged-in fires; guest and "boot not recorded yet" don't); late waiter resolves at once;
  at most once per page.
- `tests/client/CitizenshipCard.test.ts` — facade mock gained the 3 event keys, `whenYandexAuthorizedLate` (default
  never resolves) and `reloadApp`; `beforeEach` resets the notice latches, the restart memo and `sessionStorage`.
  New `session status line (task 0397)` block (26 tests): checking (no login/buy button, Seen still fires), guest
  unchanged, read_failed + button (click reloads on start screen; refused in a lobby/match and during a join set-up,
  logs nothing, button stays and works once back), still_failing after a marked restart, marker consumed when the
  restart helped, 0278 situation B, unverified citizen / non-citizen, unverified after a confirmed purchase,
  verified paid / non-paid, unverified read claiming paid, reconciled re-read updates without reload, kill switch and
  `citizenship_ui` off, superseded read publishes nothing, one load per refresh, and the five 0278 late-login tests.
  **Deliberate update:** `Citizenship:Seen › fires exactly once` — its fixture lacked `isAuthoritative`, which now
  derives `read_failed` and logs `ReadFailed`; fixed the fixture (`isAuthoritative: true`), not the count. No other
  existing card test needed a change (the predicted "guest UI while a read is pending" tests did not exist: every
  existing guest test lets the read land before asserting).
- `tests/client/CitizenshipStatusLang.test.ts` (new) — keys present/non-empty in both, same key set (and only the
  approved keys), RU not copied from EN, EN/RU equal the owner-approved text exactly.

### Which 0278 case holds — evidence (code read this turn)

| 0278 path | Today's code | Result |
|---|---|---|
| **Situation B** (authorized, boot login failed) | `ProfileSession.ts` `login()` sets `loginFailed = true` (only there); `resolveSession()` then returns null → `loadPlayerProfileView` zero-state (`isAuthoritative: false`). | **Was broken; now covered** by `read_failed` + Restart game. Test: *0278 situation B*. No extra code. |
| **Late SDK, card hidden** | `resolveSession()` returns null *before* the `loginFailed` check when `isYandexAuthorized()` is false — nothing latches. `profileFetch()` calls `ensureSession()` on every read. The `0329` reveal does a fresh `refreshProfile()` after the late `getPlayer()`. | **Already recovers** — no new code. Pinned by *late SDK, card hidden (0329)…*: checking, then the real state, exactly one read, and a late-auth signal that landed while hidden causes no extra read. |
| **Late player, card already showing** | `initPlayer()` / `playerRecovery` assign `yandexSdkPlayerObject` late with no signal; the card's first read had returned null (guest) and nothing re-read. | **Was broken; fixed** by `whenYandexAuthorizedLate()` + the card's re-read through `refreshProfile()`. Tests: the two *card showing as guest* tests (real state; and failure → read_failed + button). |

⚠️ How often the late-player case happens in production is **unmeasured** (as the plan says).

### Brief verification

| Step | Status |
|---|---|
| 1 Spec approved | Done before this build (Q1–Q4 + plan rulings). |
| 2 Each state on a real build | **Not done here — goes to the next-sprint verify task (producer work).** Locally: per-state render tests, plus element screenshots on `npm run start:client` of **guest** (real), **checking** and **read_failed** (both stubbed on the instance in devtools: `currentNotice` overridden, `profile` set) — saved under the gitignored `.playwright-mcp/` (`0397-guest.png`, `0397-checking.png`, `0397-read-failed.png`). Rendered text matched the approved EN. RU, verified and unverified were **not** shown on a build. |
| 3 Verified-paid only on `isPaidCitizen` | `CitizenshipNotice.test.ts` (all 80 combos) + card tests. |
| 4 One source | `grep -rn "loadPlayerProfileView(" src` → one call, `CitizenshipCard.ts:303` (`refreshProfile`); the rest are comments/the definition. `isCurrentPlayerPaidCitizen()` callers: `FlashistFacade.ts:2197` (0248 ad gate) and `CitizenshipCard.ts:331` (the notice) — same value. |
| 5 Kill switch | Card tests with `CITIZENSHIP_CARD_ENABLED` false and with `citizenship_ui` off: nothing renders, status stays `unknown`, nothing logged, no late-login subscription. ⚠️ Remote `citizenship_ui` **unverified** live (`0238`). |
| 6 Translations | Lang test; `grep` for the approved strings in `src` → comments only. Keys used in code: exactly the 6. |
| 7 Retry only on press | `restartAfterProfileReadFailure(` has one caller (`CitizenshipCard.ts:761`, the button handler); tests above. |
| 8 No blaming wording | Owner-approved text verbatim, pinned by the lang test. |
| Added (0278) | Above table + tests. |

### Verify runs

- Targeted suites (`CitizenshipCard`, `CitizenshipStatus`, `PlayerProfileView`, `CitizenshipNotice`,
  `ProfileReadRestart`, `StartScreenPresence`, `CitizenshipStatusLang`, `FlashistFacade`): all pass
  (card 162/162, facade 57/57, status + view 83/83, the four others 95/95).
- `npx tsc --noEmit -p .` → exit 0. `npm run lint` → exit 0. Prettier `--check` on every touched file → clean.
- `npm test` run 1 → **exit 1**: 3 failed / 3858 passed, 2 suites failed — `tests/profile-server/TenureGrantRoutes.test.ts`
  (`Exceeded timeout of 5000 ms`, the confirmed `supertest` flake shape) and `tests/profile-server/InboxRoutes.test.ts`
  (two unexpected `404`s — the historical, **mechanism-unknown** `supertest` shape). Both are profile-server suites this
  client-only change does not touch. Not `0197`: no `SIGSEGV` in the log, newest `node-*.ips` is from 2026-10-01.
  **Re-ran:** the two suites alone → 82/82 pass; full `npm test` again → **exit 0, 199/199 suites, 3861/3861 tests**,
  shell harnesses included (none skipped).
- `npm run build-prod` → exit 0, `compiled with 2 warnings` (webpack's generic asset/entrypoint size-limit warnings;
  not compared against a pre-change build). It touched no tracked file.
- **Mutation checks** (each restored, `diff -q` against the backup confirmed):
  - M1 (the plan's): remove the card's late-login subscription → 3 tests red (both *card showing as guest* + reconnect).
  - M2: drop the "reveal's own read not issued yet" guard → 2 red (*already fired before the reveal*, *late SDK hidden*).
  - M3: drop the connection-generation guard → 1 red (reconnect).
  - M4: drop the checking render → 3 red.
  - Facade: remove the boot `.then(mark)` hook → 3 red; remove the recovery `mark` → 1 red.

### Decision log

1. **Late-login re-read: how "while the card is still hidden it does nothing / no double read" is enforced.** The
   plan subscribes in `revealCard()`; but a signal that already fired while the card was hidden resolves *at once*
   when the `0329` reveal subscribes, which would add a second read next to the reveal's own — contradicting the
   plan's own test. Mechanism chosen: the subscription snapshots `profileReadsIssued` at subscribe time (before the
   reveal's read is issued) and the callback does nothing if no read has been issued since — that read starts after
   the login and sees it. Also guards `isEnabled`/`isConnected`/generation as planned. **Why it qualified:**
   mechanical, local to the planned method, required for the plan's stated behaviour and test; obvious-winner within
   intent (the alternative — subscribing in `connectedCallback` — moves the subscription out of where the plan put it).
   Finding it answers: none (build-time detail, no review yet).
2. **Reconnect test sharpened.** A merely removed card is already stopped by `isConnected`, so a remove-only test
   would not prove the generation guard; the test removes **and re-appends** and expects exactly one extra read.
   Proven by M3. Qualified: test-only, in-plan ("Reconnect: a stale subscription does nothing").
3. **`markYandexAuthorizedLate()` placed right after the recovery `getPlayer()` assignment**, before the best-effort
   OTEL name fetch (plan: "after its `getPlayer()` assignment"). Keeps the window the plan flags as an untested risk
   as small as possible. Qualified: within the plan's wording.
4. **Element ids added for tests/screenshots:** `#citizenship-status-notice`, `#citizenship-status-checking` (the
   plan named only `#citizenship-status-restart`). Cosmetic, matches the card's id convention.
5. **The restart marker is consumed on the first render of every enabled load** (`currentNotice()` runs in
   `render()`), so a restart that fixed the read can never make a later failure say "still not working". This is the
   plan's "removes it at once, so it can never carry past the next load". With the card disabled on that next load
   the marker is not read (the card does nothing at all then) — noted, not tested.

No review finding was answered and no fix was applied without asking in this unit (no review has run yet).

#### 2026-10-06 — Process review, round 1 (spawned `fkit-coder`, Process-review worker of `fkit-sprint-ship-loop`)

6. **Review R1 — restart marker could outlive the next load (fixed without asking).** What changed:
   `CitizenshipCard.connectedCallback()` now calls `wasRestartedAfterProfileReadFailure(this.sessionStorageOrNull())`
   as its first act, before the kill-switch return and the flag check, so the marker is read and removed on every
   load whatever the card's state; the per-page memo keeps the answer for a late `0329` reveal on the same load.
   This supersedes item 5's "noted, not tested". Tests added in `tests/client/CitizenshipCard.test.ts` (killed /
   flag-hidden next load consumes the marker, a later failed read says `read_failed`; hidden-then-revealed on the same
   load says `still_failing`); fix removed → 3 red. **Why it qualified:** verified `CORRECT` at
   `ProfileReadRestart.ts` `wasRestartedAfterProfileReadFailure` + `CitizenshipCard.ts` `connectedCallback` early
   returns; mechanical and local (one call, one comment); inside the approved plan, step 4 ("removes it at once, so
   it can never carry past the next load").
7. **Reviewer observation (no row), not acted on:** `Citizenship:Status:Unverified` / `ReadFailed` fire from
   `refreshProfile()` whether or not the card is on screen. That is plan step 7 as approved; visibility-gating them
   would be a behaviour change outside the plan. Left for the owner/producer as a possible follow-up.
8. Obvious-winner calls this round: none.

### Not done / open

- Brief verification step 2 on a real build (verified, unverified, RU, throttled network) → next-sprint verify task
  (producer). Before `0395`/`0396` are live every logged-in citizen sees "not confirmed" — Q4's deploy rule.
- The small re-render window between the late `getPlayer()` landing and the signal callback (plan risk) is not tested.
- No commit, no wiki write.

#### 2026-10-06 — Post-review verify (spawned `fkit-coder`, Verify step of `fkit-sprint-ship-loop`) — BLOCKED

No source written. Host: 14 cores; no other jest running; load avg 7.8 at start of run 1, 11.6 at start of run 2
(owner desktop apps, not jest), rising to ~16-17 during each jest run.

- `npm test` run 1 — **exit 1**. Suites 197 passed / 2 failed / 199; tests 3862 passed / 2 failed / 3864; 297 s.
  Failures: `tests/profile-server/PaymentsRoutes.test.ts` (`Exceeded timeout of 5000 ms` — supertest-family flake
  shape) and `ShellHarnesses.test.ts` (`tests/profile-checks.sh` killed at the 150 s deadline, reached C20).
- `npm test` run 2 (re-run) — **exit 1**. Same counts; 291 s. Failures: `tests/profile-server/Routes.test.ts`
  (`Exceeded timeout of 5000 ms` — supertest-family flake shape) and `ShellHarnesses.test.ts`
  (`tests/scripts/profile-deploy-hardening.test.sh` killed at 150 s).
- No `0197` sign in either run: no `SIGSEGV` in output, no new `node-*.ips` report (newest is 2026-10-01).
- All 8 suites in the 0397 change surface PASS in both runs (`CitizenshipCard`, `CitizenshipNotice`,
  `CitizenshipStatus`, `CitizenshipStatusLang`, `FlashistFacade`, `PlayerProfileView`, `ProfileReadRestart`,
  `StartScreenPresence`).
- Diagnostic: the two killed harnesses run alone both exit 0 — `profile-checks.sh` 44 s, `profile-deploy-hardening`
  30 s. So they are CPU-starved inside the full parallel run, not hung.
- `npx tsc --noEmit` exit 0 (no output) · `npm run lint` exit 0 · `npm run build-prod` exit 0 (2 standing webpack
  size warnings) · `plan.md` hash `177a27f777e5f2ec2cf9e99fba4f4f7b75935e7e` (matches).
- Result: no clean full run in two tries; every failure is outside the 0397 change surface. Per the step's rule,
  returned BLOCKED. Nothing fixed. Fixes applied without asking this step: none.

#### 2026-10-06 — Post-review verify (maxWorkers=4) (spawned `fkit-coder`, Verify step of `fkit-sprint-ship-loop`) — PASS

Owner ruling 2026-10-06: run `npm test -- --maxWorkers=4`, no code change. No source or config written.

- Before: `uptime` 18:53, up 37 min, load 3.76 / 3.75 / 6.65. No jest / `npm test` already running. Frontmost app
  (`lsappinfo front`): "Ultimate General Civil War" (so the Terminal tree was in the background class, as in the
  diagnosis). 14 cores.
- `npm test -- --maxWorkers=4`, **one run** — **exit 0**. Suites **199 passed / 199**; tests **3863 passed, 1 skipped,
  3864 total**. Jest time 97.8 s; wall clock 99 s (`time -p` real 98.74 s).
- The 1 skip: `scripts/test-check-docker-secret-boundary.sh`. Docker is down, so the wrapper skipped it and warned —
  **skipped, not passed** (the documented behaviour). The other three `npm test` harnesses passed inside
  `ShellHarnesses.test.ts` (91.3 s for that suite). No 150 s harness kill.
- Failures: none. No supertest-family shape (`Exceeded timeout`, `did not exit`, `socket hang up`) in the output.
  No `0197` sign: no `SIGSEGV`, and no new `node-*.ips` report (newest is still 2026-10-01).
- All 8 suites in the 0397 change surface PASS (`CitizenshipCard`, `CitizenshipNotice`, `CitizenshipStatus`,
  `CitizenshipStatusLang`, `FlashistFacade`, `PlayerProfileView`, `ProfileReadRestart`, `StartScreenPresence`).
- Load during the run (sampled every 60 s): 4.6 → 5.5, no alarm (my limits: 1-min load > 30, or `ps` > 5 s). After:
  18:55, load 5.29 / 4.43 / 6.57. Same frontmost app. No jest processes left over.
- No re-run needed. `tsc` / lint / `build-prod` not re-run: source mtimes are 16:24 at the latest, and the previous
  entry (worklog written 17:04) ran all three after that. `plan.md` hash `177a27f777e5f2ec2cf9e99fba4f4f7b75935e7e`
  (matches).
- Fixes applied without asking this step: none. Obvious-winner calls: none.
