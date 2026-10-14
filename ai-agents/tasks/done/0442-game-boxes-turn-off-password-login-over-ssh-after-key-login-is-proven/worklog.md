# Worklog — 0442: turn off SSH password login on game prod, game dev and telemetry

## 2026-10-13 — Build (repo-work steps 1–8), fkit-coder as `fkit-sprint-ship-loop` Build worker

Built against the owner-approved `plan.md` (blob `a84c6f02856c0077693a17f38e8931b89b01fba5`), including its
*Owner decisions* (Q1 = change `deploy.sh`, Q2 = dev + telemetry now / prod weekend, Q3 = keep passwords, drop
switches, Q4 = one shared script). **No live step was run.** No SSH to any box, no deploy, no `.env*` file touched,
nothing committed.

### What changed
- **`sshd-hardening.sh` (new, 0755):** a sourced library with one entry point, `harden_sshd [<root prefix>]`.
  - Copies 0221's guards: key in root's `authorized_keys`; `Include sshd_config.d/*.conf`; `sshd -t`; reload (never
    restart); effective-config gate, global and `-C user=root,…`, with `without-password` → `prohibit-password`.
  - Copies 0221's restore-not-delete rollback. The backup sits outside `sshd_config.d/`.
  - Copies 0221's drop-in settings exactly. A harness drift check compares the non-comment lines with
    `setup-profile.sh`'s.
  - Idempotent: if the file is unchanged, nothing is written and sshd is not reloaded, and the gate still runs. If
    that gate fails, it reports FAILED and keeps the file.
  - `setup-profile.sh` is untouched (Q4).
- **`setup-game-host.sh`:** a new `SSHD HARDENING (0442)` section after the alerts section. It reports `OK sshd` or
  `FAILED sshd — <reason>`, and a missing library reports FAILED. Guard 0 holds by construction here, as the header
  comment explains.
- **`deploy.sh`:**
  - Ships `sshd-hardening.sh` in the root-step tar and checks that it exists.
  - **Q1:** the blank-token and blank-URL early returns are removed. The root step now runs on every key deploy, and
    the box reports alerts SKIPPED, so the deploy still exits 3.
  - Banners name alerts + sshd hardening.
  - A 0442 note in the password branch. The existing strings are kept.
- **`setup-telemetry.sh`:** a new `SSHD HARDENING (0442)` section after the cron block, before the version marker:
  1. guard 0 (`TELEMETRY_DEPLOY_SSH_AUTH=password` → exit 1);
  2. library missing → exit 1;
  3. `if ! harden_sshd` → exit 1.

  The header list and inputs are updated.
- **`build-deploy-telemetry.sh`:**
  - `DEPLOY_SSH_AUTH` is set in both auth branches and staged as `TELEMETRY_DEPLOY_SSH_AUTH`.
  - The library: existence check, scp to `/root/sshd-hardening.sh`, added to `TELEMETRY_SHIPPED_PATHS` (now five).
  - A 0442 note in the password branch.
- **`scripts/telemetry-tunnel.sh`:** a 0442 note in the password branch.
- **Docs, `docs/vps-deployment-guide.md`:**
  - §1 and §2: one line each.
  - §7: key install without a password; deploy user = root; Q3 wording (password values stay, switches go, the root
    password is the console login); a new *Password login is off (task 0442)* section (what changed, the next deploy
    re-applies, rollback A and B with commands, a `Host` block with `IdentitiesOnly`, lost key = console only); the
    rotate step.
  - §8: the failed-logins count drops; `sshd` is a cause behind `GAME HOST SETUP`.
- **Tests:**
  - `tests/ssh-alerts.sh`: `sshd` stub + `systemctl reload` failure fixture; each case's fake root is seeded with an
    Include line and a fake key; H1–H13; the `set -x` guard is extended to the library.
  - `tests/scripts/profile-deploy-hardening.test.sh`: T40, T44, T53, T67, T69 (rewritten per Q1), plus a new
    structural block for the library and its wiring, including a run of the telemetry guard 0.
  - `tests/scripts/ConfigParityCallSites.test.ts`: fixture list (see the decision log).

### Verification
- `bash tests/ssh-alerts.sh` → **141 passed, 0 failed** (run under macOS `/bin/bash` 3.2.57, which is also the `bash`
  on PATH).
- **Negative controls:** four mutations of the library in a scratch copy. Each one turned the harness red:
  - rollback deletes instead of restoring → 3 failed;
  - idempotence removed → 4 failed;
  - gate ignores the root context → 2 failed;
  - `sshd -t` skipped → 4 failed.
- `bash tests/scripts/profile-deploy-hardening.test.sh` → **ALL PASS** (1000 ✅ lines).
- `bash -n` on every touched script: OK. **shellcheck: not installed on this machine, not run.**
- **Full `npm test`** (one run, through the npm script / project lock), **101 s → RED:**
  - result: 1 suite failed / 224 passed; 2 tests failed / 4609 passed;
  - both failures were in `tests/scripts/ConfigParityCallSites.test.ts` (`deploy.sh` exited 3, expected 0). This
    change caused them; they are not a flake.
  - after the fixture fix: targeted `npm test -- tests/scripts/ConfigParityCallSites.test.ts` → 16/16 passed.
  - **A green full run has not been seen since that fix.** Only one full run was allowed.
- Secrets grep over the diff: no host, address or key. The only match is the visibly fake fixture key
  `…0442fakeKeyNotReal` in `tests/ssh-alerts.sh`.

### Not verifiable here
- A real sshd, systemd, and Ubuntu 24.04 socket activation: covered only by the stubs. The live steps (P1–P5 and the
  per-box steps) are the proof, and the owner executes them.

## Decision log (unattended calls, ADR-032 A4 / ADR-019)
1. **Fixture fix to `tests/scripts/ConfigParityCallSites.test.ts`** — an obvious winner, within the plan's intent.
   - Answers: the full `npm test` red above. That suite drives the real `deploy.sh` and copies a list of the files
     it ships. That list lacked the new `sshd-hardening.sh`, so `run_game_host_setup` reported "missing" → exit 3.
   - Changed: added `"sshd-hardening.sh"` to `COPIED`, and corrected the 0443 comment about the blank token
     (since Q1 the root login runs either way).
   - Why it qualified:
     - mechanical, in one place;
     - the same kind of fixture update the plan already lists for T67 and the shipped-paths checks ("Harness
       coupling … updated in the same change");
     - the plan simply did not name this suite;
     - no behaviour change.
2. **`harden_sshd` takes the root prefix as an argument** (`harden_sshd "$ROOT"`), not through a new environment
   variable. This is an implementation detail of plan decision 5 (`$ROOT` test seam) and stays inside it.
3. **`SSHD_HARDENING_REASON`** is set by the library so that `setup-game-host.sh` can print
   `report sshd FAILED "<reason>"` (plan decision 6's wording). Inside the plan.
4. **A missing library in `setup-telemetry.sh` → exit 1.** The plan says the section "stops the deploy on failure
   (exit 1)", and a library that was not shipped is such a failure. Inside the plan.
5. **The 0442 note in the `deploy.sh` / telemetry password branches is printed at the top of the branch**, so it shows
   both when the switch is off (refusal) and when it is on. Plan decision 8 says "the fallback branch prints an extra
   line"; this is a placement choice within it.
6. **Docs §1 and §2 got one line each.** Both said the password fallback was a way back, which this task makes
   wrong. The plan listed §7 and §8; this is the same correction, within verification 7's intent.

None of these is a frontier move or a scope change.

## 2026-10-13 — Process review, round 1 (R1–R2), fkit-coder as `fkit-sprint-ship-loop` Process-review worker

Ledger: `review.md` (R1 medium, R2 low; coverage: reasoning-only second opinion). Both findings were put to the owner
by the driver before this spawn; both ruled "Fix now". No live step, no SSH, no deploy, no `.env*` touched, nothing
committed. `plan.md` not edited — where the rulings below contradict plan decision 3 ("Unchanged: no write and no
reload"), the owner ruling on R2 governs.

### What changed
- **R1 — `build-deploy-telemetry.sh`:** the key branch adds `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no`
  to both `SCP_CMD` and `SSH_CMD`, so the staged `TELEMETRY_DEPLOY_SSH_AUTH=key` is true by construction.
  `tests/scripts/profile-deploy-hardening.test.sh` T55: two driven checks (every ssh / scp call) and one structural count.
- **R2 — `sshd-hardening.sh`:** the unchanged path now runs `sshd -t` → reload → gate, and leaves the file on any failure.
  `setup-game-host.sh` contract comment and `docs/vps-deployment-guide.md` §7 sentence updated.
  `tests/ssh-alerts.sh`: H2 and H12 updated, H14–H16 added.

### Verification
- `bash tests/ssh-alerts.sh` → **151 passed, 0 failed**. Negative control (unchanged-path reload removed in place, then
  restored and `cmp`-checked) → 7 failed.
- `bash tests/scripts/profile-deploy-hardening.test.sh` → **ALL PASS** (1003 ✅ lines), the three new R1 checks among them.
  R1 negative control: HEAD's telemetry key branch counts 0 of the new option pair (the structural check would be red).
- `bash -n` on every touched script: OK. shellcheck: not installed, not run.
- **One full `npm test`** (npm script, project lock; no other jest process before or after) → **green: 225/225 suites,
  4611/4611 tests, 110 s.** This is also the first green full run since the build round's fixture fix.
- Still not verifiable here: real sshd / systemd behaviour — the live steps are the proof.

## Decision log — process review round 1 (ADR-032 A4 / ADR-019)
7. **R1 fix** — answers review R1. Changed: telemetry key-path ssh/scp options (above) + T55 checks. Why it qualified:
   **owner-ruled** ("Fix now", 2026-10-13); verified CORRECT; mechanical, one branch. Option order chosen so T55's
   existing `-o IdentitiesOnly=yes -i <key>` contiguous match still holds. `BatchMode` deliberately not added (it would
   also block a passphrase prompt for the key itself, which is key auth).
8. **R1 scope call: `scripts/telemetry-tunnel.sh` left unchanged** — obvious winner within the ruling's intent (the
   driver asked to consider it). The tunnel hardens nothing and stages no auth label, so no guard trusts it; after 0442
   the box refuses passwords anyway. Changing it adds harness coupling for no safety gain.
9. **R2 fix, shape "always reload on the unchanged path"** — answers review R2. Why it qualified: **owner-ruled** ("Fix
   now (small)"; option text names "or always reload sshd"); verified CORRECT; localized to one branch. Chosen over
   "detect the interrupted case" because detection is blind to the fresh-box interruption (no `.previous` backup, temp
   file already moved), the likeliest one. Contract: a reload is not a restart; `setup-profile.sh` (0221) already reloads
   every deploy. `sshd -t` runs before that reload so a config broken elsewhere is never reloaded.
10. **Flagged, not fixed:** `build-deploy-profile.sh`'s key path has R1's shape. Out of this plan (profile is 0221's);
    harmless while the profile box refuses passwords.
