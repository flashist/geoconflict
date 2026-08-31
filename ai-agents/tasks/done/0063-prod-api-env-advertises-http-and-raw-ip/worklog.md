# Worklog — 0063 Prod `/api/env` advertises `http` on a raw IP

Coder: fkit-coder (Build worker spawned by fkit-sprint-ship-loop under the declared-approval marker).
Plan: [plan.md](plan.md) — owner-approved 2026-08-24 via AskUserQuestion relay in the lead session.

Raw-values policy: the prod VPS IP is written `<prod-ip>` — no endpoints in artifacts. Only the six
public-facing URL keys were touched; nothing else from `.env*` is quoted anywhere.

## Owner rulings (2026-08-24, relayed by the lead)

All four plan NEEDS-DECISION items ruled the recommended way:

1. **Reframe accepted in full** — verification rescoped (brief steps 3/4/5/7 unsatisfiable: no auth
   service exists in the deployment); severity corrected on the record ("publicly advertised wrong
   config poisoning a dead auth stack; no current user impact — no user can hold a token", replacing
   "broken for users today"); both producer follow-ups to be filed (routed by the lead): the
   `TokenLoginModal.ts:73` silent-failure brief, and the "JWT/Discord auth service at all vs
   Yandex-only identity" product question.
2. **Target = apex `https://geoconflict.ru`** (not `api.geoconflict.ru`, which is the profile server).
3. **`JWT_AUDIENCE` changed in the same edit** (no-live-tokens evidence accepted).
4. **Plan approved — build.**

## Open-question answer (brief verification step 1 — answered in writing)

There is **no token-minting service** in the geoconflict deployment. No `/login/*`, `/users/@me`,
`/refresh`, `/logout`, `/revoke`, `/player/:id` routes and no JWT-signing code exist anywhere in the
repo; live probes (2026-08-24) show `https://geoconflict.ru/login/discord` and
`https://geoconflict.ru/.well-known/jwks.json` both return the SPA HTML page. Deployed `JWT_ISSUER`
was `http://<prod-ip>` (confirmed live via `/api/env`); the minted-token `iss` is vacuous — no tokens
are minted, and JWKS-as-HTML means no token could ever validate server-side regardless of issuer
string. Residual: an external minter outside the repo cannot be disproven, but its tokens could not
validate either. Full evidence chain: plan.md §2.

## Changes (2026-08-24) — config only, no source

**`.env.prod`** (gitignored; ships via `deploy.sh prod`):

| Key | Before | After |
|---|---|---|
| `PUBLIC_HOST` | `<prod-ip>` | `geoconflict.ru` |
| `PUBLIC_PROTOCOL` | `http` | `https` |
| `PUBLIC_PORT` | `80` | `443` |
| `API_BASE_URL` | `http://<prod-ip>` | `https://geoconflict.ru` |
| `JWT_ISSUER` | `http://<prod-ip>` | `https://geoconflict.ru` |
| `JWT_AUDIENCE` | `<prod-ip>` | `geoconflict.ru` |

`VPS_IP` (the SSH deploy target) deliberately untouched.

**`.env`** (gitignored; fallback-trap placeholders, currently shadowed by `.env.prod`):
`PUBLIC_PROTOCOL_PROD` `http` → `https`; `PUBLIC_PORT_PROD` `80` → `443`.

No git commit: both files are gitignored; no tracked file changed.

## Verification — done now

1. **Key-by-key grep of both files**: all eight edited values confirmed; `VPS_IP` and
   `PROFILE_API_URL` unchanged. PASS.
2. **deploy.sh forwarding inspection**: all six keys written verbatim into the remote env file
   (`deploy.sh:287-293`); unsuffixed `.env.prod` values short-circuit the `*_PROD` lookups
   (`-z` guards at `deploy.sh:87-133`). PASS.
3. **deploy.sh resolution simulated** in a subshell (`source .env; source .env.prod` with allexport,
   as `deploy.sh:72-75` does): all six resolve to the new values. PASS.
4. **`npm test` baseline**: 91 suites / 740 tests, **all passed** (no source changed; run as
   regression baseline).

## Deploy pendings — weekend `deploy.sh prod` (same deploy 0066 rides on)

Live checks; cannot be done earlier — the failure and the fix are environment-specific:

1. `curl https://geoconflict.ru/api/env` → `publicProtocol=https`, `publicHost=geoconflict.ru`,
   `publicPort=443`, `apiBaseUrl=https://geoconflict.ru`, `jwtIssuer=https://geoconflict.ru`,
   `jwtAudience=geoconflict.ru`.
2. Browser console on live https site across load / login attempt / logout: no mixed-content errors.
3. `/api/public_lobbies` still returns lobbies (same-origin relative; must not regress).
4. Game connect + play a public lobby (WS regression check for `PUBLIC_HOST` — code-verified safe:
   `Transport.ts:316-320` builds from `window.location`).
5. Discord login button: expected clean same-origin dead end (SPA page, no OAuth, no mixed-content
   error) — per rescoped verification; login completing is out of scope (no auth service).
6. Telemetry spot-check: OTEL resource attribute `openfront.host` now reports the domain
   (`OtelResource.ts:22`); benign label change.

## Known-state records

- **`Matchmaking.ts:55` — recorded latent-broken-and-unreachable** (brief step 9, "explicitly
  recorded" arm): builds `new WebSocket(config.jwtIssuer() + "/matchmaking/join")`; an `https://`
  URL still throws a synchronous SyntaxError in the WebSocket constructor. Unreachable —
  `MatchmakingModal.open()` has no caller. Fix belongs to whoever wires the matchmaking UI up.
- **`ProdConfig.ts` audience fallback** already retargeted `openfront.io` → `geoconflict.ru` by 0066
  (`6f66aff`), not yet deployed; masked by the env var either way.

## Decision log (ADR-019/ADR-032 audit — unattended actions under the standing approval)

- **Fixes applied without asking: the approved plan itself, exactly as written** — the six
  `.env.prod` values and two `.env` placeholders above. Qualification: in-plan (plan §3 table,
  verbatim), owner-approved 2026-08-24, mechanical/localized (eight anchored line edits via sed,
  verified `CORRECT` by key-grep + resolution simulation + green test baseline).
- **Obvious-winner calls: none.**
- **Out-of-plan actions: none.** No source touched; no scope widened.
- **Review round SKIPPED — owner-ruled 2026-08-24** (via AskUserQuestion relay in the lead session):
  config-only change with no tracked diff; the weekend live deploy is the verification. **Condition:
  the task stays open until all six deploy pendings above are proven live.** Not a coder call — an
  explicit owner ruling relayed by the sprint-ship-loop driver.
  - 📌 **Outcome, recorded 2026-08-30:** the task was closed on 2026-08-29 with **four of the six
    still unevidenced** — so the condition was **not** met at the close. All four were proven
    afterwards (2026-08-29 → 2026-08-30), and the condition is **now satisfied**. Full evidence,
    including the Uptrace measurement that discharged pending 6, is in the brief's
    *Close-out — production evidence* section. Nothing here is being reopened.
- **Follow-ups filed** (routed by the lead per the 2026-08-24 rulings): **0069** — auth strategy
  product decision (JWT/Discord auth service vs Yandex-only identity); **0070** — TokenLoginModal
  silent failure (`TokenLoginModal.ts:73`), gated on 0069.
