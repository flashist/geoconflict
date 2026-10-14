## Plan — 0453: profile deploy key path never falls back to a password prompt

**Summary**
- Small change: 2 lines plus comments in `build-deploy-profile.sh`, plus about 4 new checks in the hardening harness (T12). No change to `setup-profile.sh`, the docs or the box.
- Planning only. Nothing was written: no source, no plan.md, no status change.
- ⚠️ Correction to the spawn context: the 0442 changes are **not** uncommitted. They are in commit `daa1bcc` ("Sprint push"). `git diff HEAD` on `build-deploy-telemetry.sh`, `build-deploy-profile.sh` and `tests/scripts/profile-deploy-hardening.test.sh` is empty. This task builds on HEAD, so there is nothing to conflict with.
- Live proof is wanted but small (one profile deploy over the key, no password prompt). It goes to a verify task under the build/verify-split rule; see the open question.
- No BatchMode, as in 0442 R1: a passphrase prompt for this key is still key login.

### What the code does today (read 2026-10-14)
- `build-deploy-profile.sh:518-527`: the key branch adds only `-o IdentitiesOnly=yes -i "$SSH_KEY_PATH"` to `SCP_CMD` and `SSH_CMD`, then sets `DEPLOY_SSH_AUTH=key`. `:766` stages that value as `PROFILE_DEPLOY_SSH_AUTH`. `setup-profile.sh:539` (guard 0) refuses only on `password`.
- Every remote call goes through these two arrays: the preflight `:614`, the scp calls `:652/656/660/664/770`, the remote run `:775`, and the cleanup trap `:427`. So the fix at `:522-523` covers all of them, the preflight included.
- Measured locally with `ssh -G` (no network, dummy host `example.invalid`, OpenSSH_10.0p2). With the new options it gives `passwordauthentication no`, `kbdinteractiveauthentication no`, `batchmode no`, `identitiesonly yes`. Options given with `-o` on the command line beat `~/.ssh/config`.
- The model to copy is `build-deploy-telemetry.sh:326-341` (0442 R1). There the new options sit **before** `-o IdentitiesOnly=yes -i <key>`, so the existing `IdentitiesOnly` checks still hold.

### Steps

**1. Harness first, then a red run on HEAD.** In `tests/scripts/profile-deploy-hardening.test.sh`, T12 (`:1809-1838`), next to the existing profile `IdentitiesOnly` checks:
- (a) **Structural check:** count of `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` in the profile key branch = 2. Reuse T12's `KEY_BRANCH` extraction, but drop comment lines first (`grep -v '^[[:space:]]*#'`).
  - Why the filter: T12's awk (`:1810`), unlike the later `key_branch()` helper (`:3061`), keeps comment lines. It also starts at the earlier `~`-expansion `if` block, so the base `SCP_CMD=`/`SSH_CMD=` lines are inside it too. Without the filter, a comment quoting the option pair would fake a pass.
  - `key_branch()` and `every_call_has()` are defined at `:3054-3062`, after T12, so T12 cannot call them. Bash functions must be defined before the call.
- (b) **Driven ssh check:** after the existing key-mode `run_deploy` (`:1832`), every `^ssh ` line in `$WORK/ssh.argv` carries both options. It also requires at least one such line, so it cannot pass on an empty file. This is written inline because `every_call_has` is not yet defined at that point; it is the same logic, a few lines. The pass message reports the call count, as T55 does.
- (c) **Driven scp check:** the same over `$WORK/scp.argv`, every `^scp ` line.
- (d) A comment in T12 naming 0453 / 0442 R1 and why: guard 0 trusts the staged `key`.
- Run `bash tests/scripts/profile-deploy-hardening.test.sh` on unmodified `build-deploy-profile.sh`. Expected: (a), (b) and (c) fail, every other check passes. This is the required "deliberate red run". It is cleaner than breaking the fix and reverting it, and nothing needs reverting afterwards.
- Rejected alternative: moving `every_call_has`/`key_branch` up to the helper block, or adding a new section after T55 that re-runs the profile deploy. The first is a refactor outside scope; the second costs an extra stubbed deploy run and depends on how `NEW`/`WORK` behave after the telemetry sections.

**2. The fix: `build-deploy-profile.sh:522-523`.**
```bash
SCP_CMD+=(-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")
SSH_CMD+=(-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")
```
- The option order matches telemetry exactly.
- **Comment** above these lines, after the existing IdentitiesOnly (0221) paragraph. It says that the key path never falls back to a typed password or keyboard-interactive prompt. A rejected key (wrong path, rotated key) used to let ssh ask for the root password, and a deploy the operator typed it into still went out labelled `key`, passing `setup-profile.sh`'s guard 0. The comment notes this is harmless while the box refuses passwords (0221) but matters after a console re-enable. Now a rejected key fails the preflight at once. It says why there is no BatchMode, and cites 0453 and 0442 R1.
- ⚠️ **Comment wording rule:** the comment must not contain the literal `IdentitiesOnly=yes`. The existing count at `:1811` does not drop comments and would go from 2 to 3. Write option names the way telemetry does (`PasswordAuthentication=no + KbdInteractiveAuthentication=no`), not the `-o … -o …` string.
- **Comment at `DEPLOY_SSH_AUTH=key` (`:524-527`):** add one sentence: "`key` is true by construction: the options above leave this session no way in but the key." This mirrors telemetry `:338-340`.
- No change to the preflight error text. `:621` already says "host unreachable or key rejected".

**3. Re-run the harness:** `ALL PASS`. Then a second red check: remove the options from `SCP_CMD` only, confirm (a) and (c) go red, and restore. This proves the scp side is guarded on its own; step 1's red covered both commands together. Restore with an Edit back to the exact line, then confirm with `git diff`.

**4. Docs: planned no change.** Nothing in the repo describes the profile key path's prompt behaviour. `docs/vps-deployment-guide.md` §7 covers game and telemetry only. Its "if ssh asks for a password … do not type it" line (`:148`) is still true for the game deploy's ordinary key path (`deploy.sh`'s key branch carries only `IdentitiesOnly`). That is out of scope here and is mentioned only as a note. If the build finds a profile statement I missed, I fix that one line.

**5. Verify.**
- `bash -n build-deploy-profile.sh`; `shellcheck` on the changed file if it is installed (not required; say if it was skipped).
- `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`. The password-branch checks (T12's `password` run, the sshpass checks) must still pass. That is verification step 4: the password branch is untouched.
- Local `ssh -G` run with the key branch's exact options against `example.invalid`, recording `passwordauthentication no` / `kbdinteractiveauthentication no` / `batchmode no` in the worklog. No network, no host named.
- One full `npm test` through the npm script, which takes the project lock. Judge a single `Exceeded timeout of 5000 ms` in a supertest suite by the flake rule (re-run and say so).
- `npm run lint` (eslint does not cover .sh; it is run because the brief lists it).
- Grep the diff for hosts, IPs, key contents and passwords: there must be none.

**6. Record.** Task folder `worklog.md`: the change surface, the red-run outputs (step 1 on HEAD, step 3 scp-only), the `ssh -G` result, the test results, and the decision log ("no BatchMode, per 0442 R1"; "checks inline in T12 rather than moving helpers"). No commit.

### Edge cases / failure modes considered
- **Passphrase-protected key without an agent:** still prompts for the key's passphrase. That is the intended reason for leaving BatchMode out.
- **Key rejected:** the preflight exits 255, so the script prints the "key rejected" message and exits 1 before anything is staged or changed. The cleanup trap's ssh `:427` fails silently (`|| true`), which is fine because nothing reached the box.
- **Operator `~/.ssh/config` with `PasswordAuthentication yes`:** the command-line `-o` wins (ssh takes the first value it gets, and the command line comes first).
- **`KbdInteractiveAuthentication` as a client option:** accepted by the local OpenSSH 10 (`ssh -G` showed it), and telemetry already uses it.
- **fail2ban:** a rejected key is now one failed try, then exit, with no password guesses on top. That is better, not worse.
- **Harness coupling:** a new comment that quotes option strings could skew T12's comment-blind `IdentitiesOnly` count. This is handled by the wording rule in step 2 and the comment filter in step 1(a).
- **No other profile key-mode run in the harness** (only `:1832`), so no other check expects the old argv. The default fixture is the password fallback, which is unchanged.
- **Counts:** no existing count moves. The `IdentitiesOnly` count stays at 2, and the harness has no total-count marker (`ShellHarnesses.test.ts` matches only `^ALL PASS$`).

### Out of scope (unchanged)
`setup-profile.sh` (sshd section, guard 0); the profile password branch; `deploy.sh`'s ordinary key path (same shape, but its hardening runs through the BatchMode root step, as 0442 R1 confirmed); `scripts/telemetry-tunnel.sh`; the docs; anything on the box.

### Live proof
Needed for verification step 5: one ordinary `npm run deploy:profile` over the key that finishes with no password prompt. It needs a deploy and the owner, so it cannot be done in this build. The harness and the `ssh -G` run prove the argv and the effective client config, not a live login. See Q1 for where it goes.

## Owner decisions (2026-10-14, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session, relayed by fkit-lead)

These override any conflicting text above.

- **Plan approval — verbatim selection: "Approve (Recommended)".**
- **Live check — verbatim selection: "Verify task, top of Sprint 9 (Recommended)".** Option text: "Your standing build/verify rule; nothing in Sprint 8 waits on it." ⇒ at close, a producer files a verify task (one normal `npm run deploy:profile` over the key finishing with no password prompt) at the top of Sprint 9.
