# PR 114 — Stop the Bounce: Durable Hardening Doctrine for Profile Deploy

> **Status:** active doctrine. **Scope:** the profile-backend deploy pipeline —
> `setup-profile.sh`, `build-deploy-profile.sh`, `scripts/check-docker-secret-boundary.sh`,
> `Dockerfile.profile`, and `tests/scripts/*`.
> **Related:** [`registry-image-policy.md`](registry-image-policy.md) ·
> [`secret-rotation-inventory.template.md`](secret-rotation-inventory.template.md) ·
> T5 task `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md`.

Keep this open on every future change to the files above. Read section 4 before every push.

**One rule governs the whole document: anchor edits and tests by unique grep string, never by
absolute line number.** The line numbers have already drifted between reviews. Every line reference
here is a *hint to grep*, not a coordinate to edit. Every new test must locate its target with
`firstIndex(/regex/)` / a unique grep string — the pattern every existing test in `tests/scripts/`
already uses — so the matrix cannot rot when the files move again.

## 1. The diagnosis

Nine adversarial-review rounds each ended in a *new* finding because every fix patched the named
instance, not the class, and shipped without first re-running the adversary's own lens across the rest
of the diff. F2/F10/F11 are three points on one curve (the hand-rolled awk Dockerfile parser is
allowlist-by-recognized-form; its default for anything it doesn't model is *pass*). F6/F7/F9/F12 are
four points on another (the deploy certifies a *proxy* — discrete-cred `psql` auth plus dependency-free
`/health` — never the exact `DATABASE_URL` the API consumes). F1/F3/F8 are three points on a third
(rollback is a hand-maintained mirror of the forward sequence built from ad-hoc flags, so any
unregistered mutation has no undo). Two compounding mistakes pinned the verdict: **(a) fix-the-instance**
— each round changed the failing *input* and pinned it with a test, never the *oracle*, so the adversary
just enumerated the next untested point on the same surface; and **(b) ship-before-self-adversary** —
with five classes live at once, fixing one class per round guarantees at least one needs-attention every
round. The loop is not bad luck; it is the mechanical consequence of patching symptoms one at a time
across a multi-class surface with no pre-submission sweep.

**A third mistake this document removes: shipping an ambivalent doctrine.** Roughly half of these
findings are *already closed in the current code*. The danger now is the opposite of round one — a
specialist who rewrites working code, re-opens a settled question, or pins a fabricated citation into CI
manufactures round ten by hand. Every section below commits to one answer, separates *already-landed
(keep its test green)* from *new work this PR*, and cites only anchors that actually resolve in the
source.

## 2. The five recurring classes

| Class | Findings | Root cause | The ONE structural fix |
|---|---|---|---|
| **A. DB / DATABASE_URL authenticity** | F6, F7, F9, F12 | Two DB credential paths exist; the gate validates the one the API does *not* use (discrete-cred `psql` + dependency-free `/health`), never the literal `DATABASE_URL` the API consumes. | **Decided: keep `DATABASE_URL`, validate the exact string (A-ii).** Make the gate a real `SELECT 1` over the *exact* `DATABASE_URL` from `profile.env`, run **stdin-only** (no password in any argv — preserves the F7 fix). Honors the T5 contract and the green pin "profile.env always emits a DATABASE_URL line" without test churn. The DB-backed `/ready` healthcheck repoint is T5's; PR 114's job is to stop recording `passed` on a proxy. |
| **B. Docker secret-boundary parser arms race** | F2, F10, F11 | A hand-rolled awk re-implementation of Docker's lexer is allowlist-by-form; its default for any unmodeled construct is *pass*, and it's treated as authoritative. | Invert authority: the **post-build scan of the actual image filesystem** (`--inspect-image`) is the gate (whole added-fs, content-matched against the repo's real secrets). The awk scanner is demoted to a **fail-closed advisory** — reject by default on anything it can't fully normalize. |
| **C. Rollback completeness & fail-loud** | F1, F3, F8 | Rollback is a hand-maintained mirror of the forward sequence, built from per-resource boolean flags; any mutation the author forgets to register has no undo, and silenced undos hide their own failure. | Replace flag-soup with one append-only LIFO undo stack: every forward mutation pushes its inverse on the line *after* it executes; the trap replays in reverse through one `run_undo` wrapper that never silences and always re-exits the original code. |
| **D. Concurrency / locking / record integrity** | F4, F5 | No single locking discipline spans the deploy. The local record is two unsynchronized appends with no lock; the remote lock starts after SSH; an unavailable lock warns-and-continues. | One discipline: a fail-closed local lock acquired *before* the first record write and held across the SSH boundary (`flock` on the Linux box, but a portable atomic `mkdir` mutex on the macOS dev host, which has **no** `flock`); the record written as **one atomic append of a complete block** via temp file; remote `flock` stays as the box-level backstop. |
| **E. Scope / future-API contract** | F9, F12 (+ meta) | The deploy asserts a present-tense fact (process alive, `psql` accepts the password) as a stand-in for a future-tense guarantee (the real API endpoint works), and no reviewer-facing artifact declares the boundary. | Make the scope boundary a first-class, reviewer-visible artifact: a scope block + PR description naming what's guaranteed NOW vs. deferred to T5, citing the **quoted** scope item and acceptance bullet (never a numeric "#N"), with tracking tokens at each in-code deferral point. |

**This list is OPEN, not exhaustive.** Rounds 10+ proved these five classes were the round-1–9 surface,
not a closed set. Surfaces born after the doctrine froze — boundary-widening operator input (I-F),
cross-redeploy state persistence (I-G), build portability (I-H) — are governed by invariants added in
§11.3, which *extend* §4 Lens 6 from a one-time check into standing invariants. Ask the §11.2 MR-3
new-surface question for every operator-supplied input and every cross-redeploy promise; a surface with no
governing invariant is one you have not written yet, not one out of scope.

## 3. Operating principles

1. **Fail closed, never open.** No path may warn-and-continue or pass-by-omission on a
   security/integrity decision. "Not recognized" must mean "blocked." Applies to lock acquisition,
   escape/`# syntax=`/`# check=` directives, unmodeled COPY forms, and DB validation alike.
2. **Certify the real artifact, not a proxy.** Validation must exercise the *exact* thing the running
   system consumes: the literal `DATABASE_URL` via the `pg` client; the actual built-image filesystem.
   Discrete `psql` creds and a text scan may *supplement* the real oracle but never *be* it.
3. **Rollback is a fail-loud state machine, not a flag mirror.** Every host/stack mutation after the
   trap installs has a registered inverse. No `|| true` with discarded output and no `2>/dev/null`
   inside the rollback path. Every undo reports ✅ restored or ❌ failed-with-diagnostics. The trap
   always re-exits the *original* failure code, never 0.
4. **One lock per state domain, fail-closed, acquired before the first write.** An unavailable lock is
   fatal, symmetrically local and remote. Shared records are written as one atomic append of a complete
   block — a body line never lands without its matching result in the same write.
5. **Close the class, then sweep all open classes in the same submission.** When a review names instance
   N, change the *oracle*, enumerate the rest of that class yourself, add the missing variants, then run
   the other four class oracles. One-class-per-round can never reach clean.
6. **Never claim completeness for a hand-rolled parser unless it fails closed on the unknown.** The
   Round-8 stance ("static catches every broad copy") was falsified twice precisely because the awk
   enumerated forms it understood and passed the rest. A pushback resting on a hand-maintained parser is
   unsafe; one resting on a real-tool oracle (actual `docker build` + full-image scan) is defensible.
7. **The data-bearing volume is never auto-deleted.** `down -v` appears only as an echoed operator hint,
   never as an executed command, in any rollback state.
8. **Say what you validate; declare what you defer.** `validation_result=passed` may claim only what the
   gate actually exercised. Anything it can't yet exercise must be named as deferred in a
   reviewer-visible place — an undeclared validation gap is itself the bug.
9. **Don't regress what's already green; don't rewrite settled answers.** ~Half these findings are
   already closed. Touch already-landed code only to extend it, never to "re-fix" it; grep for the
   unique string first; cite only anchors that resolve.

## 4. Pre-submission adversarial self-review checklist

Run this over the **whole diff**, not just the lines you touched, before every push. Any "wrong" answer
blocks submission.

**Lens 1 — Fail-open vs fail-closed**
- [ ] Does any path `warn-and-continue`, `|| true`, or fall through to an implicit pass on a
  security/integrity decision? (Must be NO.)
- [ ] Does every parser/guard REJECT on input it cannot fully model, rather than pass by omission?
  (Must be YES.)

**Lens 2 — Fresh vs existing state**
- [ ] Does it behave correctly on a **first-time** deploy (no backups, no existing volume) *and* on a
  redeploy? (Must be YES.)
- [ ] On a fresh-deploy failure, is every mutation (stack, volume-preservation, nginx site set, nginx
  running-state) left clean or loudly reported? (Must be YES.)

**Lens 3 — Concurrent invocation**
- [ ] Is the critical section locked *before* the first shared-state write, and is an unavailable lock
  fatal? (Must be YES.)
- [ ] Is every shared-record write a single atomic append of a complete block? (Must be YES.)

**Lens 4 — Output suppression**
- [ ] Does any recovery/rollback action discard output or redirect to `/dev/null`, hiding a failure that
  matters at recovery time? (Must be NO.)
- [ ] Does the failing path preserve and re-exit the original exit code? (Must be YES.)

**Lens 5 — Proxy vs real artifact**
- [ ] Am I validating a stand-in (discrete creds, text scan, liveness `/health`) or the exact artifact
  that ships (the literal `DATABASE_URL` via `pg`, the built-image filesystem)? (Must be: real artifact,
  or the gap is explicitly scoped to T5 with a quoted citation.)

**Lens 6 — Future consumers**
- [ ] For every "the box provides X for a future consumer" promise (`DATABASE_URL`,
  `PROFILE_INTERNAL_TOKEN`, `/internal/` allowlist), is it proven end-to-end now or named as
  deferred/unvalidated in a reviewer-visible place? (Must be YES.)

**Meta-sweep**
- [ ] Have I run the other four class oracles against the current scripts, not just the class this round
  named? (Must be YES.)
- [ ] Does the scope doc / PR body still match the actual validation surface? (Must be YES — coupled by
  test.)
- [ ] Did I touch already-landed code (Class A `urlencode`, Class B `assert_default_escape` / var-source
  reject, Class C fresh-deploy nginx removal, Class D remote-flock abort, the digest result line) only
  to *extend* it, leaving its pinned test green? (Must be YES.)
- [ ] Does every citation I added resolve to real, quoted text in the cited file — no numeric
  "criterion #N"? (Must be YES.)
- [ ] Did I run the §11.4 invariant-coverage sweep — for EACH invariant I-A..I-H, every governed site
  grepped and checked at MR-2 granularity, not just the site this round named? (Must be YES — the
  procedural complement to these lenses; see §11.2 MR-2/MR-4.)

## 5. Per-class structural fixes and proof-of-closure test matrices

Each class opens with an **Already closed (keep green)** / **New in this PR** split so you never rewrite
working code.

### Class A — DB / DATABASE_URL authenticity

**Decision: A-ii (validate the exact string). A-i (drop the URL) is rejected** — it would break the
pinned test "profile.env always emits a DATABASE_URL line" and silently defer the whole authenticity
question to T5.

**Already closed (keep green):** `urlencode()` + its adversarial round-trip test (**F6 is genuinely
closed — don't weaken either**); the argv-safety invariant in `probe_db_credentials` (password via
stdin/`PGPASSWORD`, never argv — the F7 fix, pinned by `setupProfileDbProbe.test.ts`); the
self-identifying digest on the result line in `build-deploy-profile.sh`.

**New in this PR:** an authoritative gate that opens a real connection using the **exact** `DATABASE_URL`
from `profile.env` and runs `SELECT 1`, **stdin/env-only** (never in argv); on failure records `failed`.
Keep `probe_db_credentials` for first-init/password-drift detection but **fix its comment** to say it
tests a *different* credential path and is supplementary. Route the operator-supplied `DATABASE_URL`
**through the same gate** — no verbatim trust. The `/ready` healthcheck + compose repoint remain **T5**
(dependency-free `/health` for liveness stays correct).

**Test matrix:** operator override verbatim-but-wrong (wrong dbname/port/stale password) while discrete
creds are correct → deploy FAILS (today: passes — the live F12 hole); scheme/parse divergence
(`postgres://` vs `postgresql://`, IPv6, empty password, `?sslmode=`) → gate and `pg` agree;
readiness-not-liveness pinned as deferred to T5; correct config → `SELECT 1` succeeds → `passed`; keep
`urlencode` round-trip green; extend the argv-safety regression to the new URL gate.

### Class B — Docker secret-boundary parser arms race

**Profile-image caveat (read first):** `Dockerfile.profile` is **single-stage** (`FROM node:24-slim`,
no `AS`), and `build-deploy-profile.sh` calls **`--inspect-image` only** (never `--runtime-image-check`).
So the authoritative gate is `--inspect-image`, and the "whole added filesystem" it must scan is the
diff of the final image **vs base `node:24-slim`**. The multi-stage `COPY --from=A` test below is a
*parser-class* regression for the static scanner and any future multi-stage Dockerfile; it doesn't map
onto the profile image as written.

**Already closed (keep green):** backtick-continuation under `# escape=` (`assert_default_escape` —
original F2/F11); variable-in-source rejection in `scan_broad_copies` (keep the REJECT on `$` in a
COPY/ADD source).

**New in this PR — load-bearing:** harden `--inspect-image` (the `find /usr/src/app -maxdepth 4` line,
currently filename-only) to scan the **whole image filesystem** (`find / -xdev`), detecting by
**content** — a sha256 match against the repo's real `.env*`/`*.secret`/`*.pem`/`id_rsa*`/`*.key` files —
*and* by a **conservative** filename scan (`.env`, `.env.*`, `*.secret`, `.git/`). Invariant to every
Dockerfile syntax trick because it observes resulting bytes. Exclude example suffixes
(`.env.example/.sample/.template`) while still flagging bare `.env`/`*.secret`. **Do NOT
whole-filesystem NAME-match `*.pem`/`id_rsa*`** — base images and dependencies legitimately ship CA
bundles and test certs, so name-matching those across the rootfs would FALSE-POSITIVE and fail every
deploy. The name scan also **excludes `node_modules`** (dependency fixtures). Novel/renamed key material
is still caught by the CONTENT hash match, which covers the whole rootfs (node_modules included) and
prints the matching path so a rare identical-fixture match is adjudicable. **Fail closed if `docker run`
itself fails** — an unavailable oracle must abort the deploy, never read as "no secrets found" (an early
`docker run … || true` form silently did the latter). Rewrite `scan_broad_copies` to
**default-REJECT** any COPY/ADD it can't normalize: reject heredoc COPY/ADD (`<<`), keep the
`$`-in-source REJECT, reject any `# syntax=` not pinned to the official image, and **fix the
continuation loop to not join across a `#` comment line** (skip heredoc *bodies* so a `RUN cat <<H … H`
body isn't false-flagged).

**Test matrix:** the **verified-still-live** comment-continuation bypass (`FROM node:24-slim` /
`# foo \` / `COPY . /app` → scanner EXIT=0 today) → after fix exits non-zero; heredoc COPY → REJECT;
heredoc body containing `COPY . /app` → PASS; custom/remote `# syntax=` → REJECT unless pinned;
multi-stage broad copy (parser-class, not the profile image) → image scan catches it; whole-fs ground
truth (`/opt/leaked.env` outside `/usr/src/app`) → `--inspect-image` FAILS (today: missed); node_modules
example → PASS, node_modules real-secret content → FAILS; a malformed/unknown COPY-like token → static
REJECT (encodes fail-closed so the next quirk can't reopen the class).

### Class C — Rollback completeness & fail-loud

**Already closed (keep green):** the stack-recreate failure report (`docker compose ps` + logs) —
landed F3/F8; `local rc=$?` + `return $rc`; `down` (no `-v`) as the only executed teardown with
`down -v` echoed as a hint. **Extend into the LIFO; don't rewrite.**

**Fixed here (was a FALSE "closed" claim — F-6 in the wild):** a prior revision of this section listed
the fresh-deploy nginx branch (`reload || stop`) as closed. It was NOT: `reload` cannot start a stopped
unit, so after certbot `--standalone` stops nginx a failed first-TLS deploy left a previously-RUNNING
nginx DOWN (and printed a misleading ✅). Fixed by capturing `NGINX_WAS_ACTIVE`
(`systemctl is-active --quiet nginx`) before the stop and, on rollback case (b), restoring that exact
state (`systemctl restart || start` when it was up; surface ❌ if it can't return; leave it down
otherwise) — the non-LIFO realization of the `systemctl start nginx` undo prescribed below.

**Fixed here (deploy/rollback scope, Finding 1):** the routine deploy ran `docker compose pull` + `up -d
--force-recreate` for the WHOLE project, so every API ship silently re-pulled and force-recreated the
data-bearing postgres (non-reproducible binary drift + needless DB downtime), even though only
profile-api is digest-pinned. Now the forward path and the rollback recreate scope to the API:
`docker compose pull profile-api`, `docker compose up -d postgres` (converge in place — never a silent
image bump), then `docker compose up -d --force-recreate --no-deps profile-api`. postgres stays the
major-pinned official `postgres:16-alpine` (same-major patches are on-disk compatible, so this is not a
data-format risk); a DB image change is a deliberate, separate maintenance action.

**New in this PR:** replace per-resource flags with one append-only LIFO stack.
`register_undo() { ROLLBACK_ACTIONS+=("$1"); }`; every forward mutation pushes its inverse on the line
*after* it executes; `rollback_deploy` iterates in reverse through one `run_undo "<label>" <cmd...>`
that captures output, prints ✅/❌ + diagnostics, sets `ROLLBACK_HAD_FAILURE`, prints a final "fully
restored / not fully restored" line, then `return $rc`. Push the stack-recovery undo on the line
**directly before** `docker compose up --force-recreate` (physically eliminates the `STACK_RECREATED`
flag). **Close the live default-site gap NOW:** before `rm -f /etc/nginx/sites-enabled/default`, capture
existence and register an undo that recreates the symlink (today it's removed and never restored —
net-new coverage). On `systemctl stop nginx` (fresh deploy) push `systemctl start nginx`. Prefer
bringing systemd + cron writes inside the trap region as registered undos, moving `DEPLOY_VALIDATED=1`
to the true end.

**Test matrix:** state-coverage S1..S6 (drive `rollback_deploy` through each failure state; assert
resulting config/site/running-state/stack/volume == pre-deploy snapshot — one case per state, so a new
mutation with no undo fails); fresh-deploy certbot failure → nginx restarted, profile site absent, stack
down, volume preserved; default-site restoration (S5, the live gap); a no-silencing static assertion
over **all** undo commands; exit-code preservation in every state; a LIFO-completeness guard (every
forward mutation token has a matching `register_undo`); rollback-failure reporting; `down -v` never
executed in S3..S6.

### Class D — Concurrency / locking / record integrity

**Already closed (keep green):** the remote box fail-closed gate (`setup-profile.sh` aborts when `flock`
unavailable / lock held, pinned by `setupProfileFailClosed.test.ts`). **Don't move the remote `flock`
earlier — it can't run before SSH connects.**

**New in this PR — the live local gap (`build-deploy-profile.sh` still does an unlocked two-step
`tee -a`):** a fail-closed local mutex acquired **before** the first record write and held across the
SSH call. **NOT `flock`** — `build-deploy-profile.sh` runs on the developer HOST, which is often macOS
where `flock` does not exist; a `command -v flock` fail-closed check (symmetric with the remote) would
abort *every* local deploy. Use a portable atomic `mkdir` mutex (gitignored fixed path, e.g.
`.profile-deploy.lock`): `if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then echo 'another profile deploy is
already running'; exit 1; fi`, released by the EXIT trap (`finalize_deploy`); add `.profile-deploy.lock`
to `.gitignore`. **Atomic record write:** stop the early `tee -a`; accumulate body lines into a
`0600 mktemp`; in `finalize_deploy` append the final `validation_result=<outcome> digest=<digest>` to
that *same* temp file, then one `cat "$tmp" >> "$DEPLOY_RECORD"` while the mutex is still held — and
**guard the write so a record-write failure never aborts the EXIT trap before the lock is released** (a
skipped `rmdir` would leave a stale lock that blocks every future deploy). Keep fixed-name
`predeploy.bak`. (The remote box keeps `flock` — it is Linux.)

**Test matrix (new `tests/scripts/profileDeployRecordConcurrency.test.ts`, grep-anchored):** N parallel
writers under the lock → N complete contiguous blocks, no interleave; the **old two-step `tee -a`
pattern** under concurrency → corrupt (control proving the atomic single-append is load-bearing — the new
temp+single-append is interleave-resistant on its own, so the control replicates the *old* code, not the
new code without the lock); lock already held → exits non-zero, writes nothing (fail-closed); a
record-write failure still **releases the lock** (no stale lock left behind); `----` count ==
`validation_result=` count.

### Class E — Scope / future-API contract

Documentary, not runtime (the Class-A real-string gate closes the runtime half of F9/F12; this closes
the reviewer-visibility half).

**Citation rule (load-bearing):** `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md` has **6
unnumbered Acceptance bullets and a numbered Scope list**. There is **no "criterion #55"** — cite only
stable quoted anchors: **Scope item 5 — "DB connection + readiness check,"** and the final Acceptance
bullet, quoted: *"The DB readiness probe returns ready ONLY when a real query over the API's actual
connection succeeds — a broken `DATABASE_URL`/credentials must make readiness (and thus the deploy gate)
FAIL, not pass."* (The T5 file already cites review rounds #7 and #12 — that cross-reference is correct.)

**Change:** rewrite the PR description with two sections — *"Validation guaranteed by this deploy"*
(services healthy; discrete-cred TCP auth; the new real `SELECT 1` over the exact `DATABASE_URL`;
digest-pinned deploy + rollback; secret-boundary static + image scan) and *"Deliberately out of scope —
tracked"* (DB-backed `/ready` wiring is T5, with the quoted anchors). Consolidate scattered scope
comments into ONE anchored block (this file or a `setup-profile.sh` header). Add tracking tokens at each
deferral point reading like `<deferred>; owned by T5 (s4-profile-05-backend-db-api.md — Scope item 5
"DB connection + readiness check")`, **never a numeric "#N".**

**Test matrix:** doc/code-coupling lint (fails if the validation surface changes without the scope doc
being touched); deferral-token presence (each names T5 by quoted text; assert no `#\d+` numeric
criterion reference exists); operator-override-now-validated regression; scope-boundary pin (readiness
*wiring* deferred to T5 while the *string-authenticity* gate is present now).

## 6. Scope decisions — made and written down

1. **What does `passed` promise?** Decided **A-ii**: box infra healthy **and** the exact `DATABASE_URL`
   opens a real connection (`SELECT 1`, stdin-only). Keep URL synthesis + the `profile.env` line.
   `/ready` readiness wiring is T5. → PR description + this scope block.
2. **Is PR 114 responsible for not-yet-existing DB endpoints?** **No.** It's the T4 ops-foundation
   slice; the real-connection readiness probe is **T5 Scope item 5**. PR 114's only remainder of F9/F12
   is *stop recording `passed` on a proxy* — closed by the Class-A gate. → "Out of scope — tracked"
   section with quoted T5 anchors.
3. **Operator-supplied `DATABASE_URL`.** Routes through the same real-connection gate — no verbatim
   trust. → this scope block + regression test.
4. **Secret-boundary authority.** The post-build image-filesystem scan is **authoritative**; the awk
   scanner is a **fail-closed advisory pre-filter**. Overturns Round-8 in writing. → also recorded in
   [`registry-image-policy.md`](registry-image-policy.md) / `Dockerfile.profile` header.
5. **Rollback boundary / nginx default-site.** Trap region extends to the true end (systemd/cron as
   undos); restoring `sites-enabled/default` on failure **is in scope**; `postgres_data` is
   **PRESERVED** with a `down -v` hint. → `setup-profile.sh` header + state matrix.
6. **Concurrency contract.** A local atomic `mkdir` mutex serializes one workstation (NOT `flock` — the
   macOS dev host has none); remote `flock` is the cross-host serializer; `.profile-deploy-record` is a
   **per-workstation provenance log** (digest-on-result-line
   makes logs mergeable), not a global ledger. → `build-deploy-profile.sh` header + concurrency test.

## 7. The new review cadence — making the next review the last

1. **Change the oracle, not the input.** Connect with the real `DATABASE_URL`; scan the real image
   filesystem; push the inverse on the line after the mutation; lock before the first write. Adding awk
   case N+1 or pinning input N has failed five times — stop.
2. **Enumerate the rest of the named class yourself** and add every missing variant in the same PR (the
   §5 matrices are the enumeration).
3. **Sweep the other four classes** before submitting (§4 lenses over the whole diff).
4. **Don't regress what's green; cite only what resolves.** Extend already-landed code, grep don't
   line-number, quote real text — a fabricated citation pinned into CI is itself round ten.
5. **Couple docs to code** with the doc/code-coupling test so a true-but-out-of-scope finding can be
   *triaged* ("correct, out of scope, owned by T5 Scope item 5, rationale in this scope block") instead
   of *re-actioned*.
6. **One CI class-sweep job** runs all five class oracles so a regression in any open class blocks merge
   in one shot.

**Pushback — legitimate vs unsafe.** Legitimate when it rests on a real-tool oracle or a written,
tracked scope boundary ("the image-filesystem scan observes the real bytes regardless of Dockerfile
syntax"; "correct but out of scope, owned by T5 Scope item 5, rationale in this file"). Per CLAUDE.md's
Review Notes rule, an evidenced disposition isn't deference-dodging — verify the claim (it's usually
true), then dispose of it with the citation. **Unsafe** when it rests on a hand-maintained parser's
claimed completeness: the Round-8 stance was falsified twice. If you must claim a gate is complete, the
claim must rest on a fail-closed-by-default oracle (actual `docker build` + whole-filesystem content
scan), not the awk.

The next review is the last one when, in a single submission, you (a) changed the oracle for the named
class, (b) closed the rest of that class with its full test matrix, (c) swept the other four classes,
(d) wrote the scope boundaries — with citations that resolve — where the reviewer reads them, and
(e) left every already-green pin untouched.

## 8. The executable merge bar

The §5 matrices are enforced by ONE test — `tests/scripts/profileDeployClassSweep.test.ts` — wired
into the single CI class-sweep job (§7.6). It is the gate that makes "class closed" mean GREEN, not
"we wrote a paragraph about it." It locks the **invariants** of §9 (the whole sub-surface of each
class, not the one instance a reviewer reported) and encodes the **merge-bar states** and the
**residual-risk register** of §10. A regression in any open class — or a new sub-instance of a closed
one — turns it red at the bar, not in the next review.

## 9. Invariants

Each class is re-framed from "the reported instance" to a property over its whole sub-surface. The
merge bar (§8) asserts these directly:

- **I-A — Argv-safety (Class A).** No secret the pipeline consumes — the Postgres password in ANY
  libpq channel (`user:pass@` userinfo, `?password=` / `&password=` query, the case-insensitive
  variants of either; plus `DOCKER_TOKEN`, `PROFILE_INTERNAL_TOKEN`, the SSH password) — may ever
  appear as a token in ANY process's argv (developer host, host `docker`/`scp`/`ssh`, in-container
  `psql`/`pg_dump`). The only sanctioned transport is stdin→env (`PGPASSWORD`, `--password-stdin`) or
  a 0600 file. argv is observable via `ps`, `/proc/<pid>/cmdline`, execve auditing, process collectors.
- **I-B — Secret boundary observed on real bytes (Class B).** The image secret boundary is certified
  against the real image filesystem (whole-rootfs content sha256 + a conservative name scan),
  fail-closed if the oracle (`docker run`) is unavailable. The awk Dockerfile scanner is a fail-closed
  advisory pre-filter, never the authority.
- **I-C — Rollback provenance (Class C).** (a) The box rollback restores the previously-running
  on-disk config and must NEVER refuse for lack of a passed record (refusing at the recovery moment,
  gated on a ledger that can be lost / written-failed / produced on another workstation, is the
  failure mode). (b) The forward path pins the **profile-api** image by digest
  (`PROFILE_DEPLOY_REF=$PROFILE_DIGEST`, refuses mutable tags), so every compose the pipeline writes
  bakes an `@sha256` profile-api ref; postgres is intentionally the major-pinned official tag
  (`postgres:16-alpine`), never silently re-pulled or bounced — a routine deploy pulls/recreates only
  profile-api (Finding 1). (c) The rollback recreate is gated on a SELF-CONTAINED `@sha256` check of the
  restored profile-api image (never roll back to a pre-hardening image — `registry-image-policy.md`
  L64); a non-digest image fails LOUD with a break-glass banner. That check reads no ledger, so it does not violate (a). The
  `.profile-deploy-record` is a developer-workstation log, never consulted by the box.
- **I-D — Shared-resource locking (Class D).** Every shared on-disk/remote resource a deploy mutates
  is covered by exactly one owning lock acquired BEFORE first use, on the SAME host where the resource
  lives (the remote `flock /var/lock/profile-deploy.lock` for box resources; the local `mkdir` mutex
  for the developer-host record/lock), OR is uniquely named per deploy so no lock is needed (the
  remote env-staging path is allocated host-side with `mktemp`). A per-workstation lock cannot cover a
  cross-workstation resource.
- **I-E — Scope boundary (Class E).** Anything correct-but-out-of-scope is documented and tracked at
  the point a reviewer reads it (a scope block + a tracking token citing the owning task), so it is
  triaged, not re-actioned. The deploy certifies only what it actually exercises.

## 10. Merge bar & residual-risk register

### 10.1 The three states

A result in the merge bar (§8) is one of three states:

- **Must-fix residual → RED test.** An ordinary `test(...)` that stays red until the fix lands. It
  BLOCKS merge. (`test.failing` is wrong here — it renders as a passing ✓ and would not block.)
- **Accepted residual → skipped, tracked.** A `test.skip(...)` whose title carries the `RESIDUAL[id]`
  and its disposition. It shows as SKIPPED — visible, tracked, never red — and has an OPEN row in
  §10.2. The owner has frozen it.
- **Closed class → green guard.** A green `test(...)` (named `CLOSED[id]` for a former residual) that
  locks the whole CLASS, so a NEW sub-instance turns it red at the bar.

### 10.2 Residual-risk register

The authoritative register of accepted residuals and closed-former-residuals. The merge bar is
coupled to this table in BOTH directions — every OPEN row ↔ a tracked `test.skip` naming the id and
disposition; every CLOSED row ↔ a green `CLOSED[id]` guard and NO skip — so neither the table nor the
tests can drift without turning the coupling test red. Row format:
`` `RESIDUAL[id]` `` — disposition — OPEN|CLOSED — rationale.

- `RESIDUAL[A-sshpass]` — was accepted: tracked — CLOSED — the SSH password no longer reaches argv: the
  deprecated, default-off `ALLOW_PROFILE_SSH_PASSWORD_FALLBACK` path now feeds `sshpass -f` from a 0600
  temp file (only the file PATH is in argv, never the secret), cleaned by `finalize_deploy`. Locked
  green by `CLOSED[A-sshpass]`.
- `RESIDUAL[D-remote-script]` — was accepted: benign — CLOSED — `REMOTE_SCRIPT` was a fixed-name path
  scp'd pre-flock. The "benign because content is deploy-invariant" rationale was false across
  commits/PRs/local edits: a concurrent operator could overwrite it between our upload and execute, so
  a deploy would run THEIR script version with OUR env (provenance mismatch / a stale rollback path).
  It is now allocated per-deploy with host-side `mktemp` (validated, cleaned by `finalize_deploy`), so
  each deploy runs exactly its own content. Locked green by `CLOSED[D-remote-script]`.
- `RESIDUAL[C-R3]` — accepted: comment — OPEN — the `build-deploy-profile.sh` "rollback-eligible"
  wording overstates the mechanism (the box reads no record); the fix is wording reconciliation, not
  behavior — gating rollback on a record would refuse it exactly when most needed.
- `RESIDUAL[D-R2]` — was accepted: fast-follow — CLOSED — `REMOTE_ENV` was keyed on the local shell
  PID and collided across workstations; it is now allocated host-side with `mktemp` and
  pattern-validated. Locked green by `CLOSED[D-R2]`.
- `RESIDUAL[G-token-persist]` — accepted: cross-redeploy persistence (M1 / I-G) — OPEN — an env-supplied
  `PROFILE_INTERNAL_TOKEN` is read (`Using PROFILE_INTERNAL_TOKEN from environment`) but never written;
  the only persistence write `( umask 077; printf '%s' "$PROFILE_INTERNAL_TOKEN" > "$PROFILE_TOKEN_FILE" )`
  sits in the generate-only `else` branch, so a blank-env redeploy silently reuses a different earlier
  token or regenerates one. Fix is to persist an env-supplied value (0600, atomic) on the run that
  introduces it. Tracked via `test.skip` until closed.
- `RESIDUAL[B-pattern-drift]` — accepted: single-source gap (M2 / I-B) — OPEN — the secret-name pattern
  set is hand-retyped across `.dockerignore` (`.env` + `.env.*`), `.gitignore` (`.env*`), and four sites
  in `check-docker-secret-boundary.sh` (`require_literal_line ".env"`/`"*.secret"`; runtime
  `-name ".env*" -o -name "*.secret"`; content-detector `id_rsa*`/`*.key`; per-layer
  `-name '.env' -o -name '.env.*'`) with no shared constant. The copies have drifted (two-line vs `.env*`
  glob) and neither `.envrc` nor `.envlocal` is covered anywhere (`grep -rE '\.envrc|\.envlocal'` exits
  1). Fix is one canonical pattern set with a drift guard that fails if any site re-implements the
  literals (MR-1). Tracked via `test.skip` until single-sourced.

## 11. Why the bounce outlived the doctrine — second-order meta-rules

> **Status:** active doctrine, second-order extension. Read after §4, alongside §9/§10.
> Same anchoring rule: grep string, never line number, never numeric "criterion #N".
> Additive only — this section adds invariants and meta-rules; it re-opens nothing the Appendix
> already marks closed. Where it touches a closed finding it does so as a cross-reference, per
> Principle 9.

Rounds 1–9 produced five *bug classes* (§2), and the class sweep closed most of them (the Appendix
register). Rounds 10+ surfaced something the five-class frame did not generate: not a sixth class, but
*new surface born after the doctrine froze*, plus one structural way a prose invariant can physically
fail to be enforceable in code. §11 names the two durable second-order failure modes (§11.1), gives one
meta-rule per mode plus the per-site coverage discipline §3.5/§4-meta already mandate (§11.2), lifts the
genuinely-new sites to invariants continuing the §9 lettering (§11.3), gives the per-invariant coverage
sweep that is the procedural complement to §4 (§11.4), and states what each new invariant owes the merge
bar (§11.5).

### 11.1 The second-order diagnosis — two doctrine-failure modes, not a sixth bug type

The post-round-9 findings reduce to two *meta-modes*. Both are ways prose-level reasoning outran
code-level enforcement. Neither re-opens a closed class — the Appendix shows the per-class sweep already
closed the round-1–9 instances; these are the gaps the *frame* left, not bugs the sweep missed.

**M1 — New surface born after the doctrine froze; no invariant existed to govern it.** §2's five classes
were a *closed* enumeration of the round-1–9 attack surface, with no generative rule for surfaces not yet
in the diff. Three findings live where none of I-A..I-E reach:
- operator input that *widens* a security boundary — `PROFILE_INTERNAL_ALLOW_IPS=all` / `0.0.0.0/0`
  turning the deny-all `location /internal/` allowlist public (closed — I-F);
- idempotent state that must *persist identically* across redeploys — the env-supplied
  `PROFILE_INTERNAL_TOKEN`, read but never written to disk, so a blank-env redeploy silently forgets or
  regenerates it (OPEN — I-G);
- build *portability* — an Apple-Silicon host pushing an arm64-only digest to an amd64 VPS (closed —
  I-H, `--platform linux/amd64`, already in the Appendix as "Profile image platform").

§4 Lens 6 *names* `PROFILE_INTERNAL_TOKEN` and the `/internal/` allowlist as "future-consumer promises,"
but only as a one-time prove-it-now question, never as a standing invariant over the *class* of
boundary-widening inputs or cross-redeploy persistence. I-F/I-G/I-H do not contradict Lens 6 — they
**extend** it from a per-deploy checklist item into a standing invariant the merge bar can pin; the Lens 6
checkbox stays green. These surfaces could only close by *adding* invariants, not by re-running the
five-class sweep.

**M2 — The invariant lived as PROSE in the doctrine but as DUPLICATED LITERALS in the code, so the two
drifted.** I-B is one English sentence ("certify against `.env*`/`*.secret`/`*.pem`/…"). In the tree the
secret-name pattern set is hand-retyped in independent places with **no** shared constant, array, or
sourced file: `.dockerignore` (`.env` + `.env.*`, two-line form); `.gitignore` (`.env*`, single-glob — a
*different* spelling); and four call sites inside `check-docker-secret-boundary.sh`
(`require_literal_line ".env"` / `require_literal_line "*.secret"`; the runtime
`docker run … find … -name ".env*" -o -name "*.secret"`; the content-detector
`find … -o -name "id_rsa*" -o -name "id_ed25519*" -o -name "*.key"`; the per-layer name scan
`-name '.env' -o -name '.env.*' -o -name '*.secret'`). The copies have drifted (the two-line
`.env`/`.env.*` form vs. the `.env*` glob disagree), and **neither `.envrc` nor `.envlocal` appears in any
of these places** (`grep -rE '\.envrc|\.envlocal'` over all of them exits 1). `.env*`/`.env.*` matches
`.env.local` but cannot match `.envrc`/`.envlocal` — no separator after `env` — so those files bypass the
scan and `.dockerignore` (OPEN — I-B drift, see §11.3 cross-note). A prose invariant cannot be
type-checked against N hand-copied literal sets; only a single-sourced pattern set with a drift guard can.
This is the one mode where the rule physically *cannot* be enforced because it has no canonical
representation in code — distinct from a class instance that was simply not yet visited (those the sweep
already closed, per the Appendix `--inspect-image` deleted-layer and host-redirect / encoded-key entries).

**On the success path — already adjudicated, recorded here as a cross-reference, not re-opened.** A
natural M-mode candidate is "fail-closed was scoped to deny/rollback, never to the success path." The
doctrine already turned that lens once, and the Appendix shows the outcome:
- **rollback-health (CLOSED).** Rollback used to report its own success on container *start*
  (`docker compose up -d` returns on start, not health), so a started-but-unhealthy restored image
  printed a false recovery. Now closed — rollback reuses `all_services_running_healthy` before reporting
  recovery (Appendix "Rollback health", pinned by `setupProfileRollback.test.ts`). This is the success
  path *of the recovery sequence*, and it is already green.
- **deploy-record durability (CLOSED-by-design).** On a PASSED deploy whose provenance append fails (disk
  full / read-only fs), `finalize_deploy` warns-and-continues
  (`cat "$DEPLOY_RECORD_TMP" >> "$DEPLOY_RECORD"` … `|| echo "Warning: could not write the deploy record to $DEPLOY_RECORD" >&2`)
  and exits 0. This is **deliberate and pinned**, not an open §3.1 violation: the Class D fix prescribes
  exactly this — "guard the write so a record-write failure never aborts the EXIT trap before the lock is
  released," because a skipped `[ "$DEPLOY_LOCK_HELD" = "1" ] && rmdir "$DEPLOY_LOCK"` would leave a stale
  lock blocking every future deploy. The Class D matrix pins "a record-write failure still releases the
  lock," and the Appendix records it landed (`profileDeployRecordConcurrency.test.ts`). The tradeoff is
  load-bearing precisely because I-C(a) makes record loss *harmless by design*: the
  `.profile-deploy-record` is "a developer-workstation log, never consulted by the box," so a lost record
  cannot break recovery — rollback gates on a self-contained `@sha256` check, never on the ledger. Warn-
  and-continue is therefore the chosen tradeoff (lock-release availability over workstation-log
  durability), not a fail-open hole. Per Principle 9 this section does **not** prescribe downgrading the
  success report; it records the disposition so a future round does not manufacture an OPEN residual out
  of it.

The standing lesson is captured as MR-5 (§11.2): fail-closed reasoning *applies* to the success path too,
but here it was already applied and the collision with lock-release already adjudicated in favor of
lock-release because the lost artifact is non-load-bearing per I-C(a).

**Net diagnosis.** The five-class sweep worked — the Appendix is the evidence: deleted-layer,
host-redirect, encoded-key, pre-recreate, rollback-health, immutable-artifact binding and the rest all
closed and pinned. What the *frame* could not do was (a) generate surfaces absent from rounds 1–9 (M1 —
boundary-widening input, cross-redeploy persistence, build portability) and (b) enforce a prose invariant
that has no single canonical encoding in code (M2 — the secret-pattern set hand-copied across consumers,
with `.envrc`/`.envlocal` falling through the drift). The bounce outlived the doctrine not because the
doctrine failed to sweep, but because "name a class and sweep it" has no rule for surface the class list
never enumerated, and no mechanism to single-source a literal set the prose only describes.

### 11.2 The meta-rules (MR-1..MR-5) — one durable instruction per gap

These sit above the per-class fixes. They are how a coder prevents the *next* round, not how they patch
the last one. MR-2 and MR-4 codify discipline §3.5 / §4-meta / §8 already mandate; MR-1/MR-3/MR-5 are the
genuinely-new instructions M1/M2 demand.

**MR-1 (answers M2) — Single-source every invariant in code.** One pattern set, one lock helper, one
platform flag, imported/sourced everywhere it is enforced. A prose invariant with N hand-copied literal
sets WILL drift. The secret-name pattern set must become one canonical list (a sourced file or a single
emitted constant) that `.dockerignore`, the `.gitignore` policy assertion, and all four
`check-docker-secret-boundary.sh` call sites read; add a merge-bar test that **fails if any site
re-implements the literals** rather than referencing the canonical set, and that asserts the set covers
`.envrc`/`.envlocal` as well as `.env`/`.env.*`. Same shape for any future duplicated security literal.

**MR-2 (codifies §3.5 / §4-meta) — Sweep by INVARIANT, not by class.** This is the per-site coverage
discipline Principle 5 ("close the class, then sweep all open classes") and the §4 Meta-sweep already
require, made explicit at invariant granularity: when you touch *any* invariant, grep EVERY governed site
and prove coverage at each — not just the site the review named. For I-A: every argv channel (every libpq
keyword libpq decodes, `sshpass`, `scp`/`ssh`, in-container `psql`/`pg_dump`) — the Appendix shows these
were swept (sshpass, host/multi-host redirect, encoded-key all closed). For I-B: every pattern consumer
(all six pattern sites) and every image layer, not the flattened view — the per-layer `docker save` scan
is already landed; the remaining gap is the M2 *drift* across pattern sites, not an un-swept layer. The
§11.4 table is this discipline made concrete; run it before submit. MR-2 does not imply the doctrine never
swept — it names the granularity at which the existing sweep must be checked so a *new* sub-instance can't
slip a closed invariant.

**MR-3 (answers M1) — The class/invariant list is OPEN; ask the new-surface question.** The five classes
are not exhaustive. For **each operator-supplied input**, ask: *can this widen a security boundary?* — if
so it is fail-closed by default (I-F). For **each value the deploy must keep constant across redeploys**,
ask: *does a blank-env redeploy resolve to the same value?* — if not it must persist on first validated
deploy (I-G). For **each artifact the pipeline builds**, ask: *is it produced for the target's
architecture regardless of the build host?* (I-H). A new surface with no governing invariant is not
"out of scope" — it is an invariant you have not written yet. This extends §4 Lens 6 from a one-time
prove-it-now check into a standing generative question.

**MR-4 (codifies §8, at finer grain) — Prescription is not implementation, at EVERY governed site.** §8
makes the merge-bar *fixture* the gate that makes "class closed" mean GREEN, "not 'we wrote a paragraph
about it.'" MR-4 is the coder's standing obligation that the green guard must exist at **every governed
site** (per MR-2), not only the one instance a reviewer reported — §8 locks §9's invariants as a class but
does not, by itself, require a per-site guard, and prose closure that no green guard enforces at a
*sibling* site is the exact mechanism by which §9's invariants kept presenting new sub-instances. If you
cannot point at the test for the site you changed, that site is asserted, not closed.

**MR-5 (the success-path lesson) — Fail-closed reasoning covers the SUCCESS path, and collisions are
adjudicated, not swallowed.** The §3.1 lens applies to the integrity *outputs* of a passed deploy, not
only to deny/rollback decisions — the rollback-health fix (Appendix, CLOSED) is that lens applied to the
recovery success path. When fail-closed collides with another load-bearing rule on the success path,
**adjudicate the collision explicitly and record the disposition** rather than leaving it implicit. The
deploy-record case is the worked example: fail-closed-record vs. always-release-the-lock collide, and the
doctrine resolves it in favor of lock-release *because I-C(a) makes the lost record non-load-bearing* —
so warn-and-continue is the chosen, pinned tradeoff (Class D matrix + Appendix), not an OPEN violation.
The rule MR-5 adds is the adjudication-and-record step, not new work on that already-closed behavior.

### 11.3 The new invariants (continuing §9 lettering: I-F..I-H)

Same framing as §9 — a property over the whole sub-surface, with status per the Appendix register. These
are the genuinely-new invariants M1/M2 demand; they extend §4 Lens 6 into standing invariants rather than
overriding it.

- **I-F — Security-boundary-widening operator input is fail-closed by default.** **CLOSED.** Any
  operator-supplied value that can WIDEN a security boundary (the nginx `/internal/` allowlist via
  `PROFILE_INTERNAL_ALLOW_IPS`, and structurally any future allow/deny or scope-expanding env input) MUST
  be validated against a fail-closed allow-list BEFORE interpolation into the enforced config.
  Match-everyone tokens — literal `all`, and any `/0` CIDR (including `/00`/`/000`, caught by stripping
  zeros from the prefix: `if [ -z "${ip_prefix//0/}" ]; then is_public=1; fi`, not literal-string
  matching) — are rejected with `exit 1` unless an explicit, loud, separately-named opt-in
  (`is_truthy "$PROFILE_INTERNAL_ALLOW_PUBLIC"`) is set; and any token outside the address charset is
  rejected (`*[!0-9a-fA-F:./]*)`) to block directive injection, *before*
  `ALLOW_DIRECTIVES+="        allow ${ip};"` reaches the `${ALLOW_DIRECTIVES}        deny all;` heredoc.
  This is the generalization of §3.1 + I-B from the Docker parser to ALL operator input: decode/normalize
  to canonical form, then reject anything unmodeled. Nuance to keep: the loop is a *denylist of disallowed
  characters plus a widening check*, not a strict IP grammar — full address-format validation is delegated
  to `nginx -t` (a malformed-but-clean-charset token like `999.999.999.999` passes this loop and is caught
  by `nginx -t`, not here). Single-sourced: this is the only site that interpolates the value into nginx
  config. Owes a green `CLOSED[F-allow-ips]` guard to be *added* (§11.5) — code closed, guard pending.

- **I-G — Idempotent secret/state persistence across redeploys.** **OPEN.** A secret or stable identifier
  the deploy is responsible for keeping CONSTANT across redeploys (`PROFILE_INTERNAL_TOKEN`, shared with
  the game server) MUST resolve to the same value on a later blank-env redeploy regardless of how it was
  first supplied. The documented precedence (`PROFILE_TOKEN_FILE="$PROFILE_DIR/.internal_token"`,
  comment-stated "env wins, else reuse persisted, else generate-and-persist") only holds *within one run*:
  the sole write to the token file — `( umask 077; printf '%s' "$PROFILE_INTERNAL_TOKEN" > "$PROFILE_TOKEN_FILE" )`
  — sits inside the generate-only `else` branch, after `PROFILE_INTERNAL_TOKEN=$(openssl rand -hex 32)`.
  The env branch prints `Using PROFILE_INTERNAL_TOKEN from environment` and writes nothing, so a blank-env
  redeploy silently reuses a *different* earlier-generated token (`Reusing persisted PROFILE_INTERNAL_TOKEN from $PROFILE_TOKEN_FILE`)
  or generates a brand-new one — the env-supplied value is lost. Fix: persist an env-supplied value (0600,
  atomic) on the run that introduces it, so the persistence write is **not reachable only from the
  generate-else branch**. This is the standing-invariant form of the Lens 6 `PROFILE_INTERNAL_TOKEN`
  promise.

- **I-H — Build artifact portability / target-architecture pinning.** **CLOSED.** Every image the pipeline
  builds and pushes MUST be produced for the architecture the target VPS executes
  (`docker buildx build --platform linux/amd64 --load -f "$DOCKERFILE" -t "$PROFILE_IMAGE" .`), so a build
  host of any architecture (an Apple-Silicon dev box) can never push a digest the amd64 reg.ru VPS cannot
  run — which would fail a first deploy outright or health-fail a redeploy into rollback. The shipped
  digest's platform is a property of the build invocation, not the developer's hardware. Already in the
  Appendix as "Profile image platform," pinned by `profileDeployClassSweep.test.ts`. The target-arch build
  is bound content-addressed through scan→push→digest via `BUILT_IMAGE_ID` (the secret scan and
  `PROFILE_DIGEST=$(docker inspect …)` both key on the immutable ID, never the mutable tag) — see the
  Appendix "Secret scan bound to the immutable artifact" entry, which is the authority on that binding and
  on the build/scan/push TOCTOU (CLOSED, fail-closed digest resolution that aborts on a concurrent retag).

### 11.4 The invariant-coverage sweep (procedural complement to §4)

Before submit, for EACH invariant enumerate every governed site in the *current* tree and check each.
§4's lens sweep asks "is this property true?"; this asks "is it true at *every* site?" — the MR-2
granularity. Grep strings, not line numbers. Where a row says CLOSED, the check is "does the pinned guard
still cover every site" (a regression turns it red), not new work.

| Invariant | Governed sites to grep | The check |
|---|---|---|
| **I-A** argv-safety | every libpq keyword libpq decodes (`probe_database_url` key-classify + `%`-in-key reject); `host`/`hostaddr` + multi-host authority reject; `sshpass -f` (`ALLOW_PROFILE_SSH_PASSWORD_FALLBACK`); `scp`/`ssh`; in-container `psql`/`pg_dump` | No password/token in any argv at any site; only stdin→env / 0600 file. CLOSED (Appendix: sshpass, host-redirect, encoded-key). A new libpq channel ⇒ classified or rejected. |
| **I-B** secret boundary on real bytes | all six pattern sites (`require_literal_line ".env"`/`"*.secret"`; runtime `-name ".env*" -o -name "*.secret"`; content-detector `id_rsa*`/`id_ed25519*`/`*.key`; per-layer `-name '.env' -o -name '.env.*'`; `.dockerignore`; `.gitignore`); every image layer via `docker save` | Per-layer scan + content match: CLOSED (Appendix deleted-layer). Remaining gap is M2 *drift*: each pattern site must reference the canonical set incl. `.envrc`/`.envlocal` (OPEN — MR-1). |
| **I-C** rollback provenance / on-disk⇒validated | PARTIAL-config refusal before any write; pre-recreate `probe_database_url` before `STACK_RECREATED=1`; rollback reuses `all_services_running_healthy`; digest-pinned profile-api recreate scope | Every on-disk config implies validated; rollback reports on health not start; recreate scoped to profile-api. CLOSED (Appendix). |
| **I-D** shared-resource locking | record write under `mkdir "$DEPLOY_LOCK"`; `REMOTE_SCRIPT`/`REMOTE_ENV` host-side `mktemp`; build/scan/push bound to `BUILT_IMAGE_ID` | Every critical section locked-before-first-use OR uniquely-named-per-deploy; the build/scan/push window's TOCTOU is closed by fail-closed digest resolution from `BUILT_IMAGE_ID` that ABORTS on a concurrent retag (Appendix "Secret scan bound to the immutable artifact"), not by the local lock. CLOSED. |
| **I-E** scope boundary | each in-code deferral token; PR body; scope block | Out-of-scope items tracked with a quoted-anchor token, never a numeric `#N`. |
| **I-F** boundary-widening input | `PROFILE_INTERNAL_ALLOW_IPS` validation loop (the only interpolation site); any new allow/deny/scope env input | Match-everyone + non-address-charset rejected fail-closed before interpolation, unless loud named opt-in. CLOSED in code; guard pending (§11.5). |
| **I-G** cross-redeploy persistence | `PROFILE_TOKEN_FILE` resolution block; any value promised constant across redeploys | Blank-env redeploy resolves to the same value; persistence write not gated on the generate-else branch. (OPEN.) |
| **I-H** build portability | `docker buildx build --platform linux/amd64`; `BUILT_IMAGE_ID` scan/digest binding | Every built+pushed image is target-arch, bound content-addressed through scan→push→digest. CLOSED (Appendix). |

### 11.5 What this means for the merge bar

§8's class-sweep test locks §9's invariants; §11 adds I-F..I-H. Per the Appendix register, the split is:

- **I-F** (boundary-widening input) is **CLOSED in code** but has **no green guard yet**. It owes a
  `CLOSED[F-allow-ips]` guard in `profileDeployClassSweep.test.ts` of the §10.1 green-guard form — a
  static assertion that the fail-closed allow-list (the `all` / `/0` rejection and the
  `*[!0-9a-fA-F:./]*)` charset reject) is present, so a regression turns it red. **Add this guard; do not
  add a §10.2 CLOSED row until it lands** — a CLOSED row without its `CLOSED[id]` guard would violate the
  §10.2 bidirectional coupling ("every CLOSED row ↔ a green `CLOSED[id]` guard and NO skip"). Until the
  guard lands, I-F is tracked here as code-closed-but-guard-pending, not in §10.2.
- **I-H** (build portability) is already **CLOSED and pinned** — Appendix "Profile image platform" and
  "Secret scan bound to the immutable artifact," both green in `profileDeployClassSweep.test.ts`. No new
  guard owed; the §11.4 row is a regression check, not new work.
- **I-G** (token-persist) describes code that is still **OPEN**. It does not get a green guard yet: it gets
  either a **must-fix RED test** that stays red until the fix lands, or — if the team consciously freezes
  it — a tracked **`test.skip`** with an OPEN row in §10.2 (§10.1's three states). Do not write a
  `CLOSED[id]` guard until the underlying code closes.
- **I-B drift / `.envrc` gap** (M2) is **OPEN**: it owes the MR-1 single-source-and-drift guard. Until that
  lands it is a tracked residual, not a closed class.

Nothing in §11 re-opens a closed class. The success-path record-durability behavior is **CLOSED-by-design**
(Class D pin + I-C(a)); it gets no new test and no OPEN row — the existing `profileDeployRecordConcurrency.test.ts`
already pins "the lock is released even if the write fails." The build/scan/push TOCTOU is **CLOSED**
(Appendix immutable-artifact binding); it gets no OPEN row either. The merge bar's job here is the same as
everywhere else: make "closed" mean GREEN, make every OPEN residual VISIBLE and tracked, and never let an
asserted-but-unenforced property — or a deliberately-pinned tradeoff — be mistaken for the other.

## Appendix — what is still open vs. already landed (as of 2026-06-15)

Verified against the current branch files. The doctrine's job on already-landed items is to **keep them
green**, not re-fix them.

**Closed in this PR (the class sweep) — keep the NEW pins green; do not re-open:**
- Class A / F12 — the DB gate now opens a real connection with the **exact** `DATABASE_URL`
  (`probe_database_url`: `SELECT 1`, password split out to stdin/`PGPASSWORD`, password-free URL to
  `psql -d`, fail-closed on parse ambiguity; operator override routed through the same gate). Pinned by
  `setupProfileFailClosed.test.ts` (behavioral) + `setupProfileDbProbe.test.ts` (argv-safety).
- Class B — `scan_broad_copies` no longer joins across `#` comment lines (the `# foo \` bypass) and
  rejects heredoc COPY/ADD; `--inspect-image` now scans **every layer** of the image (via
  `docker save`, not the flattened `docker run` view) by **content** (sha256) + a conservative name
  scan, so a secret COPY'd then `rm`'d in a *later* layer — absent from the runtime filesystem but
  still recoverable from the pushed image — is caught from its layer bytes. Fail-closed if
  `docker save` fails, if a layer blob is unreadable as a tar (never silently skip a layer), or if
  the archive yields zero layers. Pinned by `checkDockerSecretBoundary.test.ts` (docker-stubbed
  `--inspect-image` cases: clean / content / name / **deleted-layer** / the three fail-closed paths).
- Profile image platform — the profile image is built `docker buildx build --platform linux/amd64
  --load` (matching the game build path, `build.sh`), so an Apple-Silicon dev host can't push an
  arm64-only digest the amd64 reg.ru VPS cannot exec (first deploy failing outright / a redeploy
  health-failing into rollback). Pinned by `profileDeployClassSweep.test.ts`.
- Class C — `/etc/nginx/sites-enabled/default` is captured before removal and restored (fail-loud) on
  rollback. Pinned by `setupProfileRollback.test.ts`.
- Partial config state — the pre-deploy config is classified into exactly three states; a PARTIAL pair
  (exactly one of `profile.env` / `docker-compose.yml` present — only reachable via a crash/OOM/power-loss
  mid-write or a manual edit) is **refused before any write** (and before the rollback trap is installed),
  rather than backed up per-file. The old binary `FRESH_DEPLOY` (true only when both absent) plus
  independent backups would, from a partial start, restore only the present file and strand the freshly
  written (never-validated) other file as a future rollback target — breaking "on-disk config ⇒ validated".
  Pinned by `setupProfileRollback.test.ts`.
- Class D / F4 — `build-deploy-profile.sh` serializes with a fail-closed local `mkdir` mutex (the macOS
  dev host has no `flock`) acquired before the first record write, and writes the record atomically
  (body→temp→one append under the lock; the lock is released even if the write fails). Pinned by
  `profileDeployRecordConcurrency.test.ts`.
- DATABASE_URL probe host fidelity — the loopback check inspects the authority host, so `probe_database_url`
  also **rejects host redirection through other channels**: a `host`/`hostaddr` query parameter (libpq
  honors these and they override the authority host) and a comma-separated **multi-host authority** (libpq
  tries each in turn, so a localhost member passes from inside the postgres container but fails from the
  API). Both would let the in-DB-container probe validate a target the API can't use. `port`/`user`/`dbname`
  query params are NOT rejected — they are consumed identically by probe and API, so they cannot diverge.
  Pinned by `setupProfileFailClosed.test.ts`.
- DATABASE_URL probe encoded-key evasion — `probe_database_url` now **rejects any `%` in a query KEY**
  fail-closed, BEFORE the password/sslpassword/host classification. libpq percent-DECODES the query keyword
  and then matches it (`fe-connect.c` `conninfo_uri_parse_params`: `keyword = conninfo_uri_decode(keyword, …)`,
  verified REL_12..master), so an encoded key such as `pass%77ord` (→`password`, a live credential channel)
  or `h%6fst` (→`host`, an authority override) would otherwise be a WORKING API parameter that also lands its
  value in psql's argv and dodges the classification. No real libpq keyword name contains `%`, and the script
  never encodes key names itself, so this refuses only a hand-crafted evasion — never a valid URL (encoded
  VALUES are still preserved; the check is key-only). Refusing an encoded spelling of a benign keyword (e.g.
  `sslmod%65`=sslmode) is intentional fail-closed conservatism — it can only block a deploy, never record a
  false pass. Pinned by `setupProfileFailClosed.test.ts`.
- Rollback health — after the rollback recreates the previous stack, it WAITS on the same
  `all_services_running_healthy` assertion the forward path uses (the health functions are defined before
  the trap so the rollback can reuse them) before reporting recovery; a started-but-unhealthy restored image
  reports a loud `ROLLBACK FAILED` with `docker compose ps` + logs, not a false success (`docker compose up
  -d` returns on start, not health). Pinned by `setupProfileRollback.test.ts`.
- Secret scan bound to the immutable artifact — `build-deploy-profile.sh` captures `BUILT_IMAGE_ID`
  (`docker inspect --format '{{.Id}}'`, validated as a sha256 fail-closed) right after the build and keys
  BOTH the `--inspect-image` secret scan AND the deploy-digest resolution on that content-addressed ID, never
  the mutable tag `$PROFILE_IMAGE`. The tag is daemon-shared: a concurrent build at the same commit could
  repoint `repo:profile-<sha>` between scan and push (the local lock is acquired only after digest
  resolution), so a tag-keyed scan could certify image A while image B is pushed/deployed by digest (TOCTOU
  on the secret boundary). Resolving the digest from the ID guarantees it refers to the EXACT scanned bytes
  (a `RepoDigest` belongs to its own image object), so a retag can never make us resolve a hijacker's digest;
  if the scanned ID has no canonical `repo@sha256:<64-hex>` digest for our repo — never pushed (legacy store)
  or repo-reassociated by a concurrent retag (containerd store) — we fail closed (no deploy of an unscanned
  image). The digest match is end-anchored 64-hex, symmetric with the strict ID guard. Pinned by
  `profileDeployClassSweep.test.ts` (static binding + behavioral capture / hijack / malformed-digest fail-closed).
- Pre-recreate DATABASE_URL gate (redeploy) — on a redeploy (postgres already running), `setup-profile.sh`
  validates the EXACT `DATABASE_URL` with `probe_database_url` in the preflight block (alongside
  `probe_db_credentials`), BEFORE `STACK_RECREATED=1` and the destructive `docker compose up -d
  --force-recreate --no-deps profile-api`. A wrong operator override now aborts (restore config) while the
  previous API is still live, instead of replacing it with a DB-broken container that only the post-recreate
  gate would catch (transient outage; persistent if rollback recreation then fails). The fresh-deploy path
  has no running postgres in the preflight, so it keeps its post-recreate gate — both gates coexist. Pinned
  by `setupProfileRollback.test.ts` (static ordering + behavioral abort-before-recreate).

**Already landed before this PR (keep the pinned test green):** F1 (fresh-deploy stack/volume preservation),
F3 (fresh-deploy nginx handling), F5 (remote flock fail-closed abort), F8 (rollback failure reporting with
`ps`/logs), F2/F10/F11 originals (`assert_default_escape` directive-block handling, `$`-in-source
reject).
