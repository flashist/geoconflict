# Worklog — 0356 Tag telemetry-server deploys with a version

## 2026-10-01 — BUILD step (fkit-coder, spawned by `fkit-sprint-ship-loop`)

**Authority:** the approved `plan.md` (blob `de85a9bf…`, verified with `git hash-object` before starting — matched),
approved by the owner 2026-10-01 via `AskUserQuestion` in the live `fkit lead` session. Owner rulings at that gate:
**Q1 = refuse** a deploy whose shipped telemetry files are uncommitted; **extras = neither** (no deploy lock, no
commit-exact upload). Nothing committed, pushed, tagged for real, SSH'd or deployed.

### What changed

| File | Change |
|---|---|
| `build-deploy-telemetry.sh` | Header doc. Sources `scripts/deploy-version-tag.sh` (missing → refuse). Captures `GIT_COMMIT`; refuses with no commit, or when any of `TELEMETRY_SHIPPED_PATHS=(setup-telemetry.sh build-deploy-telemetry.sh scripts/deploy-version-tag.sh)` is dirty or `git status` fails (lists paths, "Commit, then redeploy."). Reads the base from `git show <commit>:package.json` via `node` (node missing → refuse). Names `<base>-telemetry.<N>` via `deploy_version_next telemetry`. All of that runs **before** the Docker dry-run and the preflight. After the preflight passes and before the first SCP: one EXIT trap `finalize_telemetry_deploy` (removes the sshpass password file and the local 0600 staged env, appends the record block in one append, last line `validation_result=<ok\|failed> git_tag=<outcome\|skipped:deploy-not-completed>`), plus `INT`→130 / `TERM`→143. Staged env gains `TELEMETRY_DEPLOY_VERSION` / `TELEMETRY_DEPLOY_COMMIT`. After the remote run returns 0: `DEPLOY_OUTCOME=ok`, then a warn-only `TAGGING` block (annotated tag on the captured commit, push `refs/tags/<name>` only). DONE prints the version, tag outcome and `cat /opt/uptrace/deployed-version`. |
| `setup-telemetry.sh` | Header doc (two env vars, step 9). New `write_deploy_version_marker` beside `is_truthy`: validates both values (else `unknown` + a warning naming the variable, never the value), writes exactly `version=…` / `commit=…` to a temp file in `$UPTRACE_DIR`, `chmod 644`, `mv` over `deployed-version`. Called once, after the cron block, before `SETUP COMPLETE`. **No image line changed.** |
| `scripts/deploy-version-tag.sh` | Header comment only ("is meant to reuse it" → "reuses it"). No function change. |
| `tests/scripts/profile-deploy-hardening.test.sh` | `git` stub answers `show <sha>:package.json`; `scp` stub captures `*.uptrace-deploy-env-*` (+ `scp_env_fail` knob). New `run_telemetry_deploy` runner (`env -i` allow-list, synthetic secrets, documentation-range fixture address, per-run unstubbed-git check). Behavioural T40–T53, cross-run push/tag lint, marker behaviour (function extracted and run), structural checks; the 0355 lint loop extended to `build-deploy-telemetry.sh`. |

`tests/scripts/ShellHarnesses.test.ts` **not touched** (success marker unchanged; §7 timing rule did not trigger).

### Verification evidence

1. **Red first** (tests written, scripts unchanged — `git diff --quiet` on the three scripts confirmed): `SOME FAILED`,
   664 ✅ / 72 ❌. Every ❌ is in a new 0356 section; all 615 baseline ✅ lines still pass (`comm` of sorted pass lines:
   none missing). Wall 95.7 s.
2. **Harness green:** `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`, **736 ✅ / 0 ❌** (was 615).
   Wall **86.3 s** standalone (baseline measured this session: 69.0 s, so +17 s). Inside the jest wrapper
   (`npx jest tests/scripts/ShellHarnesses.test.ts --verbose`): **84.4 s**, against the 150 s `spawnSync` deadline.
   Under the ~110 s stop line in plan §7 → no NEEDS-DECISION.
3. **Full `npm test`** (command: `npm test`):
   - Run 1: `Test Suites: 1 failed, 185 passed, 186 total`, `Tests: 3313 passed`. The failure was
     `tests/UnitGrid.test.ts` — "A jest worker process … was terminated … signal=SIGSEGV". The crash report from this run
     (`~/Library/Logs/DiagnosticReports/node-2026-10-01-112643.ips`) has its faulting stack starting at
     `ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers` — the known task `0197` V8 crash, unrelated to this change.
   - **Re-ran** (per CLAUDE.md): `Test Suites: 186 passed, 186 total`, `Tests: 3327 passed, 3327 total`, 113.0 s.
     `ShellHarnesses.test.ts` PASS (112.8 s); all four registered harnesses passed, **none skipped** (Docker was up,
     so the Docker-probed secret-boundary harness ran).
4. `git diff setup-telemetry.sh` → no `image:` line changed. `git diff --quiet package.json package-lock.json` → unchanged.
5. `bash -n` OK on all four shell files. **`shellcheck` is not installed on this host — not run.**
6. **Mutation pass** (scratch symlink mirrors; real files untouched; mirrors deleted after) — each turned the harness red:
   | Mutation | Caught by |
   |---|---|
   | marker call moved before `compose up` | structural order check (1 ❌) |
   | tag block moved before the remote run | T40 order + T46 "failed deploy was tagged" (3 ❌) |
   | dirty check removed | T44 (16 ❌) |
   | trap installed after the first SCP | structural trap-position check (1 ❌) |
   | password-file removal dropped from the trap | T53 success + failure, structural (3 ❌) |
7. No real `git tag` / `git push` (no `*telemetry*` tag in the repo afterwards), no SSH, nothing deployed, nothing committed.

### Not verified / limits (plan §6, unchanged)
- **The real deploy is untested** — needs the weekend slot and the owner; the verify task (top of Sprint 8) is the
  producer's to file at close.
- `node`-missing refusal and a commit with no `package.json` (falls through to the "not X.Y.Z" refusal) have **no
  dedicated test** — the harness always has `node` on PATH.
- No deploy lock; check-then-upload window (0355 R3); `.env.telemetry` knob values are not recorded — all owner-ruled
  "neither" / follow-ups.
- **Operational:** until these changes are committed, a real telemetry deploy refuses (its own shipped files are dirty).
- `tests/scripts/ShellHarnesses.test.ts`'s comment still says the hardening harness runs "~16 s"; it is now ~84–86 s.
  Left alone per plan §4.2. 64 s headroom remains to the 150 s deadline.

### Decision log (judgment calls inside the approved plan)
1. **Kept the existing password-only EXIT trap** (set in the auth section, before the preflight). `finalize_telemetry_deploy`
   replaces it when installed after the preflight and removes the password file itself. Why: the plan installs the new
   trap after the preflight; deleting the old one would leak the password file on a preflight failure. Inside plan intent
   ("folds in today's password-only trap").
2. **Staged-env lint for the two new exports uses its own pattern** (`'${DEPLOY_VERSION}'` / `'${GIT_COMMIT}'`) rather than
   the 0284 loop's `'${V:-}'` shape — they are computed values, not operator input; reshaping the code to fit the old
   pattern would have been test-driven contortion.
3. **Added one sub-case to T46** (`scp_env_fail` stub knob): proves the local 0600 staged env is removed when its SCP
   fails — the side-effect fix plan §3.1.4 claims but listed no test for. Obvious winner within intent (verifies a plan claim).
4. **Fixture working-tree `package.json` says `0.0.999` in every telemetry run, and T45 marks `package.json` dirty** — proves
   the plan §3.1.3 design point (base read at the commit; an uncommitted `package.json` neither blocks nor renames).
5. **Marker write failure fails the setup** (temp removed, `return 1` under `set -e` → record `failed`, no tag). The plan did
   not specify; fail-closed matches "written only when every step succeeded".
6. **No extra `print_header` for the marker step** — plan says one echo line.
7. **Record timestamp = when the trap is installed** (the attempt's start), mirroring the profile record; block written
   with a single `printf >>` (no temp file — the record holds no secret).

Fixes applied without asking (review findings): **none** — this was the build step; no review has run yet.

## Verify step (independent)

2026-10-01, fresh context, `fkit-sprint-ship-loop` verify spawn. No source or test touched. Plan blob confirmed `de85a9bf…`.

- `bash -n`: OK on `build-deploy-telemetry.sh`, `setup-telemetry.sh`, `scripts/deploy-version-tag.sh`, `tests/scripts/profile-deploy-hardening.test.sh`.
- Hardening harness standalone: `ALL PASS`, 736 ✅ / 0 ❌, wall **87.5 s** (under plan §7's ~110 s line; wrapper deadline 150 s).
- Full `npm test`, run 1: 185/186 suites, 3315/3315 tests; `tests/server/GameServerProfileResolve.test.ts` lost its worker to `signal=SIGSEGV`. New `node-*.ips` crash report's top frame is `ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers` ⇒ the known task `0197` V8 GC crash, unrelated to this shell-only change. **Re-ran once.**
- Full `npm test`, run 2 (re-run): **186/186 suites, 3327/3327 tests, exit 0**; `ShellHarnesses.test.ts` PASS (124.8 s for the whole suite). Docker daemon was up — no harness skipped. No new crash report.
- `git diff -- setup-telemetry.sh | grep '^[-+].*image:'` empty; `package.json`/`package-lock.json` unchanged; `git tag -l '*telemetry*'` empty; no `.env.__t4f_fixture__.secret` left in the repo root; working-tree status identical before and after the runs.

## 2026-10-01 — PROCESS-REVIEW step, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop`)

**Authority:** the approved `plan.md` (blob `de85a9bf…`, re-checked with `git hash-object` this step — matched), owner
approval 2026-10-01 via `AskUserQuestion` in the live `fkit lead` session; owner ruling on R2 relayed by `fkit-lead`
(*"Accept as known limit"*). Ledger: `review.md` (R1–R2). Nothing committed, pushed, tagged for real, SSH'd or deployed.

### Decision log (fixes applied without per-fix owner approval)
1. **R1 → fixed.** Which finding: `review.md` R1 (`finalize_telemetry_deploy` deletes a file named by an inherited
   `SSH_PASSWORD_FILE` in key-auth mode). What changed: `build-deploy-telemetry.sh` — `SSH_PASSWORD_FILE=""` (plus a
   3-line comment) just before the auth `if [ -n "$SSH_KEY_PATH" ]`, so only the password branch's `mktemp` can set it;
   `tests/scripts/profile-deploy-hardening.test.sh` — new **T54**: a key-auth deploy run with `SSH_PASSWORD_FILE`
   pointing at a decoy file; the decoy must survive a successful run and a `fail_deploy` run. Why it qualified:
   verified `CORRECT` (reproduced: T54 red against the unfixed script, exactly its 2 survival checks ❌, 738 ✅);
   mechanical and localized (one assignment, the exact shape `build-deploy-profile.sh` already uses); inside the
   approved plan (§3.1 item 4 makes the new trap own this variable's cleanup — inheriting an outside value was never
   intended).
2. **R2 → no code change** (owner ruling, not a coder call): recorded as an *Accepted residual* in `review.md`.
3. Obvious-winner calls: **none**.

### Verification evidence
- Red first: harness `SOME FAILED`, 738 ✅ / 2 ❌ (both T54), 89 s.
- `bash -n` OK on `build-deploy-telemetry.sh` and the harness.
- Harness green: `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`, **740 ✅ / 0 ❌**, wall **94 s**
  (under plan §7's ~110 s stop line; 150 s wrapper deadline). T53 (password path still removes its own 0600 file
  after success and failure) stays green.
- Full `npm test`: **186/186 suites, 3327/3327 tests, exit 0, first run** (no re-run needed); `ShellHarnesses.test.ts`
  PASS (144.2 s for the suite), no harness skipped (Docker up). No new `node-*.ips` crash report, no fixture secret file
  left in the repo root, `git tag -l '*telemetry*'` empty.
- `shellcheck` not installed on this host — not run.

## Re-verify after review fix (independent)

2026-10-01, fresh context, `fkit-sprint-ship-loop` re-verify spawn after round-1 fix R1. No source or test touched.

- `bash -n`: OK on `build-deploy-telemetry.sh`, `setup-telemetry.sh`, `scripts/deploy-version-tag.sh`, `tests/scripts/profile-deploy-hardening.test.sh`.
- Hardening harness standalone: `ALL PASS`, **740 ✅ / 0 ❌**, wall **92.0 s** (under plan §7's ~110 s line; wrapper deadline 150 s). T54's 4 checks green.
- Full `npm test`, **first run, no re-run**: **186/186 suites, 3327/3327 tests, exit 0**; `ShellHarnesses.test.ts` PASS (126.1 s). Docker daemon up — nothing skipped. `node-*.ips` crash-report count unchanged (3 before, 3 after).
- R1 diff read: exactly 4 added lines before the auth `if` — a 3-line comment + `SSH_PASSWORD_FILE=""` (`build-deploy-telemetry.sh:297`); matches `build-deploy-profile.sh:404`. No other behaviour change from the fix. T54 is a pure addition (decoy file must survive a key-auth success and a `fail_deploy` run).
- `git diff -- setup-telemetry.sh | grep '^[-+].*image:'` empty; `package.json`/`package-lock.json` unchanged; `git tag -l '*telemetry*'` empty; no `.env.__t4f*` fixture left; `plan.md` blob `de85a9bfd45005e189b6f64fddb97adfb45c4b39` (matches); `git status --porcelain` identical before and after the runs.
