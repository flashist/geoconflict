# 0340 — S3a enforce: mint verified (`vfy:true`) sessions at login — implementation plan

Plan only. Nothing was written: no source, no files, no plan.md. Grounded on `dev` at `6eef01f`, with 0391's 24 h window in the tree.

## Summary
- **Small server change; one real code path.** In the login route, a signature that verifies now mints `vfy:true` (a "verified" mark inside the session token). `resolveCaller` (the one function every route uses to learn who is asking) now reports `verified`. Everything else is comments and tests. About 0.5 day (an estimate).
- **No response changes, and no route reads `verified` yet.** New tests prove both: login's body stays identical, and every Bearer route answers a verified token exactly as it answers an unverified one.
- **Fail-open is unchanged.** Every non-`ok` outcome, and a classifier that throws, mints `vfy:false`. Login never refuses because of the signature.
- **One re-grounding of step 13 (carried for approval, not a question).** Step 13 says "resolve by the signed id". Since ADR-121, `classifyLoginSignature` deliberately keeps the signed id inside the function. `verified === true` only when the signed id equals the asserted id. So resolving by the asserted id, as today, is the same value. No new plumbing.
- **Deploy:** profile server only, at the 10/11 Oct slot at the earliest. Three things must be true first: 0391 is live (Tue 6 Oct), the owner has looked at the post-0391 data (ADR-122), and the owner has separately approved enforcing. Deploy it alone, not with 0250 S3b. ⛔ Never roll back to a pre-S2 image.
- **Two open questions** are at the end: whether to close at build or after deploy, and how to prove `vfy:true` is live in production.

## 0. Grounding (checked in the tree, `6eef01f`)
- `SessionToken.ts:62`: `vfy: z.boolean()`, widened in S2. `signSessionToken(secret, { playerId, platform, verified? })` already mints `vfy: subject.verified === true` (`:79-97`). **No code change needed here.**
- `LoginVerification.ts:29-55`: `classifyLoginSignature` returns `{ outcome, verified, staleAgeBracket? }`, with `verified: true` only on `ok`. The order since ADR-121 is: id check first (`:44`, otherwise `id_mismatch`), then age (`:47`, otherwise `stale`). The signed id never leaves the function (header `:12-13`).
- `PlayerSignature.ts:45-47`: the window is 86,400 s old and 300 s ahead. Exactly at either limit still counts as fresh.
- `Routes.ts`:
  - `CallerResolution`: `:315`, with its ⚠️ doc at `:301-314`.
  - `resolveCaller` doc: `:456-475`. Its `ok` branch: `:510-511`.
  - The profile-read `TODO(0267)`: `:597-601`.
  - The login comment block: `:663-692`.
  - The S2 classify try/catch: `:723-745`.
  - The resolve: `:746-755`.
  - `signSessionToken`: `:779-782`.
  - Comments that say "the token is `vfy:false`": the payments intent (`:917-921`) and the tenure-grant claim (`:1541-1543`).
- `Server.ts:194` already passes `playerSignatureSecret: yandexPaymentsSecret`. No new env var, and config parity is unchanged.
- `PlatformSchema` is `z.enum(["yandex_games"])`, a single platform.
- Client: on a relogin, `takeYandexPlayerSignature` makes a fresh signed call (`FlashistFacade.ts:1879-1916`). So a client that hits a 401 (an expired token, or a rotated session key) re-verifies on its own. **The client code is unchanged.**
- Existing tests that S3a affects:
  - `tests/profile-server/LoginVerificationRoutes.test.ts:219,239,345` assert `vfy:false` for every outcome, including `ok`. That row flips.
  - `SessionToken.test.ts:210+` already covers a `verified:true` mint and the old-schema copy. No change.

## 1. Code changes

### Step 13 — the login mints `vfy:true` (`src/profile-server/Routes.ts`)
- In the S2 try/catch (`:723-738`), add `let verified = false;`, declared before the `try`. Inside it: `verified = verification.verified === true;`. The `catch` leaves it `false`, so a throw is still `bad_signature` and an unverified session.
- The resolve (`:746-755`) is **unchanged**. It still uses `parsed.data.platformUserId`. A one-line comment says why: when `verified`, this equals the signed id by construction (`LoginVerification.ts:44`). This is the re-grounding above.
- The creation-switch path (`resolveExistingPlayer`) is unchanged. With the switch off and a valid signature:
  - an existing player gets a `vfy:true` session;
  - a new id still gets 503 `creation_paused` and nothing is written.
- `signSessionToken(sessionSecret, { playerId: resolved.playerId, platform: parsed.data.platform, verified })`.
- Status, body shape and `Cache-Control: no-store` are unchanged. Only the claims inside the token differ: the token is base64, not encrypted, so its holder can see their own `vfy` value. Nothing new leaks.
- Rewrite the login comment block (`:663-692`):
  - 🔓 "Adds NO security today" becomes: true for `vfy:false` sessions only.
  - The "SHADOW MODE … token (`vfy:false`) exactly as without it" paragraph becomes S3a: `ok` ⇒ `vfy:true`; every other outcome, or a throw ⇒ `vfy:false`, never a refused login.
  - Keep the ⛔ never-log / never-persist rule word for word.
  - Add one line: `verified` is Yandex-only. A second platform must not reuse this check (ADR-116 re-raise: a second login method).

### Step 14 — `resolveCaller` reports `verified` (`Routes.ts`)
- New pure, exported function:
  ```ts
  export type SessionCaller = { status: "ok"; playerId: string; verified: boolean };
  export function callerFromSession(claims: SessionClaims): SessionCaller {
    return { status: "ok", playerId: claims.pid, verified: claims.vfy === true };
  }
  ```
  - `type CallerResolution = SessionCaller | CallerFailure;`
  - `resolveCaller`'s `ok` branch (`:510-511`) returns `callerFromSession(verification.claims)`.
  - Import `type SessionClaims` from `./SessionToken`.
- Update the ⚠️ doc at `:301-314`. `ok` alone is NOT the proven owner; `verified: true` is. **No route reads `verified` yet:**
  - `0250` S3b adds the owner view;
  - `0319` gates name change;
  - until then every route serves the equalized (unverified) view to every caller.
- Update the `resolveCaller` doc at `:456-460`. "Any future signature check (0267) drops in HERE" becomes: the check happens once, at login (ADR-116), and `resolveCaller` carries its result from the token's `vfy` claim, with no database read.
- No call site changes. Every route uses `caller.playerId` only, so the new field is ignored. TypeScript compiles it unchanged.

### Step 15 — comments only
These are the sites plan step 15 names:
- `src/profile-server/PublicProjection.ts:3-4`, `:43-46` and the `TODO(payments)` at `:51-52`. New wording: "a token may be `vfy:true` since 0340, but no route branches on it yet; this is the view every caller gets until S3b".
- `src/profile-server/SessionToken.ts:6-15`: the 🔓 paragraph, now true only for `vfy:false`, and "S2 itself still mints only `false`" becomes S3a mints `true` on `ok`. Keep the ⛔ rollback line. `:24-26`: rotation now drops verified sessions too, and the client's relogin re-verifies with a fresh signed call.
- `src/core/profile/LoginContract.ts:10-19`: "still mints only `vfy:false`" becomes "mints `vfy:true` for a verified signature since 0340".
- `src/client/ProfileSession.ts:5-11`: "The server only COUNTS what it proves for now" becomes "a verified signature now yields a `vfy:true` session". **A comment only, in a client file:** no behaviour change and no game deploy needed. It rides the next game build harmlessly.
- Also `LoginVerification.ts:3-5`, whose header says "S3a will mint", changes to present tense.

**Carried for approval — an extended comment sweep, comments only.** The brief says to update *every* comment that still says "no verification yet". These sites say "the token is `vfy:false`", which becomes false once 0340 deploys. Each one gets "the route does not read `verified` yet (0250 S3b / 0319), so it is still the same trust level":
- `src/core/profile/PlayerProfile.ts:55-57`
- `src/core/profile/InboxContract.ts:16-20`
- `src/core/profile/NameChangeContract.ts:13-16` and `:144-146`
- `src/core/profile/PaymentsContract.ts:9-11`
- `Routes.ts:597-601` (`TODO(0267)`), `:917-921` and `:1541-1543`

`Telemetry.ts:107` ("S3a mints `vfy:true` for exactly these") is already correct, so it is left alone.

## 2. Tests (synthetic keys, ids and names only; nothing real)

1. **`tests/profile-server/LoginVerificationRoutes.test.ts`** (rename the describe and header to "S2 + S3a"):
   - In the outcome table (`:177-250`), `vfy` must equal `expectedOutcome === "ok"`. Today it is `false` for every row. Body shape stays identical to a no-signature baseline (`stableShape`), `no-store` is unchanged, and the resolve is still by the asserted id. Covers checks 1 and 6.
   - **Forgery, made meaningful:** a repo mock whose `resolveOrCreatePlayer` maps each platform id to a **different** internal player id. A valid signature for A plus asserted B gives `vfy:false`, `pid` is B's, never A's, and the resolve was never called with A's id. The same holds for a 3-day-old A signature with asserted B (`id_mismatch`, ADR-121). Check 2.
   - Tampered signature, `bad_payload` (HMAC fine, no `data.uniqueID`), stale for the right player (30 h old, and 10 min ahead): each gives 200 and `vfy:false`. Use offsets well away from the 86,400 s / 300 s edges so the clock gap between test and server cannot move them. The exact edges are already unit-tested in `PlayerSignature.test.ts`. Check 2, re-grounded on 24 h and id-first.
   - No secret (option absent, and `""`), a bad signature, and no signature each give 200 with `vfy:false`. Then a Bearer `GET /v1/profile` with that token gives 200, which is "the citizenship card still loads". Check 3.
   - The classifier forced to throw (the existing `:273` test) also asserts `vfy:false`. The stale-metric-throws test (`:312`) keeps `vfy:false`.
   - Creation switch off plus a valid signature:
     - an existing player gives 200 with `vfy:true`, `resolveExistingPlayer` called and `resolveOrCreatePlayer` not;
     - a new id gives 503 `creation_paused`, no token, nothing written.
     - Check 4.
   - The no-leak test (`:388`) is unchanged. It already sends a valid matching signature, which now runs the `vfy:true` path, so it covers S3a. Add one assertion: the minted token's payload contains no signature part. Check 7.
2. **`callerFromSession` unit test**, a small new file `tests/profile-server/CallerFromSession.test.ts` with no supertest:
   - `vfy:true` gives `verified:true`;
   - `vfy:false` gives `verified:false`;
   - `playerId === pid`.
   - Check 5.
3. **No route reads `verified` yet:**
   - `tests/profile-server/SessionRoutes.test.ts`: `tokenFor` gains an optional `verified`. Add one `describe.each(ROUTES)` case: a `vfy:true` token gives the same status, the same body and the same repository call as a `vfy:false` one. That covers 7 routes: profile, messages, messages/read, name-change request, cancel and dismiss, and payments intent.
   - Add one equivalent case in `TenureGrantRoutes.test.ts`, since the tenure-grant route is not in `ROUTES`.
   - Optionally `tests/profile-server/support/sessionToken.ts` `bearerFor` gains `verified?: boolean`.
4. **Integration, optional, check 8, recommended (carried):** one `tests/integration/Login.it.test.ts` case.
   - An app built with a synthetic `playerSignatureSecret` and an inline `signFor` copy, the same pattern as the two unit suites.
   - Steps: login with a valid matching signature, then the token's `vfy === true`, then a Bearer `GET /v1/profile` gives 200.
   - It runs only with `npm run test:integration` against local Postgres (`gc-0012-it-pg`, port 5433). If Docker is down, I report it as **not run** and do not fake it.
5. **Gate:** in order:
   - `npm test -- tests/profile-server tests/core/LoginContract.test.ts`
   - `npx tsc --noEmit`, because jest/SWC does not typecheck
   - `npm run lint`
   - full `npm test`, which includes the shell harnesses

   If a supertest flake (`Exceeded timeout of 5000 ms`, `did not exit`) or 0197's SIGSEGV shows up, I tell them apart per CLAUDE.md, re-run, and say I re-ran. Check 11.
   - The `src/core/` changes are comments only. `LoginContract.test.ts` still runs as their gate.
6. **Secrets scan before review:** check the diff and the new fixtures for real ids, keys, signatures, tokens, hosts and IPs. Check 12.

## 3. Edge cases and failure modes
- **The classifier throws.** `verified` stays at its initial `false`. The metric counts `bad_signature`. Tested.
- **`id_mismatch` / forgery.** A genuine signature for A sent with B's id gives `vfy:false`, and the token is for B's player (B was asserted, as today). A's player is never touched. Tested with distinct ids.
- **`stale` is always the right player** (ADR-121 Decision 2). It still gives `vfy:false`. The cost appears only once a consumer reads `verified` (ADR-122 *Consequences*).
- **Live sessions after deploy.** Existing `vfy:false` tokens stay valid, so nobody is forced to log in again. A player becomes verified at their next login, which is the next page load or a 401 relogin. In the first ~24 h the verified share grows gradually. That is expected, not a fault.
- **Session-key rotation (`PROFILE_SESSION_SECRET`).**
  - Every live token turns invalid, verified ones included.
  - The client logs in again once, and its relogin makes a **fresh** signed call (`FlashistFacade.ts:1882`), so it re-verifies.
  - If that fresh call fails, the player stays unverified until the next page load.
  - Today nothing reads `verified`, so the cost is zero. No code change. This goes into the ADR-113 note (ADR-116 residual 1). A key id or dual key stays a later revisit.
- **`YANDEX_PAYMENTS_SECRET` missing or rotated on the box.** Every login gives `no_secret` or `bad_signature`, so everyone is unverified (fail-open). No login breaks. The `ok` share in the S2 metric shows it.
- **Replay.** A captured signature (24 h) plus its token (24 h) works for up to ~48 h. Already accepted as ADR-121 R1. No change.
- **A paused-creation 503 or a DB 500 after a successful verification** mints no token. The metric still counts `ok`, so `ok` ≥ verified tokens actually minted. Note this when reading the numbers.
- **⛔ One-way rollback.**
  - S3a → S2 (any image built after the 2026-09-29 S2 deploy) is safe: S2 parses `vfy:true`.
  - **Never roll S3a back to a pre-S2 build.** Every verified token would turn invalid and every client would log in again once.
  - The preferred rollback target is **the 0391 image** recorded at its Tue 6 Oct deploy. It keeps the 24 h window. An older S2 image is token-safe, but it brings back the 900 s window and its ~32 % stale share.
- **Noticed, not touched (out of scope).** `metrics.loginVerification(...)` (`Routes.ts:739`) sits outside a try/catch, and that predates this task. OTEL counters do not throw in practice. I'm only flagging it, not changing it.

## 4. Deploy notes (profile server only)
- **Gate (ADR-122, brief 2026-10-05 later note).** Before deploy:
  1. 0391 is live in production (Tue 6 Oct);
  2. the owner has looked at whatever post-0391 login data exists. `0392` reads it: stale share, `ok`, `id_mismatch`, `bad_payload`. Counters restarted at the 0391 deploy, so never compare across it. It is weekday-only data. The owner decides by eye; there is no fixed bar;
  3. **a separate, explicit owner approval to enforce.** Looking at the numbers is not that approval.
- **If 0391 has not deployed by the slot:** do not deploy 0340. A 0340 build would carry 0391 too, and no post-0391 data would exist to look at.
- **Slot:** 10/11 Oct weekend at the earliest, via `npm run deploy:profile`.
  - **Alone.** Not with 0250 S3b (architect advice; also, S3b is not built).
  - Not between 02:00 and 03:15 UTC (the backup window).
  - The deploy recreates both containers, overwrites that day's backup object and restarts the counters.
- **Delta check before deploy:** `git log <0391-deployed-commit>..HEAD -- src/profile-server src/core/profile migrations`. List everything else that would ride along. Stop if anything unexpected is in it.
- **Watch after deploy (read-only):**
  - the login metric's `ok` share is about the same as before. S3a does not change classification;
  - login `error` and `bad_request` are flat;
  - `sessionRejected` `invalid` shows no spike;
  - `/health` shows the new version tag.
- **Worklog deploy entry** (the task folder's `worklog.md`): date, UTC time, order, image digest, rollback target (the 0391 image), and the ⛔ never-pre-S2 rule written out. Check 9.
- **After deploy, the ADR-113 note.** The trigger fires when the server actually mints `vfy:true` in production. The coder does not edit ADRs. The lead or producer spawns `fkit-architect`, who:
  - appends ADR-116 § *Amendments* → ADR-113 (point 5, point 9, the re-raise list, the key-rotation note), dated, attributed and append-only;
  - marks that ADR-116 subsection applied.

  The brief makes this a close condition unless the owner rules otherwise (see Q1). Check 10.
- **Update the runbook's rollback targets** (`weekend-deploy-slot-runbook.md`, "keep an S2-or-later image as 0340's rollback target") at deploy time. This is producer or lead territory.

## 5. Out of scope
- Any route reading `verified`: `0250` S3b (the owner view), `0319` (name-change gate), `0332` (join token), `0323`.
- Any client code change (comments only), any response change, any new metric or analytics event.
- The freshness window: already ruled and built in 0391 (ADR-121).
- `0394` (re-login on a Yandex account switch): backlog, not a gate.
- The game-server seam (`getCreditableYandexId`, ADR-103): stays asserted until 0332.
- Key id / dual key for session rotation.
- Wrapping the pre-existing `loginVerification` metric call in a try/catch (§3, noticed only).
- Committing: nothing is committed without the owner's explicit ask.

## 6. Carried for approval with this plan (not separate questions)
- Step 13 re-grounding: resolve by the asserted id, which equals the signed id by construction. No signed-id plumbing, which keeps ADR-121's "signed id never leaves the classifier".
- The extended comment sweep (§1 Step 15, second list). Comments only, including 4 files under `src/core/profile/`.
- The new "no route reads `verified`" parity tests in `SessionRoutes` and `TenureGrantRoutes`.
- The optional real-Postgres integration case, included. If local Postgres or Docker is not up, it is reported as not run.

## Sequencing
1. Steps 13 and 14 code, plus the `callerFromSession` test.
2. LoginVerificationRoutes S3a rows, the forgery-with-distinct-ids test and the creation-switch tests.
3. The parity tests.
4. The comment sweep.
5. The integration case.
6. tsc, lint, then the full `npm test`, then a secrets scan of the diff.
7. Stateful review (`fkit-reviewer`).
8. The deploy and the ADR-113 note follow the §4 gate. They are not part of the build.

---

## Owner rulings at the plan gate (2026-10-05, live via `AskUserQuestion` in the `fkit lead` session; recorded by the driver, `fkit-sprint-ship-loop`)

Everything above this line is the approved plan text, copied unchanged. The owner's answers:

- **Plan:** "Approve (Recommended)" — including every item in §6 *Carried for approval* (step-13 re-grounding, the extended comment sweep, the parity tests, the optional integration case).
- **Q1 — when is 0340 done:** "Split it (Recommended)". ⇒ `0340` closes once built and reviewed (agent-closed). A separate "verify 0340 live" task covers the deploy, the live check and routing the ADR-113 note to `fkit-architect`. The brief's "close only after deploy + ADR-113 note" condition is superseded by this ruling. §4's deploy steps and the ADR-113 note move to that verify task; they are not part of this build.
- **Q2 — live proof:** "I'll check once (Rec)" — at the deploy slot the owner decodes their own login token's payload in DevTools and reports only `vfy: true/false`; the token itself is never pasted anywhere. Belongs to the verify task.
