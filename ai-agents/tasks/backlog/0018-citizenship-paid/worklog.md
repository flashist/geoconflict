# Worklog — 0018 Citizenship Paid (mock-buildable scope)

> **Attribution note (review R4, owner-ruled 2026-08-24, driver's doing noted as such):** commit
> `7b58655` (labelled "0017 earned citizenship: review round") also carries a slice of 0018 Phase-1
> content — the 3 `PURCHASE_*_CITIZENSHIP` analyticEvents keys in `FlashistFacade.ts` and 0018's
> `plan.md` — swept in by the driver's `git add -A` during the 0017 close. The Phase-1 bullet below
> ("3 new analyticEvents keys") described the tree state at write time and stays accurate about
> authorship; the commit label does not. No history rewrite.

## 2026-08-24 — Plan (orchestrated plan gate)

- `plan.md` written after code-verified context gathering; key finding: the brief's server side
  (grant SQL, /intent /complete /reconcile, HMAC verify, inbox seam) was already shipped by 0019 —
  remaining scope is client flow + UI + analytics + lang + tests + compose-proof it-tests.
- Owner approved (2026-08-24, AskUserQuestion via the lead session): plan as written; dev-browser
  mock harness SKIPPED; cancel shows the generic error per brief.

## 2026-08-24 — Build, Phase 1 (Docker-free)

Changed (all per approved plan):
- `src/client/flashist/FlashistFacade.ts` — 3 new `analyticEvents` keys
  (`Purchase:{Started,Completed,Abandoned}:Citizenship`); `whenPaymentsCatalogSettled()` +
  `setPaymentsCatalogStatus()` (sole status writer; wakes waiters; lazy resolver list because tests
  build instances via Object.create).
- `src/client/CitizenshipPurchase.ts` (new) — flow orchestration: id → intent → Started →
  purchase() → /complete → Completed → best-effort consume; Abandoned on frame/complete failure;
  nothing pre-frame; defensive missing-signature guard.
- `src/client/CitizenshipCard.ts` — buy CTA (State 2 only, hidden entirely without catalog product,
  price from catalog), inline `purchase_error` line, in-flight tap latch, catalog-settle
  subscription, `PURCHASES_RECONCILED_EVENT` listener (+ disconnect cleanup), `paidGrantConfirmed`
  double-charge guard.
- `src/client/PaymentsReconciliation.ts` — exports `PURCHASES_RECONCILED_EVENT`; dispatches it after
  processing ≥1 token (even when a consume fails — the grant is committed server-side).
- `resources/lang/en.json` + `ru.json` — `citizenship_paid` section (4 keys, brief strings, in sync).
- `src/profile-server/PaymentsRepository.ts` — comment-only: seam TODO now points at the
  `citizenship_paid.inbox_*` lang keys.
- `ai-agents/knowledge-base/analytics-event-reference.md` — 3 purchase events documented;
  `purchaseCitizenship` row updated (now fires; supersedes 0021's `UI:Tap:CitizenshipBuy` string).
- Tests: `tests/client/CitizenshipPurchase.test.ts` (new, 7), `tests/client/PaymentsReconciliation.test.ts`
  (new, 7 — first coverage of this module), `tests/client/CitizenshipCard.test.ts` (+11 in own
  describe), `tests/client/FlashistFacade.test.ts` (+3 settle-hook tests),
  `tests/integration/PaymentsRepository.it.test.ts` (+2 compose tests in own describe block —
  `PlayerProfileRepository.it.test.ts` untouched per tree-awareness instruction).

### Decision log (ADR-019 audit — fixes applied without per-fix approval, and judgment calls)

1. **Card state changes need explicit `requestUpdate()`** — found via a failing new test (error line
   not rendered): `@state` assignments do not reliably schedule Lit updates under the SWC test
   transform; the existing card code always pairs state writes with explicit `requestUpdate()`
   (connectedCallback, refreshProfile). Fix: same idiom for `purchaseError` / `paidGrantConfirmed`.
   Qualified: verified-CORRECT (test red→green), mechanical/localized, in-plan (implements the
   planned UX, not new scope).
2. **Phase-2 DB isolation** — `gc-0017-it-pg` health-checked OK and reused, but on **own databases**
   (`gc_it_0018`, `gc_local_0018`) instead of 0017's `gc_it`/`gc_local`: the concurrent 0017 coder's
   it-runs TRUNCATE the same tables — sharing a DB would cross-flake both. Obvious winner within the
   coordinator's "health-check, else own container" guidance.
3. No other unattended fixes or obvious-winner calls — **none** beyond the two above.

## 2026-08-24 — Verification ledger

### Phase 1 (Docker-free)

| # | Command | Outcome |
|---|---|---|
| 1 | `npx tsc --noEmit` | PASS (clean, no output) |
| 2 | `npx jest tests/client/{CitizenshipPurchase,PaymentsReconciliation,CitizenshipCard,FlashistFacade}.test.ts` | first run 59/60 — error line not rendered (decision 1); after fix **60/60 PASS** |
| 3 | `npm test` (full suite) | **PASS 91 suites / 737 tests** |
| 4 | `npm run lint` | PASS (clean) |
| 5 | `python3` JSON validation of `en.json`/`ru.json` | PASS — `citizenship_paid` keys identical in both |

### Phase 2 (Docker)

| # | Command | Outcome |
|---|---|---|
| 6 | `docker ps` + `docker exec gc-0017-it-pg pg_isready` | Container up 36 min, accepting connections (health-checked before reuse — not assumed mine) |
| 7 | `CREATE DATABASE gc_it_0018` + full `RUN_DB_TESTS=1 npx jest --runInBand` (TEST_DATABASE_URL → gc_it_0018) | first attempt auth-failed (password is `testpw`, not `postgres`); with correct URL **PASS 3 suites / 25 tests** (23 pre-existing + 2 new compose tests), serialized per known virgin-DB migration race |
| 8 | `CREATE DATABASE gc_local_0018` + both migrations via psql | PASS — 6 tables |
| 9 | Local profile server (`PROFILE_PORT=8788`, `YANDEX_PAYMENTS_SECRET=synthetic-secret-0018`) — `/health` + `/ready` | 200 ok / 200 ready |
| 10 | Node E2E drive (`scratchpad/e2e-drive.mjs`): `/intent` → synthetic-HMAC `/complete` → idempotent retry → public profile read → `/reconcile` (interrupted intent + processed stray) → tampered signature | intent 200; complete 200 `{success, purchaseToken}`; retry 200 idempotent; profile `is_citizen: true`, **no** `is_paid_citizen`/`citizenship_purchased_at` leaked; reconcile 200 `[e2e-tok-2, e2e-tok-1]`; bad signature **400 invalid_signature** |
| 11 | psql check on `gc_local_0018` | both players `is_citizen=t, is_paid_citizen=t`, `purchased_at` set, `earned_at` NULL; 2 receipts; both intents used + linked to receipts |

Not run / out of scope (stated plainly):
- **In-browser click-through of the mocked flow** — owner ruled the dev-browser mock harness OUT;
  client verification is jsdom-level (0019 precedent). Real-frame E2E is 0065.
- **Inbox message render** — 0012 seam stays a no-op by design; verification executes when 0012 lands.
- **`CITIZENSHIP_CARD_ENABLED`** stays `false` (guarded by an existing test); flip is 0065/0017 live tail.
- Nothing committed; no task files moved.

## 2026-08-24 — Review round 1 (stateful; owner dispositions via lead relay)

All four findings verified CORRECT against the code before acting. Fixes applied under the owner's
explicit dispositions (R1 fix now; R2+R3 one shared change; R4 note only):
- **R1**: `PlayerProfileView.isAuthoritative` flag (zero-states false, fetched profiles true); card
  buy-CTA gate now `isCitizen || !profile.isAuthoritative → nothing`.
- **R2+R3** (shared root cause — unbounded await on `consumePurchase`): purchase flow returns
  "granted" without awaiting consume (fire-and-forget, rejection swallowed); reconciliation
  dispatches `PURCHASES_RECONCILED_EVENT` before the consume loop. Consume-after-grant ordering
  preserved in both.
- **R4**: attribution note at the top of this worklog; no code change.

Test pins: card zero-state-CTA test; purchase hung-consume test (+ ordering assertion);
reconciliation hung-consume test; PlayerProfileView shape assertions extended to pin the flag on
every path.

| # | Command | Outcome |
|---|---|---|
| 1 | `npx jest` on the 4 affected suites (CitizenshipPurchase, PaymentsReconciliation, CitizenshipCard, PlayerProfileView) | PASS 66/66 |
| 2 | `npm test` | **PASS 91 suites / 740 tests** (737 → 740: +3 review pins) |
| 3 | `npm run lint` | PASS (clean) |
| 4 | `npx tsc --noEmit` | PASS (clean) |

Decision log (ADR-019 audit): all three code fixes were owner-dispositioned this round — none
applied on standing approval alone; no obvious-winner calls beyond the dispositions → **none**
unattended. No commit made; flag stays false; review.md header left `in-review` pending reviewer
re-verification.

### Left running for reviewer re-runs
- `gc-0017-it-pg` untouched (0017's container); my DBs `gc_it_0018` / `gc_local_0018` left in place
  (drop with `docker exec gc-0017-it-pg psql -U postgres -c "DROP DATABASE gc_it_0018;" -c "DROP DATABASE gc_local_0018;"`).
- Local profile server STOPPED (was PID 92075).
