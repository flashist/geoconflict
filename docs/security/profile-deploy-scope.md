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
- `RESIDUAL[D-remote-script]` — accepted: benign — OPEN — `REMOTE_SCRIPT` is a fixed-name path scp'd
  pre-flock, but its content is deploy-invariant (every deploy uploads the same `setup-profile.sh`),
  so a clobber between overlapping deploys cannot corrupt a secret — unlike the env-staging path.
- `RESIDUAL[C-R3]` — accepted: comment — OPEN — the `build-deploy-profile.sh` "rollback-eligible"
  wording overstates the mechanism (the box reads no record); the fix is wording reconciliation, not
  behavior — gating rollback on a record would refuse it exactly when most needed.
- `RESIDUAL[D-R2]` — was accepted: fast-follow — CLOSED — `REMOTE_ENV` was keyed on the local shell
  PID and collided across workstations; it is now allocated host-side with `mktemp` and
  pattern-validated. Locked green by `CLOSED[D-R2]`.

## Appendix — what is still open vs. already landed (as of 2026-06-15)

Verified against the current branch files. The doctrine's job on already-landed items is to **keep them
green**, not re-fix them.

**Closed in this PR (the class sweep) — keep the NEW pins green; do not re-open:**
- Class A / F12 — the DB gate now opens a real connection with the **exact** `DATABASE_URL`
  (`probe_database_url`: `SELECT 1`, password split out to stdin/`PGPASSWORD`, password-free URL to
  `psql -d`, fail-closed on parse ambiguity; operator override routed through the same gate). Pinned by
  `setupProfileFailClosed.test.ts` (behavioral) + `setupProfileDbProbe.test.ts` (argv-safety).
- Class B — `scan_broad_copies` no longer joins across `#` comment lines (the `# foo \` bypass) and
  rejects heredoc COPY/ADD; `--inspect-image` scans the whole rootfs by **content** (sha256) + a
  conservative name scan, **fail-closed if `docker run` fails**. Pinned by
  `checkDockerSecretBoundary.test.ts` (incl. docker-stubbed `--inspect-image` cases).
- Class C — `/etc/nginx/sites-enabled/default` is captured before removal and restored (fail-loud) on
  rollback. Pinned by `setupProfileRollback.test.ts`.
- Class D / F4 — `build-deploy-profile.sh` serializes with a fail-closed local `mkdir` mutex (the macOS
  dev host has no `flock`) acquired before the first record write, and writes the record atomically
  (body→temp→one append under the lock; the lock is released even if the write fails). Pinned by
  `profileDeployRecordConcurrency.test.ts`.

**Already landed before this PR (keep the pinned test green):** F1 (fresh-deploy stack/volume preservation),
F3 (fresh-deploy nginx handling), F5 (remote flock fail-closed abort), F8 (rollback failure reporting with
`ps`/logs), F2/F10/F11 originals (`assert_default_escape` directive-block handling, `$`-in-source
reject).
