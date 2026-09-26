# Profile box: case-variant `/internal/` paths skip the nginx IP allowlist

## ID
0276

## Sprint
Sprint 4

*(Pulled from the Backlog board 2026-09-15 on an OWNER RULING via `AskUserQuestion` in the lead session, relayed by `fkit-lead` to a spawned `fkit-producer`: *"Small fix; lands before real traffic hits the profile server. Built after S3"*. Not producer precedent.)*

## Priority
High *(placement owner-ruled — Sprint 4, before XP go-live; the rank itself is producer's, NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0272`**, because it builds on S3's final internal route set and gates XP go-live (`0217`). Appended at the bottom (ADR-035), not inserted.

## Status
✅ Done (agent-closed — not owner-verified)

---

## ✅ CLOSING RECORD — 2026-09-17. Deployed, proven on the box, closed.

**Closed by a spawned `fkit-producer` for `/fkit-sprint-ship-loop` — no owner channel, which is why the
status above carries `(agent-closed — not owner-verified)`.** Who did what, plainly: the **OWNER
personally ran the profile-box deploy and the probe from the game box**; the **lead session ran the
read-only probes from a non-allowed host and inspected the deployed nginx config read-only**. No agent
changed anything on either box.

### The gap that held this task open is closed — the `allow` half is now proven

From the **game box** (a host inside `PROFILE_INTERNAL_ALLOW_IPS`), owner-run 2026-09-17:

```
POST https://<profile domain>/internal/v1/credit   →   401
```

**401, not 403.** The request passed the nginx allowlist, reached the app, and `internalAuth` refused it
for carrying no token. That is verification step 5 — the one probe that would have caught a rewritten
location that silently stopped allowing the game server, a failure which would otherwise have surfaced
only as a permanent 403 at `0217`.

### Verification list — all seven met

| Step | Result |
|---|---|
| 1 — tests green | ✅ `tsc` clean · `npm test` **135 suites / 1724 tests** · hardening harness `ALL PASS` incl. all **7** new assertions · `test:integration` not required (plan §7) |
| 2 — three case variants → 403/404, never 401 | ✅ **3 of 3 on the box** (lead, non-allowed host): `/INTERNAL/…` **403** · `/Internal/…` **403** · `/iNtErNaL/…` **403** |
| 3 — edge probes recorded | ✅ **on the box** (lead, non-allowed host): `/%49NTERNAL/…` **403** · `//internal/…` **403** · `/./internal/…` **403** · trailing-slash `/internal/v1/credit/` **403** |
| 4 — lowercase control from a non-allowed host | ✅ owner-run, **403** |
| 5 — allowed path still reaches `internalAuth` | ✅ **owner-run from the game box → 401** (above) |
| 6 — public routes unaffected | ✅ `/health` 200 · `/ready` 200 · `GET /v1/profile` without Bearer → 401 (correct after `0273`'s D1) |
| 7 — no secrets or addresses in any artifact | ✅ |

### Beyond the list — all four internal routes, not just credit

From a non-allowed host (lead, read-only): `/internal/v1/credit`, `/internal/v1/players/resolve`,
`/internal/v1/messages/send`, `/internal/v1/name-change/decide` → **403 on all four**. **Eleven probes in
total from the non-allowed host, plus the one from the allowed host. No 401 from a non-allowed host
anywhere.**

### Deployed config — inspected read-only on the box by the lead

- the block is `location ~* ^/internal/` — the regex form this task introduced, **live**;
- inside it, **exactly one `allow` directive, with `deny all` after it**. The reverse order would have
  locked the game server out — that is the mutation the reviewer's harness assertion F guards;
- `nginx -t` passes.

### ⚠️ Two evidence bases on two different nginx versions — do not present them as one

The deployed box runs nginx **1.28.3**. The coder's build-time container probe ran on nginx **1.31.5**.
**The box probes above are what prove the deployed behaviour.** The container run is corroboration on a
different version, not the same evidence.

### Build record's three unverified items — all three now discharged

| # | Item | Verdict 2026-09-17 |
|---|---|---|
| 1 | the box's nginx version | ✅ **1.28.3**, read off the box |
| 2 | the box's deployed site file | ✅ the `~* ^/internal/` regex block is live — inspected and probed |
| 3 | the box's `PROFILE_INTERNAL_ALLOW_IPS` | ✅ **discharged** — 401 from the allowed host, 403 from a non-allowed one |

### Carried forward out of this task

- **Review ledger `Status: closed-out`, 0 defects in this task's surface.** R1 routed to
  [`0280`](../../backlog/0280-correct-stale-test-figures-in-claude-md-and-stale-profile-route-table-in-architecture-md/brief.md).
  **R2 stands as a known residual: a bare `/internal` with no trailing slash is not matched by
  `~* ^/internal/`.** Latent, no action taken — no route is registered at that exact path today.
- **The fix only works ABOVE `0274`'s timing middleware.** `app.set("case sensitive routing", true)` must
  stay before the first `app.use`. Moving it below fails **16 tests, byte-for-byte identically to
  deleting it** — Express 4 builds its router lazily on the first route registration and reads app
  settings at that moment, so a late `app.set` is silently ignored. ⛔ Do not reorder those lines.
- **`src/profile-server/` has no sub-routers** — every route is registered directly on `app`, so the
  app-wide setting genuinely covers all four internal routes. ⚠️ **Adding an `express.Router()` later
  reopens this hole**: a Router carries its own `caseSensitive` option and does not inherit the app's.

### 📌 Re-runnable box evidence for `0279` and `0217` to inherit — 2026-09-17

The `/internal/` boundary now has a concrete box-side evidence set: **eleven read-only probes from a
non-allowed host** (three case variants, four edge forms, four internal routes) **and one read-only probe
from the allowed game box**. All are plain `curl`s, none changes anything on either box, and the whole
set is cheap to re-run. [`0279`](../../backlog/0279-profile-internal-routes-no-rate-limiter-no-auth-failure-log/brief.md)
(rate limiter / auth-failure logging) and [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)
(XP go-live) should **re-run this set rather than rediscover it**.

---

## 🚨 BUILD RECORD — 2026-09-16. READ THIS BEFORE READING THE GREEN GATES.

> 📌 **Superseded on its open items by the CLOSING RECORD above (2026-09-17): all three "unverified"
> items are now discharged on the box.** Kept verbatim as the historical record of what was and was not
> proven at build time — the reasoning below is still correct about what a green `npm test` does and
> does not prove.

### A green `npm test` is NOT the box being fixed.

The hardening harness proves the config that `setup-profile.sh` **writes**. A container run proves that
config behaves on **nginx 1.31.5**. Neither is the deployed box.

**Unverified — all three, and they are the whole point of this task:**
1. **the box's nginx version**,
2. **the box's deployed site file**, and
3. **the box's `PROFILE_INTERNAL_ALLOW_IPS`**.

⇒ **The owner-run box probes in *Verification steps* below, performed AFTER profile deploy 2, are the
only proof of the deployed result.** Until they are run and recorded, this task is *built*, not
*proven*. Do not report it as fixed on the strength of a green test run.

### Two reviewer findings worth keeping after the ledger is filed away

- **The one-line fix only works ABOVE `0274`'s timing middleware.** `app.set("case sensitive routing",
  true)` sits at `src/profile-server/Routes.ts:491`; the first `app.use` (`0274`'s timing middleware) at
  `:512` — strictly before. Moving the `app.set` **below** it fails **16 tests, byte-for-byte identically
  to deleting it**, because Express 4 builds its router lazily on the first route registration and reads
  app settings *at that moment*. A late `app.set` is silently ignored. ⛔ **Do not reorder those lines.**
- **There are no sub-routers in `src/profile-server/`.** An `express.Router()` carries its **own**
  `caseSensitive` option and does **not** inherit the app's, so a sub-Router would have silently escaped
  the app-wide fix. A repo-wide grep for `Router(`, `express.Router` and `.route(` across
  `src/profile-server/` returns **zero** matches — every route is registered directly on `app`. So the
  app-wide setting genuinely covers **all four** internal routes (`players/resolve` `:718`, `credit`
  `:748`, `messages/send` `:1079`, name-change decide `:1255`). ⚠️ **Adding a sub-Router later reopens
  this hole** — it would need `{caseSensitive: true}` of its own.

---

## Owner
fkit-coder

## Context

**Filed 2026-09-15 on an OWNER RULING (`AskUserQuestion`, lead session, relayed by `fkit-lead` to a
spawned `fkit-producer`):** *"File a task"*. First filed on the Backlog board; **the owner then ruled
placement the same day** (`AskUserQuestion`): *"Small fix; lands before real traffic hits the profile
server. Built after S3"* ⇒ **Sprint 4, and it counts toward XP go-live (`0217`).**

**Found by:** the `0271` (S2) reviewer's probe. Recorded as out of scope in
`ai-agents/tasks/done/0271-profile-identity-s2-login-endpoint-and-session-token/review.md`.
**Pre-existing** — not caused by `0271`.

**The gap.** Internal (service-to-service) routes on the profile box have two layers of protection:
1. **Network layer** — the host nginx config written by `setup-profile.sh` (the `location /internal/`
   block, ~line 1199) allows only the game server IP and denies everyone else.
2. **App layer** — `internalAuth` (`src/profile-server/InternalAuth.ts`) requires the shared
   `PROFILE_INTERNAL_TOKEN` as a Bearer token.

nginx prefix `location` matching is **case-sensitive**. Express 4 routing is **case-insensitive by
default**. So `POST /INTERNAL/v1/credit` (or `/Internal/…`, any mix) does not match
`location /internal/`, falls through to `location /`, is proxied to the app, and Express still routes
it to the internal handler. The reviewer's probe got a **401 from `internalAuth`** (the route was
reached), not a 403 from nginx or a 404.

**Severity: lost layer, not an open door.** The token is still required, and `internalAuth` fails
closed. But `InternalAuth.ts`'s own header says the IP allowlist exists so *"a misconfigured allowlist
or an attacker already on an allowed host still needs the shared token"* — the reverse also holds: the
allowlist is supposed to keep the whole internet from reaching the token check at all. Today anyone can
reach it, and can try tokens against it.

**Affected routes (as of 2026-09-15; the set changes under `0271`/`0272`):** every `app.post("/internal/…")`
in `src/profile-server/Routes.ts` — credit, profile upsert (replaced by players/resolve in `0272`),
messages/send, name-change/decide.

**Related, smaller symptom in the same file:** the error handler (`Routes.ts`, ~line 1143) decides
"never send CORS headers on `/internal/*`" with a case-sensitive `req.path` check, so an error on a
case-variant internal path gets `Access-Control-Allow-Origin: *`. Whichever fix is chosen should leave
that check consistent with it.

## What to build

Close the mismatch so that **no request that the app would route to an internal handler can bypass the
nginx allowlist.** The plan picks the approach; the options (not decided here):

- **A. Make Express routing case-sensitive** (the app's `case sensitive routing` setting, and the
  equivalent option on any `Router` in use), so non-lowercase paths 404 in the app. Fix is in the app
  image; covers every current and future internal route. Check it does not break any **public** route
  a client calls with different casing.
- **B. Make the nginx match case-insensitive** (a regex location such as `~* ^/internal/`), so every
  case variant hits the allowlist. Fix is in the host config, shipped via `setup-profile.sh`. Note the
  precedence difference between prefix and regex locations when writing it.
- **C. Reject in the app** any request whose lowercased path starts with `/internal/` unless the path
  is exactly lowercase (a small early middleware). App-layer, explicit, independent of routing settings.

Combining A or C with B (fix both layers) is allowed if the plan argues it; say which in the plan.

Also:
- Keep the error handler's "no CORS on internal" check consistent with the chosen fix.
- Add tests that lock the behaviour (a supertest case for case-variant internal paths if the fix is
  app-side; a structural assertion if the fix is in `setup-profile.sh`).
- If `setup-profile.sh` changes, update `tests/scripts/profile-deploy-hardening.test.sh` — it carries
  grep-level structural checks over that file and is an unconditional gate in `npm test`. (As of filing
  it has no assertion on the `/internal/` location block; adding one is in scope for option B.)
- If nginx changes, the box needs a re-run of `setup-profile.sh` (an owner step — the owner runs every
  box command).

## Verification steps

1. **Tests:** `npm test` is green, including the shell harness gate; new tests fail on the pre-fix code
   and pass after.
2. **Case-variant probes, from a host that is NOT the game server** (after the fix is deployed): for
   `POST /INTERNAL/v1/credit`, `/Internal/v1/credit`, `/iNtErNaL/v1/credit` — the response is a **403
   from nginx** (option B) or a **404** (option A/C). It must **never** be a 401 (that means the route
   was reached).
3. **Edge probes, same host:** a percent-encoded variant (e.g. `%49NTERNAL`) and a double-slash variant
   (`//internal/v1/credit`) — record the response of each; none may be a 401.
4. **Lowercase control, same non-allowed host:** `POST /internal/v1/credit` still returns 403 from nginx
   (unchanged behaviour).
5. **Allowed path still works:** from the game server IP, a correctly authed lowercase internal call
   still succeeds (or, if the game server is not yet wired, the lowercase route still reaches
   `internalAuth` — 401 without a token, not 403/404).
6. **Public routes unaffected:** `/health`, `/ready` and one authenticated `/v1/…` route answer as before.
7. **No secrets or addresses** in the worklog, review or any artifact — write "the game server IP", never
   the address; never paste a token.

## Notes

- **Depends on:** nothing
- **Blocks:** `0217` (XP go-live — owner-ruled 2026-09-15: lands before real traffic)
- **Sequencing (soft — merge-conflict avoidance, not a dependency):** `0271` (S2) and `0272` (S3) both
  edit `src/profile-server/Routes.ts`, and `setup-profile.sh` is in the current working-tree change set.
  `0272` also replaces `/internal/v1/profile/upsert` with `/internal/v1/players/resolve`. **Build this
  after `0272` lands**, so the fix covers the final internal route set and does not conflict.
- **Placement — owner-ruled 2026-09-15:** Sprint 4, before XP go-live, built after S3 (`0272`). Added to
  `0217`'s go-live list and `## Depends on`. The **rank** (High) is the producer's, not owner-ruled.
- Severity framing for any reviewer: the Bearer token still gates these routes; this restores the
  network layer, it does not close an unauthenticated hole.
