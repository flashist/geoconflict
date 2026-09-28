# Worklog — 0330 Retry a failed Yandex SDK loader download

## 2026-09-28 — Build (fkit-coder, Build worker spawned by `fkit-sprint-ship-loop`)

Built from the approved `plan.md` (`git hash-object` `d046800c3954fad9a5e6b009ce8c172b1d352306`), with the owner
rulings recorded there: **D-A** split design (degrade after the quick retries, ~2 s; background retries continue),
**D-B** add `Session:SdkLoaderRetry:{Recovered|RecoveredLate|GaveUp}`, **local browser check owed by the owner**
(no browser driven by the coder). Nothing committed.

### Change surface

| File | Change |
|---|---|
| `src/client/yandex-games_iframe.html` | One attribute: `id="flashist-yandex-sdk-loader"` on the loader tag. Nothing else (the file's other uncommitted hunks belong to other tasks). |
| `src/client/SdkLoaderRetry.ts` (new) | Delay constants (`[500, 1500]`, `[5000, 15000, 45000]`), `runSdkLoaderRetries`, `reinsertSdkLoaderScript`, `SdkLoaderRetryOutcome` closed list. |
| `src/client/flashist/FlashistFacade.ts` | Enum key `SESSION_SDK_LOADER_RETRY_FIRST_PART`; lazy retry state; memoised `waitForSdkLoader()` used by `yandexSdkInit` **and** the login-status window; `yandexSdkInit` split — the body from `this.yaGamesAvailable = true` to the end moved unchanged into `initLoadedYandexSdk()`; latched background phase; `logSdkLoaderRetryOutcome` (once per page); classifier input `scriptFailed = flag && !sdkLoaderRecoveredByRetry`. |
| `src/client/PlatformDegradedAnalytics.ts` | Comment only: the `ScriptFailed` meaning. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New `Session:SdkLoaderRetry:{Outcome}` row; `ScriptFailed` wording; `PlatformRecovered` can follow `ScriptFailed`; `Player:YandexUnknown` window note. English only, no UI text. |
| `tests/client/SdkLoaderRetry.test.ts` (new) | Helper tests (schedule, stop rules, one tag at every step, no insert after load, missing tag, never throws). Fake `.invalid` src only. |
| `tests/client/SdkLoaderRetryFacade.test.ts` (new) | Facade integration (plan §6 items 1–5, 7–10, plus D-B event cases). |
| `tests/client/PlatformDegradedFacade.test.ts` | One test: the template loader tag carries the id, exactly once. |

`YaGames.init()` stays at most once per page: `initLoadedYandexSdk()` is reached from `yandexSdkInit` only when
`YaGames` exists, and the background phase only starts when it does not.

### Tests — red first

1. **Red run 1** (tests written, no module yet): `SdkLoaderRetry.test.ts`, `SdkLoaderRetryFacade.test.ts`,
   `PlatformDegradedFacade.test.ts` → `Test Suites: 3 failed` — `Cannot find module '../../src/client/SdkLoaderRetry'`.
2. **Red run 2** (helper module written, facade and template unchanged) → `Tests: 13 failed, 59 passed, 72 total`.
   Failing: the enum key; all four in-deadline tests (retry, value 2, login window LoggedIn-not-Unknown, attempt
   still downloading at 5 s); background success → late recovery; the cap; init-rejection-after-retried-load;
   retried-load-without-YaGames; missing tag; background latched once; retried-then-OK → `NoPlayer`; template id.
   Passing already (guard tests — today's code never retries): the onload path, init rejection after a normal load,
   standalone page, all-quick-retries-failed → `ScriptFailed`.
3. **Green:** the 3 suites plus `FlashistFacade.test.ts` (0329 suite), `PlatformDegradedAnalytics.test.ts`,
   `CitizenshipCard.test.ts` → `Test Suites: 6 passed`, `Tests: 249 passed, 249 total`.
4. **Full `npm test`:** `Test Suites: 175 passed, 175 total`, `Tests: 3095 passed, 3095 total`, exit 0. No
   `supertest` flake on this run, so no re-run.
5. **Lint:** ESLint on every file I touched → clean; `tsc --noEmit` → clean. Full `npm run lint` → **1 error, not
   mine**: a parsing error in the untracked `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` (not in the tsconfig
   project). Left untouched — another task's file.
6. **Prettier:** run only on the files I edited; the only change it made was on my own new test lines in
   `PlatformDegradedFacade.test.ts`. Not run on the analytics doc.

### Decision log (ADR-020)

Obvious-winner calls, each inside the approved plan's intent; no fix was applied from a review (none has run yet).

1. **`Recovered` vs `RecoveredLate` is decided by the 5 s deadline, not by which retry phase loaded.** D-B's option
   text says the event shows loads saved "inside the 5 s" vs "later". A quick-phase attempt that is still
   downloading at the deadline and loads afterwards arrives after the boot went degraded and takes the late path
   (plan §2b.3), so it logs `RecoveredLate`. Rule: `platformInitTimeoutStage === "script"` at the moment of
   success. Tested ("a quick retry still downloading at 5 s …").
2. **A missing loader tag logs `GaveUp` with value `0` and starts no background phase.** The plan says "missing"
   means no retry and today's behaviour; D-B says the event fires when the first download failed. Both hold:
   the first download failed, zero re-downloads were made. Also makes a future template regression visible.
3. **Failure handling inside the helpers:** an attempt function that throws counts as a failed retry (`"error"`);
   DOM work inside `reinsertSdkLoaderScript` that throws reads as `"missing"` (stop retrying). Stopping is the
   safe side of "never run the loader twice". Plan: "never throws".
4. **A background retry that loads but leaves no `YaGames` does not call `initLoadedYandexSdk()`.** A guard, the
   same as today's "loaded but no SDK" (`NoSdk`) return. No retry after a load either way.

Behaviour note (not a decision — it follows from the fixed schedule): a quick-phase attempt that **errors** after the
deadline continues to the next quick retry and then the background phase; the total stays capped at 5.

### Owner-owed: local browser check (plan §7 step 2 — owner ruled "You run it later")

The coder did **not** drive any browser. Steps for the owner:

1. `DEPLOY_ENV=dev npm run build-prod` (never plain `build-prod` — `DEPLOY_ENV=dev` keeps analytics out of
   production while `GAME_ENV` stays `prod`).
2. Serve `static/` and open the Yandex iframe harness page (the `yandex-games_iframe.html` build).
3. DevTools → Network: tick **Disable cache**; add a request-blocking rule for the SDK loader request (the `async`
   script with id `flashist-yandex-sdk-loader`).
4. **Scenario A — unblock within ~1 s:** reload with the block on, remove the block right after load. Expect a
   second loader request that succeeds, and exactly **one** executed loader (one `script#flashist-yandex-sdk-loader`
   in Elements).
5. **Scenario B — unblock after ~10 s:** reload with the block on; expect failed retries at about +0.5 s and +2 s,
   then background requests at about +7 s (and +22 s / +67 s if still blocked). Unblock after ~10 s; the next
   background request should succeed. Still exactly one loader tag.
6. ⚠️ The harness parent never answers the loader, so `init()` hangs there: "boot not degraded" and "card
   reappears" are **not observable locally** — the unit tests cover them.
7. Record counts and yes/no only — no URLs, hosts or query values.

### Unverified

- Dynamic re-insertion of the Yandex loader has not been checked against Yandex moderation rules or the loader's
  own logic (plan §8). Same URL, same `async` tag.
- Whether a retry actually succeeds for real players is unmeasured; `Session:SdkLoaderRetry:*` and
  `Session:PlatformDegraded:ScriptFailed` after release are the measurement.
- The local browser check above is owner-owed.
- The wiki page `systems/flashist-init` ("Rejected SDK init does not retry") is now incomplete: still true for
  `init()`, but the download now retries. A wiki ingest after close is the wiki role's write.

## 2026-09-28 — Process review, round 1 (fkit-coder, Process-review worker spawned by `fkit-sprint-ship-loop`)

Ledger `review.md` round 1, findings R1–R3. Owner rulings relayed by fkit-lead: R1 "Code fix", R3 "Accept as
known"; R2 applied under the standing approval. Codex X2 was disproven by the reviewer (no row) — nothing done.

### Change surface

| File | Change |
|---|---|
| `src/client/flashist/FlashistFacade.ts` | New lazy field `sdkLoaderRecoveredInDeadline`; set in the quick-retry `loaded` branch (`!isLate`); classifier `scriptFailed` input reads it instead of `sdkLoaderRecoveredByRetry`. |
| `src/client/PlatformDegradedAnalytics.ts` | `ScriptFailed` comment: "recovered it before the 5 s deadline". |
| `ai-agents/knowledge-base/analytics-event-reference.md` | Cause 1 wording; `Session:PlatformRecovered` row; `Session:SdkLoaderRetry` row — R2's two caveats, over-claims removed. My lines only. |
| `tests/client/SdkLoaderRetryFacade.test.ts` | 2 new classification tests (R1). |

### Tests

1. **Red first:** the 2 new tests on the old code → `Tests: 2 failed, 16 passed, 18 total` — received
   `Session:PlatformDegraded:NoSdk` and `Session:PlatformDegraded:ScriptTimeout`, expected `ScriptFailed`.
2. **Green:** the 0330 suites plus `PlatformDegradedFacade`, `FlashistFacade`, `PlatformDegradedAnalytics`,
   `CitizenshipCard` → `Test Suites: 6 passed`, `Tests: 251 passed, 251 total`.
3. **Full `npm test`:** `Test Suites: 175 passed, 175 total`, `Tests: 3097 passed, 3097 total`, exit 0. No flake,
   no re-run.
4. ESLint + Prettier `--check` on the 3 edited code files → clean. `tsc --noEmit` → exit 0. Prettier not run on the
   analytics doc (never reformat a whole doc).

### Decision log (ADR-020) — fixes applied without per-fix owner approval

1. **R1 — sibling case folded into the owner-approved fix.** Finding: a background save before the gate check read
   `NoSdk`. While verifying, the same root cause showed a second mislabel: a quick retry still downloading at 5 s
   that loads before the check read `ScriptTimeout`. Changed: both now read `ScriptFailed` (one field, one input).
   Why it qualified: verified `CORRECT` by a red test; mechanical/localized (one field + one classifier input);
   inside the plan — plan §4's table already says that case is `ScriptFailed`, and the owner's R1 option text is
   "Only a save INSIDE the 5 s window clears the 'script failed' label".
2. **R2 — doc caveats.** Finding: the `Session:SdkLoaderRetry` row lacked the early-close bias and the
   loader-vs-platform distinction. Changed: both caveats added, two over-claims removed. Why it qualified: verified
   `CORRECT` against the code (`GaveUp` fires only from the end of the background phase; `Recovered`/`RecoveredLate`
   are logged before `init()` runs); doc-only; inside plan §5's analytics-reference scope.
3. **Obvious-winner calls:** none.

## 2026-09-28 — Process review, round 2 (fkit-coder, Process-review worker spawned by `fkit-sprint-ship-loop`)

Decision log (ADR-020): **R4** — finding: `analytics-event-reference.md` § *Platform degraded causes* item 1
over-claimed that a late save "still reads `ScriptFailed`" even when nothing is missing (the classifier returns `null`
then — 0328's design). Changed: added "if anything is still missing at the check" to that sentence; no code change
(Codex's code-defect framing is incorrect). Why it qualified: verified `CORRECT` against the classifier's first
`null` return; doc-only, one clause; inside plan §5's analytics-reference scope. Obvious-winner calls: none. No tests
re-run — no code changed. Ledger set `Status: closed-out`.
