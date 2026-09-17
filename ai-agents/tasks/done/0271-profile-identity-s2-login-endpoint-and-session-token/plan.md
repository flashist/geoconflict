# Plan — 0271 · S2 · `POST /v1/login` + 24 h session token (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-15, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session:
  **"Approve"** — explicitly including D3 (all three scope additions: optional `yandexPlayerId` in 4 request
  schemas, the JSON error handler, payments-intent `23503` → 404), D5 (no allowlist entry), D6 (S2 builds
  first; shared `src/core/profile/Platform.ts`), and D7 (persist-or-reuse with generate-if-absent).
- Design authority: ADR-113 (accepted; token ships in v1), design report §2/§4/§9, ADR-112 (amended).
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-15):
  - **D1 — "Test player, then delete"** (option A): synthetic clearly-marked id, login ×2 + Bearer read, then a
    one-transaction delete; counts back. The driver asks the owner's OK before both writes. Outside the
    nightly backup window. No token or id recorded.
  - **D2 — "OK, it's their own ID"** (option A): the internal player id readable in the unencrypted token
    payload is accepted and documented in code (holder sees only their own id; no public route accepts a
    player id).
  - **D3 — all three scope additions approved.**
  - **D4 — "401 not logged in"**: no credentials at all → `401 session_invalid`; the ~2 existing
    "400 without yandexPlayerId" tests change.
  - **D5 — no `config-parity-allowlist.json` entry** for `PROFILE_SESSION_SECRET`.
  - **D6 — S2 first; `PlatformSchema` lives in a new `src/core/profile/Platform.ts`** that both S2 and S3
    import (supersedes §1's `PlatformSchema` in `LoginContract.ts` — `LoginContract.ts` re-exports or imports it).
  - **D7 — persist-or-reuse with generate-if-absent.**

---

## Worker summary
- Plan is ready to build. Estimate ~2.5 dev days, the top of the brief's 2–2.5 d range.
- **Found a bug in live code:** a malformed JSON body that contains a Yandex id gets part of that id printed to the container's stderr log. Reproduced on Node 24. It hits every public JSON route today, not just the new login. Unless fixed, brief check 5 ("no ids in any log line") fails. (Fixed by §6, D3.)
- **"Bearer on every public route" is not possible without a contract change.** Four request schemas still require `yandexPlayerId`, so a request with only a token gets `400` before the caller is ever looked up. S2 makes that field optional (D3).
- **Token payload is base64, not encrypted** — the client can read its own internal player id (accepted, D2).
- **No `config-parity-allowlist.json` entry** — an active (phase-1) entry would switch off the very check that catches a forwarding mistake (D5).
- **S3 overlap:** both slices edit `Routes.ts`, `Server.ts`, the route tests and the integration DB helper. S2 builds first, then S3 rebases (D6).

## 0. What the code looks like now (read at planning time)
- `Routes.ts`:
  - `resolveCaller` is private to `createApp`. It reads `yandexPlayerId` (query on GET, body otherwise), looks it up find-only, and returns `bad_request | unknown | ok`.
  - There are 4 CORS middlewares, all copies of each other. None allows `Authorization` and none sets `Max-Age`.
  - `GET /v1/profile` has no OPTIONS handler.
  - There is no error-handling middleware.
- `PlayerIdentityRepository` already has `resolveOrCreatePlayer` (race-safe, returns `{playerId, created, profile}`) and `findPlayerByIdentity`. `PLATFORM_YANDEX_GAMES` is defined there.
- `player_xp_grants` exists (migration 006) but no code reads it. The git tree is clean: 0253's tenure route and code are not present.
- `Server.ts` reads secrets itself, warns at boot, and passes config into `createApp(repo, payments?, inbox?, nameChange?)`.
- Deploy path:
  - `build-deploy-profile.sh` stages `export X=%q` lines.
  - `setup-profile.sh` uses `persist_or_reuse_secret` (writes the value **empty** when neither env nor file has one) and a separate generate-if-absent block for `PROFILE_INTERNAL_TOKEN`.
  - Then the `profile.env` heredoc, then `report_config_values`.
- Config-parity checker:
  - Rule B1: a variable the server reads must be in `profile.env`.
  - Rule B2: every `profile.env` key must be exported by build-deploy.
  - An active (phase-1) allowlist entry turns both rules off for that variable.
  - `ConfigParity.test.ts` asserts `requiredTotal` is 0 on the real repo, so this is a gate in `npm test`.
- Hardening harness: T12–T15 pull the real functions out of `setup-profile.sh` and run them, driven by a `PERSIST_SPECS` list. The structural checks grep call order and the heredoc's `KEY=${KEY:-}` lines.

## 1. Contract — new `src/core/profile/LoginContract.ts`
```ts
// PlatformSchema lives in src/core/profile/Platform.ts (D6) — imported here.
export const LoginRequestSchema = z.object({
  platform: PlatformSchema,
  platformUserId: z.string().min(1).max(128),   // design §8 Q4 default, 1–128
});
export const TenureCheckStatusSchema = z.enum(["done", "pending"]);
export const LoginResponseSchema = z.object({
  created: z.boolean(),
  profile: PublicPlayerProfileSchema,            // same projection as GET /v1/profile
  grantChecks: z.object({ tenure: TenureCheckStatusSchema }),
  session: z.object({ token: z.string().min(1), expiresAt: z.iso.datetime() }),
});
export const SESSION_ERROR_CODES = ["session_expired", "session_invalid", "session_unavailable"] as const;
// 400 bad_request · 401 session_expired|session_invalid (Bearer routes) · 503 session_unavailable · 500 internal_error
// (503 creation_paused is S5's — not declared here)
```
- New `src/core/profile/Platform.ts`: `export const PlatformSchema = z.enum(["yandex_games"]);` (D6).
- `PlayerIdentityRepository`'s local `Platform` type becomes `z.infer<typeof PlatformSchema>`. The constant stays, so there is no churn for S3.
- Doc comments carry the ADR-113 honesty line: the token adds no security today. `vfy:false` never counts as a proven owner (0250).

## 2. `POST /v1/login` (Routes.ts)
The order matters.
1. **CORS** via `publicCors("POST")`. OPTIONS gets 204 before anything else. **No limiter.**
2. **Session check first:** if the secret is missing or too short, answer `503 session_unavailable`. This runs before parsing and before any DB write, so no player is ever created without a token.
3. Parse with `LoginRequestSchema`; failure gives `400 bad_request`.
4. `repo.resolveOrCreatePlayer(platform, platformUserId, "login")`.
5. `grantChecks.tenure`:
   - `created` gives `"pending"` without a query (a brand-new player cannot have a grant yet).
   - Otherwise it is `"done"` if and only if a `player_xp_grants(player_id,'tenure')` row exists, any amount.
   - New repo method: `hasXpGrant(playerId, kind: "tenure"): Promise<boolean>` on `PlayerProfileRepository`, added to the `ProfileRepo` interface, bound in `Server.ts`, and in `tests/integration/support/db.ts` `realProfileRepo`.
6. `profile = toPublicProfile(resolved.profile, created ? undefined : await readNameChangeState(playerId))`. That is the same shape as GET: no ids, no paid fields.
7. `signSessionToken`, then `200`, with **`Cache-Control: no-store`** because the body holds a credential.
8. Errors: `log.error(\`POST /v1/login failed: ${formatError(error)}\`)` and `500 internal_error`.
   - Checked: pg error `message` does not include `detail`, so no key values reach the log.
   - The repository's give-up message has no ids.

## 3. `src/profile-server/SessionToken.ts` (new)
```ts
export const SESSION_TOKEN_VERSION = "v1";
export const SESSION_TTL_SECONDS = 86_400;
export const MIN_SESSION_SECRET_LENGTH = 32;
export interface SessionClaims { pid: string; plt: Platform; iat: number; exp: number; vfy: false }
export function isUsableSessionSecret(secret: string): boolean;
export function signSessionToken(secret, { playerId, platform }, nowMs = Date.now()): { token: string; expiresAt: string };
export type SessionVerification = { status: "ok"; claims: SessionClaims } | { status: "expired" } | { status: "invalid" };
export function verifySessionToken(secret, token, nowMs = Date.now()): SessionVerification;
export function loadSessionSecret(env: NodeJS.ProcessEnv, log: { warn(msg: string): void }): string; // "" when unusable
```
- **Format:** `v1.<b64url(JSON payload)>.<b64url(HMAC-SHA256(secret, "v1." + payloadB64))>`. `iat`/`exp` are in seconds.
- **Verify order** (each failure gives `invalid` unless noted):
  1. Secret must be usable. An empty or short key **never verifies**; HMAC with `""` is valid crypto, so this guard is load-bearing.
  2. Split into exactly 3 parts.
  3. `parts[0] === "v1"`.
  4. The MAC part matches `^[A-Za-z0-9_-]{43}$` **and** re-encodes to the same string. Without the canonical check, flipping the last character can leave the decoded bytes the same, so a "tampered" token would still verify and the tamper test would pass or fail at random.
  5. `timingSafeEqual`, with a length check first (the `InternalAuth.ts` pattern).
  6. Only after the MAC passes: `JSON.parse` in try, then a strict zod schema (`pid` uuid, `plt` enum, `iat`/`exp` ints, `vfy: z.literal(false)`).
  7. `exp - iat > TTL` gives invalid.
  8. `exp * 1000 <= nowMs` gives **`expired`**.
- Expiry is checked only after the MAC, so a forged token with an old `exp` is `invalid`, never `expired`.
- `sign` throws if the secret is unusable. The route has already answered 503 by then, so this is a second guard.
- `loadSessionSecret` warns with one of two lines and never the value or its length:
  - `PROFILE_SESSION_SECRET is not set — POST /v1/login and Bearer sessions disabled (503)`
  - `PROFILE_SESSION_SECRET is too short (minimum 32 characters) — treated as unset (503)`
- **Payload readability (D2):** the payload is base64, not encrypted; the holder can read their own `pid`. Documented in code as accepted: only the holder's own id, and no public route accepts a player id.
- **Key rotation:** one key, no key id and no "previous key" overlap in S2.
  - How to rotate: set a new value in `.env.profile.secret` and deploy (the value is written through), or `rm` the persist file and deploy (a new one is generated).
  - Effect: every live token gets `401 session_invalid`, and S4's client logs in again once. Nothing is stored, so nothing is lost.
  - Before S4 ships, no client holds a token, so rotating costs nothing.
  - A leaked key today gives nothing beyond asserting an id (`vfy:false`). Once 0267 issues `vfy:true`, revisit a key id or dual key; a `v2` prefix is the upgrade path.
- **No refresh endpoint and no revocation** (design §2).

## 4. One caller-resolving function (Routes.ts `resolveCaller`)
```ts
type CallerResolution =
  | { status: "ok"; playerId: string; via: "token" | "legacy" }   // `via` = S5's legacy_fallback_used hook, no metrics now
  | { status: "unknown" } | { status: "bad_request" }
  | { status: "unauthorized"; error: "session_expired" | "session_invalid" }
  | { status: "session_unavailable" };
```
1. **`Authorization` header present:**
   - Secret unusable: `session_unavailable` (503).
   - Not `Bearer <x>`: `session_invalid`.
   - Otherwise verify: `ok{via:"token"}` with **no DB read**, `session_expired`, or `session_invalid`.
   - **Never falls back to the legacy id**, even if one is also sent. Otherwise a stale token would pass quietly and S4's re-login on 401 would never fire.
2. **No header, legacy fallback.** Marked `// LEGACY FALLBACK — removed as 0273 (S4)'s last step`.
   - `yandexPlayerId` key absent: `unauthorized session_invalid` (401) (D4).
   - Present but malformed: `400` (unchanged).
   - Otherwise **find-only** `findPlayerByIdentity`: `ok{via:"legacy"}` or `unknown`. Never creates.
- One helper `sendCallerFailure(res, caller)` maps `unauthorized` to 401 `{error}` and `session_unavailable` to 503. Each route keeps its own answer for `unknown`/`bad_request`: 404 profile, 403 inbox and name-change, 404 payments intent.
- **Request schemas (D3 i):** `yandexPlayerId` becomes `.optional()` in `PurchaseIntentRequestSchema`, `MarkReadRequestSchema`, `NameChangeRequestSchema` and `NameChangeCancelRequestSchema`. Without this, a Bearer-only POST gets 400 before `resolveCaller` runs. Client typings are unaffected because the field was only sent, never read.
- **Payments intent (D3 iii):** `createIntent` failing with pg `23503` (the token's player no longer exists, e.g. after a DB restore) gives `404 not_found` instead of `500`.

## 5. CORS
- The 4 copied middlewares become one `publicCors(methods)`:
  - `Access-Control-Allow-Origin: *`
  - `Allow-Methods`
  - `Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Max-Age: 7200` (Chromium's maximum)
  - OPTIONS returns 204 before the limiter or any repo call.
- Applied to `/v1/login` (POST), `GET /v1/profile` (new exact-path `app.options("/v1/profile", …)` before the GET, so the preflight never reaches `profileReadLimiter`), `/v1/messages` (GET, PATCH), both name-change paths (POST) and `/v1/payments` (POST).
- 401 and 503 answers from `resolveCaller` carry `Access-Control-Allow-Origin`, so S4's browser client can read the status and log in again.
- `/internal/*` never gets CORS (existing assertions stay).

## 6. Error handler (the log leak — D3 ii)
- Last `app.use((err, req, res, next) => …)`:
  - `err.type === "entity.parse.failed"` gives `400 bad_request`.
  - `entity.too.large` gives `413 payload_too_large`.
  - Anything else gives `500 internal_error`, logged as `unhandled error on ${req.method} ${req.path}: ${err.name}`. No message, no query string.
  - Sets ACAO on non-`/internal` paths.
- **Why this is needed:** Express's default handler runs `console.error(err.stack)`. On Node 24, `JSON.parse` error messages include part of the input body (reproduced: `Unexpected token 'a', ..."mUserId": abc123456}"`). The default handler also returns the stack as HTML, because the profile image does not set `NODE_ENV`.

## 7. Secret wiring and deploy
- **`Server.ts`:** `const sessionSecret = loadSessionSecret(process.env, log)`, passed as a new 5th argument `createApp(repo, payments, inbox, nameChange, { secret: sessionSecret })`. The read is a literal `process.env.PROFILE_SESSION_SECRET` so the parity checker sees it. When the argument is left out (existing tests), login returns 503 and legacy routes work.
- **`setup-profile.sh`:**
  - `persist_or_reuse_secret` gets an optional 3rd argument, `generate`. When neither env nor a non-empty file has a value, it runs `openssl rand -hex 32`, writes it 0600, and prints `Generated and persisted $name to $file`.
  - The four existing optional variables are called unchanged, so they keep "written EMPTY / feature off".
  - New call: `persist_or_reuse_secret PROFILE_SESSION_SECRET "$PROFILE_DIR/.session_secret" generate`, after the token block and before the heredoc.
  - Heredoc line `PROFILE_SESSION_SECRET=${PROFILE_SESSION_SECRET:-}`.
  - `report_config_values` row: OK if at least 32 characters. FINDING if empty ("login + Bearer sessions 503 — should be impossible after generate") or too short. No value, no length.
  - Header comment documents the variable.
  - **Persist-or-reuse (D7):** a redeploy reuses the key, so tokens survive deploys, and rotating is deliberate.
- **`build-deploy-profile.sh`:** `printf "export PROFILE_SESSION_SECRET=%q\n" "${PROFILE_SESSION_SECRET:-}"`, with a comment: blank = the box reuses or generates.
- **`example.env.profile`:** a secrets-block entry. It says the variable is optional, that the box generates it once and persists it in `.session_secret`, that setting it rotates the key and logs everyone out (silent re-login), and that it is not shared with the game server.
- **`config-parity-allowlist.json`: no entry** (D5). Forwarding at both hops satisfies B1 and B2.
- **Hardening harness:**
  - Add `PROFILE_SESSION_SECRET:.session_secret` to `PERSIST_SPECS`. T12, T13 and the structural loops then cover it. The call-order regex is not end-anchored, so the `generate` argument still matches.
  - New **T16 (generate mode):**
    - Neither supplied nor persisted: 0600 file created, 64 hex characters, variable set, exact "Generated and persisted" line, no value or length in the output.
    - The next blank call reuses the key.
    - An empty file also triggers generate.
    - An unreadable file aborts the deploy.
  - Structural: the 4 optional variables are **never** called with `generate`.
  - New **T10-style case:** `PROFILE_SESSION_SECRET` is staged exactly once, survives sourcing, never appears in any command line.
  - T15: `clean_config` sets it, and new bad cases (empty, too short) must produce a FINDING.

## 8. Tests — each written and seen failing before the code
**A. `tests/profile-server/SessionToken.test.ts` (unit)**
- Sign then verify round trip. `vfy === false`, `exp - iat === 86400`, `expiresAt === new Date(exp*1000).toISOString()`.
- Each of these gives `invalid`:
  - tampered payload (re-encoded with a different uuid)
  - a deterministic middle-character MAC flip
  - a non-canonical MAC encoding
  - wrong key
  - prefixes `v2.`, `V1.`, none
  - `""`, `a.b`, `a.b.c.d`
  - validly signed non-JSON
  - validly signed `vfy:true`
  - validly signed non-uuid `pid`
  - validly signed `exp - iat > TTL`
  - forged MAC with a past `exp` (must be `invalid`, not `expired`)
- Expiry boundary: `now === exp` gives expired; `exp - 1 s` gives ok.
- **Empty or short secret never verifies** a token signed with that same key; `sign` throws.
- `loadSessionSecret`: unset or short input triggers a warn that names the variable and does not contain the canary value; a usable secret triggers no warn.

**B. `tests/profile-server/LoginRoutes.test.ts` (supertest, mocks)**
- 200: the body passes `LoginResponseSchema.parse`; `created` is passed through; `profile` has no paid fields and matches no uuid; `Cache-Control: no-store`; the token verifies to `PLAYER_ID`.
- Tenure: created gives `pending` and `hasXpGrant` is not called; existing with a grant gives `done`; existing without gives `pending`.
- 400: missing or unknown platform (`"web"`), `""`, 129 characters, non-string, malformed JSON (JSON 400, not HTML or 500).
- 503 `session_unavailable` with no or short secret, and `resolveOrCreatePlayer` **not called**.
- 500 when the repo throws.
- **No limiter:** 100 sequential logins, all 200.
- OPTIONS `/v1/login` gives 204 with `Authorization` in Allow-Headers and `Max-Age`, and no repo call.

**C. `resolveCaller` table test across all 6 public routes** (profile GET, messages GET, messages/read PATCH, name-change request and cancel, payments intent)
- Bearer only: ok, uses `PLAYER_ID`, `findPlayerByIdentity` not called.
- Tampered, wrong key, wrong version, or `Basic …`: 401 `session_invalid`. Expired: 401 `session_expired`.
- Invalid Bearer plus a valid legacy id: still 401.
- Bearer with no secret: 503.
- Legacy known or unknown: existing answers unchanged; `resolveOrCreatePlayer` never called.
- Neither: 401 `session_invalid` (D4). Malformed legacy id: 400.
- 401s carry ACAO.
- Payments intent `23503`: 404.
- Existing `InboxRoutes`/`Routes` tests that assert "400 without yandexPlayerId" change to 401 (D4).

**D. CORS preflight on every public route:** 204 with `Authorization` and `Max-Age`. 70 OPTIONS on `/v1/profile` produce no 429. `/internal/*` gets no ACAO.

**E. No ids in logs.**
- Setup: a capture transport added to `logger` (children share transports) plus a spy on `console.error`.
- Drive: login success, login with the repo throwing, malformed JSON containing the synthetic id, a tampered Bearer, legacy calls.
- Assert the captured output contains none of: the synthetic `platformUserId`, `PLAYER_ID`, the token, the secret.

**F. Integration (`tests/integration/Login.it.test.ts`, real Postgres)**
- Two parallel logins for one new id: exactly 1 player, 0 orphans (`countOrphanPlayers`), exactly one reply with `created:true`, both tokens name the same `pid`.
- Login, then Bearer `GET /v1/profile`: 200.
- Legacy GET for an unknown id leaves the players count unchanged.
- SQL-insert a 0-XP tenure row, then login: `done`.

**Mutations to run and record in the worklog; each must turn a test red:**
- remove the empty-secret guard in verify
- drop the canonical-MAC check
- check expiry before the MAC
- let an invalid Bearer fall back to the legacy id
- have the legacy fallback call `resolveOrCreatePlayer`
- attach `profileReadLimiter` to login
- remove `Authorization` from Allow-Headers
- log `platformUserId` on the login path
- remove the error handler
- remove the `profile.env` heredoc line (the ConfigParity real-repo test goes red, rule B1)
- remove the build-deploy export (rule B2 and the harness T10-style case)
- call `generate` on `YANDEX_PAYMENTS_SECRET` (harness structural check)

**Gates:**
- `npm test`, including the shell harnesses (~22–25 s)
- `npm run test:integration`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run check:config-parity` (profile REQUIRED 0)
- A supertest `Exceeded timeout of 5000 ms` failure follows CLAUDE.md: re-run, and say that I re-ran.

## 9. Overlap with S3 (0272) — build order
- **Shared files:**
  - `src/profile-server/Routes.ts`: imports, the `ProfileRepo` interface (S2 adds `hasXpGrant`; S3 changes the upsert and credit routes), the `createApp` signature.
  - `Server.ts`: the repo binding.
  - `tests/profile-server/Routes.test.ts`: `mockRepo`.
  - `tests/integration/support/db.ts`: `realProfileRepo`.
  - `tests/integration/Routes.it.test.ts`: S3 rewrites the upsert-based fixtures.
- **`PlatformSchema`:** one home, `src/core/profile/Platform.ts`, created by S2 (D6).
- **S2 builds first, then S3 rebases.** Do not build both in the same working tree at the same time.

## 10. Box check after the owner deploys
**Read-only (an agent runs these):**
- `schema_migrations` still ends at 006.
- Row counts for `players` and `player_identities`.
- A single `node -e` exit-code test inside the container that the secret is set and at least 32 characters; no value is printed.
- `stat` shows 0600 on `.session_secret`.
- Boot logs contain no `PROFILE_SESSION_SECRET` warn.
- Deploy output shows "Generated and persisted" on the first deploy.
- `curl -X OPTIONS` on `/v1/login` and `/v1/profile`: 204 with Allow-Headers and Max-Age.
- `POST /v1/login` with a bad body: 400, no write.
- Bearer `GET /v1/profile` with a garbage token: 401 `session_invalid`.

**Write steps (D1 option A — driver asks the owner's OK before both writes):**
1. Login with a synthetic id `zz-0271-verify-<UTC date>-<8 random hex>`: 200, `created:true`, token received.
2. Bearer `GET /v1/profile`: 200.
3. Login again: `created:false`.
4. One-transaction cleanup: `DELETE FROM players WHERE id = (SELECT player_id FROM player_identities WHERE platform='yandex_games' AND platform_user_id=$1) RETURNING 1` (the cascade removes the identity). Counts return to their earlier values.
5. `docker logs` grep for the synthetic id: 0 hits. This is live proof of check 5.
- Run it outside the nightly backup window, so no dump captures the row.
- Record no token or id in the worklog; write "token received" only.

## 11. What S2 must NOT do
- **S3:** `/internal/v1/players/resolve`, crediting by `playerId`, removing the upsert, anything in the game server.
- **S4:** `ProfileSession`, removing `yandexPlayerId` from client calls, analytics events, **removing the legacy fallback**.
- **S5:** OTEL metrics, `PROFILE_LOGIN_CREATE_ENABLED` / `503 creation_paused`, alerts, the cleanup runbook, `profile-checks.sh`.
- **Not in this slice either:**
  - per-IP limiter on login
  - Yandex signature verification or `vfy:true` (0267)
  - tenure claim route (0253)
  - account linking, refresh, revocation, key id or dual key
- **Never:** wiki writes, task moves, commits.

## 12. Risks
- **The token proves nothing** (by design, ADR-113). The risk is a later consumer treating a `ok{via:"token"}` result as a proven owner. Mitigations: `vfy: z.literal(false)` plus doc comments, and 0250 must check.
- **An invalid Bearer never falls back.** If S4 ships a bug that sends a garbage header, that client loses profile calls until it logs in again. This is intended; the 401 is what triggers S4's retry.
- **Token routes skip the DB check.** A token for a deleted player (after a DB restore without rotating the key) gives 404/403, and 404 on intent via the `23503` mapping. No erasure path exists today.
- **No limiter on login** leaves junk profiles possible until S5. Owner-accepted.
- **The hardening harness does grep-level checks** over `setup-profile.sh`, so reshaping existing lines can turn `npm test` red. Keep the column-0 anchors.
- **Host nginx access logs** still record legacy `?yandexPlayerId=` query strings until S4. Existing behavior, not S2's to fix.

## 13. Effort
~2.5 d:
- token module + tests 0.5
- login + `resolveCaller` + CORS + schemas + error handler 1.0
- deploy wiring + harness 0.5
- integration + mutations + gates 0.5

The box check is extra, and it runs after the owner deploys.
