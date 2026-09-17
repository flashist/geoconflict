# Worklog — 0276 Internal path case variants bypass the nginx allowlist

Run: 2026-09-16, spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) as the **Build worker**, under
the approved plan `plan.md` (blob re-hashed before starting — it matched). No box deploy, no SSH, no
commit, no task-file move, no wiki write, no status change, no `git stash`/`reset`/index change.
`plan.md` was neither edited nor re-authored.

## Headline

- Two source lines (plus comments): `app.set("case sensitive routing", true)` at the top of `createApp`,
  and a lowercased `/internal` comparison in `profileErrorHandler`. One nginx line in `setup-profile.sh`:
  the prefix `location /internal/` became the case-insensitive regex `location ~* ^/internal/`.
- All gates green. Seven mutations executed, all caught.
- **Two of the plan's stated unverifiable residuals were actually verified**, by rendering the nginx
  heredoc and running it under a containerized nginx — including a control run of the pre-fix config that
  demonstrates the bypass rather than only reasoning about it. See **Verification** and **Corrections**.

## Pre-flight

- `plan.md` → `70a453b5b22f716bf02dd75ecfa4cba6f14b4431` ✅ (matches the carried hash, 23688 bytes).
- `src/profile-server/Routes.ts` → `a6fc5ffd641221aa9e39fc6060cd622bf6291aaa` ✅ (the driver's post-`0274`
  Step 0 value, not the plan's stale `634d1d9…`).
- `setup-profile.sh` → `36e213fe5f1bcabd9e8005207551cb32bd8771b4` ✅.
- Navigated by symbol, not line number, as instructed — `0274` shifted every line number in the plan.
- `0274`'s HTTP timing middleware confirmed present as the first `app.use` in `createApp`; the new
  `app.set` was placed **above** it (the one merge constraint). Mutation B below proves that mattered.

## Change surface

New:
- `tests/profile-server/InternalPathCase.test.ts` (~215 lines, 23 tests)

Modified:
- `src/profile-server/Routes.ts` — exactly two regions:
  - `createApp`, immediately after `const app = express();` and **above** `0274`'s timing middleware and
    `app.set("trust proxy", 1)`: added `app.set("case sensitive routing", true)` + a comment block naming
    the nginx pairing, the ordering trap, and the owner-approved public-route consequence.
  - `profileErrorHandler`, the CORS branch: `req.path` → a `const lowerPath = req.path.toLowerCase()`
    compared instead. `toLowerCase`, never `toLocaleLowerCase` (locale-dependent; Turkish dotless ı).
- `setup-profile.sh` — two regions:
  - the nginx site heredoc: `location /internal/ {` → `location ~* ^/internal/ {`, plus a comment above it
    explaining why it is a regex and that a regex location's `proxy_pass` may carry no URI part.
  - the summary echo near the end: now says the allowlist is case-insensitive since `0276`.
- `tests/profile-server/ErrorHandler.test.ts` — 4 new unit cases in the `profileErrorHandler — unit`
  describe (2 case-variant, 1 lowercase regression guard, 1 public-path over-correction guard).
  Also reformatted by `npx prettier --write` — the only lines it touched were the ones added here.
- `tests/scripts/profile-deploy-hardening.test.sh` — one new structural section at the end
  (`== Structural: nginx /internal/ location is case-insensitive (0276) ==`), 7 assertions.

Not touched (plan §6): `internalAuth`, `resolveCaller`, `createApp`'s signature, any route's behaviour,
`architecture.md`, `CLAUDE.md`, `build-deploy-profile.sh`, `profile-checks.sh`, any sprint plan, any
`brief.md`, any `review.md`, the wiki. No rate limiter was added (`0279`). No `strict routing` change.
No new env var.

## Verification

### Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **clean** (exit 0, no output) |
| `npm run lint` | **clean** (eslint, no output) |
| `npm test` | **135 suites / 1724 tests, all passed**, 80.3 s wall (50.5 s on the earlier run — the shell-harness suite dominates and varies) |
| `npm run check:config-parity` | **unchanged** — profile pipeline `REQUIRED 0 / INFO 0 / ALLOWED 0`; no new env var, as expected |
| `npm run test:integration` | **not run, and not required** — no schema, migration or DB-path change |
| `npx prettier --check` (touched TS) | clean after one `--write` on `ErrorHandler.test.ts` |

All four shell harnesses ran inside `npm test` — Docker was up, so
`scripts/test-check-docker-secret-boundary.sh` genuinely ran rather than skipping.

No `supertest` flake occurred in any run (no timeout, no "did not exit", no `socket hang up`), so the
`0197`-first rule never came into play and nothing needed a re-run.

### RED-first, honestly

| Step | RED seen? | Evidence |
|---|---|---|
| 1 — case-variant internal routes | **yes** | 16 failed / 7 passed. `POST /INTERNAL/v1/credit` with a valid token returned **200** — the credit handler actually ran. That is the defect, reproduced in-repo. |
| 3 — public-route casing lock | **yes, but see below** | `/HEALTH` 200, `/READY` 200, `/V1/Login` 400, `/V1/Profile` 401 — all non-404. Written in step 1's pass exactly as the plan's honesty note requires, so this RED was genuinely observed and is not a post-hoc claim. |
| 4 — error-handler case | **yes** | 2 failed / 15 passed; both case-variant cases got the CORS header. |
| 6 — shell harness | **yes** | 2 of 7 assertions failed against the then-unchanged `setup-profile.sh`. |

The lowercase controls (step 1) passed **before** the fix as well as after — that is their whole point:
they prove the suite cannot go green by the app simply 404-ing everything.

### Mutations executed (all seven caught)

| # | Mutation | Result |
|---|---|---|
| A | delete `app.set("case sensitive routing", true)` | 16 failed — case variants execute the handler |
| B | **move** the setting *below* the first `app.use` | 16 failed, identical to A — the lazy-router ordering trap is real, not folklore. The comment warning about it is now empirically backed. |
| C | revert `.toLowerCase()` in `profileErrorHandler` | 2 failed — case variant gets `Access-Control-Allow-Origin: *` |
| D | regex header reverted to a prefix `location /internal/ {` | 2 failed (header assertion + the no-prefix-survives assertion) |
| E | `deny all;` deleted | 3 failed (the allowlist assertion fired; 2 were cascade noise from my crude edit joining two lines) |
| F | `deny all;` hoisted **above** the allows | 1 failed — the positional order assertion |
| G | the whole `/internal/` location block removed | 6 failed, led by the **extract-or-fail-loudly** guard. No assertion went vacuously green. |

`src/profile-server/Routes.ts` and `setup-profile.sh` were both `diff`-confirmed **byte-exact** against
pre-mutation backups afterwards, and the full gate suite was re-run from that restored state.

### nginx — verified beyond what the plan expected

The plan (§2, residual 2) flagged two nginx behaviours as unverifiable without box access. They were
verified locally instead, at no cost to the box: the site heredoc was extracted from `setup-profile.sh`,
rendered with stub values (`PROFILE_DOMAIN=example.test`, `PROFILE_PORT=3000`, two `allow` lines from
`192.0.2.0/24` and `198.51.100.0/24` — RFC 5737 documentation ranges, no real address), and run under
`nginx:alpine` (**nginx 1.31.5**) with a throwaway self-signed cert. Everything stayed in the scratchpad;
the containers were removed; nothing synthetic entered the repo.

- **`nginx -t` on the rendered config: successful.** The regex location with a bare
  `proxy_pass http://127.0.0.1:3000;` is legal — the trap §4 step 7 names is confirmed avoided, not merely
  reasoned about.
- **Probe, new config** (denied client IP ⇒ **403 = the internal block matched**; **502 = fell through to
  the catch-all, no upstream**):

  | path | code |
  |---|---|
  | `/internal/v1/credit` | 403 |
  | `/INTERNAL/v1/credit` | 403 |
  | `/Internal/v1/credit` | 403 |
  | `/iNtErNaL/v1/credit` | 403 |
  | `/%49NTERNAL/v1/credit` | 403 |
  | `//internal/v1/credit` | 403 |
  | `/internal//v1/credit` | 403 |
  | `/./internal/v1/credit` | 403 |
  | `/v1/login` | 502 |
  | `/health` | 502 |

- **Control probe, the pre-fix prefix config** — the bypass, demonstrated:

  | path | code |
  |---|---|
  | `/internal/v1/credit` | 403 |
  | `/INTERNAL/v1/credit` | **502 — past the allowlist** |
  | `/Internal/v1/credit` | **502** |
  | `/iNtErNaL/v1/credit` | **502** |
  | `/%49NTERNAL/v1/credit` | **502** |
  | `//internal/v1/credit` | 403 |

⚠️ **What this does and does not prove.** It proves nginx's documented normalization (percent-decoding
and `merge_slashes`, both before location matching) and the regex location's legality, on nginx 1.31.5 in
a container, against the config this script *writes*. It does **not** prove anything about the box: its
nginx version, its currently-deployed site file, or its `PROFILE_INTERNAL_ALLOW_IPS`. The brief's
owner-run box probes are still the only thing that proves the **deployed** result, exactly as plan §9
says. A green `npm test` still must not be read as the box being fixed.

## Corrections to the plan (reported, not acted on)

1. **`//internal/…` was already caught at nginx**, even by the old prefix location (403 in the control
   probe) — `merge_slashes` collapses it before matching. Plan §1.1/§2 listed it only as "404 in Express",
   which is true of the app layer but understates the old nginx layer. No behaviour change either way.
2. **`/%49NTERNAL/…` did reach the app under the old config** (502 = proxied to a dead upstream), where
   Express 404'd it on the still-encoded path. The plan's two claims about this were both right; this just
   confirms the path it took.
3. **`CLAUDE.md`'s measured figures are stale** — it says `npm test` is 113 suites / 1185 tests at
   ~22–25 s; it is now **135 suites / 1724 tests at 50–80 s** on this host. That belongs to `0280`, which
   is already filed. Not touched here.

## Decision log

Every call made without asking, under the standing approval of `plan.md` (ADR-019 discipline, ADR-032 A4).

| # | Decision | Plan clause | Why it qualified |
|---|---|---|---|
| 1 | Used the driver's Step 0 hashes (`a6fc5ffd…`, `36e213fe…`) rather than the plan's stale `634d1d9…` for `Routes.ts`. | §4 step 0 explicitly permits "**or** the post-`0274` value the driver gives you". | In-plan by its own text. Both hashes confirmed before any edit. |
| 2 | Added a 7th harness assertion the plan's step-6 mutation list did not enumerate: `proxy_pass` carries no URI part. | §4 step 7's ⚠️ nginx trap. | Mechanical, localized, and it gates the exact trap the plan names one step later. Within plan intent; adds no source behaviour. |
| 3 | Added `GET /READY` → 404 and `GET /V1/Profile` → 404 to the public-casing lock (plan named `/HEALTH` and `/V1/Login`). | §4 step 3. | Two more rows in an existing `test.each` table over the same owner-approved behaviour. Obvious winner; no new behaviour asserted. |
| 4 | Ran mutation **B** (move the setting below the first `app.use`), which the plan did not list. | §3 / §4 step 2's ⚠️ ordering warning. | Verification only — no file left changed. The plan asserts the ordering is load-bearing and that getting it wrong is *silent*; an unexecuted claim of silence is worth little. It is now measured. |
| 5 | Validated the rendered nginx config with a containerized `nginx -t` and probed both the new and the pre-fix config. | §2 and §10 residual 2, which flag exactly these as unverified. | Read-only verification in the scratchpad; no repo file, no box, no credential, no committed artifact. It converts a named residual into evidence. Memory rule "Run it, don't hand it over" points the same way. |
| 6 | Ran `npx prettier --write tests/profile-server/ErrorHandler.test.ts`. | §7 gates (lint/format). | Mechanical; it touched only lines added in this task. |
| 7 | Left the plan's §6 exclusions fully intact — no `/internal/*` rate limiter, no `internalAuth` failure log, no `architecture.md` or `CLAUDE.md` edit. | §6 + the spawn's follow-up note. | `0279` and `0280` own these. Not a judgment call so much as a boundary held; recorded so its absence is not read as an oversight. |

No fix was applied to answer a review finding — this was a Build run, not a Process-review run; no
review had been run at the time of writing.

## Residuals carried forward

1. **Public-route behaviour change is live in the app**: `GET /HEALTH`, `POST /V1/Login`, `GET /V1/Profile`
   and every other non-lowercase spelling now 404. Owner-approved 2026-09-16 on the stated basis that no
   out-of-repo caller uses a non-lowercase path. Every in-repo caller was re-confirmed lowercase. **Not
   checkable from the repo** for anything outside it.
2. **The box is not fixed until a profile deploy runs.** Both halves ride one ordinary profile deploy
   (`build-deploy-profile.sh` uploads and runs `setup-profile.sh` every time) — no separate owner step.
   The brief's verification steps 2–6 are owner-run on the box, after deploy.
3. **No rate limiter and no `internalAuth` failure log on `/internal/*`.** Still open; `0279` owns it.
4. **The error-handler fix is defensive only** — unreachable over HTTP on a case variant now that routing
   is case-sensitive. Correct and cheap; not a fix for an exploitable leak.
5. **`PROFILE_INTERNAL_ALLOW_IPS` correctness on the box is unverified** — if stale, a correctly-cased
   internal call is already 403 and nothing here changes that. `0217` owns it.
6. **`architecture.md`'s route table is stale** (`0272`/`0273` drift) and **`CLAUDE.md`'s test figures are
   stale**. Both are `0280`.
7. **The hardcoded-harness-list residual in `CLAUDE.md` is unchanged** — no new `.sh` harness was added,
   so it is neither worsened nor improved.
8. **The harness's new section is coupled to the heredoc's formatting**, like the `0060`/`0219` sections
   before it. A reformat of that block reds this section — a false RED, never a false green.
