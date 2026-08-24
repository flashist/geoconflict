# Plan — 0063 Prod `/api/env` advertises `http` on a raw IP

**Status: awaiting owner approval (ADR-031 plan gate). No source or config edited yet.**
Planned 2026-08-24 by fkit-coder (spawned by fkit-sprint-ship-loop; plan-only unit).

Raw values policy: the prod VPS IP is written `<prod-ip>` throughout — no endpoints in artifacts.
It appears verbatim in `.env.prod` (gitignored) and in the public `/api/env` response.

---

## 1. Root cause — verified, and one level deeper than the brief

Every mechanical claim in the brief checks out against the code:

- `/api/env` serves `publicProtocol` / `apiBaseUrl` / `jwtIssuer` / `jwtAudience` from config
  (`src/server/Master.ts:181-197`) — **confirmed**.
- Client caches them into a module global (`src/core/configuration/ConfigLoader.ts:29-62` →
  `RuntimeConfig.ts:12-20`) — **confirmed**.
- `ensureAbsoluteUrl` (`src/client/jwt.ts:49-57`) returns any value already matching `^https?://`
  unchanged, so `getApiBase()` (`jwt.ts:88-124`) hands back the literal `http://<prod-ip>` regardless
  of page scheme — **confirmed**.
- Consumers as listed: `tokenLogin` (`jwt.ts:181-184`), `getUserMe` (`jwt.ts:361`), `logOut`
  (`jwt.ts:213-221`), `fetchPlayerById` (`jwt.ts:392-394`), the client-side issuer comparison
  (`jwt.ts:260-269`), `TokenLoginModal` retry-then-silent-close with the user alert commented out
  (`TokenLoginModal.ts:70-76`), `Main.ts:422-428/622/641`, `AccountModal.ts` logout/login button —
  **all confirmed**.
- `Matchmaking.ts:55` builds `new WebSocket(config.jwtIssuer() + "/matchmaking/join")` — an
  `http(s)://` URL throws synchronously; `MatchmakingModal.open()` has no caller — **confirmed
  latent**.

**Where the values actually come from (the thing to change):** the local, gitignored **`.env.prod`**.
It sets, unsuffixed: `PUBLIC_HOST=<prod-ip>`, `PUBLIC_PROTOCOL=http`, `PUBLIC_PORT=80`,
`API_BASE_URL=http://<prod-ip>`, `JWT_ISSUER=http://<prod-ip>`, **and `JWT_AUDIENCE=<prod-ip>`**
(the brief asked to check audience — it is also wrong). `deploy.sh` loads `.env` → `.env.secret` →
`.env.prod` → `.env.prod.secret` (`deploy.sh:72-75`); unsuffixed values short-circuit the
`*_PROD`-suffixed lookups (`deploy.sh:87-110` pattern) and are written verbatim into the remote env
file (`deploy.sh:278-296`). Live prod `/api/env` (fetched 2026-08-24) returns exactly these values —
config generation, transport, and serving all verified end to end.

**One brief claim is stale:** "ProdConfig.ts defaults `jwtAudience()` to `openfront.io`". Commit
`6f66aff` (task 0066, licensing remediation, "JWT fallback retarget") already changed the fallback to
`"geoconflict.ru"` (`ProdConfig.ts:27`). Irrelevant at runtime anyway: the env var overrides it —
and note 0066 is **not yet deployed**, so live prod still runs the old fallback (also masked by the
env var).

## 2. The open question (JWT issuer mismatch) — answered, with a twist

The brief's step 1 asks what `iss` the token-minting service signs vs the deployed `JWT_ISSUER`.
Evidence gathered 2026-08-24:

1. **This repo contains no auth service.** No route for `/login/discord`, `/login/token`,
   `/users/@me`, `/refresh`, `/logout`, `/revoke`, `/player/:id` exists in `src/server/` or
   `src/profile-server/` (grep-verified), and no JWT *minting* code (`SignJWT`/`jose` signing)
   exists anywhere — `jose` is used only to *verify* (`src/server/jwt.ts`) and *decode*
   (`src/client/jwt.ts`). Upstream OpenFront runs these on a separate `api.openfront.io` service
   the fork does not have.
2. **Live probes confirm it.** `https://geoconflict.ru/login/discord` returns **200 text/html — the
   game SPA page** (nginx `location /` → master → SPA fallback), not an OAuth redirect.
   `https://geoconflict.ru/.well-known/jwks.json` likewise returns the **HTML page, not a JWKS**.
3. **Therefore server-side token validation can never succeed**: `jwkPublicKey()`
   (`DefaultConfig.ts:187-200`) fetches `jwtIssuer() + "/.well-known/jwks.json"`, gets HTML, Zod
   parse fails, throws → `verifyClientToken` catches → `false` — regardless of any `iss` string.
4. **And no user can hold a token**: nothing in this deployment mints one, so `getToken()` returns
   null, `isLoggedIn()` is false before any network call.

**Written answer to the open question (verification step 1):** there is no token-minting service in
the geoconflict deployment; the deployed `JWT_ISSUER` is `http://<prod-ip>` (from `.env.prod`,
confirmed live via `/api/env`); the actual `iss` of minted tokens is **vacuous — no tokens are
minted**. An issuer *mismatch* cannot occur; the real defect underneath is that the entire
Discord/JWT auth stack is a dead end in this fork. Residual uncertainty, stated plainly: I cannot
prove no external minter exists outside this repo — but even if one did, point 3 means its tokens
could never validate server-side, so the conclusion stands.

**Severity reframe (report, honestly):** the brief's headline — "breaking login and profile fetch
for returning users TODAY" — overstates. There can be no returning JWT-logged-in users: no token
source has ever existed on this origin. The mixed-content block is real but sits *behind* a login
that dead-ends earlier (the Discord button in `AccountModal.ts:281` navigates to the SPA page and
nothing happens — silently, which is the TokenLoginModal concern). The config values are still
genuinely wrong and worth fixing now: they are publicly advertised, they poison every future auth
consumer, `getAudience()` and cookie logic derive from them, and 0017/0018-era work will trip over
them. Placement is owner-ruled; this plan does not re-open it — it reports the evidence.

## 3. Fix approach — config only, no source changes

**Edit `.env.prod`** (local, gitignored; the values ship via `deploy.sh prod`):

| Key | From | To |
|---|---|---|
| `PUBLIC_HOST` | `<prod-ip>` | `geoconflict.ru` |
| `PUBLIC_PROTOCOL` | `http` | `https` |
| `PUBLIC_PORT` | `80` | `443` |
| `API_BASE_URL` | `http://<prod-ip>` | `https://geoconflict.ru` |
| `JWT_ISSUER` | `http://<prod-ip>` | `https://geoconflict.ru` |
| `JWT_AUDIENCE` | `<prod-ip>` | `geoconflict.ru` |

Also fix the fallback trap in **`.env`** (gitignored): `PUBLIC_PROTOCOL_PROD=http` →
`https`, `PUBLIC_PORT_PROD=80` → `443` (currently shadowed by `.env.prod`, but wrong if it ever
stops being shadowed).

Rationale for the choices:

- **Apex `https://geoconflict.ru` for `API_BASE_URL`/`JWT_ISSUER`, not `api.geoconflict.ru`.** The
  brief says "`https://geoconflict.ru` / `https://api.geoconflict.ru`-shaped". `api.geoconflict.ru`
  is the **profile server** — pointing dead auth calls (`/login/*`, `/refresh`, `/users/@me`) at it
  would spray 404s at a live service and imply it is the token issuer, which it is not (no minting
  code there either). Apex keeps the dead ends same-origin, mixed-content-free, and harmless.
  Flagged as a decision point below.
- **All three set explicitly** (brief step 2): `apiBaseUrl()` falls back to `jwtIssuer()`
  (`DefaultConfig.ts:141-150` — confirmed), and unset `JWT_ISSUER` would fall back through the
  audience to `https://api.geoconflict.ru` (`DefaultConfig.ts:178-185`) — the profile server again.
  Explicit values prevent both divergence and surprise fallbacks.
- **`JWT_AUDIENCE` changed in the same edit, put to the owner here rather than done silently**
  (brief step 3 says report, don't silently change): the invalidate-live-tokens risk is empty —
  per §2 no live tokens can exist. New value matches the post-0066 code fallback.
- **No client normalization** (brief step 4): honored — `getApiBase()` untouched.
- **`PUBLIC_HOST` change is regression-safe**: game WebSockets build from `window.location`
  (`Transport.ts:316-320` — verified), not `publicHost`. Remaining consumers are labels: `/api/env`
  itself, archive metadata (`Archive.ts:93`), and the OTEL resource attribute `openfront.host`
  (`OtelResource.ts:22`) — that telemetry label will change from IP to domain; noted, benign (no
  dashboards key on it per project memory).
- **`Matchmaking.ts:55` left as-is, recorded** (brief step 9's "explicitly recorded" arm): still
  latent-broken (`https://` URL still throws in the WebSocket constructor) and still unreachable.
  A code fix belongs to whoever wires the matchmaking UI up; folding it into a config task is scope
  creep. Recorded here and to be recorded in the worklog.

**Deliberately out of scope (routed, not dropped):**

- **`TokenLoginModal.ts:73` silent failure** — the commented-out user alert. Per brief step 5 this
  becomes its own brief; the lead should route it to `@fkit-producer`. Arguably now *more*
  important: it is the UX that makes the dead auth stack invisible.
- **Whether geoconflict should have a JWT auth service at all** (or drop the Discord login UI in
  favor of Yandex identity) — a product/architecture decision surfaced below, not settled here.

## 4. Test & verification plan

**Now (pre-deploy):**

1. Edit the two env files as above; diff-check character-by-character (no secrets touched —
   secret-bearing keys live in `.env.prod.secret`, untouched).
2. Config-inspection re-verification: `deploy.sh:278-296` forwards all six keys verbatim
   (already verified); `DefaultConfig` resolution paths for each key (already verified).
3. `npm test` full suite as a no-regression baseline — expected untouched (no source change);
   any failure is pre-existing and gets reported, not hidden.
4. No new unit tests: there is no code change to test. (The CLAUDE.md "all `src/core/` changes must
   be tested" rule is not triggered.)

**Weekend deploy pendings (`deploy.sh prod` — same deploy 0066 is waiting on; live checks, cannot
be done earlier because the failure is environment-specific):**

1. `curl https://geoconflict.ru/api/env` → `publicProtocol=https`, `publicHost=geoconflict.ru`,
   `publicPort=443`, `apiBaseUrl=https://geoconflict.ru`, `jwtIssuer=https://geoconflict.ru`,
   `jwtAudience=geoconflict.ru` (brief verification step 2, extended with audience).
2. Browser console on the live https site across load / login attempt / logout: **no
   mixed-content errors** (step 6).
3. `/api/public_lobbies` still returns lobbies (step 8 — it is same-origin relative,
   `Master.ts:200-202`, and must not regress).
4. Game connect + play a public lobby (WS regression check for the `PUBLIC_HOST` change —
   code-verified safe, confirm live).
5. Discord login button: expected outcome is a **clean same-origin dead end** (navigates to the SPA
   page; no mixed-content error, no OAuth). Login still does not complete — see NEEDS-DECISION 1;
   steps 3-5 and 7 of the brief's verification are unsatisfiable/vacuous as scoped (no auth service,
   no existing sessions to preserve) and are replaced by this documented-dead-end check unless the
   owner rules otherwise.
6. Telemetry spot-check: `openfront.host` attribute now reports the domain.

## 5. NEEDS-DECISION (for the lead to relay to the owner)

1. **Rescope of brief verification steps 3, 4, 5, 7.** "Login completes end to end in production"
   cannot be satisfied by any config value: no auth service exists in this deployment (§2).
   Proposed: accept the rescoped verification in §4 (config correct + no mixed content + clean
   documented dead end), and treat "should geoconflict have a JWT/Discord auth service at all, or
   remove that UI in favor of Yandex identity" as a separate product/architecture question for the
   owner. Recommendation: accept rescope; file the auth-stack question with the producer.
2. **Severity reframe on the record.** "Broken for users today" → "publicly advertised wrong config
   poisoning a dead auth stack; no current user impact because no user can hold a token". The fix
   is still worth shipping now; the owner may want the record corrected. (Placement is owner-ruled
   and not re-opened.)
3. **`JWT_ISSUER`/`API_BASE_URL` target: apex `https://geoconflict.ru` (recommended) vs
   `https://api.geoconflict.ru`** (which is the profile server — see §3 rationale). The brief's
   wording permits either shape.
4. **`JWT_AUDIENCE=geoconflict.ru` in the same edit** — brief said report-first; reported here with
   the no-live-tokens evidence. Recommendation: approve alongside.
5. **Route the TokenLoginModal silent-failure brief to the producer** (brief step 5). Recommendation:
   yes, and mention it pairs with decision 1's product question.

## 6. Sequencing after approval

1. Edit `.env.prod` + `.env` (minutes; no source, no commit — env files are gitignored anyway).
2. Run `npm test` baseline; write worklog entry (root cause, open-question answer, files changed,
   Matchmaking latent-state record).
3. Report change surface back to the driver; live verification checklist (§4) parks as deploy
   pendings on the weekend `deploy.sh prod`.
4. Producer routes: silent-failure brief; auth-stack product question (per owner's decisions).
