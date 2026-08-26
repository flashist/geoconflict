# Review ledger — s4-profile-04g

Task: `ai-agents/tasks/done/0183-profile-04g-argv-concurrency-hardening/brief.md`
File(s) under review: `build-deploy-profile.sh`, `build-deploy-telemetry.sh`,
`setup-profile.sh`, `setup-telemetry.sh`, `tests/scripts/profile-deploy-hardening.test.sh`
Status: **CLOSED OUT — converged, no open defects.** R1 (C1/C2/F2 residuals, F3/F4 non-issues, F1 cheap fix) → **F1 RESOLVED R2 (`/process-review`, user-approved)** → **R3 `/stateful-review`** re-verified the R2 fix clean (both reviewers) + raised **C3** (residual) & **F-NEW-1** (pre-existing) → **R3 `/process-review`** independently confirmed C3/F-NEW-1, did **not** re-litigate C1/C2/F2/F3/F4, and **called closeout (user-approved)**. F-NEW-1 deferred to a future telemetry-hardening task.
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

- **Preflight `DOMAIN_MATCH` is a set-overlap, not bound to the SSH-selected IP (C3, Codex high)**
  — What: the no-marker fallback (`build-deploy-profile.sh:398-407`, mirrored
  `build-deploy-telemetry.sh:279-285`) sets `DOMAIN_MATCH=1` when **any** address resolved for
  `PROFILE_DOMAIN` overlaps **any** address in `{PROFILE_SERVER_HOST literal} ∪ resolve_ips(PROFILE_SERVER_HOST)`.
  SSH resolves `PROFILE_SERVER_HOST` independently, so with a **multi-A-record round-robin**
  hostname (domain→{A}, host→{A,B}) the check can pass on A while SSH lands on unmarked host B,
  which would then be provisioned. Why (non-blocking, structural): (1) the **role marker is the
  authoritative gate** (`:424-430`), read over the same SSH and deciding first — `DOMAIN_MATCH` is
  only the *first-provision-no-marker* bootstrap fallback (`:431`), so any already-provisioned or
  wrong-role box is rejected regardless; (2) **non-triggering with the actual deploy config** —
  profile/telemetry use a **literal IP** for `*_SERVER_HOST` (`80.78.247.199` etc.; the test uses
  `203.0.113.10`), where `resolve_ips` returns that single IP and SSH connects to exactly it (no
  multi-address ambiguity); (3) **not the X1 threat** — X1's criterion is an *operator-mistyped*
  host (a mistyped literal IP still aborts: no marker + domain doesn't resolve to it), whereas C3
  needs a correctly-typed round-robin hostname + first-provision + SSH load-balancing onto a
  non-domain IP — exactly the task's pre-declared **"ultra-low-reachability races → residual, not
  blocker"** bucket. Codex's fix (resolve once → pin one IP → use it for preflight + SCP + SSH via
  `HostKeyAlias`, repo-wide with telemetry) is real hardening but adds transport complexity for a
  scenario the literal-IP config never hits. Re-raise only if: round-robin / multi-IP hostnames
  become a supported `*_SERVER_HOST` form, OR first-provision must defend a multi-IP target as a
  hard requirement — then either pin one resolved IP through preflight+SCP+SSH, or require a literal
  IP (abort the no-marker DNS-bootstrap path when `*_SERVER_HOST` resolves to >1 address).

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
| 3 | **R2 `TMPDIR → VALIDATE_TMPDIR` fix** re-reviewed (`/stateful-review` on the updated PR; both reviewers) | **CLEAN — confirmed by both** Claude `code-reviewer` and Codex: rename complete (7 refs, all 3 exit paths clean up `VALIDATE_TMPDIR`, fully block-scoped), special `$TMPDIR` no longer clobbered, downstream `SSH_PASSWORD_FILE`/`LOCAL_TMPENV` mktemp now inherit a valid base; argv-safety intact; suite **ALL PASS** | No action. F1 fix verified correct & complete. |
| 3 | **C3** (Codex, high) — preflight `DOMAIN_MATCH` set-overlap not bound to the SSH-selected IP; round-robin multi-IP host could pass no-marker fallback while SSH lands elsewhere | PARTIALLY CORRECT → **low** — authoritative role-marker gate unaffected; **non-triggering with the literal-IP deploys in use** (single resolved IP, SSH binds to it); not the X1 operator-mistype threat; ultra-low-reachability round-robin edge | **Accepted residual** (do-not-re-litigate). Pinned-IP / literal-IP hardening logged as future-task scope. Not blocking. |
| 3 | **F-NEW-1** (Claude, informational) — telemetry `LOCAL_TMPENV` (secrets) rm'd inline after SCP with no EXIT trap → leaks on SCP failure | CORRECT but **pre-existing** — confirmed identical in the `dev` baseline (`git show dev:build-deploy-telemetry.sh`); 04g neither introduces nor worsens it (04g only *adds* the `SSH_PASSWORD_FILE` EXIT trap, a net improvement) | **Noted as pre-existing, out of 04g scope** — not tracked as a 04g open item. A future telemetry-hardening task could give it a finalize/EXIT-trap like profile's. |
| 4 | **C3 + F-NEW-1** independently re-verified under `/process-review`; **CLOSEOUT** | CONFIRMED — C3 mechanically real but **low**: literal-IP `*_SERVER_HOST` config (`.env*`, memory `80.78.247.199`) → `resolve_ips` returns one IP and SSH binds to exactly it (no round-robin ambiguity); authoritative role-marker gate (`build-deploy-profile.sh:424-430`) decides before `DOMAIN_MATCH` (`:431`); round-robin-hostname first-provision edge = task's pre-declared ultra-low-reachability residual; **new mechanism, not a re-raise of C1/C2**. F-NEW-1 CORRECT but **pre-existing in `dev`**, out of scope (proper fix = consolidate telemetry's **non-additive** EXIT trap → telemetry-hardening task). **C1/C2/F2/F3/F4 not re-litigated** (re-raise conditions unmet). | **CLOSED OUT (user-approved)** — 04g converged, **no open defects**; no code change this round. F-NEW-1 deferred to a future telemetry-hardening task. |

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
- **R3 (`/stateful-review` on the updated PR — both reviewers):** the R2 `VALIDATE_TMPDIR` fix is
  **verified clean & complete by both** Claude `code-reviewer` and Codex; suite still **ALL PASS**.
  One new finding — **C3** (preflight `DOMAIN_MATCH` not bound to the SSH-selected IP) — accepted as
  a **residual** (non-triggering with the literal-IP deploys; authoritative role-marker gate
  unaffected; ultra-low-reachability round-robin edge). **F-NEW-1** (telemetry `LOCAL_TMPENV` leak on
  SCP failure) is **pre-existing in `dev`**, out of 04g scope. **No open defects; converged — no
  oscillation** (C3 is a genuinely new mechanism, not a re-raise of C1/C2).
- **CLOSED OUT (R3 `/process-review`, user-approved):** C3 + F-NEW-1 independently re-verified;
  C1/C2/F2/F3/F4 **not** re-litigated (re-raise conditions unmet). 04g is converged with **no open
  defects** and ships with the on-box milestone validation as the merge gate (as 04e3).

## Forward notes (for downstream tasks)

- **F-NEW-1 → homed in `ai-agents/tasks/backlog/0047-deploy-transport-secret-hygiene/brief.md`:** give
  `build-deploy-telemetry.sh` a single unconditional EXIT-trap finalize (covering **both**
  `LOCAL_TMPENV` and `SSH_PASSWORD_FILE`) like profile's `finalize_deploy`, so a failed SCP can't
  leave a 0600 secret env_file on the dev host. Traps are **non-additive** — fold the existing
  password-branch `trap … EXIT` (`:244`) into the consolidated one. Pre-existing in `dev`; not a 04g
  regression. **(Also re-homes A2** — the remote env-file 0600 window 04e3 expected T4g to close but
  04g's argv/concurrency/preflight scope did not — **into the same `sec13` task.)**
- **C3 → if round-robin/multi-IP `*_SERVER_HOST` ever becomes supported:** pin one resolved IP and
  use it for preflight + SCP + SSH (`HostKeyAlias`), or abort the no-marker DNS-bootstrap path when
  `*_SERVER_HOST` resolves to >1 address. Repo-wide with telemetry.
