# 0309 — worklog

Build worker, spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30. Approved plan:
`plan.md` in this folder (blob `53b8505bb3b8fc238924b013ad2ea12de44aa937`, re-hashed at start — matched).
Owner ruling carried: open question 1 = **"Move it into 0297"** — this task closes on local proof
(plan §1–§5); the §6 deploy + log read-back belongs to `0297`. Nothing committed.

> **Status: built, locally verified.** Plan §1–§5 done. **§6 not done, by ruling** — no deploy, no SSH,
> no box, no secret touched. The real answer (which construction Yandex uses) is therefore **still
> unknown**; it arrives only after a deploy + a real purchase, now tracked in `0297`. Full `npm test`
> **not run here** — the driver's separate Verify step owns it.

## Pre-check

- `git status` over `src/profile-server` and `tests/profile-server` was clean before the build — no
  overlap with the other tasks' uncommitted work in the tree.
- Plan's brief re-check still holds: `verifySignedPayload` has exactly two callers (`Routes.ts`
  `/complete`, `/reconcile`); `verifyHmacEnvelope` has one other caller (`PlayerSignature.ts:65`), which
  reads only `envelope.decodedJson`.

## Change surface

| File | Change |
|---|---|
| `src/profile-server/YandexSignature.ts` | `export type HmacConstruction = "base64_payload" \| "decoded_json"`; `verifyHmacEnvelope` returns `{ decodedJson, construction }`; candidates are now fixed `{construction, message}` pairs, `.some` → `.find` (HMAC compare, length check, `timingSafeEqual` and order unchanged); `VerifiedPayload.construction`; header comment's stale "live-verification checklist" line replaced. |
| `src/profile-server/Routes.ts` | `/complete`: the combined `verified === null \|\| purchases.length !== 1` check split in two, same 400 `invalid_signature` for both, with one `log.info` between them. `/reconcile`: one `log.info` right after its `verified === null` check. |
| `src/profile-server/PlayerSignature.ts` | **Untouched** (plan: no code change; login ignores the new field). |
| `tests/profile-server/YandexSignature.test.ts` | +2 cases (label per construction, flat + envelope shapes); the three `verifyHmacEnvelope` `toEqual({ decodedJson })` updated to include `construction` — the only edit to existing assertions. |
| `tests/profile-server/PaymentsRoutes.test.ts` | File-level logger mock (copied from `TenureGrantRoutes.test.ts`); `signOverDecodedJson` helper; new `describe("signature-construction log line")` — 8 cases. |

Log lines, exact:
`yandex purchase signature verified (complete): construction=<label>` and the same with `(reconcile)`.

## Red → green

Command (both runs):
`npm test -- tests/profile-server/YandexSignature.test.ts tests/profile-server/PaymentsRoutes.test.ts tests/profile-server/PlayerSignature.test.ts`

- **Red** (tests written, code unchanged): `Tests: 11 failed, 81 passed, 92 total`. Failing = exactly the
  new/updated label cases: 5 `/complete`·`/reconcile` success-line cases + multi-purchase case + leak guard
  (PaymentsRoutes), 3 updated `verifyHmacEnvelope` cases + 2 new `verifySignedPayload` label cases. Every
  pre-existing case passed. The two "no line on a bad signature" cases passed pre-change — expected, they
  assert absence.
- **Green** (after the change): `Test Suites: 3 passed, 3 total` · `Tests: 92 passed, 92 total`. Re-run
  once more after a comment-only rewrap: same result. No supertest flake seen; no re-run was needed for
  one.

## Checks

- `npx tsc --noEmit -p tsconfig.json`: baseline taken **before** any edit = exit 0, 0 lines. After = exit
  0, 0 lines. No new type errors.
- `npm run lint`: exit 0.
- `npx prettier --check` on the four touched files: clean.
- Full `npm test`: **not run** (driver's Verify step).

## How "no secrets" holds

- Logged value is typed `HmacConstruction` (two literals), taken only from the constants written into the
  candidate pairs — never computed from input. One interpolation per line; route name is a literal.
- Tests pin the whole line by exact string, and the leak guard checks **every** captured log line (not
  just the label lines) against: the synthetic secret, each full signed string, its signature part, its
  payload part, the decoded JSON, the full purchase token (51 chars, so the reconcile skip line's
  `slice(0, 8)` cannot print it whole), and the intent id — across both routes × both constructions. It
  also asserts exactly 4 label lines were captured, so the guard cannot pass vacuously.
- All test values are obviously synthetic (`payments-test-secret`, `synthetic-purchase-token-0309-…`,
  `some-other-synthetic-key`).

## Decision log

Calls the plan did not spell out word for word. **No review fixes were applied** (no review has run yet)
and **no obvious-winner call was made outside the plan**; these are build-detail choices inside it.

1. **`/complete` condition split.** The plan says "right after the `verified === null` rejection, and
   before the `purchases.length !== 1` check", but the code had them as one `||` condition. Split into
   two `if`s, each returning the same `400 { error: "invalid_signature" }`, with the log between. Response
   behaviour byte-identical; this is the only way to place the line where the plan (and its design choice
   3) put it.
2. **One extra route test beyond (a)–(d):** "/complete logs the label even when it then refuses a
   multi-purchase payload". Pins plan design choice 3 so a later refactor cannot silently move the log
   after the count check. Test-only; no behaviour added.
3. **Bad-signature case (c) uses two inputs per route**: a well-formed payload signed with a wrong
   synthetic key (the realistic failure) and the existing `garbage.notbase64json` shape. Plan named "a bad
   signature"; both are that.
4. **Leak guard (d) inspects all captured lines**, not only label lines, and asserts a non-zero label
   count. The plan says "over all lines from (a) and (b)"; the guard runs its own four successful requests
   (both routes × both constructions) so it does not depend on test order.
5. **`messageCandidates` typed `ReadonlyArray<{ construction; message }>`** — an explicit annotation so
   the label literals are checked against `HmacConstruction` at the declaration site.
6. **YandexSignature label tests also cover the docs' envelope shape** (`ENVELOPE_PURCHASE`) under both
   constructions — the plan's "the envelope shape under both methods" bullet, folded into the two label
   cases rather than a separate `it`.

## Review round 1 — process-review decision log (2026-09-30)

Process-review worker, spawned by `fkit-sprint-ship-loop` under the plan's standing approval (ADR-019
discipline). One fix applied without per-fix owner approval; **no obvious-winner call made.**

- **Fix applied unattended — answers R1** (low, reviewer's *Reviewer findings*, logger mock blind to
  meta objects).
  - **What changed:** `tests/profile-server/PaymentsRoutes.test.ts` only. The logger mock also records
    each call's raw arguments (`logCalls`); the `signature-construction log line` block resets it in
    `beforeEach`; the leak guard asserts every captured call is exactly one string argument. No `src/`
    change.
  - **Why it qualified:** verified `CORRECT` (mock uses `String(arg)`; the real logger's
    `winston.format.json()` prints meta fields) · mechanical/localized (one test file, 4 small hunks) ·
    inside the approved plan (§3 test (d) leak guard, §4 point 3 "exactly one interpolation" per log
    call). Of the reviewer's two options, the one-string assertion was taken because `JSON.stringify`
    would escape quotes and so still miss the decoded-JSON forbidden value.
  - **Proof:** throwaway mutation — `{ signature: parsed.data.signature }` as a second arg to the
    `/complete` log call — passed the old guard, failed the new one (`Expected length: 1, Received
    length: 2`). `Routes.ts` restored from a scratch backup; sha1 identical before and after.
  - **Checks after:** the 3 §5 suites 92/92 · `npm run lint` exit 0 · `npx tsc --noEmit -p
    tsconfig.json` exit 0, 0 lines · prettier clean. Full `npm test` not run (driver's Verify step).

## Not done (by ruling or by scope)

- **§6 deploy / `/health` + `/ready` / reading the line on the box / recording the label in `0297`** —
  moved to `0297` by the owner's ruling. Until that happens, *which construction Yandex uses is not known*.
- ⚠️ Carried from the plan, for whoever does §6: `docker logs` is lost when the container is recreated —
  the line must be read **before the next profile deploy** (in particular before any `0310` deploy).
- Did not touch `plan.md`, the brief's `## Status`, the sprint board, or `0297`'s brief.
