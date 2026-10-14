# Worklog — 0453: profile deploy key path never falls back to a password prompt

## 2026-10-14 — Build (plan steps 1–6), fkit-coder as `fkit-sprint-ship-loop` Build worker

Built against the owner-approved `plan.md` (blob `ba70ffae411c13e45c345ad6032b50058461c543`, checked with
`git hash-object` before starting) and its *Owner decisions* (approve; live check → verify task at the top of
Sprint 9, filed by the closing producer, not here). **No live step was run.** No SSH to any box, no deploy, no
`.env*` file touched, `plan.md` not edited, no status changed, nothing committed.

### What changed
- **`build-deploy-profile.sh`, key branch (`:518-535`):**
  - `SCP_CMD` and `SSH_CMD` now add `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` before the
    existing `-o IdentitiesOnly=yes -i "$SSH_KEY_PATH"`. Same option order as `build-deploy-telemetry.sh` (0442 R1).
  - A comment says why: a rejected key used to let ssh prompt for the root password, and a deploy the operator typed
    it into still went out labelled `key`, passing `setup-profile.sh`'s guard 0. Harmless while the box refuses
    passwords (0221), not after a console re-enable. No BatchMode. Cites 0453 and 0442 R1. Per the plan's wording
    rule, the comment does not contain the literal `IdentitiesOnly=yes` (T12's comment-blind count would move).
  - At `DEPLOY_SSH_AUTH=key`: one added sentence, "`key` is true by construction: the options above leave this
    session no way in but the key."
  - Password branch untouched. Preflight error text untouched.
- **`tests/scripts/profile-deploy-hardening.test.sh`:**
  - (a) Structural, beside the existing profile `IdentitiesOnly` count (just above the T12 header): the pair
    `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` appears exactly 2 times in the key branch,
    with comment lines dropped first (T12's `KEY_BRANCH` awk keeps comments).
  - (b)+(c) Driven, in T12 after the key-mode `run_deploy` and its `IdentitiesOnly` argv check: one loop over
    `ssh`/`scp` — every `^ssh ` line of `ssh.argv` and every `^scp ` line of `scp.argv` carries the pair, and there
    is at least one such line. Inline copy of `every_call_has()`'s logic (that helper is defined later in the file).
    The pass message reports the call count.
  - (d) Comments naming 0453 / 0442 R1 and why (guard 0 trusts the staged `key`).
  - No existing count moved.
- **Docs: no change** (plan step 4). Searched `docs/` and `ai-agents/knowledge-base/` for a statement about the
  profile key path's prompt behaviour; none found. `docs/vps-deployment-guide.md` §7 covers game + telemetry only.
  Note only, out of scope: its "If ssh asks for a password … do not type it" line (`:148`) is still true for the game
  deploy's ordinary key path.

### Evidence
- **Red run on HEAD** (harness edited, `build-deploy-profile.sh` unmodified — confirmed `git diff --quiet`): exit 1,
  `SOME FAILED`, exactly three failures, every other check passed:
  - `❌ build-deploy-profile.sh: '-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no' appears 0 time(s) in the key branch (outside comments), expected 2 …`
  - `❌ key-mode: 0 of 2 ssh call(s) carry '-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no' …`
  - `❌ key-mode: 0 of 5 scp call(s) carry '-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no' …`
- **After the fix:** `bash -n` OK on both files; harness exit 0, 0 `❌`, 1006 `✅`, `ALL PASS`. New lines:
  `… on both SCP_CMD and SSH_CMD in the key branch (0453)`, `every ssh call … (2 calls, 0453)`,
  `every scp call … (5 calls, 0453)`. Password-branch checks (T1/T2 sshpass checks, T12 `password-mode deploy exited
  0`, `PROFILE_DEPLOY_SSH_AUTH=password exactly once`, guard 0 refusal) still pass — verification step 4.
- **scp-only red check (step 3):** removed the pair from `SCP_CMD` only → exit 1, exactly two failures:
  - `❌ … appears 1 time(s) in the key branch (outside comments), expected 2 …`
  - `❌ key-mode: 0 of 5 scp call(s) carry … `
  The ssh check stayed green, so the scp side is guarded on its own. Restored with an Edit back to the exact line;
  `cmp` against a copy of the fixed file = identical; `git diff` shows only the intended change; harness re-run
  `ALL PASS`.
- **`ssh -G`** (OpenSSH_10.0p2, local only, dummy host `example.invalid`, dummy key path, the key branch's exact
  options): `passwordauthentication no`, `kbdinteractiveauthentication no`, `batchmode no`, `identitiesonly yes`,
  `stricthostkeychecking accept-new`.
- **`shellcheck`: skipped** — not installed on this host.
- **`npm run lint`:** exit 0 (eslint does not cover `.sh`; run because the brief lists it).
- **Full `npm test`** (one run, through the npm script / project lock): exit 0 — `Test Suites: 227 passed, 227 total`, `Tests: 4684 passed, 4684 total`,
  `Time: 272.481 s`; `ShellHarnesses.test.ts` PASS (154.8 s). No flake, no re-run. No jest process left afterwards.
- **Secrets scan** of the added lines (IPs, domain, key blocks, `password=`): none.
- **Not verified here:** a live login. The harness and `ssh -G` prove the argv and the effective client config, not
  that the real box accepts the key with no prompt. That is the Sprint 9 verify task (owner decision).

### Decision log (unattended calls, ADR-019 / ADR-032 audit)
- **No BatchMode** — per the approved plan and 0442 R1: a passphrase prompt for this key is still key auth.
- **Driven checks inline in T12, not by moving `every_call_has`/`key_branch` up** — per the approved plan (moving
  them is a refactor outside scope).
- **(b) and (c) written as one `for tool in ssh scp` loop** rather than two copied blocks — same checks the plan
  names, same pass/fail meaning; a form choice inside the plan, not a scope change.
- **Structural check (a) placed beside the existing profile `IdentitiesOnly` count**, which sits just above the T12
  header, not inside T12's echo block — that is where the plan's "next to the existing profile `IdentitiesOnly`
  checks" points, and where `KEY_BRANCH` is defined.
- **Fixes applied without asking / obvious-winner calls outside the plan: none.**

## 2026-10-14 — Process review round 1, fkit-coder as `fkit-sprint-ship-loop` Process-review worker

Ledger `review.md`: one finding, R1 (comment "no way in but the key" overstates — GSSAPI / host-based not turned off).
Verified at `build-deploy-profile.sh:529-534` and `build-deploy-telemetry.sh:336-340`; `ssh -G` (OpenSSH_10.0p2,
`example.invalid`, no network): `gssapiauthentication no` / `hostbasedauthentication no` by default, `yes` when the operator
opts in. No repo file enables either. No lock-out path (`setup-profile.sh` and `sshd-hardening.sh` drop-ins disable only
password/kbd-interactive). Severity derived: low, comment accuracy only.

### Decision log (unattended calls, ADR-019 / ADR-032 audit)
- **R1 → `won't fix (frontier)`, no code or comment change.** Not an unattended call: owner ruling 2026-10-14, live
  `AskUserQuestion` relayed by fkit-lead, verbatim "Accept as known, no change (Recommended)". Recorded as accepted residual
  `key-path-comment-overstates-auth-lockdown`, covering both `build-deploy-profile.sh` and `build-deploy-telemetry.sh`.
  Ledger header set to `Status: closed-out`. `Coverage:` and *Reviewer findings* untouched.
- **Fixes applied without asking / obvious-winner calls: none.**
- No source change this round, so no test run.
