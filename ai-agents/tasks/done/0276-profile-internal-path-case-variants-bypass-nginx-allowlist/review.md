# Review — 0276

Task: `ai-agents/tasks/done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md`
Plan: `plan.md` (owner-approved; blob `70a453b5b22f716bf02dd75ecfa4cba6f14b4431` — **re-hashed at review time, matches**)
File(s) under review:
- `src/profile-server/Routes.ts` (two regions: `:491`, `:343-353`)
- `setup-profile.sh` (two hunks: nginx heredoc `:1292-1306`, summary echo `:1684`)
- `tests/profile-server/InternalPathCase.test.ts` (new, 23 tests)
- `tests/profile-server/ErrorHandler.test.ts` (+4 unit cases, `:216-265`)
- `tests/scripts/profile-deploy-hardening.test.sh` (new `0276` section, 7 assertions)
Status: closed-out

**Round 1 verdict: ✅ Ready to merge (deploy-gated).** Two reviewers ran; one low, pre-existing,
cosmetic finding. No defect in 0276's own surface. The deployed result is still unproven — see
*Accepted residuals*.

> ## 🚨 Closeout caveat — read before calling this done
> **A green `npm test` is NOT the box being fixed.** The harness proves the config this script
> **writes**; the coder's container run proves it on **nginx 1.31.5**. **Unverified: the box's nginx
> version, its currently-deployed site file, and its `PROFILE_INTERNAL_ALLOW_IPS`.** The owner-run box
> probes (brief steps 2–6), after **profile deploy 2**, are the only proof of the *deployed* result.
> Closed-out here means *the review is finished*, not *the box is fixed*.

**Closed out 2026-09-16 with no second review round.** Both dispositions below are **driver
dispositions — NOT owner rulings** (the owner was mid-restore-drill on the live box, having just
proven the restore path `IDENTICAL`; neither item was a product decision worth interrupting for).
**The owner may overturn either freely.**

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | `setup-profile.sh:1684` | The summary echo claiming the `/internal/` nginx allowlist was "laid down (… case-insensitive `~*` since 0276)" runs **unconditionally**, outside the `if [ -n "$PROFILE_DOMAIN" ]` guard at `:1672-1681`. With `PROFILE_DOMAIN` unset the script prints "TLS/nginx skipped" and then still claims the allowlist exists. **Pre-existing** — identical placement at HEAD; `0276` changed only the line's text, and in doing so made the false claim marginally more specific. Cosmetic/reporting only; no runtime effect. Raised by Codex. **→ Disposition: routed to `0280`** (see *Dispositions*). |
| R2 | 1 | low | `setup-profile.sh:1303` | Coverage note, **no action required today**: `location ~* ^/internal/` (like the old `location /internal/`) does not match the bare path `/internal` — only `/internal/…`. No route exists at `/internal` today, so it 404s at the app either way and nothing is exposed. Worth recording only because `profileErrorHandler:351` explicitly contemplates `/internal` as a path (`lowerPath !== "/internal"`), which could lead a later reader to assume the two layers cover the same set. Latent, not live; `0279` owns internal-route hardening. |

### Dispositions — **driver disposition, 2026-09-16 — not an owner ruling**

Recorded by the `fkit-sprint-ship-loop` driver, not the owner. The owner was mid-restore-drill on the
live profile box (restore path proven `IDENTICAL` that day) and neither item was a product decision
worth interrupting for. **A later reader must not mistake either for owner authority; the owner may
overturn either freely.**

| # | Disposition | Detail |
|---|---|---|
| **R1** | **Routed to `0280` — not fixed here, and NOT dropped** | `0280` is the filed "stale/incorrect reporting and documentation" task (already carrying `architecture.md`'s stale route table and `CLAUDE.md`'s stale test figures). R1 belongs there, not in `0276`'s change set: tracking beats leaving it. The driver will have the producer add it to `0280`'s brief. ⚠️ Carried with the finding intact: it is a **real, if cosmetic, false statement in deploy output** — the script can print "TLS/nginx skipped" and then claim the `/internal/` allowlist exists. It is **pre-existing at HEAD**; `0276` changed only the line's **text**, not its placement or conditionality. |
| **R2** | **No action** | Latent coverage note only; nothing exposed today. `0279` owns internal-route hardening. |
| **Accepted residuals** | **All six accepted as written — now binding against future review rounds** | Each keeps the Re-raise condition written below. Listed there in full. |

**Not re-verified, deliberately:** the coder's plan-correction 1 (`//internal/…` was already 403 at
nginx under `merge_slashes`). The driver explicitly did **not** ask for it. Its standing stays exactly
**"reviewer-unverified, not disputed"** — the honest description. It changes no behaviour either way.

### ⭐ The two most load-bearing results of this review — preserve these

**1. Mutation B, reproduced independently by the reviewer: 16 failed / 7 passed — identical to
deleting `app.set` outright.**
Moving `app.set("case sensitive routing", true)` below the first `app.use` produces byte-for-byte the
same failure count as mutation A (deletion). **This is what proves the change set is not inert.** It is
the single failure mode that would have passed every test in the suite while the fix did nothing:
Express 4 builds its router lazily on the first route registration and reads app settings *at that
moment*, so a late `app.set` is silently ignored.
**Ordering confirmed in source:** `app.set("case sensitive routing", true)` at
`src/profile-server/Routes.ts:491`; the first `app.use` (0274's timing middleware) at
`src/profile-server/Routes.ts:512`. Strictly before.

**2. A hole nobody asked about, closed: a sub-`Router()` does NOT inherit `caseSensitive`.**
An `express.Router()` carries its **own** `caseSensitive` option and does not inherit the app's, so any
route mounted on a sub-Router created without `{caseSensitive: true}` would have stayed
case-**insensitive** — and the app-wide fix would have silently missed it.
**Evidence, not just the conclusion:** a repo-wide grep for `Router(`, `express.Router` and `.route(`
across `src/profile-server/` returns **zero** matches. Every route is registered directly on `app` —
`app.post("/internal/v1/players/resolve", …)` at `:718`, `app.post("/internal/v1/credit", …)` at
`:748`, `app.post("/internal/v1/messages/send", …)` at `:1079`, and the name-change decide route at
`:1255`. So the app-wide setting genuinely covers **all four** internal routes. Codex independently
confirmed the mechanism with its own Express probe: `_router` stayed `undefined` after `express()` and
after both `app.set(...)` calls, and existed only after the first `app.use(...)`.

### Verified — every load-bearing claim in the worklog held

Re-run independently by the reviewer, in an **isolated rsync copy** (`scratchpad/mut`, `node_modules`
symlinked); the repo tree was never mutated and was byte-confirmed unchanged after each mutation.

| Claim | Reviewer result |
|---|---|
| **Mutation B** — move `app.set` below the first `app.use` | **Reproduced: 16 failed / 7 passed.** The change set is **not** inert; the lazy-router ordering trap is real. |
| **Mutation A** — delete `app.set` | 16 failed / 7 passed — **identical to B**, as claimed |
| **Mutation C** — revert `.toLowerCase()` | 2 failed / 15 passed, as claimed |
| **Mutation F** — hoist `deny all;` above the allows | **Caught** by the positional-order assertion (the outage-shaped-as-security-fix case) |
| **Mutation G** — remove the whole location block | **6 failures, led by the extract-or-fail-loudly guard.** No assertion went vacuously green. |
| Ordering in source | `app.set("case sensitive routing", true)` at `Routes.ts:491`; first `app.use` at `:512`. Strictly before. |
| No sub-`Router()` escapes the app-wide setting | Confirmed — **zero** `express.Router` / `Router(` / `.route(` in `src/profile-server/`; every route is registered directly on `app`. A sub-Router would *not* inherit `caseSensitive`; none exists. |
| nginx block body unchanged | `${ALLOW_DIRECTIVES}`, `deny all;`, bare `proxy_pass` — **byte-identical to HEAD** apart from the header line. Verified by extracting both versions. |
| Touched nothing `0274` owns | `setup-profile.sh` carries exactly **two** `0276` hunks (nginx heredoc; summary echo). Persisted variables, value-report rows, OTLP probe and `checks.env` are all `0271`/`0274` hunks, untouched. |
| Tests send the **correct** token | `InternalPathCase.test.ts:33,150,166` — correct `PROFILE_INTERNAL_TOKEN`, so a regression shows as the handler **running (200)**, not an ambiguous 401. |
| Lowercase controls are non-vacuous | `:181-182` assert **both** `not.toBe(404)` **and** `toHaveBeenCalled()`. An app that 404'd everything would fail the spy assertion. |
| No over-correction in the error handler | Public paths still get `Access-Control-Allow-Origin: *` — verified by reading `Routes.ts:351-353` and by the dedicated guard at `ErrorHandler.test.ts:258-265`. `/internalization` does not match (exact `/internal` or `/internal/` only). |
| No non-lowercase path literal in-repo | Docker healthcheck (`setup-profile.sh:1000`) and operator curls (`:1675,1678`; `build-deploy-profile.sh:630`) all use lowercase `/health`. `profile-checks.sh` makes no HTTP call to these routes. Only matches repo-wide are the two new **comments** in `Routes.ts:345,477`. |
| No synthetic artifacts left in the repo | No stub cert, no RFC 5737 fake IPs, no scratch nginx config anywhere in `git status`. Clean. |

### Reviewer's own probe — raw paths on the wire

The worklog's edge-probe table was re-derived independently, sending **raw unnormalized request
lines** over a real socket (not supertest, which silently normalizes `/./` and `/..`):

- Only **exact-lowercase** `/internal/v1/credit` (± trailing slash) reaches an internal handler.
- `/INTERNAL/…`, `/Internal/…`, `/iNtErNaL/…`, `/internal/v1/CREDIT`, `/internal/V1/credit`,
  `/%49nternal/…`, `/internal//v1/credit`, `//internal/…`, `/./internal/…`, `/foo/../internal/…`,
  `/internal/v1/credit;x=1`, `/internal/v1/credit%2F`, `/internal/v1/cred%69t`, `/INTERNAL/v1/credit/`
  → **all 404, handler never called.**
- **Trailing slash is not a new bypass**, as the plan says: `/internal/v1/credit/` reaches the handler
  in Express (`strict routing` deliberately off) **and** matches nginx `~* ^/internal/`. Both layers
  cover it.
- **The set Express routes is a strict subset of the set nginx's regex matches**, so nothing Express
  will route to an internal handler can miss the allowlist. That is the property the fix needed.

> ### ⚠️ TRAP — read this before writing a path-traversal test against this app
> Under **supertest**, `/./internal/v1/credit` and `/foo/../internal/v1/credit` return **200 with the
> handler called**. That is **NOT** an Express bypass and **NOT** a defect.
> **superagent normalizes dot-segments client-side**, so what actually reaches the wire is the plain
> `/internal/v1/credit`. Sent **raw over a real socket**, both paths **404 with the handler never
> called** (reviewer-verified this round, using `http.request` with the literal path on the request
> line).
> Any path-traversal or normalization test written with supertest is therefore testing superagent, not
> this app. Use a raw `http.request` for those. The next person to probe this will otherwise lose a day
> chasing a bypass that does not exist.

### nginx location interaction

Only **two** locations exist in the HTTPS server block: `~* ^/internal/` (`:1303`) and the catch-all
`/` (`:1313`). Prefix matching picks `/`, then regexes are tried in file order and `~* ^/internal/`
wins for internal paths; no other path matches the regex, so nothing else changes. There is **no
`.well-known`/ACME location** to collide with — `certbot certonly --standalone` (`:1253`) handles
renewal, not an nginx location.

### Gates re-run by the reviewer (read-only)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean (exit 0) |
| `npm test` | **135 suites / 1724 tests, all passed**, 55.4 s — matches the worklog |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS`, including all 7 new `0276` assertions |
| `npm run test:integration` | **not run** — not required (no schema, migration or DB-path change); plan §7 says so explicitly |

**Flake rule:** no `supertest` flake occurred in any run — no `Exceeded timeout of 5000 ms`, no
"did not exit", no `socket hang up`. The `0197` SIGSEGV signature check therefore never came into
play and **no re-run was needed**.

### The two plan corrections — judged

1. **`//internal/…` was already 403 under the old prefix location** (`merge_slashes`). **Accepted as
   reported.** I independently confirmed the app-layer half (Express 404s it raw). The nginx half rests
   on the coder's containerized control probe, which I did **not** re-run — *reviewer-unverified, not
   disputed*. Either way it changes no behaviour and weakens nothing.
2. **`/%49NTERNAL/…` reached the app pre-fix, where Express 404'd the still-encoded path.** **Correct
   and consistent** with my own raw probe (`/%49nternal/…` → 404 at the app). The plan's claims stand.

Both corrections make the plan *more* accurate and neither changes the fix. Good practice; recorded so
the plan is not later read as wrong.

## Coder response

_(coder-owned — reviewer does not write here)_

## Accepted residuals (shared, do-not-re-litigate)

> **All six accepted 2026-09-16 — driver disposition, NOT an owner ruling.** They are **binding
> against future review rounds** from this point: a later round may not re-raise one unless its
> stated **Re-raise only if** condition is met. The owner may overturn any of them freely.
> (The first entry records the owner's *own* 2026-09-16 ruling on app-wide case sensitivity — that
> one *is* owner authority; its acceptance **as a residual** is the driver's.)

- **App-wide case sensitivity, not scoped middleware** — What: `case sensitive routing` is set on the
  whole app, so `GET /HEALTH`, `POST /V1/Login`, `GET /V1/Profile` and every other non-lowercase
  spelling now 404. · Why (structural): owner ruling 2026-09-16; Option C (scoped middleware) and
  B-only were presented and rejected. Scoped middleware buys nothing the app-wide setting does not and
  collides with `0274`'s mount point. Every in-repo caller uses lowercase literals (re-verified this
  round). · Re-raise only if: a caller **outside this repo** (monitor, uptime probe, bookmarked curl)
  is found using a non-lowercase path.
- **No rate limiter and no `internalAuth` failure log on `/internal/*`** — What: internal routes stay
  unthrottled and silent on auth failure. · Why (structural): deliberately out of scope for `0276`;
  task `0279` owns it. `0276` restores the *network* layer, which is what was lost. · Re-raise only
  if: `0279` is cancelled or deferred past the game deploy.
- **`strict routing` stays off** — What: `/internal/v1/credit/` still matches. · Why (structural): not
  a bypass — both layers cover the trailing-slash form (re-verified by raw probe this round);
  conflating it with case sensitivity would change unrelated public-route behaviour. · Re-raise only
  if: a route is added where trailing-slash and exact forms must differ.
- **The error-handler fix is defensive only** — What: unreachable over HTTP on a case variant now that
  routing is case-sensitive. · Why (structural): cheap, correct, and it survives a future revert of the
  routing setting; tested at unit level because an HTTP test would be vacuous. **Not** a fix for an
  exploitable leak. · Re-raise only if: `case sensitive routing` is reverted.
- **🚨 A green `npm test` is NOT the box being fixed** — What: both halves ride one ordinary profile
  deploy (`build-deploy-profile.sh` uploads and runs `setup-profile.sh` every time); no separate owner
  step. The harness proves the config this script **writes**; the coder's container run proves it on
  **nginx 1.31.5**. · Why (structural): nothing in-repo can reach the box. **Unverified: the box's
  nginx version, its currently-deployed site file, and its `PROFILE_INTERNAL_ALLOW_IPS`.** · Re-raise
  only if: closeout is attempted while claiming the *deployed* result is proven — the brief's
  owner-run box probes (steps 2–6, after deploy) are the only proof.
- **`architecture.md` route table and `CLAUDE.md` test figures are stale** — What: `0272`/`0273` route
  drift; `CLAUDE.md` still says 113 suites / 1185 tests at ~22–25 s, measured today at 135 / 1724 at
  ~55 s. · Why (structural): task `0280` owns both. · Re-raise only if: `0280` is cancelled.

## Suppressed as settled (raised, not dropped silently)

Nothing was suppressed this round — neither reviewer re-raised a settled tradeoff. The priming list
above was supplied to both passes.

## Convergence call

**Round 1, first pass — no loop risk.** Two findings, both low, neither a defect in `0276`'s own
change. R1 is a pre-existing cosmetic reporting bug on a line `0276` happened to edit; R2 is a latent
coverage note with no live exposure. Neither blocks.

**Closed out 2026-09-16. No second review round.** R1 routed to `0280` (tracked, not fixed here, not
dropped); R2 no action; all six residuals accepted as binding. Both dispositions are **driver
dispositions, not owner rulings** — see *Dispositions* above.

**What "closed-out" does and does not mean.** It means the **review** is finished: two reviewers ran,
every load-bearing claim was independently re-verified, and the open items are dispositioned. It does
**not** mean the box is fixed. `0276` rides **profile deploy 2** with `0274`; the brief's owner-run box
probes (steps 2–6) after that deploy are the only proof of the deployed result. See the closeout
caveat at the top of this file.
