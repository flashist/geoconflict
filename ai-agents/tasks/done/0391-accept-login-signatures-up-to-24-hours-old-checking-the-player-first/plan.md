# Plan — 0391: accept login signatures up to 24 h old, checking the player first

**Planning only. No files were written.** Built to ADR-121 (accepted 2026-10-05). Line numbers re-checked on `dev` 2026-10-05.

## Summary (most important first)
- **Recommended: split the client part off.** Server change plus test changes now; the account-switch re-login (ADR-121 Decision 3) goes into a follow-up task that **must land before `0340` mints `vfy:true`**. That keeps "server-only, profile deploy only, 10/11 Oct" true. **This needs the owner's OK at this gate** (open question 1). Note: ADR-121 lists the account-switch re-login as *decided*, while the brief allows deferring it. Deferring means ADR-121 Decision 3 stays unbuilt until the follow-up ships. This is flagged, not resolved silently.
- **`openAuthDialog` already leads to a fresh profile login.** Confirmed in code (details below). No change needed there.
- **`ACCOUNT_SELECTION_DIALOG_CLOSED`: no handler exists, and nothing in `src/client` subscribes to any Yandex SDK event.** The handler would be the first one. It is new design work and touches owner-ruled restart rules (D3, the restart latch, ledger AR-9). That is why the split is recommended.
- **Stale brackets:** drop the five unreachable past brackets under 24 h. Split `past_over_24h` into `past_24h_48h` / `past_48h_7d` / `past_over_7d`. The two future brackets stay unchanged. The `outcome` counter's name and values are unchanged (open question 2).
- **The 300 s held-signature refetch (B4) and `0372`'s A2 `Refetch` diagnostic: keep both unchanged now.** No client behaviour change, and no GameAnalytics event added, removed or renamed. A2 is now low-value: it fires an extra signed call on about 1 in 3 page loads and returns `Same` about 99% of the time. Removing it is a candidate for the follow-up client task (open question 3).
- **A server change also forces a client *test* change.** `tests/client/SignatureAgeAnalytics.test.ts` imports the server's window and bracket function to check they match the client's. After this change that check would fail. The plan cuts that link: the client's diagnostic labels stay frozen on `0366`'s edges. Only comments change in client source, so no game deploy is needed.

## 1. Server changes (profile server)

### 1a. `src/profile-server/PlayerSignature.ts`
- `LOGIN_SIGNATURE_MAX_AGE_SECONDS`: `900` → `86_400`, with the doc comment changed to "24 h (ADR-121; was 900 s under ADR-116)". `LOGIN_SIGNATURE_MAX_FUTURE_SECONDS` stays `300`.
- **Return the signed id on a stale result.** Change the type to `{ status: "stale"; platformUserId: string; ageBracket: StaleSignatureAgeBracket }`, and have the stale branch (now `:135–139`) return `platformUserId: uniqueId`. The checks before it stay in the same order: secret, then HMAC, then JSON, then `data.uniqueID`, then `issuedAt`. So a stale result always has a validated id.
- **Bracket constants:** remove `STALE_PAST_20M/30M/1H/6H/24H_SECONDS` and add `STALE_PAST_48H_SECONDS = 172_800` and `STALE_PAST_7D_SECONDS = 604_800`. `STALE_FUTURE_SMALL_MAX_SECONDS = 900` stays.
- **`staleSignatureAgeBracket(ageMs)`:** the future side is unchanged. The past side returns `past_24h_48h` for age ≤ 48 h, `past_48h_7d` for age ≤ 7 d, and `past_over_7d` above that. Ranges stay open below and closed above, as in `0366`. The doc comment notes it is only called for an age outside the window (> 86,400 s on the past side).
- **Header comment (`:24–31`):** "logs in as its owner until it goes stale" becomes "up to 24 h after `issuedAt` (+5 min skew); see ADR-121 R1". Also add a note that a stale result carries the signed id **only so the caller can compare it**, and that it is never logged, used as a label, or returned.

### 1b. `src/profile-server/LoginVerification.ts` — id first, then age (ADR-121 Decision 2)
```ts
const result = verifySignedPlayer(signature, secret, nowMs);
if (result.status !== "ok" && result.status !== "stale") {
  return { outcome: result.status, verified: false };
}
// ADR-121 Decision 2: id first, then age — `stale` means "right player, too old".
if (result.platformUserId !== assertedPlatformUserId) {
  return { outcome: "id_mismatch", verified: false };
}
if (result.status === "stale") {
  return { outcome: "stale", verified: false, staleAgeBracket: result.ageBracket };
}
return { outcome: "ok", verified: true };
```
The `LoginVerification` interface does **not** change. It never carries the id, so the id cannot reach `Routes.ts`, a metric or a response. Only the file-header comment changes.

### 1c. `src/profile-server/Telemetry.ts` (comments + type)
- **`LoginVerificationOutcome` doc (`:93–108`):** reorder to the real check order (… `id_mismatch` → `stale` → `ok`). `stale` becomes "the right player, but outside the 86,400 s old / 300 s ahead window (ADR-121)". The values do not change, so `0392` reads the same series as `0339`/`0373`.
- **`StaleSignatureAgeBracket` (`:110–137`):** five values — `future_5m_15m`, `future_over_15m`, `past_24h_48h`, `past_48h_7d`, `past_over_7d`. The doc is rewritten for the 86,400 s window. It records that the `0366` sub-24 h brackets were retired by ADR-121, and that **the three new past brackets add up to the old `past_over_24h`**, so `0373`'s 417 figure stays comparable.
- The counter name `geoconflict.profile.login.verification.stale_age`, its label key `bracket`, and its description are unchanged.

### 1d. `src/profile-server/Routes.ts`
No logic change. One comment line in the S2 / `0366` block (`~:682–692`) cites ADR-121 (24 h window, id checked first).

## 2. Client — no behaviour change in this task (recommended option)

### 2a. `openAuthDialog`: a fresh profile login already follows (confirmed)
`CitizenshipCard.onLoginCtaTap` → `openYandexAuthDialog()` re-fetches the player → `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` → `Main.ts` `requestGameRestart`. That gives one of two paths:
- **A full reload.** A fresh boot with a fresh signed prefetch and a fresh login.
- **The fallback** (mid-match, already restarted once, or no storage). `refreshProfile` → `loadPlayerProfileView` → `profileFetch` → `ensureSession`. That reaches `login()`, because a guest boot never got a session and never latched D3. `takeYandexPlayerSignature` then makes a **fresh** signed call: `initPlayer` only starts a prefetch for a logged-in player, so a guest boot holds none.

There is also no login loop: the restart latch caps reloads at one per page load. The auth dialog can only be reached by a guest (the button is guest-only). **No change here.** The worklog will record this trace as the evidence.

### 2b. `ACCOUNT_SELECTION_DIALOG_CLOSED` — recommended: defer to a follow-up task
Why it is safe to defer:
- **Every session is `vfy:false` until `0340`.** The risk the handler guards against is a verified session following the wrong account, and that cannot happen yet.
- **The in-page gap is not created by this task.** Today a switched account already keeps the old session token for its 24 h TTL. The 900 s → 24 h change does not affect that.
- **The need itself is unverified.** We do not know whether Yandex reloads the game iframe on an account switch. If it does, the boot login already handles it.

What the follow-up would need to cover (that is why it is not small):
- the first SDK event subscription in the codebase;
- re-fetching the plain player and dropping any held signed prefetch;
- detecting a changed `getUniqueID()`;
- choosing restart vs session drop, which interacts with the D3 latch and `GameRestart`;
- resolving `ProfileSession.relogin`'s owner-ruled known limit AR-9. Its comment says "RE-RAISE if a logout or switch-account surface appears", and this handler *is* that surface.

**It must block `0340`.** The producer files it once the owner agrees. Verification step 7 needs its task id.

### 2c. B4 held-signature refetch (`SIGNED_PLAYER_HELD_MAX_AGE_MS = 300_000`, `FlashistFacade.ts:560`) — keep
- It costs one extra signed call, and only when login starts more than 5 minutes after boot, which is rare.
- It still ensures a login sends a recently fetched signature.
- Effect on `0372` events: none.
- **Comment-only change:** "well inside the server's 900 s freshness window" becomes "kept after ADR-121 widened the window to 24 h; no longer needed for freshness".

### 2d. `0372` A2 `Refetch` diagnostic — keep unchanged now
- It still triggers on the client's frozen > 900 s labels.
- Its question is answered (`Same` ≈ 99%), but removing it is a client change and would need a game deploy.
- Candidate for removal in the follow-up client task (open question 3).

### 2e. `src/client/SignatureAgeAnalytics.ts` — comments only, labels frozen
- Its edges stay `0366`'s.
- `Fresh` now means "≤ 15 min old / ≤ 5 min ahead (the pre-ADR-121 window)". It **no longer equals the server's `ok`**.
- Event names and the label set are unchanged, so `0373`'s client series stay comparable.
- The `SIGNATURE_AGE_TO_SERVER_BRACKET` doc comment changes to say it maps to `0366`'s brackets (historical). The name is kept, to avoid churn.

## 3. Tests

### `tests/profile-server/PlayerSignature.test.ts`
- **Window constant:** expect `86_400` and `300`.
- **Freshness table:** 23 h 59 m old → `ok`; exactly 86,400 s → `ok`; 86,401 s → `stale`; 3 days → `stale`; exactly 300 s ahead → `ok`; 301 s ahead → `stale`; far future → `stale`; a milliseconds `issuedAt` → `stale` (kept).
- **Stale results** now expect `{ status: "stale", platformUserId: UNIQUE_ID, ageBracket }`.
- **Bracket table:** 86,401 s → `past_24h_48h`; 36 h → `past_24h_48h`; 3 d → `past_48h_7d`; 30 d → `past_over_7d`; 301 s ahead and 10 min ahead → `future_5m_15m`; 1 h ahead and ms-`issuedAt` → `future_over_15m`.
- **Edge sweep:** 172,800 (at the edge → `past_24h_48h`, +1 ms → `past_48h_7d`) and 604,800 (→ `past_48h_7d` / `past_over_7d`). The 900 s future edge test is kept. The old 1,200 / 1,800 / 3,600 / 21,600 / 86,400 rows are removed.
- **Exactly 86,400 s old and exactly 300 s ahead → `ok` with no `ageBracket`.**

### `tests/profile-server/LoginVerification.test.ts`
- The "genuine but stale" row `NOW_SEC - 901` becomes `NOW_SEC - 86_401` → `stale` / `past_24h_48h`.
- **Right player:** 23 h 59 m old → `ok` and `verified: true`.
- **Replace** the test that pinned the old order ("1-day-old signature for ANOTHER id is stale") with id-first tests. A valid note for B, sent as A, is `id_mismatch` with **no** `staleAgeBracket` key when it is:
  - 1 min old;
  - 3 days old;
  - 10 min ahead (future-stale).
- **New:** for every outcome, the result's keys are a subset of `{ outcome, verified, staleAgeBracket }`, and the signed id never appears in the result.

### `tests/profile-server/LoginVerificationRoutes.test.ts`
- `STALE_AGE_BRACKETS` → the five new values.
- The "a stale signature" row (−3600 s, which is now `ok`) becomes −3 days.
- **Add a row:** a 3-day-old valid signature for `OTHER_PLATFORM_USER_ID` → 200, `id_mismatch`, no bracket recorded, `vfy:false`, same body shape.
- **Bracket rows:** "45 min old → `past_30m_1h`" becomes "30 h old → `past_24h_48h`" and "3 days old → `past_48h_7d`". These ages are hours away from any edge, so the test-clock vs server-clock race cannot move them. "10 min ahead" is kept.
- **"Stale-age recording throwing" test:** −45 min becomes −3 days.
- **No-leak test (verification step 4):**
  - the stale signature becomes 3 days old;
  - **add** a fresh and a 3-day-old note signed for `OTHER_PLATFORM_USER_ID`, one of each through a failing repo (to force the log line);
  - assert that neither the other id nor any part of any signature appears in log lines, repository calls, recorded metric values (`verifications` + `staleAges`) or response bodies.

  This covers the stale result that now carries the id. (For the right-player stale path, the signed id equals the asserted id, which legitimately goes to `resolveOrCreatePlayer`. So the other-id rows are the meaningful leak check.)
- **Fail-open (step 6):** the existing parametrised 200 / `vfy:false` / same-shape test covers absent, bad signature, stale, id mismatch and the classifier throwing. The no-secret test is kept.

### `tests/profile-server/Telemetry.test.ts`
- The bracket test goes from "eight" values to five, with the list updated.
- `loginStaleSignatureAge("past_over_24h")` becomes `"past_over_7d"`.

### `tests/client/SignatureAgeAnalytics.test.ts`
- **Narrow the server-parity test to the future side**, which is still shared (300 s limit, 900 s split). Drop the past-side comparison against `staleSignatureAgeBracket`.
- **Drop the import of the server's max-age constant**, with a comment pointing to ADR-121 for the decoupling.
- The existing per-edge label table and the "mapping covers eight `0366` brackets" test stay; that test already compares against a literal list, not the server.

### `tests/client/SignedPlayerFacade.test.ts`
Unchanged. It pins `SIGNED_PLAYER_HELD_MAX_AGE_MS = 300_000`, which is kept.

## 4. Docs (not the wiki)
- **`ai-agents/knowledge-base/analytics-event-reference.md` §A1/A2:**
  - rename the "Server (`0366`)" column to "Server bracket under `0366` (retired by ADR-121 for ages < 24 h)";
  - change `Fresh` to "the pre-ADR-121 15-min window, not the server's `ok`";
  - remove the "a test sweeps every edge against the server's function" claim;
  - event strings and enum keys are unchanged.
- **`worklog.md` in the task folder:**
  - the openAuthDialog trace (§2a);
  - the B4 / A2 decision (step 8);
  - the defer record and follow-up id;
  - test output;
  - deploy entry: date, first post-deploy UTC time (the start of `0392`'s window), "counters restart at deploy — never compare cumulative values across it", and the rollback note ("rolling back narrows classification to 900 s; every session stays `vfy:false`, so it is safe").
- **Wiki:** none (fkit-wiki ingests later).

## 5. Sequencing
1. `PlayerSignature.ts` and `Telemetry.ts` type, then their tests (step 1a/1c).
2. `LoginVerification.ts` and its tests.
3. `Routes.ts` comment and the route tests.
4. Client comments and the client parity test.
5. Analytics reference doc.
6. `npx tsc --noEmit` (type-check, so a removed bracket value anywhere is a compile error), `npm run lint`, targeted jest runs, then the full `npm test`.
7. Ask the reviewer for a stateful review.
8. Profile deploy in the weekend slot (10/11 Oct), owner-run; no game deploy.

## 6. Edge cases and failure modes considered
- **Boundaries:** exactly 86,400 s old and exactly 300 s ahead are `ok` (inclusive, as ADR-116 A4). +1 s either way is `stale`.
- **A future-dated note for another player is `id_mismatch`, not `stale`.** Id-first applies to both directions.
- **A milliseconds `issuedAt`** still reads as far future → `stale`/`future_over_15m` for the right player, or `id_mismatch` for another.
- **`bad_payload` still wins over everything.** A missing `uniqueID` or `issuedAt` never reaches the id or age checks, so the order before the window check is untouched.
- **Signed-id leak paths:** the id lives only inside `verifySignedPlayer` → `classifyLoginSignature`. `LoginVerification` has no id field, and a test pins that.
- **Route clock race:** the route tests read `Date.now()` separately from the server, so every route-level age is hours from any edge. Exact edges are tested only at unit level with a fixed `NOW_MS`.
- **Dashboards and alerts:** grep found no alert, Uptrace config or runbook check keyed on the old bracket values. The runbook's N3.1 row is historical. Old bracket series simply stop at deploy, and the counters restart anyway.
- **Rollback** narrows classification back to 900 s. No data is migrated, and sessions are `vfy:false` either way.
- **Expected outcome-mix shift after deploy:** `ok` ≈ 97%, `stale` ≈ 2.5%. `id_mismatch` may tick up slightly (wrong-player notes that were previously hidden under `stale`). That is ADR-121's point, not a regression.
- **Accepted residual R1** (a stolen signature works up to ~48 h) is closeout of ADR-121 if a reviewer raises it.

## 7. Verification mapping (brief → how)
| Step | How |
|---|---|
| 1 | Unit: 23 h 59 m, right player → `ok` |
| 2 | Unit: 86,400 → `ok`, 86,401 → `stale` with an over-24 h bracket (`past_24h_48h`), 300 s ahead → `ok`, 301 s ahead → `stale` |
| 3 | Unit: B-signed-as-A at 1 min and at 3 d → `id_mismatch`, never `stale` |
| 4 | Route no-leak test, extended (§3) |
| 5 | Edge sweep for 172,800 / 604,800 / 900 s future; a test asserting only the fixed values ever appear as labels |
| 6 | Existing fail-open parametrised route test, updated rows |
| 7 | Deferred: owner OK recorded + follow-up task id (or, under option B, the client tests listed in open question 1) |
| 8 | `npm test` green. If a `supertest` timeout flake or the `0197` SIGSEGV shows, re-run and say so |
| 9 | Worklog deploy entry |
| 10 | Synthetic keys and ids only (existing `zz0325-…` fixtures) |

## 8. Out of scope (unchanged from the brief)
- Minting `vfy:true` (`0340`), and any route that reads `verified`.
- Any message for notes over 24 h old (`0393`; no forced popup).
- Persisting the session token across reloads.
- **This plan adds:** the `ACCOUNT_SELECTION_DIALOG_CLOSED` handler and removing A2, under the recommended option.
- No commit or push without the owner's explicit ask.

## 9. Unverified
- **The Yandex SDK subscription API** for `ACCOUNT_SELECTION_DIALOG_CLOSED` (method name and event constant): not checked against the docs. Only ADR-121's architect research describes it. Matters only if the client part is built.
- **Whether Yandex reloads the game iframe on an account switch:** unknown. It decides whether the handler is needed at all.
- **Effort:** ~½–1 day for the server part plus tests. This is an estimate.

## Option B (only if the owner rejects the split) — extra scope now
- **`FlashistFacade`:** subscribe once after SDK init, guarded, to `ACCOUNT_SELECTION_DIALOG_CLOSED`. On close:
  - re-fetch the plain player;
  - drop `signedPlayerPrefetch`;
  - if the authorised state or `getUniqueID()` changed, emit an account-changed event.
- **`Main.ts`:** route that event through `requestGameRestart` (same match guard and latch). The fallback is a session drop.
- **`ProfileSession`:** add an exported `dropSessionForAccountChange()`, and fix AR-9 so `relogin` re-checks `yandexId` before handing back a replaced token.
- **Tests:** in `SignedPlayerFacade.test.ts` / `ProfileSession.test.ts`, check that one close-with-change gives one restart request or one fresh login, a close with no change gives nothing, and there is no loop.
- **Cost:** it adds a **game deploy** (so "server-only, ~1 day" no longer holds), changes owner-ruled D3/AR-9 behaviour, and likely needs its own architect consult.

---

## Owner rulings at the plan gate (2026-10-05, live via `AskUserQuestion` in the `fkit lead` session; recorded by the driver, `fkit-sprint-ship-loop`)

Everything above this line is the approved plan text, copied unchanged. The owner's answers:

- **Plan:** "Approve (Recommended)".
- **Q1 — account-switch re-login (ADR-121 Decision 3), owner verbatim:** *"I am not sure if we can control this user scenario or if Yandex Games sends us enough events/data about it. I suggest moving this part into a different task and move it to backlog, because this scenario is a rare one and it can be easily fixed by the user if the page is reloaded"*. ⇒ Not built in `0391`. Filed as a separate task on the **Backlog** board. ⚠️ The owner did **not** rule it a hard gate on `0340` (the plan had recommended that); the plan's "must block `0340`" line is superseded by this ruling unless the owner says otherwise.
- **Q2 — stale-age brackets:** "24–48h / 2–7d / 7d+ (Rec)" — as planned.
- **Q3 — B4 refetch + `0372` A2 diagnostic:** "Keep both for now (Recommended)" — as planned.
