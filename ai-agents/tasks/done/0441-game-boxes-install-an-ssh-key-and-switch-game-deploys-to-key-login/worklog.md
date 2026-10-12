# Worklog — 0441

## 2026-10-12 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as Build worker)

Scope of this spawn: repo work **A1–A5** and the targeted checks of **A6** of the approved `plan.md`
(blob `6c71c61f…`, verified with `git hash-object` before starting). A3 (telemetry tunnel) in scope per
owner Q5. **Not done here, by instruction:** the full `npm test` (driver's Verify step), the review
(driver spawns the reviewer), anything over SSH against any box, reading any `.env*` value, Q8.
No commit, no push.

### What changed

| File | Change |
|---|---|
| `deploy.sh` | A1. `SSH_PASSWORD_FILE=""` before the auth branch. Password path: `mktemp` → EXIT/INT/TERM traps → `chmod 600` → `printf` the password into it → `sshpass -f <file>` for scp and ssh (was `sshpass -p "$SSH_PASSWORD"`). Key path: `-o IdentitiesOnly=yes -i <key>` on scp and ssh. Gating, messages and branch order unchanged (key wins; password needs the flag). |
| `build-deploy-telemetry.sh` | A2. Key path: `-o IdentitiesOnly=yes` added to `SCP_CMD` and `SSH_CMD`. Nothing else. |
| `scripts/telemetry-tunnel.sh` | A3. Same two fixes as `deploy.sh`: `IdentitiesOnly=yes` on the key path; `sshpass -f` 0600 file + EXIT/INT/TERM traps on the password path (was `sshpass -p`). |
| `tests/scripts/profile-deploy-hardening.test.sh` | A4. Helpers `every_call_has`, `key_branch`; new driver `run_game_deploy` (shared stubs, no new executable per test); T55 (telemetry key path), T60–T65 (game deploy), T66 (tunnel password path), a structural block; header updated. |
| `docs/vps-deployment-guide.md` | A5. New §7 *SSH Keys for Deploys (game dev/prod, telemetry)*; one pointer to it in §2. No host, address, key or password. |
| `example.env.telemetry` | `TELEMETRY_SSH_KEY=~/.ssh/id_rsa` → `~/.ssh/geoconflict-telemetry`. |
| `CLAUDE.md` | One sentence in the harness section: since `0441` the harness drives and greps `deploy.sh` and `scripts/telemetry-tunnel.sh`. |

### Red first

Tests added before any script fix. Harness run against the **unfixed** scripts: `rc=1`, `SOME FAILED`,
769 ✅. Failures (all expected):
- **T55** (telemetry key path): an ssh call and an scp call lack `-o IdentitiesOnly=yes -i <key>`; key
  branch has 0 `IdentitiesOnly=yes` (expected 2).
- **T60** (game key path): ssh and scp calls lack `-o IdentitiesOnly=yes -i <key>`.
- **T61** (game password path): exit 2; `sshpass -p` used; 0 `sshpass -f` calls; no 0600 file;
  **password found in an argv**; no file to remove.
- **T62**: no password file seen ("left after failure (none)"). ⚠️ Its *"the failed deploy failed"*
  line passed on red for the wrong reason (rc=2: the sshpass stub cannot exec `-p`), not the injected
  failure. Green below shows rc≠0 from the injected failure.
- **T64** (key + password): calls not on the key with `IdentitiesOnly=yes`.
- **T66** (tunnel password path): exit 2; `-p` used; no `-f`; no 0600 file; **password in an argv**;
  no file to remove.
- **Structural:** `sshpass -p` present in `deploy.sh` and the tunnel; 0 `IdentitiesOnly=yes` in both key
  branches; no INT/TERM traps in either.
- T63 and T65 passed on red, as expected — they guard behaviour that already held (refusal without the
  flag; an inherited `SSH_PASSWORD_FILE` is never deleted).

The "password in an argv" hits on red are the harness's synthetic `SECRET_PW`, written to its own temp
folders. No real credential was involved anywhere.

### Green

After the fixes: `bash tests/scripts/profile-deploy-hardening.test.sh` → `rc=0`, **ALL PASS**, 794 ✅,
0 ❌ (baseline before this task: 752 ✅).

### Other checks

- `bash -n` OK on `deploy.sh`, `build-deploy-telemetry.sh`, `scripts/telemetry-tunnel.sh`,
  `tests/scripts/profile-deploy-hardening.test.sh`.
- `npm test -- tests/scripts/ShellHarnesses.test.ts tests/scripts/ConfigParityCallSites.test.ts` →
  2 suites, **20/20 passed** (jest 42.7 s; wall 44 s). `ConfigParityCallSites` drives the real
  `deploy.sh` on the key path and still sees `["scp","ssh"]`.
- Ad-hoc, not in the harness (it needs a slow-exiting ssh stub, i.e. a new executable): ran the fixed
  tunnel on the password path with an ssh stand-in that sleeps 2 s, sent TERM to the script mid-run →
  password file mode `-rw-------` while in use, script `rc=143`, file removed afterwards.
- **Not run here:** the full `npm test` (the driver's Verify step).

### Harness wall time

| Run | Result | Wall |
|---|---|---|
| Baseline, before any change | ALL PASS, 752 ✅ | 17 s |
| Red (tests added, scripts unfixed) | SOME FAILED, 769 ✅ | 17 s |
| Green (scripts fixed) | ALL PASS, 794 ✅ | 17 s |

Nine new driven runs (7 `deploy.sh`, 1 tunnel, 1 extra telemetry run) added no measurable time;
far from `ShellHarnesses.test.ts`'s 150 s deadline. Measured standalone, not inside a full `npm test`.

### Decision log (obvious-winner / in-plan judgement calls made without asking)

1. **EXIT trap set right after `mktemp`, before the password is written** (`deploy.sh`, tunnel). The
   profile/telemetry scripts set it after the `printf`. Setting it first closes the window where a
   failing `chmod`/`printf` under `set -e` would leave the file. Same pattern, narrower window — within
   A1/A3's intent.
2. **`key_branch` awk helper instead of reusing the profile check's awk "as-is".** The plan said that
   awk works as-is for telemetry. It does not quite: in both `build-deploy-telemetry.sh` and the tunnel
   the *first* `if [ -n "$SSH_KEY_PATH" ]; then` is the `~`-expansion check, so the as-is awk captures
   that block too, and the count would be right only because no comment says `IdentitiesOnly=yes`. The
   helper takes the block that ends in `elif` and drops comment lines. Test-only.
3. **Extra structural checks** for `trap 'exit 130' INT` / `trap 'exit 143' TERM` in `deploy.sh` and
   the tunnel. Not in the plan's test list; they pin the Ctrl-C cleanup the plan asks for (A1/A3).
   Test-only.
4. **T64 also sets the fallback flag** (key + password + flag): proves the key wins even when the
   password path is allowed. Stronger form of the plan's T64.
5. **T65 runs twice (success and failure)**, mirroring T54 as the plan says.
6. **Runbook fallback text says to comment out BOTH `SSH_KEY_<ENV>` and any shared `SSH_KEY`.** The plan
   said only `SSH_KEY_<ENV>`. `deploy.sh` falls back to `SSH_KEY` when `SSH_KEY_<ENV>` is empty, and
   `example.env` sets `SSH_KEY`, so the plan's wording would keep the key path. Correction of fact,
   within A5's intent. **Flagged to the driver.**
7. **Runbook added as §7 at the end of the guide** (with a pointer from §2) instead of a new §3, so no
   existing section is renumbered.
8. **Removed an unverified claim from my own runbook draft** ("each retry can extend the ban") — true
   only with a recidive jail, not checked.

No fix was applied in answer to a review finding (no review has run yet).

### Open items for the driver / owner (not decided here)

- **Q1 (key type/layout) is still unasked.** The runbook and `example.env.telemetry` use the plan's
  recommended layout: two keys, `~/.ssh/geoconflict-game` (dev + prod) and
  `~/.ssh/geoconflict-telemetry`, ed25519 with passphrase. A different answer means editing §7 and the
  example.
- Plan step (c) (box inventory) and all of (b) are untouched: they need the owner.
- Unrelated working-tree changes present and **not mine**: `ai-agents/sprints/backlog.md`,
  `ai-agents/sprints/plan-sprint-8.md`, this task's `brief.md`, and the untracked
  `ai-agents/tasks/backlog/0444-…/`.

## Verify (driver step) — 2026-10-12

Run by a spawned `fkit-coder` for `fkit-sprint-ship-loop`, read-only on source (nothing fixed).

- **No other jest run** was going beforehand (`ps` check empty); the project lock did not wait.
- **`npm test` (full, via the npm script): green, exit 0.** `Test Suites: 223 passed, 223 total` ·
  `Tests: 4549 passed, 4549 total` · 0 skipped · `Time: 73.274 s`. No failures, so no flake/`SIGSEGV`
  triage was needed and **no re-run was done**.
- **Shell harnesses:** `PASS tests/scripts/ShellHarnesses.test.ts (39.312 s)`. That suite checks each
  harness's own success marker. The default reporter does not print those markers, so the harness
  this task changed was also run standalone: `bash tests/scripts/profile-deploy-hardening.test.sh` →
  exit 0, last line **`ALL PASS`**, 0 FAIL lines. Docker daemon was up (`docker info` → 28.5.1), so
  `scripts/test-check-docker-secret-boundary.sh` actually ran, not skipped (0 skipped in the summary).
  The markers of the other three harnesses were checked by the wrapper only, not seen directly.
- **`npm run lint`: exit 0, no findings.**

## Process review, round 1 — 2026-10-12

Run by a spawned `fkit-coder` as `fkit-sprint-ship-loop`'s Process-review worker, under the owner's
plan approval (plan blob `e04f4772…`, checked with `git hash-object`). Ledger: `review.md`, now
`Status: closed-out`. No SSH, no `.env*` value read, no commit.

### Decision log (fixes applied without per-fix owner approval)

1. **R1 → `example.env`.** Answers R1 (template shows per-environment keys; runbook uses one shared
   game key). Changed the two commented overlay examples from `geoconflict-dev` / `geoconflict-prod`
   to `geoconflict-game` for both, plus a one-line pointer to the runbook's section 7. Qualified:
   verified `CORRECT`; mechanical, one comment block; in plan (A5's runbook/template alignment) and
   the owner's Q1 ruling ("Two new keys") fixed the layout. Runbook section 7 and
   `example.env.telemetry` already matched Q1 — left unchanged.
2. **R3 → harness password-content check.** Answers R3 (stub records file path + mode, never what
   the file holds). The shared `sshpass` stub now appends the `-f` file's first line to
   `$WORK/sshpass.pwline` (not a `*.argv` file, so the leak greps still see no password); T61 and T66
   assert every recorded line equals `$SECRET_PW`; their reset lists clear the new file. Qualified:
   verified `CORRECT`; test-only and local; no new executable (0371 rule); in plan (A4's T61/T66
   password-path tests); the relayed owner instruction put a cheap, test-only content check in plan.
   Red-checked (both scripts temporarily wrote a wrong value → exactly the two new checks failed;
   restored byte-identical, `cmp`).
3. **R2** — no fix; owner ruled "Accept as is". Recorded as accepted residual
   *0441-signal-cleanup-test* in `review.md`.

Obvious-winner calls: none.

### Checks after the fixes
- `bash -n` OK: `deploy.sh`, `build-deploy-telemetry.sh`, `scripts/telemetry-tunnel.sh`,
  `tests/scripts/profile-deploy-hardening.test.sh`.
- `bash tests/scripts/profile-deploy-hardening.test.sh` → rc 0, **ALL PASS**, 796 ✅ / 0 ❌, 17 s wall.
- `npm test -- tests/scripts/ShellHarnesses.test.ts tests/scripts/ConfigParityCallSites.test.ts` →
  2 suites, 20/20 passed (42.4 s).
- **Not run:** full `npm test` (the driver re-verifies).

## Re-verify after review round 1 (driver step) — 2026-10-12

Run-and-diagnose only; no source written. No other jest run was going beforehand (`ps` empty).
- Full `npm test` (via npm script, project lock) → exit 0, **223/223 suites, 4549/4549 tests passed**,
  0 skipped (Docker-probed harness ran), 73.1 s. No failures, so no flake/`SIGSEGV` triage needed.
- `npm run lint` → exit 0, no output.
- `bash tests/scripts/profile-deploy-hardening.test.sh` standalone → rc 0, final line **`ALL PASS`**,
  796 ✅ / 0 ❌.
