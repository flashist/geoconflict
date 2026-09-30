# Plan — 0309: record which Yandex HMAC construction real purchases match

Planning only. I wrote no source, no tests and no files; `plan.md` is for the driver to write.

## Summary
- A small change on the profile server only: the signature check reports which of the two methods matched, and the two payment routes log that name.
- I checked the brief against the current code. It holds, with one gap it did not mention: the HMAC half now lives in a **shared** helper, `verifyHmacEnvelope`, which the verified-login check (`PlayerSignature.ts`, task 0325) also uses. The plan adds the label there. The login path's behaviour does not change.
- The other tasks' uncommitted work touches nothing in the profile server (`git status` over `src/profile-server` and `tests/profile-server` is clean). No conflict.
- The logger question from the brief: `src/profile-server/Logger.ts` is plain winston JSON to the console. It has no OTEL transport, so the "extra arguments get dropped" problem does not apply here. The details go in the message string anyway, to match every other log line in `Routes.ts`.
- Background, not proof: task 0325's S0 run (2026-09-29) found that signed **player** data matches the decoded-JSON method only. Purchases are a different signed object, so this task still measures them. I expect the answer to be decoded JSON.

## Brief claims re-checked (current tree)
- `YandexSignature.ts` accepts both methods through `messageCandidates = [payloadPart, decodedPayload]` and `.some(...)` (`:133-140`). Confirmed.
- `verifySignedPayload` is called in exactly two places: `/v1/payments/yandex/complete` (`Routes.ts:935`) and `/reconcile` (`Routes.ts:1007`). Neither logs anything on success today. Confirmed.
- `rawPayload` stores only the decoded JSON, never the signature, so the question cannot be answered offline. Confirmed.
- **New:** `verifyHmacEnvelope` (`YandexSignature.ts:108`) was split out by task 0325 and is imported by `PlayerSignature.ts:32`. `PlayerSignature` reads only `envelope.decodedJson`.
- Log volume stays small. `/reconcile` is called only when `getPurchases()` is non-empty (`FlashistFacade.getSignedPurchases` returns null for an empty list, `:1566`). The new line appears about once per real purchase or recovered purchase, never once per session.

## Changes

### 1. `src/profile-server/YandexSignature.ts`
- Add `export type HmacConstruction = "base64_payload" | "decoded_json";`
- `verifyHmacEnvelope` returns `{ decodedJson: string; construction: HmacConstruction } | null`.
  - Replace the untyped candidates list with a fixed list of pairs: `[{ construction: "base64_payload", message: payloadPart }, { construction: "decoded_json", message: decodedPayload }]`.
  - Replace `.some(...)` with `.find(...)`. The HMAC comparison is unchanged: same `createHmac`, same length check, same `timingSafeEqual`, same order (base64 first). The label comes from whichever pair matched. So what is accepted and what is rejected stays exactly the same.
- `VerifiedPayload` gains `construction: HmacConstruction`, and `verifySignedPayload` passes `envelope.construction` through.
- Header comment `:9-10`: replace the stale "live-verification checklist confirms…" with a line saying task 0309 logs which method matched, and 0310 will drop the unused one.
- `PlayerSignature.ts`: **no code change.** It ignores the new field. Login does not log the label; that is out of scope, and S0 already answered it for login.

### 2. `src/profile-server/Routes.ts`: one `log.info` in each payment route
- `/complete`: right after the `verified === null` rejection, and before the `purchases.length !== 1` check, add:
  `log.info(`yandex purchase signature verified (complete): construction=${verified.construction}`);`
- `/reconcile`: the same line with `(reconcile)`, right after its `verified === null` check.
- A short comment on each: label only, never the signature, the signed string, the payload, the token or the secret.

### 3. Tests (red first)
Written before the code, run and seen to fail, then made green.

**`tests/profile-server/YandexSignature.test.ts`**
- `verifySignedPayload`:
  - A flat purchase signed over base64 → `construction === "base64_payload"`.
  - The same purchase signed over the decoded JSON (the existing `signOverDecodedJson` helper) → `"decoded_json"`.
  - The envelope shape under both methods.
  - A bad signature or the wrong key still gives `null` (these cases already exist; they stay unchanged).
- `verifyHmacEnvelope`: the three `toEqual({ decodedJson })` checks at `:165`, `:171`, `:182` fail against the new shape, because `toEqual` rejects the extra key. I update them to `{ decodedJson, construction: "…" }`. That makes them stricter, not looser. **This is the only edit to an existing assertion.** Every other existing case stays unchanged.

**`tests/profile-server/PaymentsRoutes.test.ts`**
- Add the file-level `jest.mock("../../src/profile-server/Logger", …)` that collects log lines, copied from `TenureGrantRoutes.test.ts:6-25`. Add a decoded-JSON signer next to the existing base64 `sign()`.
- Use a **long** synthetic purchase token (40 characters or more). The existing reconcile skip line logs `token.slice(0, 8)`, and the current `"tok-1"` is shorter than 8, so that line would print it whole.
- New cases:
  - (a) `/complete` succeeds with each method → exactly one line equal to `yandex purchase signature verified (complete): construction=<label>`. This is an exact-string match, so any extra interpolation fails the test.
  - (b) `/reconcile` succeeds → the same, with `(reconcile)`.
  - (c) A bad signature → 400 `invalid_signature` and **no** "signature verified" line.
  - (d) The leak guard over **all** lines from (a) and (b): none contains the synthetic secret, the full signed string, the signature part, the base64 payload part, the decoded JSON text, the full purchase token, or the intent id.
- Mocking the logger file-wide only captures lines. Existing tests in this file do not assert on logs, so they are unaffected.

### 4. How "no secrets" is guaranteed, not just hoped for
1. The logged value has type `HmacConstruction`, a union of two literals. TypeScript refuses to assign a request-derived string to it.
2. The value is only ever taken from the two constants written into the candidate pairs. It is never computed from input.
3. Each log call has exactly one interpolation (the label). The route name is a literal.
4. Test (a)/(b) pins the whole line, and test (d) checks the output for every synthetic secret-bearing value.
- The logger has only a console transport. Nothing else sees the line: no metric and no OTEL export.

### 5. Verification (local, before closing)
- `npm test -- tests/profile-server/YandexSignature.test.ts tests/profile-server/PaymentsRoutes.test.ts tests/profile-server/PlayerSignature.test.ts`
  - PaymentsRoutes uses supertest, so it belongs to the known flaky family (CLAUDE.md). On a timeout-shaped failure: re-run once and say that I re-ran.
- Then full `npm test`, which is slow because it includes the shell harnesses, and `npm run lint`.
- `npx tsc --noEmit -p tsconfig.json`, because jest/SWC does not type-check. Compared against a baseline taken first, in case errors already exist.

### 6. Deploy and read-back
These are brief steps 3–5, and they are owner-gated. See open question 1 for who owns them.
- The owner runs or approves `build-deploy-profile.sh` in a weekend slot. Next slot: 2026-10-03/04.
- Then `/health` and `/ready` must return 200.
- After the next real purchase or reconcile: a read-only check on the box that greps the profile container's logs for `signature verified`. I run it if I have SSH access; otherwise the owner does. Record date, label, route and "observed via container log" in 0309's worklog and in 0297's worklog §1 box 2. Record the label only, never the line's other fields beyond the timestamp.
- ⚠️ `docker logs` is lost when the container is recreated. The line must be read **before the next profile deploy**, and in particular before any 0310 deploy.
- The build script works from a dirty tree: it tags the image `-dirty` and ships whatever is in `src/`. See open question 2.

## Design choices I made that the brief left open
1. **The label goes on the shared `verifyHmacEnvelope`**, not only on `verifySignedPayload`. It is one source of truth and costs login nothing. The alternative was a private wrapper that strips the field, which leaves the envelope byte-identical but adds indirection.
2. **Label names:** `base64_payload` / `decoded_json`.
3. **Logged whenever the signature passes**, even when `/complete` then refuses because the purchase count is not 1. The question is about the signature, not the grant.
4. **Level `info`**, a fixed message, and no new metric.
5. **If both methods ever matched** (impossible in practice), the label is `base64_payload`, because that candidate comes first. The accept/reject result is the same either way.
6. **The label is not logged on the login path.**

## Risks
- Real players are paying on this path. A wrong rewrite of the `.some`→`.find` would reject real purchases. Guarded by the unchanged existing reject/accept cases plus the new cases for both methods.
- The answer depends on a real purchase happening after the deploy. If none arrives for a long time, fall back to the by-hand route (brief step 5) after asking the owner.

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text.*

- **Plan:** APPROVED.
- **Open question 1 (who owns deploy → real purchase → log read):** **"Move it into 0297"** — `0309` closes on local proof (§3–§5); the §6 deploy + log-read + write-down steps move into `0297` §1 (the closing producer edits both briefs; `0297` then waits on "deploy + a real purchase" instead of on `0309`). No new task. The builder does **not** do §6.
- **Open question 2 (commit before the profile deploy):** not put to the owner as a question in this session; relayed to the owner as advice (the deploy builds from the working tree and tags `-dirty`). No builder action.
