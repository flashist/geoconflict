# Review ledger — s4-profile-04g

Task: `ai-agents/tasks/backlog/s4-profile-04g-argv-concurrency-hardening.md`
File(s) under review: `build-deploy-profile.sh`, `build-deploy-telemetry.sh`,
`setup-profile.sh`, `setup-telemetry.sh`, `tests/scripts/profile-deploy-hardening.test.sh`
Status: in-review — R1 converged (C1/C2/F2 accepted residuals, F3/F4 non-issues, F1 cheap fix); **F1 RESOLVED R2 (`/process-review`, user-approved)**. No open defects.
Scope reviewed: branch diff vs `dev` (PR 125). Reviewers: Claude `code-reviewer` +
Codex adversarial review (both ran — full coverage). Acceptance test suite: **ALL PASS**
(30+ assertions, `tests/scripts/profile-deploy-hardening.test.sh`).

Carry-forward residuals from predecessor ledgers still apply: see `s4-profile-04e3.md`
(the **X1** preflight residual that 04g implements; the **"0644 window"** mktemp→chmod
non-defect, which 04g reuses for `SSH_PASSWORD_FILE`/`DEPLOY_RECORD_TMP`; the
`/root/`-hardcoded remote paths; domain-optional deploy; `CERTBOT_EMAIL` default; the
persisted `DOCKER_TOKEN` X2 residual) — none re-raised here.

## Accepted residuals (do-not-re-litigate)

- **Remote-script pre-flock race / cross-client `$$` env-path collision (C1, Codex high)**
  — What: the remote `flock` is acquired inside `setup-profile.sh` (`:134-135`) *after*
  `build-deploy-profile.sh` SCPs the staged env to `/root/.profile-deploy-env-$$`
  (`:463,491`) and the SSH chain sources it (`:496-501`). Two deploys from *different
  machines* whose local PIDs collide could write the same `…-env-$$` path; and the local
  `mkdir` mutex is per-machine, so it does not serialize cross-client. Why (structural):
  (1) `REMOTE_ENV=/root/.profile-deploy-env-$$` is **unchanged pre-existing** code (the
  in-production `build-deploy-telemetry.sh` pattern), **not introduced by 04g**; (2) 04g
  **adds** the remote `flock` where there was **zero** remote serialization before — a
  strict improvement, not a regression; (3) for distinct PIDs the second deploy sources
  its **own** env then fails closed at `flock -n 9` *before any mutation* (no interleave —
  verified by test T3/T4); (4) the residual same-PID-cross-client window is **exactly the
  "remote-script pre-flock race"** the task threat model + postmortem §11.1 **pre-declare
  as a residual, not a blocker.** Codex's "remote concurrency remains unsafe" measures
  against a perfect cross-client design, not the pre-04g baseline. Codex's hardening
  (unique random remote dir per deploy + acquire `flock` in the *outer* SSH before
  sourcing) is recorded here as **future-task** scope. Re-raise only if: cross-client
  concurrent deploys (multiple operators / CI runners against one box) become a hard
  requirement — then implement the unique-remote-dir + outer-SSH-flock design repo-wide
  with telemetry.

- **Preflight reads the role marker over an unauthenticated host key (C2, Codex high)** —
  What: the deploy-target preflight reads `/etc/geoconflict-deploy-role` over the same
  `SSH_CMD`, which on telemetry is `StrictHostKeyChecking=no` (`build-deploy-telemetry.sh:244`)
  and on profile is `accept-new` (`build-deploy-profile.sh:359`); an active MITM that
  presents any host key could return the expected marker and pass preflight. Why
  (structural): the weak host-key option is **pre-existing transport** (the prior
  `sshpass -p` lines carried the same `-o StrictHostKeyChecking=no`/`accept-new`); 04g did
  not change it. The preflight's charter (**X1**) is defending against an *operator-mistyped
  but legitimately-reachable* host, **not** an active MITM — and the **same SSH channel
  carries the real secret transfer** (SCP + setup run), so the preflight neither adds nor
  removes MITM exposure. Optional cheap alignment noted: telemetry
  `StrictHostKeyChecking=no → accept-new` to match profile (TOFU); deliberately **not**
  taken in 04g (transport hardening is out of this slice's scope). Re-raise only if:
  host-key pinning (`known_hosts`) becomes a hard requirement for the deploy, OR the
  telemetry `no→accept-new` alignment is taken up as its own item.

- **`util-linux` bootstrap install runs before `flock` (F2, Claude low)** — What:
  `setup-profile.sh:128` runs `apt-get update -y && apt-get install -y util-linux` *before*
  the `flock -n 9` at `:135`, while the comment at `:123` says the lock spans the box
  deploy "BEFORE the first mutation." Why (non-blocking): the bootstrap install is
  **idempotent**, `|| true`-guarded, serialized by dpkg's own lock, and **rarely runs at
  all** (`flock` ships in `util-linux` on stock Ubuntu, so the `command -v flock` guard
  short-circuits on the real reg.ru boxes). The behavior is safe; only the comment slightly
  overstates "before the first mutation," and the structural test asserts `flock` precedes
  the *main* `apt upgrade` (`:150`) rather than "no apt precedes flock." Re-raise only if:
  a non-idempotent or non-dpkg-locked step is added before `flock`, OR the pre-flock
  bootstrap is shown to interleave destructively under concurrency (would be a defect).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | **C1** (Codex, high) — remote `flock` acquired after env staged/sourced; cross-client `$$` env-path collision | PARTIALLY CORRECT — window real, but pre-existing `$$` pattern (not a 04g regression), 04g *adds* the flock (strict improvement), distinct-PID case fails closed before mutation (T3/T4), same-PID-cross-client case is the task-pre-declared "pre-flock race" residual | **Accepted residual** (do-not-re-litigate); Codex's unique-remote-dir + outer-SSH-flock hardening logged as future-task scope. Not blocking. |
| 1 | **C2** (Codex, high) — preflight reads marker over `StrictHostKeyChecking=no`; MITM could spoof identity | PARTIALLY CORRECT — weak host-key option is pre-existing transport (not changed by 04g); preflight's charter (X1) is operator-error not MITM; same channel carries the real transfer so preflight doesn't change exposure → effective **low**, pre-existing | **Accepted residual**; optional telemetry `no→accept-new` alignment noted, not taken in 04g. Not blocking. |
| 1 | **F1** (Claude, high) — telemetry clobbers `$TMPDIR` (`:87`) without restoring; new `SSH_PASSWORD_FILE=$(mktemp)` (`:239`) depends on it | PARTIALLY CORRECT — "fails on Linux" **disproven empirically**: bare `TMPDIR=$(mktemp -d)` doesn't export a previously-unexported var (default-Linux → fallback, rc=0); BSD `mktemp` tolerates a stale exported `TMPDIR` (macOS dev host, rc=0). Only bites under GNU mktemp **and** an explicitly-exported `TMPDIR`. Pre-existing `LOCAL_TMPENV=$(mktemp)` (`:333`) already had the same dependency and telemetry deploys fine → severity **high → low** | **Open / actionable** (user-elected cheap fix): don't clobber `TMPDIR` in the validate block. Real latent hygiene issue, not blocking. |
| 1 | **F2** (Claude, low) — `apt-get install util-linux` runs before `flock`; comment says "before the first mutation"; test doesn't catch | CORRECT → low — bootstrap is idempotent, `|| true`-guarded, dpkg-serialized, rarely runs; comment slightly overstates; test asserts flock < main apt-upgrade (narrower than "no apt before flock") | **Accepted residual** (do-not-re-litigate). Behavior safe; comment/test imprecision only. |
| 1 | **F3** (Claude, low) — `trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT` single-quote note | INCORRECT (self-cleared) — single-quote form is correct (evaluated at fire time); reviewer noted "no fix required." Independently confirmed telemetry has **only one** EXIT trap (`:242`), not clobbered by any later staging trap → password file is cleaned on any exit | No action. Verified clean. |
| 1 | **F4** (Claude, low) — `mkdir -p "$(dirname "$DEPLOY_RECORD")"` runs before the lock | INCORRECT (self-cleared) — idempotent and safe; intentionally outside the lock; reviewer noted no action needed | No action. Verified clean. |
| 2 | **F1** re-verified under `/process-review` (independent re-read + empirical test) | CONFIRMED low — severity **even lower than R1**: macOS BSD `mktemp` (bare, no `-t`) **ignores `$TMPDIR`** entirely (Darwin per-user temp via `confstr`), proven `rc=0` against a *deleted* base dir; default-Linux doesn't export `TMPDIR` so the clobber never reaches a child `mktemp` either. Trigger is GNU mktemp **and** a pre-exported `TMPDIR`, and even then it's a fail-closed early abort. Pre-existing root cause; 04g adds one rarely-hit consumer (`SSH_PASSWORD_FILE`). | **APPLIED (user-approved)**: renamed the validate-block temp dir `TMPDIR → VALIDATE_TMPDIR` (the 7 refs in the `if command -v docker` block) so it never clobbers the special exported var; later `SSH_PASSWORD_FILE`/`LOCAL_TMPENV` mktemp now inherit a valid base. Zero behavioral change; `bash -n` clean; harness **34/34**. F1 closed. |
| 2 | **C1/C2/F2/F3/F4** re-verified under `/process-review` | All five classifications **CONFIRMED** independently (read the cited code, traced full flow) — C1/C2 are frontier-moves vs a perfect cross-client/MITM design (not the pre-04g baseline), F2 is comment imprecision over safe idempotent behavior, F3/F4 are verified-clean non-issues | No change. No new defects, no loop. |

## Open / actionable

- _(none — no open defects.)_ **F1 RESOLVED (R2, `/process-review`, user-approved):** the
  validate-block temp dir was renamed `TMPDIR → VALIDATE_TMPDIR` in `build-deploy-telemetry.sh`
  (the 7 refs inside the `if command -v docker` block), so it no longer clobbers the special
  exported `$TMPDIR`; the later `SSH_PASSWORD_FILE`/`LOCAL_TMPENV` mktemp calls now inherit a
  valid base dir. **Zero behavioral change** in any environment (macOS bare `mktemp` ignores
  `$TMPDIR` entirely; default-Linux never exported it). `bash -n` clean;
  `tests/scripts/profile-deploy-hardening.test.sh` **34/34**. C1/C2/F2 remain accepted
  residuals; F3/F4 verified non-issues. **An independent `/process-review` re-read every cited
  code path and agreed with all six R1 classifications — no new defects, no oscillation.**
