# Review ledger — s4-profile-04e3

Task: `ai-agents/tasks/done/0180-profile-04e3-deploy-wiring-milestone/brief.md`
File(s) under review: `build-deploy-profile.sh` (deploy/transport slice: SSH/SCP secret-staging + remote `setup-profile.sh` invocation, digest+domain passthrough). The PR's other file (`…/0182-profile-04i-server-bring-up-runbook/brief.md`) is docs — not reviewed for code defects.
Status: **resolved (R3)** — C1 re-verified empirically and **applied** as optional low-severity hardening (split trap, `build-deploy-profile.sh:308-310`). Its claimed *medium correctness defect* (false "DONE" on an aborted deploy) was **disproven**: the script's existing `set -e` (`:13`,`:18`) already aborts on the signal-killed `ssh` (exit 130), so the false success never prints — verified empirically on bash 3.2.57. No open defects. Milestone (`https://api.geoconflict.ru/health` 200 over TLS) remains validation-gated on the on-box *Independent test*. **R3 (stateful-review, PR 121 re-review after the split-trap update):** the split-trap is re-verified correct; both reviewers ran full coverage again; two *new* Codex findings (wrong-host preflight **X1**, persisted registry token **X2**) and one Claude finding (remote perm window **A2**) are real but **non-blocking frontier-moves** → recorded as new residuals + forward-notes, not blockers. Verdict: **Ready to merge (validation-gated)**.

Reviewers (R1, stateful-review): **Claude `code-reviewer`** (review-only) + **Codex adversarial** — both ran, full coverage.
Reviewers (R3, stateful-review re-review of PR 121): **Claude `code-reviewer`** (review-only) + **Codex adversarial** — both ran, full coverage again.

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
- **No remote identity / role-marker preflight before provisioning (X1, R3)** — What:
  the first box contact is the SCP at `:277-279`; there is no read-only SSH preflight
  that asserts the target is the *intended* profile box (a provisioned role-marker, or
  `PROFILE_SERVER_HOST` matching `PROFILE_DOMAIN`'s expected address) before the
  destructive `setup-profile.sh` runs `apt upgrade`/ufw/swap/containers (`setup-profile.sh:123,133`,
  all *before* its later domain DNS check at `:486+`). A mistyped/stale host that is
  reachable **and** accepts the root key would therefore be clobbered. Why (structural):
  this is the **exact in-production pattern of `build-deploy-telemetry.sh`** (direct SCP,
  no role-marker preflight); the scenario is narrow (operator mistypes the host AND that
  host accepts the same SSH key AND the operator runs a destructive provision); the
  current `set -e`-on-SCP handling already aborts on *unreachable / auth-fail* targets
  before any secret. A role-marker preflight + host/domain match is **net-new defensive
  hardening** (frontier), not a defect this slice introduced. Codex's "high" is
  severity-inflated for this slice. Re-raise only if: the deploy must defend against a
  reachable-but-wrong host as a hard requirement (then add the preflight repo-wide with
  telemetry — see forward-note).
- **Broad `DOCKER_TOKEN` persisted on the VPS (X2, R3)** — What: the deploy passes
  `DOCKER_TOKEN` through; `setup-profile.sh:398-401` runs `docker login --password-stdin`
  (token on **stdin**, not argv) but never `docker logout` and uses no isolated
  `DOCKER_CONFIG`, so the credential persists in `/root/.docker/config.json` on a public
  box. The runbook reuses the game's existing registry creds, so VPS compromise could
  expose creds for unrelated images. Why (structural): delivery here is already secure
  (0600 staged env_file, sourced + `rm`'d, never in argv); the **persistence itself is an
  accepted 04e2 residual** ("token is reuse-persisted" — `s4-profile-04e2.md`), and the
  remedy (a repo-scoped pull-only token + `docker logout` / isolated `DOCKER_CONFIG`
  after `docker compose pull`) lives in **`setup-profile.sh` + ops token-scoping**, not in
  this build/transport slice. Codex's "high" is severity-inflated for this slice.
  Re-raise only if: a scoped pull-only token cannot be issued, or the persisted token is
  shown to grant write/push on unrelated prod images (then fix in `setup-profile.sh` —
  see forward-note).

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
| 2 | (**process-review**) C1 re-verified before applying — does the false-"DONE" actually reproduce? | **PARTIALLY CORRECT — severity corrected medium→low; handoff premise disproven** | Empirical test (bash 3.2.57, SIGINT to the process group during the foreground command): with `set -e` **off** the false "DONE" reproduces (exit 0), but with `set -e` **on** (the actual script — `:13`,`:18`) it exits **130 with no false "DONE"**. So the handoff's "set -e doesn't help" claim is wrong and the *active* medium defect does not exist here. **Applied anyway (user-approved option A)** as explicit hardening: removes the implicit `set -e` dependency and makes cleanup run exactly once. Split trap now at `:308-310`. Non-regressing (fixed variant → exit 130, no DONE on every `set -e` setting); the verified-correct iidfile→EXIT-trap handoff is preserved (EXIT trap is still `cleanup_secrets`; `$IIDFILE` rm'd at `:140`). |
| 3 | (**stateful-review re-review**, PR 121) split-trap update (`:305-310`) re-verified after the "just updated" commit `2c6c177` | **CONFIRMED CORRECT — no defect** | EXIT trap + `exit 130`/`exit 143` → `cleanup_secrets` runs exactly once on every path (incl. INT/TERM); iidfile→EXIT handoff preserved. The actual PR update is clean. |
| 3 | (**Codex**, *high*) no remote identity/role-marker preflight before destructive provisioning (`:277-279` → `setup-profile.sh:123,133`) | **PARTIALLY CORRECT → frontier-move; high→low/med** | Fact confirmed (apt-upgrade/ufw/swap/containers run before any DNS check; a reachable *wrong* host accepting the key is clobbered). Mirrors in-prod `build-deploy-telemetry.sh`; narrow scenario; fix is net-new cross-file hardening. → New accepted residual (**X1**) + forward-note. Not this slice's defect. |
| 3 | (**Codex**, *high*) broad `DOCKER_TOKEN` persisted in root's docker config on the public VPS (`setup-profile.sh:398-401`; no logout/isolated `DOCKER_CONFIG`) | **PARTIALLY CORRECT → frontier-move; high→low/med** | Fact confirmed (login, never logged out). Delivery already secure (stdin, 0600 staged + rm'd); *persistence* is an accepted **04e2** residual; remedy lives in `setup-profile.sh`+ops (scoped pull-only token). → New accepted residual (**X2**) + forward-note. Not this slice's defect. |
| 3 | (**Claude**, *med*) remote env file at scp-default perms briefly before in-session `chmod 600` (`:343`) | **PARTIALLY CORRECT → low (negligible)** | Real window, but `/root` is mode 0700 → no other-user traversal regardless of file mode. Distinct from settled #4 (local file). → Forward-note (**A2**) to T4g. Non-blocking. |
| 3 | (**Claude**, *high*, self-downgraded) `REMOTE_ENV_STAGED=1` set before SCP (`:336`) | **SUPPRESSED — re-litigates settled R1 decision** | Flag-set-before-SCP is the *deliberately conservative* partial-transfer cleanup (R1 confirmed-correct row). Claude's "set after SCP" inverts it; Claude concedes the impact is a harmless `\|\| true` no-op. Re-raise condition not met. |
| 3 | (**Claude**, *low* ×4) iidfile-trap benign (A3); `LOCAL_TMPENV` mktemp 0600 re-confirms settled #4 (A4); auth gate correct (A5); `${PROFILE_DOMAIN:-<domain>}` URL works (A6) | **INCORRECT (reviewer self-disproved / re-confirms settled)** | All four are non-findings the reviewer disproved in its own write-up. No action. |

**No oscillation / no loop:** first review of this slice. Both stateless reviewers led with two "high" findings each; verification collapsed them to **one medium real defect (C1)** — the rest were intentional designs (domain-optional, telemetry-mirrored root contract, owner email default) or a disproven premise (mktemp 0600). Classic stateless severity-inflation, caught at the dedup/verify gate. **R3 (PR 121 re-review):** again both reviewers led with two "high" findings each; verification collapsed them to **zero blocking defects** — the actual update (split-trap) is correct, two are out-of-slice frontier-moves (X1/X2, severity-inflated), one is a negligible perm window (A2), one re-litigates a settled R1 decision (A1), four were self-disproven. Same stateless severity-inflation pattern, same gate — no oscillation introduced.

## Open / actionable

- _(none — no open defects.)_ **#C1 RESOLVED (R2):** the split-trap hardening is applied at
  `build-deploy-profile.sh:308-310` (`trap cleanup_secrets EXIT` + `trap 'exit 130' INT` +
  `trap 'exit 143' TERM`); `bash -n` clean. The claimed false-"DONE" correctness defect was
  **disproven** (existing `set -e` already prevents it — see Decision log R2); this was applied
  as explicit hardening, not a bugfix. Validation-gate: the on-box *Independent test* (milestone
  curl + `ps`-during-deploy secret check + bad-SSH-target fail-before-mutate + EXIT-trap cleanup)
  remains the real merge gate.

## Forward notes (for downstream tasks)

- **T4g** (argv + concurrency hardening): the signal-trap split was **applied here** (`:308-310`),
  so T4g does **not** need to redo it (the original "fold the signal-trap fix in" plan is closed).
  Note `build-deploy-telemetry.sh` does its secret cleanup **inline** (no `EXIT/INT/TERM` trap), so
  there is nothing analogous to split there. The `/root/`-vs-user path coupling (accepted residual)
  should still be addressed repo-wide with telemetry only if a non-root deploy user is ever
  required — not in one script alone.
- **T4g — remote env-file perm window (A2, added R3):** after the SCP at `:337`, the remote
  `/root/.profile-deploy-env-$$` briefly holds scp-default perms before the in-session `chmod 600`
  at `:343`. Negligible today (`/root` is 0700 → no other-user traversal), so **not** fixed in this
  slice. When T4g touches transport, fold the chmod into the transfer (e.g. pipe the env-block via
  stdin into a `umask 077`-guarded remote write, or pre-create the file 0600 before SCP) so the
  window closes. Do the same in `build-deploy-telemetry.sh` for parity.
- **X1 (wrong-host preflight) → homed in `s4-profile-04g` (T4g), added to its Scope/AC R3:** a
  read-only SSH preflight before the SCP at `:277-279` that asserts the target is the intended
  profile box (a provisioned role-marker file, and/or `PROFILE_SERVER_HOST` matching
  `PROFILE_DOMAIN`'s resolved address) and aborts before any mutation. **Repo-wide with
  `build-deploy-telemetry.sh`** (same gap). Frontier-move, not this slice's defect.
- **X2 (registry token persisted on VPS) → homed in new `0045-vps-registry-credential-hygiene`:**
  issue a repo-scoped **pull-only** token for the VPS, and in `setup-profile.sh` either use an
  isolated `DOCKER_CONFIG` for `docker compose pull` or `docker logout` immediately after, so a
  broad credential does not persist in `/root/.docker/config.json` on a public box. The
  *persistence* is an accepted 04e2 residual, so this is hardening, not a regression.
