# Task — Profile Backend Infra: Argv-safety + concurrency lock + atomic deploy record + deploy-target preflight (T4g)

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D — T4 threat model clauses 2 & 4). Sub-task of `s4-profile-04-backend-infra.md` — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
Medium — closes the last two clauses of the T4 threat model, plus a deploy-target preflight added R3. Strictly additive on top of T4e/T4f; the final slice.

## Depends on
T4e, T4f.

## Blocks
None.

## Context
Close the remaining T4-threat-model items: a secret never appears in argv on **any** path, one fail-closed lock spans the deploy before any write/mutation, and the deploy record is an atomic single block. Keepers **K1** and **K6**. **Added (R3 — `ai-agents/reviews/s4-profile-04e3.md` stateful-review / PR 121, finding X1):** also add a read-only remote-identity preflight so a mistyped/stale-but-reachable host cannot be destructively provisioned before any validation.

## Scope
- **NET-NEW over T4e** (T4e ships only the key-path default and the seed's **vulnerable** `sshpass -p "$SSH_PASSWORD"` form — verified at `4e56fbf:build-deploy-profile.sh:150-151`): replace `sshpass -p` with `sshpass -f <0600 file>` (only the path in argv); the file is created **0600 BEFORE** the secret is written, removed by the finalize/cleanup trap (K1). Genuinely additive — the seed is **not** already on `-f`.
- **Discrete-credential DB probe** (if any auth check at deploy time): password piped to a container `read`/`PGPASSWORD` via stdin, never on `psql` argv (K1) — **string-template DB-URL only, NO libpq semantic validation, NO connect**.
- **Concurrency**: local atomic `mkdir` mutex (macOS dev host) acquired **before** the record trap + first write; remote `flock` on `/var/lock/profile-deploy.lock` (install `util-linux` if missing), **fail closed** if the lock is unavailable (K6).
- **Atomic deploy record**: accumulate the body in a 0600 temp; append the single `validation_result=… digest=…` line to that temp; append the **whole block** to the shared record in one operation under the lock (so a body can never land without its result, and concurrent deploys can't interleave). `finalize_deploy` is the single EXIT writer; every cleanup `|| true`-guarded so a failure can't leak the lock (K6).
- **Deploy-target preflight (added R3 — finding X1, NET-NEW):** before the first SCP / secret-staging in `build-deploy-profile.sh`, run a **read-only** SSH preflight that asserts the target is the *intended* profile box — e.g. a provisioned role-marker file (`setup-profile.sh` writes the marker; the deploy checks it here) and/or `PROFILE_SERVER_HOST` matching `PROFILE_DOMAIN`'s resolved address — and **abort before any mutation or secret transfer** on mismatch. Today the only target check is the SCP itself (`set -e` aborts on *unreachable / auth-fail*), but a *reachable wrong* host that accepts the key would be clobbered: `setup-profile.sh` runs `apt upgrade`/ufw/swap/containers (`:123,133`) **before** its later domain DNS check (`:486+`). Apply **repo-wide with `build-deploy-telemetry.sh`** (same gap). This is a frontier-move, not a defect 04e3 introduced — see the ledger residual "No remote identity / role-marker preflight (X1)".

## Out of scope
- `DATABASE_URL` libpq/semantic validation (`probe_database_url` richness) → T5.
- `/ready` and any DB query → T5.
- awk lexer fixes (frozen, T4f).
- Re-litigating T4e's **key-path** SSH transport (already correct) — T4g's NET-NEW is the `-p`→`-f` replacement, the 0600-file-before-write ordering, the discrete-cred stdin DB probe, the `flock` mutex + atomic single-block record, and (added R3) the **read-only deploy-target preflight**. Note the preflight is a *new pre-check before* the transport, **not** a change to the already-correct key-path transport itself.
- Hardening of ultra-low-reachability TOCTOU races beyond the written residual (residual list, not blockers).

## Acceptance criteria (defined up front)
- No secret (password, token, `DATABASE_URL`, `POSTGRES_PASSWORD`) appears in any process argv on the dev host **or** the box, in **any** auth path — the argv-safety matrix passes (`sshpass -f`, `--password-stdin`, `PGPASSWORD`, stdin, 0600 file only). Assert via a `ps`/proc scrape during each path and by code review of every credential call site. Specifically confirm the seed's `sshpass -p` is **gone** (replaced by `-f`).
- The `sshpass` 0600 password file is created mode 0600 **before** the secret is written and is removed by the EXIT/INT/TERM trap even on failure (assert mode at creation; assert removal after an injected mid-deploy failure).
- Two concurrent deploys: the second fails closed (lock unavailable) and writes **no** record byte; the first completes — N parallel writers yield N contiguous, non-interleaved record blocks, each with its `validation_result` line (concurrency test).
- If the lock cannot be acquired or `flock` cannot be installed on the box, the deploy fails closed (no write, no mutation).
- The deploy record is appended atomically as one block under the lock; a record-append failure **warns-and-continues** so the lock (`rmdir`/`flock` release) still runs — the deploy lock is never stranded (assert by injecting an append failure).
- No `DATABASE_URL` libpq/semantic validation is added (string-template only; no connect).
- **(Added R3 — X1)** A mistyped/wrong `PROFILE_SERVER_HOST` that is reachable and accepts the key is **rejected by the read-only preflight before any secret transfer or box mutation** (assert: point the deploy at a reachable non-profile host with a valid key → it aborts with no SCP, no secret staged, no `setup-profile.sh` run). The same preflight is mirrored in `build-deploy-telemetry.sh`.

## Threat model
Closes the last two clauses. **(Argv)** A password/token must never appear in any process's argv (visible to `ps`, `/proc/<pid>/cmdline`, execve auditing, process collectors) — every credential travels by stdin/`PGPASSWORD`/`--password-stdin`/`sshpass -f` 0600 file only. The `4e56fbf` seed actually ships the vulnerable `sshpass -p "$SSH_PASSWORD"` form, so the `-p`→`-f` replacement is real net-new work, **not** a re-litigation of an already-correct T4e auth path; the 0600 file is created empty-then-filled and trap-removed so the secret is neither world-readable nor leaked on abort. **(Concurrency)** Two overlapping deploys could interleave container mutations or corrupt the record; one fail-closed lock before any write, plus an atomic single-block record, prevents both — and the `|| true`-guarded cleanup ensures a cleanup failure can't strand the lock (a self-inflicted deploy-wedge). **Explicitly out:** `DATABASE_URL` semantic validity (T5); the byte scan (T4f). Known ultra-low-reachability races (remote-script pre-flock race, scan→push TOCTOU) are carried as a **flat residual bullet list**, not blockers (postmortem §11.1 triage). **(Wrong-host, added R3 — X1)** A reachable-but-unintended host that accepts the deploy key would today receive the script + secrets and be destructively provisioned *before* any validation; a read-only remote-identity preflight before the first SCP closes this (frontier-move from the 04e3 stateful-review, applied repo-wide with telemetry).

## Review budget
Max 2 rounds; round 2 ends in a flat residual bullet list (ultra-low-reachability races → residual, not blocker).

## Salvage (reuse — do not re-derive)
- Postmortem §14 **K1** (`probe_db_credentials` password via container stdin `read`; `--password-stdin` registry login; `sshpass -f` 0600 file created-before-written, trap-removed).
- Postmortem §14 **K6** (remote `flock` fail-closed + install `util-linux`; local `mkdir` mutex before trap+first write; 0600 temp record body + single `validation_result` line appended + whole block under lock; `finalize_deploy` single EXIT writer, `|| true`-guarded cleanup, never leak lock).
- Original seed: `git show 4e56fbf:build-deploy-profile.sh` (`sshpass -p` path ~150-151 — **REPLACE** with `-f`; `cleanup_secrets` trap — extend to `finalize_deploy`).
- Postmortem §11.1 residual triage (remote-script pre-flock race, scan→push TOCTOU → residual list).

## Independent test
Run each credential path under a `ps -ef`/proc scraper and assert no secret in argv (and the seed's `sshpass -p` is gone, `-f` is in place); assert the `sshpass` file is 0600 at creation and gone after an injected failure. Launch two deploys concurrently and assert the second fails closed with no record write and the first yields one contiguous record block; inject a record-append failure and assert the lock still releases. **(Added R3 — X1)** Point the deploy at a reachable non-profile host (valid key) and assert the preflight aborts before any SCP / secret-staging / `setup-profile.sh` run. Verifiable on the dev host plus a single box; builds strictly on T4e/T4f without altering their behavioral acceptance.
