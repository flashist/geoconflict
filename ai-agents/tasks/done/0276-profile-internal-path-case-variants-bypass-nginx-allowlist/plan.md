# 0276 — Internal path case variants bypass the nginx allowlist — APPROVED PLAN

> **Approved by the owner 2026-09-16** via `AskUserQuestion` in the `fkit lead` session
> (`fkit-sprint-ship-loop` driver). This file is the approved artifact; the driver wrote it at
> approval, before the Build spawn.

## Owner ruling folded into this plan

| Ruling | Decision |
|---|---|
| **Approach** | **Option A + B — the clean fix.** App-wide `case sensitive routing` **and** the nginx `~* ^/internal/` regex location, plus the case-insensitive error-handler check. The owner was told explicitly that this makes **all** routes case-sensitive — `GET /HEALTH`, `POST /V1/Login`, `GET /V1/Profile` begin returning 404 — and was asked whether any caller **outside this repo** (a monitor, a bookmarked curl, an uptime probe) uses non-lowercase paths. **Owner answer: no.** Options C (scoped middleware) and B-only were presented and rejected. |

---

## Baseline

- `src/profile-server/Routes.ts` was at `git hash-object` = `634d1d9092b4c292b79494a8121d61ac8c8628a7` when this plan was written. **Step 0 re-confirms it.**
- ⚠️ **`0274` (S5) is being built in parallel and edits the same top-of-`createApp` region.** See §8 — **`0274` lands first**, and this task's `app.set(...)` line must sit **above** `0274`'s timing middleware.

## Summary

- **The brief is materially stale in one place and materially *understated* in another.**
  - **Stale:** the affected-route list. `/internal/v1/profile/upsert` is **gone** — `0272` shipped `players/resolve`.
  - **Understated:** the brief says the fix needs "a re-run of `setup-profile.sh` (an owner step)". In fact `build-deploy-profile.sh` uploads and runs `setup-profile.sh` on **every** profile deploy, so the nginx half rides an ordinary deploy with **no extra owner step**.
- **The defect is real and was reproduced**, not merely read: Express 4.21.2 with default routing routes `/INTERNAL/v1/credit` to the internal handler.
- **Blast radius, concretely: an unmetered, unlogged token-guessing oracle against `PROFILE_INTERNAL_TOKEN`, open to the whole internet.** Not an open door — the token still gates — but there is **no rate limiter on any internal route**.
- **Two of the brief's three "edge probes" are already safe** — `%49NTERNAL` and `//internal/` both 404 in Express today. The brief expected them unknown.
- **No new deploy needed** — rides profile deploy 1 or 2 depending on when it lands.
- **Effort: 2.5–4 h.** A small task; not inflated.

---

## 1. What is actually broken today

### 1.1 The routing mismatch (proven)

| Layer | File:line | Behaviour |
|---|---|---|
| nginx | `setup-profile.sh:1209` — `location /internal/ {` | **prefix** location; nginx prefix matching is **case-sensitive** |
| nginx | `setup-profile.sh:1218` — `location / {` | catch-all; **no allowlist**, plain `proxy_pass` |
| Express | `src/profile-server/Routes.ts:410` — `const app = express();` | no `case sensitive routing` set ⇒ Express 4 default **case-insensitive** |

A throwaway Express 4.21.2 probe (inline `node -e`, nothing written to disk) with a route registered at `/internal/v1/credit`:

```
=== default (today) ===
/internal/v1/credit     401  path=/internal/v1/credit      ← reached
/INTERNAL/v1/credit     401  path=/INTERNAL/v1/credit      ← REACHED
/Internal/v1/credit     401  path=/Internal/v1/credit      ← REACHED
/iNtErNaL/v1/credit     401  path=/iNtErNaL/v1/credit      ← REACHED
/%49NTERNAL/v1/credit   404                                ← not reached
//internal/v1/credit    404                                ← not reached
/internal/v1/credit/    401  path=/internal/v1/credit/     ← reached (strict routing off)
/internal//v1/credit    404
/./internal/v1/credit   404
/v1/login               200
/V1/Login               200                                ← public routes are case-insensitive too

=== with app.set("case sensitive routing", true) ===
/INTERNAL/v1/credit     404   /Internal/… 404   /iNtErNaL/… 404
/internal/v1/credit     401   (unchanged)
/internal/v1/credit/    401   (unchanged — that is `strict routing`, a different setting)
/V1/Login               404   ← BEHAVIOUR CHANGE on a public route (owner-approved)
```

The probe also shows `req.path` **preserves the original case** — which is what breaks the error handler (§1.3).

**Affected internal routes today — four, but not the brief's four:**
- `Routes.ts:560` `POST /internal/v1/players/resolve`
- `Routes.ts:590` `POST /internal/v1/credit`
- `Routes.ts:921` `POST /internal/v1/messages/send`
- `Routes.ts:1097` `POST /internal/v1/name-change/decide`

`/internal/v1/profile/upsert` (named in the brief) **no longer exists** — `0272` replaced it.

### 1.2 Blast radius

Today, from any host on the internet:

1. `POST <profile domain>/INTERNAL/v1/credit` → nginx `location /internal/` does not match → falls to `location /` → proxied → Express routes it → `internalAuth` (`src/profile-server/InternalAuth.ts:21`) answers **401 `{"error":"unauthorized"}`**.
2. **No rate limiter on any internal route.** `profileReadLimiter`, `paymentsLimiter` and `nameChangeLimiter` are per-route and none is mounted on `/internal/*`. So this is an **unbounded, unthrottled guessing oracle** against `PROFILE_INTERNAL_TOKEN`.
3. `internalAuth` **logs nothing on failure** — so guessing is also **silent**. (`0274` adds a rejection counter for *sessions*, not for `internalAuth`.)
4. A correct token guess reaches `creditMatchXp`, `resolveOrCreatePlayer`, inbox send and name-change decide — write access to player XP and inbox.

**Honest severity:** the token is a high-entropy shared secret and `internalAuth` fails closed, so this is not exploitable by guessing in practice. What is lost is the *network* layer that `InternalAuth.ts:3-7` explicitly names as the other half of the pair. The brief's framing — *"lost layer, not an open door"* — is correct and is **not** being upgraded.

⚠️ **One thing the brief did not name:** the **absence of a rate limiter** is what turns "lost layer" into "oracle". Flagged here; **not built here** (§6). Recommend the producer file it as a follow-up.

### 1.3 The error-handler check (smaller, and about to become unreachable)

`src/profile-server/Routes.ts:309`:

```ts
if (req.path !== "/internal" && !req.path.startsWith("/internal/")) {
  res.set("Access-Control-Allow-Origin", "*");
}
```

`req.path` keeps the request's original case, so on `/INTERNAL/v1/credit` this evaluates true and sets `Access-Control-Allow-Origin: *`.

**Reachability, stated precisely:** `internalAuth` answers its own 401 via `res.status(401).json(...)` and never reaches this handler, so the 401 itself carries no CORS header. The handler is reached on an internal path **only** by a body-parser error (400 malformed / 413 too large / 415 bad charset or encoding), because `express.json()` (`Routes.ts:414`) runs before `internalAuth`. So the actual leak today is: a cross-origin page can read `{"error":"bad_request"}` from a case-variant internal path. **Low value — a consistency defect, not a data leak. Do not dress it up as one.**

**Consequence for testing:** once fix A lands, a case-variant path 404s **before** body parsing, so this branch becomes **unreachable over HTTP through this app**. Its test must therefore be a **unit-level** call on `profileErrorHandler` (§4 step 4), or it tests nothing.

---

## 2. Reachability from outside — yes, with two nginx caveats that stay unverified here

**Reachable:** yes, for the three plain case variants. The chain is proven by reading — nginx prefix locations are case-sensitive (documented nginx behaviour) + `location /` has no allowlist (`setup-profile.sh:1218-1226`) + Express routes it (probe). `0271`'s reviewer got a 401 from the live box, which is the empirical half.

**Not reachable (verified in Express):** `%49NTERNAL`, `//internal/` and `/./internal/` all 404 regardless of the setting.

⚠️ **Unverified — nginx-side; no nginx and no box access during planning.** Two documented nginx behaviours the plan leans on but could **not** be run:
- nginx **decodes `%XX` and merges duplicate slashes (`merge_slashes on`, default) before location matching.** If true, option B's regex catches `%49NTERNAL` and `//internal/` at nginx as a 403 — strictly better than today's 404-in-Express.
- `proxy_pass` **without a URI part** passes the request URI **in its original form**, so Express still sees the raw encoded path and still 404s.

Both are standard, long-documented nginx behaviour. **Neither is verified on the box**; the brief's owner-run verification probes are what will prove them. **The plan is written so nothing breaks if either is wrong** — option A alone already makes every variant a 404.

---

## 3. Approach — A + B, plus the error-handler fix (owner-ruled)

### Chosen

- **A — `app.set("case sensitive routing", true)`** in `createApp`, immediately after `const app = express();` and **before** the first `app.use` / `app.<method>`.
  ⚠️ **Ordering is load-bearing:** Express 4 builds its router lazily on first route registration and reads app settings at that moment. Set it too late and it **silently does nothing**.
- **B — replace the prefix location with `location ~* ^/internal/`** in `setup-profile.sh`'s nginx heredoc.
- **Error handler — lowercase `req.path` before the comparison.**

### Why both, not one

- **B alone** leaves the app case-insensitively routable. Anything reaching the app by another path — the published container port, a future ingress, a misconfigured location — is still routable to an internal handler. That is precisely the layering `InternalAuth.ts:3-7` argues for.
- **A alone** leaves nginx proxying a non-allowlisted request into the app. The outcome is safe (404) but the *network* boundary is still absent.
- **Together:** nginx 403s everything it normalizes; the app 404s anything that slips past.

### Rejected, with reasons

- **Option C (early reject middleware)** — achieves nothing A does not, adds a middleware, and mounts at exactly the spot `0274` is mounting its timing middleware: a worse collision for no benefit. **Owner rejected it.**
- **Error handler as a public-prefix allowlist** (fail-closed) — strictly safer, but it means enumerating every public route and re-enumerating on every new one. A frontier move with real ongoing cost, outside this brief. **Flagged as possible later hardening; not done here.**
- **`strict routing`** — not needed and not safe to conflate. `/internal/v1/credit/` (trailing slash) already matches the nginx prefix *and* will match `~* ^/internal/`, so it is **not** a bypass; the probe confirms it behaves identically before and after A. **Leave it off.**

---

## 4. Step-by-step, RED-first

Each test is written and **seen failing** before its source change. The mutation each must catch is named.

**Step 0 — re-confirm the baseline.** `git hash-object src/profile-server/Routes.ts` still `634d1d9092b4c292b79494a8121d61ac8c8628a7`, **or** the post-`0274` value the driver gives you. If it matches neither, **stop and re-read before touching anything.**

**Step 1 (RED) — case-variant internal routes.**
New file `tests/profile-server/InternalPathCase.test.ts` — a **new file** rather than appended to `Routes.test.ts`, to stay out of `0274`'s way. Follows the existing `createApp(...)` + `supertest` idiom at `tests/profile-server/Routes.test.ts:55-59`.

For each of the four internal routes × `{/INTERNAL/…, /Internal/…, /iNtErNaL/…}`, with `PROFILE_INTERNAL_TOKEN` set in the test env **and the correct token sent**:
- expect **404**
- expect the corresponding repo mock (`creditMatchXp`, `resolveOrCreatePlayer`, inbox `send`, `decideNameChange`) **not called**

Plus a **lowercase control** per route: exact path with the correct token → the route executes (non-404), so the suite cannot pass by the app being broken outright.

> Sending a **valid** token is deliberate. Without it a regression shows as 401 — indistinguishable from "route not reached" to a careless reader. With it, a regression shows as the handler actually running.

**Mutation it must catch:** delete `app.set("case sensitive routing", true)` → case variants execute the handler.
**Expected RED today:** handler executes; assertions fail.

**Step 2 (GREEN) — `Routes.ts`, one line.** Insert after `const app = express();` (`:410`), before `app.set("trust proxy", 1)` (`:413`), with a short comment naming `0276` and the nginx pairing. ⚠️ **If `0274` has landed, this line must sit ABOVE `0274`'s timing middleware** — see §8. Run step 1 → green.

**Step 3 — public-route casing lock.** In the same new test file:
- `GET /health` → 200, `GET /ready` → 200, `POST /v1/login` exact-lowercase → unchanged behaviour
- `GET /HEALTH` → 404, `POST /V1/Login` → 404 *(the owner-approved behaviour change)*

**Mutation it must catch:** the setting reverted, or applied to a sub-router instead of the app → `/V1/Login` returns 200 again.
⚠️ **Honesty note:** the second half of this test only goes RED *before* step 2. Written after step 2 it would be born green. So **write it in step 1's pass** and merely verify it here. Do not claim a RED you did not see.

**Step 4 (RED) — error-handler case.** In `tests/profile-server/ErrorHandler.test.ts`, reusing its existing `run(err, res, path)` helper (`:67`):
- `run(err, mockRes(), "/INTERNAL/v1/credit")` and `"/Internal/v1/credit"` → `res.set` **not** called with `Access-Control-Allow-Origin`
- existing lowercase `/internal/v1/credit` → still no CORS (regression guard)
- a public path `/v1/login` → still `*` (guards against over-correcting into fail-closed)

**Mutation it must catch:** revert the `.toLowerCase()` → the case-variant gets `Access-Control-Allow-Origin: *`.
**Why unit-level:** after step 2 this branch is unreachable over HTTP on a case-variant (§1.3). An HTTP test here would be vacuous.

**Step 5 (GREEN) — error handler.** `Routes.ts:309` → compare against `req.path.toLowerCase()`. Use `toLowerCase()`, **not** `toLocaleLowerCase()` — locale-independent; the Turkish dotless-ı case would otherwise be a live hazard.

**Step 6 (RED) — shell harness.** New section in `tests/scripts/profile-deploy-hardening.test.sh`, following that file's own `pass`/`fail` idiom and its **"extract the block or fail loudly"** convention (`:356-358` is the template — a vacuous grep passing green is the catastrophic direction this file already guards against):
- extract the internal location block from `setup-profile.sh` with `awk`; `fail` if not found
- assert the location is `location ~* ^/internal/`
- assert **no** remaining case-sensitive prefix `location /internal/ {`
- assert the block still contains `${ALLOW_DIRECTIVES}` and `deny all;`, **and that `deny all` comes after the allows** — nginx evaluates allow/deny in order; reversed, the block denies everyone including the game server

**Mutations it must catch:** regex reverted to a prefix location; `deny all` deleted; `deny all` hoisted above the allows; the block removed entirely.
**Expected RED today:** the file has **no** assertion on this block at all (verified — its nginx assertions at `:324-382` cover the *game* container `nginx.conf`, a different file).

**Step 7 (GREEN) — `setup-profile.sh`.** In the heredoc at `:1206-1217`:
- `location /internal/ {` → `location ~* ^/internal/ {`
- update the comment above it to say why it is a regex (case-insensitive; pairs with the app's case-sensitive routing)
- optionally update the summary echo at `:1586`

⚠️ **nginx trap to respect:** `proxy_pass` inside a **regex** location may not carry a URI part. Ours is `proxy_pass http://127.0.0.1:${PROFILE_PORT};` — **no URI part, so it is legal.** Adding a trailing `/` there would make `nginx -t` fail. If it ever did, `setup-profile.sh:1139` runs `nginx -t` before restart and the ERR trap at `:1234` restores the previous site config — a bad regex **aborts the deploy rather than taking the API down**. Good safety property; do not remove it.

**Step 8 — gates.** §7.

---

## 5. Files touched, effort

| File | Change | Size |
|---|---|---|
| `src/profile-server/Routes.ts` | 1 line at `:410-413` + 1 line at `:309` | ~4 lines incl. comments |
| `setup-profile.sh` | `:1206-1209` location + comment; `:1586` echo | ~4 lines |
| `tests/profile-server/InternalPathCase.test.ts` | **new** | ~120 lines |
| `tests/profile-server/ErrorHandler.test.ts` | +3 cases | ~25 lines |
| `tests/scripts/profile-deploy-hardening.test.sh` | new structural section | ~30 lines |

**Effort: 2.5–4 h.** Source ~20 min; tests ~1.5 h; harness ~45 min; gates + review round ~1 h.

---

## 6. What 0276 must NOT do

- **`0274` (S5):** no `ProfileMetrics`, no `createApp` options parameter, no HTTP timing middleware, no route-label metrics, no `resolveCaller` rejection counters, no `PROFILE_LOGIN_CREATE_ENABLED`, no `checks.env` / `POSTGRES_*` / disk-and-growth checks, no OTLP probe, no Uptrace dashboard or alert rules.
- **`0277`:** nothing in `setup-telemetry.sh`, no Telegram, no `HTTPS_PROXY`, no notifier config.
- **`0253`:** no tenure-grant route, no `tenure.claims`.
- **`0267`:** no signed-payload / Yandex signature verification. `resolveCaller` (`Routes.ts:383-407`) is **not touched at all**.
- **`0262`:** no collector work.
- **No rate limiter on `/internal/*`** — genuinely tempting (§1.2), genuinely out of scope. Recommend the producer file it; do not build it here.
- **No `strict routing` change.**
- **No change to `internalAuth`**, no route added or removed, no change to what any internal route does.
- **No update to `ai-agents/knowledge-base/architecture.md`.** Its route table (`:478-489`) is **stale** — it still lists `/internal/v1/profile/upsert` and `?yandexPlayerId=` query auth, both removed by `0272`/`0273`. Real drift, worth reporting to the producer; belongs to those tasks, not this one.
- **No commit, no push, no task-file move, no status change, no sprint-plan or brief edit.**

---

## 7. Gates

| Gate | Expectation |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm test` | green — **includes the shell-harness gate** (~22–25 s wall), and the hardening harness must stay green after the `setup-profile.sh` edit. A red hardening harness here is the gate working, per `CLAUDE.md`. |
| `npm run check:config-parity` | unchanged — `0276` adds **no** env var; run it to prove no drift, not because drift is expected |
| `npm run test:integration` | **not required.** No schema, migration or DB-path change. Stated explicitly rather than skipped silently. |

---

## 8. Sequencing against 0274 and 0275

### `src/profile-server/Routes.ts` — regions 0276 needs

| Region | Lines | `0274` also touches? |
|---|---|---|
| Top of `createApp`, between `const app = express();` and `app.use(express.json())` | `:410-414` | **YES** — `0274` mounts its timing middleware "first, before `express.json()`" |
| `profileErrorHandler` CORS check | `:309` | No |
| `createApp` signature | `:355-361` | `0274` adds a 6th param — **`0276` does not touch the signature at all** |
| `resolveCaller` | `:383-407` | `0274` yes; **`0276` no** |
| `POST /v1/login` handler | `:506` | `0274` yes; **`0276` no** |

**One collision, five lines, at the top of `createApp`.** Textual only: `app.set(...)` and `app.use(timing)` are independent statements and neither constrains the other's semantics — **except that `app.set("case sensitive routing")` must precede the first `app.use`, including `0274`'s timing middleware.** That is the single merge constraint. `0274`'s own plan anticipates this and reaches the same conclusion.

**Driver ruling: `0274` lands first, then `0276`.** `0274` is already in progress with an approved plan and a running build worker; it is a far larger change set; and `0276`'s source change is two lines that rebase onto anything in seconds. Reversing the order would make the larger plan rebase around a one-liner.

### `setup-profile.sh` — no collision

| Task | Region |
|---|---|
| `0274` | persisted variables + value-report rows (`~:840-878`), OTLP probe, `checks.env` (`~:448`) |
| `0276` | nginx heredoc only (`:1189-1230`) |

Disjoint, ~350 lines apart. `tests/scripts/profile-deploy-hardening.test.sh`: `0274` extends the existing `0219`/`0220` sections; `0276` adds a new section. Textual-only risk in a 1124-line file.

### `0275` — no overlap. Backup/restore and the dry-run harness; different files entirely.

---

## 9. Deploy

**Correcting the brief:** `build-deploy-profile.sh` uploads `setup-profile.sh` to the box and runs it on **every** deploy (`build-deploy-profile.sh:10-13, 414`; self-described as "PROVISION + DEPLOY" and idempotent). The nginx heredoc is gated only on `PROFILE_DOMAIN` being non-empty (`setup-profile.sh:1065`), which it is. So **the site file is rewritten and nginx restarted on every profile deploy** — the nginx half needs **no separate owner step**, contrary to the brief's note.

Current chain:

```
0275 Part B → profile deploy 1 (S2 + S3 + 0273's removal)
            → 0277 (Telegram alert delivery)
            → profile deploy 2 (0274)
            → game deploy
```

**`0276` needs no deploy of its own.** Both halves (image + nginx) ship together in one profile deploy:
- lands **before** deploy 1 → rides deploy 1
- lands **after** deploy 1, before deploy 2 → rides **deploy 2** *(the likely case, given `0274` first)*

Either way it is live **before the game deploy**.

⚠️ **The brief's verification steps 2–6 are owner-run, on the box, after deploy.** They cannot be run locally and are **not** part of this task's gates. `npm test` proves the app half; the harness proves the config half is *written*; only the box probes prove the *deployed* result. **A green `npm test` must not be read as the box being fixed.**

---

## 10. Risks and residuals

1. **Behaviour change on public routes (option A) — owner-approved.** `GET /HEALTH`, `POST /V1/Login`, `/V1/Profile` etc. begin returning 404. Every in-repo caller uses exact-lowercase literals — verified: `src/server/ProfileApiClient.ts:18-19`, `PlayerProfileView.ts:154`, `Inbox.ts:167`, `NameChangeRequest.ts:95,124`, `PaymentsApiClient.ts`, the docker healthcheck (`setup-profile.sh:914`), the operator curl lines (`:1577,1580`; `build-deploy-profile.sh:615`). `profile-checks.sh` makes no HTTP call to these paths. **Not checkable from the repo:** anything outside it. The owner was asked and answered **no**.
2. **nginx-side normalization is unverified** (§2). If `merge_slashes`/decoding behave differently than documented, option B catches less than claimed — but option A still 404s every variant, so the fix does not depend on it. The box probes settle it.
3. **The rate-limiter gap on `/internal/*` stays open** after this task. Deliberately out of scope; recommend a follow-up brief.
4. **The error-handler fix is defensive only** after step 2 — unreachable over HTTP on a case-variant. Correct and cheap, and it survives a future revert of the routing setting. **Not** a fix for an exploitable leak.
5. **`architecture.md`'s route table is stale** from `0272`/`0273`. Reported, not fixed here.
6. **`CLAUDE.md`'s hardcoded-harness-list residual is unchanged** — no new `.sh` harness is added, so it is neither worsened nor improved.
7. **Unverified: whether `PROFILE_INTERNAL_ALLOW_IPS` is currently correct on the box.** If stale, a correctly-cased internal call is already 403 and this fix changes nothing about that. `0217` owns it.
