# Review ledger — s4-profile-04e3

Task: `ai-agents/tasks/backlog/s4-profile-04e3-deploy-wiring-milestone.md`
File(s) under review: `build-deploy-profile.sh` (deploy/transport slice: SSH/SCP secret-staging + remote `setup-profile.sh` invocation, digest+domain passthrough). The PR's other file (`…/s4-profile-04i-server-bring-up-runbook.md`) is docs — not reviewed for code defects.
Status: **in-review** — 1 open defect (**C1**, medium, non-blocking) routed to a coder-handoff; everything else verified correct or recorded as an accepted residual. Milestone (`https://api.geoconflict.ru/health` 200 over TLS) is still validation-gated on the on-box *Independent test*.

Reviewers (R1, stateful-review): **Claude `code-reviewer`** (review-only) + **Codex adversarial** — both ran, full coverage.

Related ledgers:
- `s4-profile-04e1.md` (same file, `build-deploy-profile.sh`) — its 4 residuals (shared durable push tag, dirty-worktree warn-not-fail, no bash test harness, docker-socket peer) still hold and were not re-raised. Its **forward note** (the new secret-cleanup `trap … EXIT` *replaces* the iidfile `trap … EXIT`, traps are not additive → fold iidfile cleanup in) was **verified correctly handled** this round (see Decision log).
- `s4-profile-04e2.md` (`setup-profile.sh`) — its **DATABASE_URL/T5** residual governs the inert `DATABASE_URL` passthrough here, and its deliberate **domain-optional** support (the certbot-cron gating fix) is the basis for suppressing finding **C2** below.

## Accepted residuals (do-not-re-litigate)

- **Domain-optional deploy (TLS skipped when `PROFILE_DOMAIN` unset)** — What: the
  transport stages `PROFILE_DOMAIN=%q` with `${PROFILE_DOMAIN:-}` (empty if unset);
  `setup-profile.sh` then **deliberately** skips nginx/Let's Encrypt and brings the
  stack up on loopback only (`setup-profile.sh:486`, and it prints "PROFILE_DOMAIN
  unset — TLS/nginx skipped" at `:734`). Why (structural): domain-unset is the
  **documented standalone/test path** — 04e2 specifically gated the certbot cron on
  `[ -n "$PROFILE_DOMAIN" ]` to make that path clean. Requiring a domain in the build
  script (Codex's C2 recommendation) would **break** that intentional mode. The
  production milestone deploy supplies the domain; an operator who forgets it is told
  ("TLS skipped"), and the final next-step echoes a literal `<domain>` placeholder — a
  visible tell, not a silent false success. Re-raise only if: the standalone/no-TLS
  mode is removed from `setup-profile.sh`, OR the milestone is changed to make a
  TLS-less deploy an error rather than a supported mode.
- **Remote paths hardcoded to `/root/` while `PROFILE_SSH_USER` is configurable** —
  What: `REMOTE_SCRIPT=/root/setup-profile.sh` (`:263`) and
  `REMOTE_ENV=/root/.profile-deploy-env-$$` (`:292`) are `/root/`-rooted, but
  `REMOTE_USER` defaults to `root` via `${PROFILE_SSH_USER:-}` and accepts any value;
  a non-root login would fail at the first SCP. Why (structural): this is the **exact,
  in-production pattern of `build-deploy-telemetry.sh`** (`:182-290` — same
  `${…_SSH_USER:-}`→root default, same `/root/…-deploy-env-$$`, same
  `chmod && chmod && . && rm && setup` chain). `setup-profile.sh` itself requires root
  (apt/systemd/swap/`/opt/profile`), so **root is the deploy contract**, and the
  `PROFILE_SSH_USER` knob mirrors telemetry's `TELEMETRY_SSH_USER` as a "just-in-case"
  override. Codex's "violates fail-before-mutate for registry state" is overstated — an
  idempotent registry push is not box mutation, and the task's fail-before-mutate
  criterion is about *the box*. Re-raise only if: a genuine non-root deploy user is
  required (then derive the remote paths from `$REMOTE_USER`'s home + a validated sudo
  path, repo-wide with telemetry) — a cheap optional early `[ "$REMOTE_USER" = root ]`
  guard before build is noted but not required.
- **`CERTBOT_EMAIL` defaults to the project owner's address** — What: the staged
  `CERTBOT_EMAIL` falls back to `ruflashist@gmail.com` (`:323`). Why (structural): this
  is the owner's own private deploy script for geoconflict.ru; the owner *wants*
  Let's Encrypt expiry/renewal notices to reach them, so a working default is desirable,
  not a leak. It is the operator's own email, not third-party PII. Re-raise only if: the
  script becomes a shared/public template, or ownership of the deploy changes.
- **`mktemp` + `chmod 600` ordering (Claude's "0644 window")** — What: `chmod 600`
  runs at `:303`, after `mktemp` at `:293`. Why (non-defect): empirically verified on
  the macOS dev host — `mktemp` creates the file **0600** already (so `chmod 600` is
  redundant defense-in-depth), the window holds an **empty** file (no secret), and the
  later `> "$LOCAL_TMPENV"` **truncates** (preserves the 0600 perms — confirmed). No
  secret is ever written to a world-readable local file on the normal path. Re-raise
  only if: it is part of the **C1** signal-race below (cleanup unlinks the file, then a
  resumed `>` re-creates it at umask) — fixing C1 closes that sub-case too.
- **Local `chmod +x setup-profile.sh` before SCP** — What: `:278` chmods the local
  copy. Why (non-defect): the file is committed mode 100755 → the chmod is a no-op and
  does not dirty the worktree; the remote chain re-chmods anyway (`:336`). Trivial;
  drop it only opportunistically. Re-raise only if: the file's committed mode changes.

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | (**Codex**, *high*) `trap cleanup_secrets … INT TERM` (`:295-302`) never `exit`s → after a caught signal bash **resumes**; Ctrl-C during the remote phase runs cleanup then falls through to `:343` printing a false "DONE", and in a narrow race (signal between `chmod` `:303` and the redirect `:311`) cleanup unlinks the temp and the resumed `>` re-creates it at umask (0644) then re-stages | **CORRECT — defect, downgraded high→medium** | **Open #C1.** Real net-new bug. Worst *practical* symptom = **false success on an aborted deploy**; the secret-exposure sub-case is low (secrets already live in plaintext `.env.profile.secret` on the same host; tiny timing window). Standard fix: `trap cleanup_secrets EXIT` + `trap 'exit 130' INT` + `trap 'exit 143' TERM`. Routed to coder-handoff (user-approved). |
| 1 | (**Codex**, *high*) unset `PROFILE_DOMAIN` → successful deploy without the TLS milestone | **PARTIALLY CORRECT → frontier-move (suppressed)** | Domain-unset is the **intentional** standalone/no-TLS mode (`setup-profile.sh:486,734`); 04e2 deliberately supports it. Recommendation to "require a domain" would break it. → Accepted residual (domain-optional). Not a defect. |
| 1 | (**both** — Codex *med* C3 / Claude *med* Cl2) `REMOTE_SCRIPT`/`REMOTE_ENV` hardcoded `/root/` vs configurable `PROFILE_SSH_USER` | **PARTIALLY CORRECT → accepted pattern** | Identical to in-production `build-deploy-telemetry.sh:182-290`; root is the deploy contract (`setup-profile.sh` needs root). "Violates fail-before-mutate" overstated (registry push ≠ box mutation). → Accepted residual. Optional early root-guard noted, not required. |
| 1 | (**Claude**, *high*) `chmod 600` after `mktemp` → 0644 window on macOS | **INCORRECT (disproven)** | Empirically `mktemp` = **0600** here; window holds an empty file; `>` preserves perms. No exposure on the normal path. Folds into C1's signal-race only. → Accepted residual (non-defect). |
| 1 | (**Claude**, *low*) local `chmod +x` dirties the worktree | **INCORRECT as a defect** | File is committed mode 100755 → no-op; remote chain re-chmods. → Accepted residual (trivial). |
| 1 | (**Claude**, *low/med*) `CERTBOT_EMAIL` personal-email default is PII-in-source | **INCORRECT as a defect → frontier-move** | Owner's own email in the owner's private deploy script; a working default is desirable for LE notices. → Accepted residual. |
| 1 | (**Claude**, verified-correct) iidfile→secret-cleanup trap handoff (the 04e1 forward note) | **CONFIRMED CORRECT — no defect** | `$IIDFILE` is `rm`'d at `:140` (success path) before the new `trap cleanup_secrets EXIT INT TERM` at `:302` replaces the iidfile EXIT trap; on the build/push-failure window the old iidfile trap is still active. No re-leak. The 04e1 forward-note concern is properly addressed. |
| 1 | (**Claude**, verified-correct) `REMOTE_ENV_STAGED` flag; secret-never-in-argv; fail-before-mutate ordering; exported vars reach `setup-profile.sh`; `set -e`/`pipefail` | **CONFIRMED CORRECT — no defect** | Flag set-before-SCP is conservative (cleans a partial transfer); no secret in any SSH/local argv (staged 0600 file, sourced + `rm`'d before setup runs); first box contact is the SCP at `:279` (after build/push, before any secret); `. ${REMOTE_ENV}` exports inherited by the `${REMOTE_SCRIPT}` child. |

**No oscillation / no loop:** first review of this slice. Both stateless reviewers led with two "high" findings each; verification collapsed them to **one medium real defect (C1)** — the rest were intentional designs (domain-optional, telemetry-mirrored root contract, owner email default) or a disproven premise (mktemp 0600). Classic stateless severity-inflation, caught at the dedup/verify gate.

## Open / actionable

- **#C1 (medium, non-blocking) — INT/TERM trap never exits** — `build-deploy-profile.sh:295-302`.
  Ctrl-C during the remote phase continues execution → false "DONE"; narrow umask re-stage
  race. Fix: split traps so `INT`/`TERM` `exit` (130/143) and only `EXIT` cleans up.
  **Routed to** `ai-agents/reviews/s4-profile-04e3-coder-handoff.md` (user-approved R1).
  Validation-gate: the on-box *Independent test* (milestone curl + `ps`-during-deploy
  secret check + bad-SSH-target fail-before-mutate + EXIT-trap cleanup) remains the
  real merge gate regardless of C1.

## Forward notes (for downstream tasks)

- **T4g** (argv + concurrency hardening): if C1 is deferred rather than fixed here, fold the
  signal-trap fix in alongside the `sshpass -p`→`-f` and deploy-lock work. The `/root/`-vs-user
  path coupling (accepted residual) should be addressed repo-wide with `build-deploy-telemetry.sh`
  if a non-root deploy user is ever required — not in one script alone.
