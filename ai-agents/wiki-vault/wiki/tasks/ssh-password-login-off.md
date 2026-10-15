# Game and Telemetry Boxes — Turn Off SSH Password Login (task 0442)

**Source**: `ai-agents/tasks/done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 39 (ADR-035 append rank; 🚨 top priority by owner ruling 2026-10-12, second after `0441`) / task `0442`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-13. Scope widened 2026-10-12 to the **telemetry** box by
> owner ruling *"Yes, add telemetry (Recommended)"* (the folder slug predates it; the title is the scope).
>
> ⚠️ **REPO WORK ONLY. NO LIVE STEP WAS RUN** — no SSH to any box, no deploy. **Password login is still ON** on game
> prod, game dev and telemetry. The box steps (pre-checks, one deploy per box, proof) are the verify task **`0452`**
> (Sprint 8, Backlog). Code committed in `daa1bcc` (2026-10-14); `git tag --contains` → **none** ⇒ not shipped.
>
> 🚨 **THE NEXT KEY DEPLOY OF A GAME BOX OR TELEMETRY TURNS PASSWORD LOGIN OFF — whatever task that deploy is for.**
> `deploy.sh` (game) and `setup-telemetry.sh` (telemetry) now apply the hardening on every key deploy. `0452`'s
> pre-checks P1–P4 (provider web console logged into as root for each box, both private keys **and** passphrases backed
> up, root passwords in the password manager, a read-only `sshd` look) must pass **before** that first deploy — this
> includes deploys made for `0449` and `0450`.

> 📌 *2026-10-15 sync:* **the box steps have started** (`0452`, now `🔄 In progress`). Pre-checks P1–P4 passed
> (provider console logged into as root on all three boxes; both keys, passphrases and root passwords in the password
> manager; a read-only sshd look found no `Match` line, no drop-in sorting before `00-`, the `Include` line present).
> Then password login is **off on telemetry and game dev since 2026-10-15** (`0452`: V2–V4 passed on both — key login works, a password-only login gets `Permission denied (publickey)`, effective `sshd -T` shows `passwordauthentication no`). **Game prod still accepts passwords** until its weekend-slot step. Telemetry went out as `0.0.164-telemetry.1`; game dev as a same-version redeploy
> ([[systems/weekend-deploy-window]]). The "password login is still ON" line above is **history for those two boxes**.
> - **Still open:** V5 — fail2ban "Total failed" should keep rising a few hours later (baselines at P4: telemetry 25430,
>   game dev 160736) — tracked as **`0462`** (it *is* `0452`'s V5 for those two boxes, not an extra check); game prod in
>   the weekend slot; the Q3 switch removal (verification step 7), after all three boxes pass.
> - ⚠️ **Misleading banner, wording only:** the game dev deploy's final banner read *"HOST SETUP NOT DONE … the sshd
>   hardening … may be missing"* although its sshd section passed — the banner is driven by the skipped SSH-alerts part
>   (`0449`'s token). Noted in the worklog, not a failure ([[tasks/ssh-security-alerts]]).

> 📌 *2026-10-15 sync, second run (`aa0973b`):* **V5 passed for telemetry and game dev** (`0462`, closed 2026-10-15): telemetry "Total failed" 25627 > 25430; game dev passed **with a note** by owner ruling — fail2ban there had been restarted by `0449`'s down/back test, which resets the counter, so the > 160736 comparison could not apply (9 failures and 1 ban in the ~6 minutes since). `0452` is left with game prod (weekend slot) and the Q3 switch removal. The game dev "misleading banner" above is gone on `0449`'s later deploy (`GAME HOST SETUP OK`). [[tasks/fail2ban-recheck-after-password-off]]

## Goal

Once [[tasks/ssh-key-login-live]] (`0445`) proved key login on every in-scope box, switch password login off so
guessing the password becomes useless — bots were trying thousands of times a day. The danger is locking **ourselves**
out, so the task is mostly a safe order and a way back. The profile box was already hardened this way in task `0221`
([[tasks/profile-os-baseline-hardening]]) and is the model.

## Key Changes

- **`sshd-hardening.sh` (new)** — a sourced library, entry point `harden_sshd [<root prefix>]`, copying `0221`'s
  section: writes `/etc/ssh/sshd_config.d/00-geoconflict-hardening.conf` (the `00-` prefix wins because sshd keeps the
  first value it reads; a `Match all` block covers cloud-image `Match User root` overrides) with password and
  keyboard-interactive off, empty passwords off, key login on, **`PermitRootLogin prohibit-password`** (root is the
  deploy user on every box). Guards: a key in root's `authorized_keys`; the `Include` line present; `sshd -t`; **reload,
  never restart**; then the **effective** settings checked (`sshd -T`, global and as root). On failure it restores the
  previous file (restore, not delete). A harness drift check pins its settings to `setup-profile.sh`'s.
- **Game boxes:** a new `SSHD HARDENING (0442)` section in `setup-game-host.sh` (the every-deploy root step from `0443`),
  reporting `OK sshd` or `FAILED sshd — <reason>`. `deploy.sh` ships the library in the root-step tar.
- **Owner ruling Q1 — "Change deploy.sh (Recommended)":** the root step now runs on **every key deploy**; only its
  alerts part is skipped while `PROFILE_SSH_ALERT_TOKEN` is blank — so a game deploy still **exits 3** until `0449`
  sets the token.
- **Telemetry:** the same section in `setup-telemetry.sh` (exit 1 on failure), with **guard 0** — refuse if the deploy
  itself came in by password (`TELEMETRY_DEPLOY_SSH_AUTH=password`).
- **Docs:** `docs/vps-deployment-guide.md` §7 *Password login is off (task 0442)* — what changed, rollback A (the open
  session restores the file) and B (the provider's web console, which is not SSH and still takes the root password), a
  `Host` block with `IdentitiesOnly`, lost key = console only. §1, §2 and §8 corrected.
- **Other owner rulings (2026-10-13):** Q2 *"Dev+telemetry now, prod weekend (Recommended)"*; Q3 *"Keep passwords, drop
  switches"* — password values stay in the env files, only the fallback switches go, **no root-password rotation**;
  Q4 — one shared script.

## Outcome

- **Review R1 (medium, owner "Fix now")** — the telemetry key path did not forbid a password fallback, so a rejected key
  plus a typed root password would still be labelled `key`, pass guard 0, and **lock out an operator whose key does not
  work**. Fixed: `build-deploy-telemetry.sh`'s key branch adds `-o PasswordAuthentication=no -o
  KbdInteractiveAuthentication=no` to every ssh/scp (no `BatchMode`: a key passphrase prompt is still key auth). The
  game root step already had this. The same gap in the profile deploy became task `0453` —
  [[tasks/profile-deploy-key-only]].
- **Review R2 (low, owner "Fix now (small)")** — the unchanged-file path skipped the reload, so an interrupted earlier
  run could report `OK` for a drop-in the running sshd never loaded. Fixed: the unchanged path also runs `sshd -t` →
  reload → check (a reload is not a restart; `setup-profile.sh` already reloads every deploy).
- **Tests:** `tests/ssh-alerts.sh` 151 passed; hardening harness `ALL PASS`; negative controls (rollback deletes,
  idempotence removed, root context ignored, `sshd -t` skipped, unchanged-path reload removed) each turned it red. Full
  `npm test` green after the R1/R2 round (225/225 suites, 4611 tests). **shellcheck not installed — not run.** Real
  sshd/systemd behaviour is covered only by stubs; the live steps are the proof.
- **Not built yet:** the box side — `0452` (game dev + telemetry now, game prod in the weekend slot). Moving other
  hand-set-up parts into the root step is `0446` (Backlog board).

## Related

- [[tasks/ssh-key-login-live]] — task `0445`, the key-login proof this task waited on
- [[tasks/deploy-ssh-key-login]] — task `0441`, the first half of the same owner request
- [[tasks/ssh-security-alerts]] — task `0443`, owner of `setup-game-host.sh`; its alerts part still skips (exit 3)
- [[tasks/profile-os-baseline-hardening]] — task `0221`, the profile box's sshd hardening this copies
- [[tasks/profile-deploy-key-only]] — task `0453`, the R1 lesson applied to the profile deploy
- [[tasks/vps-access-hardening]] — task `0132`, the April 2026 target this finishes for the game and telemetry boxes (once `0452` runs)
- [[tasks/deployment-credential-hardening]] — the SSH-key-first deploy contract; password login now off on telemetry and game dev (2026-10-15)
- [[systems/weekend-deploy-window]] — the deploy consequence above; game prod waits for the weekend slot
- [[decisions/sprint-8]] — the board (rank 39; verify `0452` at rank 46)
- [[decisions/sprint-backlog]] — `0446` (game boxes rebuilt from scripts alone)
- [[tasks/game-deploy-env-file-cleanup]] — task `0447`: its verify `0450` deploys game dev, which now applies this hardening
- [[tasks/fail2ban-recheck-after-password-off]] — task `0462`, V5 for telemetry and game dev (passed)
- [[tasks/game-deploy-env-file-cleanup-verified]] — task `0450`, whose deploys waited for this task's pre-checks
