# `0201` — worklog

## 2026-09-05 — Phase 2 built: shell harnesses folded into `npm test`

Implemented the approved `plan.md` (blob `297a94d224a3b293a513aed7ce2c14d96c7899a4`, 9880 bytes —
verified with `git hash-object` before any code was written; the file matched the paste carried in
the spawn prompt). Option A as approved: a thin jest `.test.ts` wrapper that shells out.

**Nothing is committed.** The working tree carries the change; the owner commits.

### Provenance / authority note (recorded, not resolved)

This build ran as a `fkit-coder` **spawned by `fkit-lead`** conducting the task directly under the
ADR-031 conductor remit — **not** by `fkit-sprint-ship-loop`, which is the caller the coder role's
declared-approval carve-out names literally. All three marker conditions were otherwise met (caller
identified, approved plan carried verbatim, owner approval stated as given live via
`AskUserQuestion` in the driver session). The worker proceeded and flagged the discrepancy in its
report rather than complying silently. Recorded here so the deviation is findable later.

### What changed

| File | Change |
| --- | --- |
| `tests/scripts/ShellHarnesses.test.ts` _(new)_ | The gate. One `it` per harness, `spawnSync("bash", [absPath])`, asserts exit 0, embeds the harness's combined stdout+stderr in the failure message so its `❌`/`FAIL` lines are visible in jest's report. Modelled on `tests/scripts/ConfigParity.test.ts`. |
| `package.json` | Added `"test:scripts:docker": "bash tests/profile-backup-dryrun.sh"`. **`"test"` untouched.** |
| `CLAUDE.md` | New Testing subsection *"Shell harnesses are part of `npm test` (task `0201`)"* — which harnesses are in, which is out and why, the measured cost, the two surprise consequences, and why the timeouts must not be removed. |
| `jest.config.ts` | **No change** — `tests/scripts/ShellHarnesses.test.ts` already matches `testRegex`, and `testPathIgnorePatterns` excludes only `node_modules` and `tests/integration`. |

### Owner rulings, and how each is discharged

| # | Ruling | How it is implemented |
| --- | --- | --- |
| **Plan gate** | Approve Option A (thin `.test.ts` wrapper). | `tests/scripts/ShellHarnesses.test.ts`. Chosen over a `posttest` npm script because `posttest` fires on `npm test -- <one file>` too, taxing the single-file workflow CLAUDE.md documents; and because `posttest` only runs when jest passed, so a red jest run would say nothing about the harnesses. |
| **Q1** | `scripts/test-check-docker-secret-boundary.sh` is **IN**, with the skip made visible — never a fake green. | `dockerDaemonIsAvailable()` runs `spawnSync("docker", ["info"])` once at module load; `const itWhenDockerAvailable = dockerAvailable ? it : it.skip`. With the daemon down jest reports `○ skipped` and a `console.warn` names the harness. **Verified** — see below. The leftover synthetic-fixture risk is accepted per the ruling and is written into CLAUDE.md so it is not a silent surprise. |
| **Q2** | `tests/profile-backup-dryrun.sh` is **OUT**, exposed as an npm script, reason recorded. | `npm run test:scripts:docker`. Reason recorded in CLAUDE.md and in the wrapper's header comment: it hard-fails (exit 1) without Docker *plus* `age`, `age-keygen`, `rclone`, `curl`, `jq`, so no honest `npm test` gate is possible. Its real gate is `0218`. Stated plainly rather than faked. |
| **Q3** | Cost confirmed **unconditional** — no `SKIP_SHELL_HARNESSES` escape hatch. | No env-var opt-out exists anywhere in the wrapper. Recorded in CLAUDE.md with the reason (the valve would become the default and the gate would rot unrun again — this task's own failure mode). |

### Measured cost — the plan's baseline did not reproduce

⚠️ **The plan told the owner `npm test` was ~24.5 s and would roughly double to ~38–40 s. Measured
today on this host, the baseline is ~3.0–3.6 s, and the result is ~22–25 s.** The absolute end state
is *better* than the ~38–40 s the owner accepted, but the *ratio* is worse than "roughly doubles" —
it is roughly 7×. The accepted ceiling is not exceeded, so nothing was changed on this account; the
discrepancy was surfaced to the lead for relay rather than quietly absorbed.

| Measurement | Before | After |
| --- | --- | --- |
| `npm test` wall-clock (3 runs each) | 3.62 s / 3.15 s / 3.02 s | 24.69 s / 22.44 s / 22.63 s |
| `npm test` wall-clock, cold jest cache (`npx jest --clearCache`) | not measured | **23.52 s** — the plan's ~55–60 s cold estimate also did not reproduce |
| Suites / tests | 112 / 1182 | **113 / 1185** (+1 suite, +3 tests, all deliberate) |

Per-harness wall-clock measured today, Docker up: hardening **15.68 s**, redeploy **1.17 s**,
secret-boundary **3.07 s** (~20 s serial, matching the ~21.5 s suite time). The plan measured the
hardening harness at 28.5–39.8 s; it did not reproduce that slow today. Machine load is the likely
difference — no code was changed in the harness, so the gate's content is unaffected either way.

### Verification

- **Gate proven RED (mandatory step 3).** Deleted the `: > "$RUN/profile-backup.sh"` fixture line
  from `run_deploy` in `tests/scripts/profile-deploy-hardening.test.sh`, ran `npm test`:
  `Test Suites: 1 failed, 112 passed` / `Tests: 1 failed, 1184 passed` — with the harness's own
  `❌` lines visible in jest's output (`❌ deploy exited 1 (expected 0)`, `❌ sshpass missing -f`,
  `❌ sshpass password file not 0600`, `❌ record missing ok result`, `❌ sshpass password file
  leaked after failure`, `❌ record missing failed result`, `❌ no lock-held message`,
  `❌ expected 3 blocks, got 0`). **Restored by hand-editing the line back, never via
  `git checkout`/`git restore`**; `git status` then showed the harness file clean (byte-identical),
  and `npm test` green again at 113/1185.
- **Docker-down skip branch verified.** Docker was **up** on this host, so the branch was exercised
  by pointing the real probe at a dead endpoint — `DOCKER_HOST=tcp://127.0.0.1:1 npx jest
  tests/scripts/ShellHarnesses.test.ts`. Result: `○ skipped docker secret boundary harness`,
  `Tests: 1 skipped, 2 passed, 3 total`, plus the `[ShellHarnesses] Docker daemon unavailable …
  SKIPPED, not passed` warning. This exercises the real `docker info` probe with the real binary,
  not a stub.
- **Lint:** `npm run lint` — clean, no errors or warnings.

### Design points worth keeping

- **`bash <path>`, never `./<path>`.** `tests/scripts/profile-deploy-hardening.test.sh` is mode 644
  and not executable, unlike the other three harnesses.
- **Two timeouts, both load-bearing.** Jest per-test timeout **180 000 ms**; `spawnSync` deadline
  **150 000 ms**. `spawnSync` blocks the jest worker thread, so jest's own timeout cannot interrupt
  it — the `spawnSync` deadline is the one that actually fires, and it is set lower so a hung
  harness is reported by our own message naming the harness. Without an explicit jest timeout the
  default 5000 ms would make a normal slow harness fail with `Exceeded timeout of 5000 ms`, the
  exact string CLAUDE.md documents as the supertest-flake signature; shipping a gate whose ordinary
  failure impersonates a known flake would be actively harmful.
- **Behaviour change now documented for everyone.** The hardening harness's grep-level structural
  assertions over `nginx.conf`, `setup-profile.sh`, `setup-telemetry.sh`,
  `build-deploy-telemetry.sh` and `update.sh` mean editing any of those files can turn `npm test`
  red. Written into CLAUDE.md so it reads as the gate working, not as a broken test.

### Decision log — decided autonomously, without asking

Two, both mechanical and inside the approved plan:

1. **Added a `spawnSync`-level 150 s deadline in addition to the plan's mandated jest timeout.** The
   plan specified only the jest per-test timeout. Trace: `spawnSync` is synchronous and blocks the
   worker thread, so jest's timer cannot preempt it — with only the jest timeout, a hung harness
   would hang the run indefinitely instead of failing. The added deadline is strictly inside the
   plan's stated intent ("a gate whose failure mode must not impersonate the flake"), is localized
   to one constant plus one branch, and changes no passing behaviour. Qualifies as
   mechanical/localized and in-plan.
2. **Placed `test:scripts:docker` as `bash tests/profile-backup-dryrun.sh` rather than
   `./tests/profile-backup-dryrun.sh`.** That file *is* executable (mode 755), so `./` would work;
   `bash` was chosen for consistency with the wrapper and to stay immune to a future mode change.
   Obvious winner, no behavioural difference.

Nothing else was decided unilaterally. No fix was applied to any finding (no review has run yet).

### Out of scope, returned as text rather than fixed

- **`0223` — the dead husky pre-commit hook.** Confirmed again incidentally: `core.hooksPath` is
  `.husky/_`, the `.husky/_/h` shim exits 0 when no top-level hook file exists, and none exist, so
  the configured `lint-staged` block never runs. **Not touched** — it is `0223`'s task. It does
  raise this gate's stakes: with no commit-time gate, `npm test` and `npm run lint` are the only
  gates the repo has.

---

## 2026-09-05 — Review round 1 processed (fixes applied)

Spawned `fkit-coder` under the lead's ADR-031 conductor remit, carrying the owner's rulings on all
six findings (given live via `AskUserQuestion` in the driver session). Ledger:
`review.md` → *Coder response*. **Nothing is committed.**

### Provenance / authority note (recorded, not resolved)

Same discrepancy the build worker recorded: the caller is `fkit-lead` conducting the task directly,
**not** `fkit-sprint-ship-loop`, which is the caller the coder role's declared-approval carve-out
names literally. The other marker conditions were met (caller identified, approved plan carried,
owner approval stated as live). Plan blob re-computed with `git hash-object` before any edit:
**`d7dc8c78b0564a83612b98c103548a1bffddcff1`** — changed from the build worker's
`297a94d224a3b293a513aed7ce2c14d96c7899a4` because the lead appended the 🔴 correction box, as the
spawn prompt said. ⚠️ Unverified: no hook checks the carry, so this is a self-report.

### What changed

| File | Change |
| --- | --- |
| `tests/scripts/ShellHarnesses.test.ts` | Per-harness **success-marker** assertion (R2); Docker **self-skip → loud failure** (R1); Docker test **ordered first** (R1); `timedOut` keyed on `error.code === "ETIMEDOUT"` (R3). |
| `CLAUDE.md` | `npm run test:coverage` named in the cost note (R6); Docker row records the mid-run failure behaviour; new paragraphs on the success markers and on the hardcoded-list residual (R5). |
| Task folder | `review.md` *Coder response* + two new accepted residuals; this worklog entry. |

**Not touched:** `jest.config.ts`, the `"test"` script, `package.json`, any harness `.sh` file (all
three verified byte-identical to HEAD after the red-then-green proofs), `0223`, `ai-agents/sprints/*`.

### Decision log — decided autonomously, without asking

Three, all inside the approved plan and the owner's rulings.

1. **R1 — the mid-run Docker self-skip is reported as FAILED, not SKIPPED.** *Answers:* R1. *What
   changed:* `expectHarnessToPass` detects the harness's own `SKIP: Docker is not available` line and
   throws, with a message saying explicitly that this is not a pass and not a harness defect. *Why it
   qualified:* the ruling's operative half — "never a fake green" — is fully satisfied, verified
   against the reviewer's own reproduction. Its literal half — "surface as SKIPPED" — is **not
   achievable**: jest-circus has no runtime skip, and the only shapes that would give a real
   `○ skipped` (a second test file, or a runner change) are outside the scope fence. Failing loudly
   is the cheapest-to-reverse honest option and strictly better than the reproduced fake green.
   **⚠️ This is a deviation from the literal ruling and is flagged to the owner in the return, in the
   ledger, and here — not absorbed.**
2. **R1 — the Docker test is ordered first in the file.** *Answers:* R1. *What changed:* test order
   only, no logic. *Why it qualified:* mechanical, localized, zero runtime cost, and it shrinks the
   probe→run race window from ~17 s (two harnesses ran in between) to milliseconds, so the *normal*
   daemon-down case keeps producing a real `○ skipped` rather than the failure of decision 1.
   Obvious winner within the ruling's intent.
3. **R3's fix incidentally closed R4(b); left closed rather than re-opened.** *Answers:* R3, touches
   R4. *What changed:* nothing extra — `error.code === "ETIMEDOUT"` also catches the measured
   `{status: 0, signal: null, error: ETIMEDOUT}` truncated-run shape the owner had accepted as a
   residual. *Why it qualified:* no code was written for it; recording it was the only action, and
   silently letting an accepted residual read as still-open would misstate the ledger. **R4(a) is
   left unfixed exactly as ruled.**

Nothing else was decided unilaterally. No finding was refuted; all six verified as stated.

### Verification (raw)

- `npm test`: **113 suites / 1185 tests, all passing**, exit 0.
  ⚠️ **Timing is unusable today** — 89 s / 73 s / 208 s at load average **29–36**. The unrelated
  `ConfigParity` suite swung 18 s → 96 s in the same runs, so this is host contention, not the gate.
  The earlier ~22 s figure is neither confirmed nor refuted by today's runs. **Do not quote today's
  numbers as the cost.**
- ⚠️ **One run was red — and it was `0197`, not this change.** `Test Suites: 1 failed, 112 passed` /
  `Tests: 1181 passed` (zero failed) with a jest-worker `_onExit`. Confirmed from
  `~/Library/Logs/DiagnosticReports/node-2026-09-05-190946.ips`: `SIGSEGV`, faulting stack starting
  at `ClearStaleLeftTrimmedPointerVisitor` — CLAUDE.md's documented `0197` signature. Not the
  supertest flake. **Re-ran; green.**
- **R1 proof (against the reviewer's reproduction).** Stateful `docker` PATH shim: first call (the
  module-load probe) answers as a healthy daemon, every later call reports it gone. Before: the
  reviewer measured `✓ passed` in 66 ms. Now: `✕ docker secret boundary harness passes` with
  `exited 0 WITHOUT RUNNING: it self-skipped…`, `Tests: 1 failed`. Shim call count 2, confirming the
  probe and the harness saw different daemon states — i.e. the window was genuinely reproduced, not
  simulated by disabling Docker outright.
- **Probe-time skip still a real skip.** Same shim with the counter primed so the probe itself fails:
  `Test Suites: 1 skipped`, `Tests: 3 skipped`, plus the `[ShellHarnesses] … SKIPPED, not passed`
  warning. Both branches verified in the same session.
- **R2 proof.** Inserted `echo …; exit 0` near the top of `tests/profile-backup-redeploy.sh` →
  `✕ … exited 0 but never printed its success marker (RESULT: N passed, 0 failed)`. Restored by
  hand-edit.
- **Genuine red-then-green.** Inverted the `-ne`→`-eq` assertion at
  `tests/profile-backup-redeploy.sh:68` → `✕ … failed with exit status 1`, with `❌ promote should
  have failed` and `RESULT: 26 passed, 1 failed` in jest's output. Restored by hand-edit; re-ran
  green (3/3). **`git diff` on all three harnesses is empty and none appears in `git status`** —
  byte-identical to HEAD. No `git checkout` / `git restore` was used at any point.
- **Success markers read from source, not from the ledger:** `profile-deploy-hardening.test.sh:343`
  `ALL PASS`; `profile-backup-redeploy.sh:186` `RESULT: $pass passed, $fail failed`;
  `test-check-docker-secret-boundary.sh:192` `Passed: $pass   Failed: $fail`. All three matched the
  reviewer's transcription.
- **`spawnSync` shapes measured on this host** (Node v24.13.0), which is what R3/R4 turn on: timeout
  → `ETIMEDOUT` + `SIGTERM`; `maxBuffer` overflow → `ENOBUFS` + `SIGTERM`; backgrounded grandchild
  past the deadline → `{status: 0, signal: null, error: ETIMEDOUT}`; missing binary → `ENOENT` with
  `signal: null`.
- `npm run lint` clean. `prettier --check tests/scripts/ShellHarnesses.test.ts` clean.
  `tsc --noEmit` reports nothing for the file. **`CLAUDE.md` still fails `prettier --check` at HEAD**
  — pre-existing, owned by `0223`, deliberately left alone (running `--write` would emit a large
  unrelated reformat diff).

---

## 2026-09-06 — Review round 2 processed (R8 fixed, two comments corrected)

Spawned `fkit-coder` under the lead's ADR-031 conductor remit, carrying the owner's rulings on all
four Round-2 items (given live via `AskUserQuestion` in the driver session). Ledger:
`review.md` → *Coder response — Round 2*. **Nothing is committed.**

### Provenance / authority note (recorded, not resolved)

Same discrepancy the build worker and the round-1 worker both recorded, and flagged again rather
than absorbed: the caller is **`fkit-lead` conducting the task directly**, *not*
`fkit-sprint-ship-loop`, which is the caller the `fkit-coder` declared-approval carve-out names
**literally**. The other marker conditions were met (caller identified, approved plan carried,
owner approval stated as given live in the driver session). I proceeded, because the carve-out's
own rationale — *"nobody is there to approve"* — is satisfied (the owner is in the driver session),
because CLAUDE.md's hard rule 5 directs the cheapest-to-reverse branch when a skill rule and a spawn
instruction conflict with no owner ruling on the point (every change here is an uncommitted
working-tree edit), and because refusing would strand a decision the owner has already made. **The
discrepancy is real and is not closed by my proceeding.**

Plan blob re-computed with `git hash-object` before any edit:
**`d7dc8c78b0564a83612b98c103548a1bffddcff1`** — matches the hash the spawn prompt carried and the
round-1 worker's value (unchanged since the lead appended the 🔴 correction box). ⚠️ Unverified: no
hook checks the carry, so this remains a self-report.

### What changed

| File | Change |
| --- | --- |
| `scripts/test-check-docker-secret-boundary.sh` | **R8 only.** Built image IDs recorded in a file under the harness's existing `mktemp -d` scratch dir instead of a shell array, so `cleanup()` can actually see them. No case, assertion, call site or output line touched. |
| `tests/scripts/ShellHarnesses.test.ts` | **Two comment corrections only, no code.** `:200` no longer claims the success marker proves "every case has run" (R7); `:38` says the hardening harness runs ~16 s, not ~30–40 s (nit). |
| Task folder | `review.md` *Coder response — Round 2*; this entry. |

**Not touched:** `jest.config.ts`, the `"test"` script, `package.json`, `CLAUDE.md`, the other three
harness `.sh` files, `ai-agents/sprints/*`, the `0208`/`0214` briefs, the whole `0223` folder. No
git hook added, no repo reformat, `prettier --write` never run.

### Owner rulings, and how each is discharged

| # | Ruling | How it is discharged |
| --- | --- | --- |
| **R8** | **FIX IT NOW, inside `0201`** — ⚠️ **a deliberate scope widening chosen by the owner against both the reviewer's and the lead's recommendation to file a follow-up. Recorded as the owner's call, not the coder's.** | Verified the diagnosis against the source, reproduced the leak (**133 → 138 dangling images, +5**), fixed it, and re-measured (**delta 0**). |
| **R7** | **Correct the comment ONLY. A minimum-case-count assertion was explicitly REJECTED** — the coverage variance belongs to the harness, not the gate. | Comment at `:200` rewritten; **no assertion added or changed.** |
| **R9** | **No action.** | Nothing changed. |
| **nit** | **Fix the number, keep the point.** | `~30–40 s` → `~16 s`; the "must stay far above jest's 5000 ms default" reasoning kept verbatim. |

### Decision log — decided autonomously, without asking

Exactly one, and it is a shape choice inside an explicitly ordered fix.

1. **R8 — fixed by a scratch-dir ID file rather than by changing the five call sites.** *Answers:*
   R8. *What changed:* `IMAGES=()` → `IMAGE_IDS="$WORK/built-image-ids"`; `build_img` appends the ID
   with `printf '%s\n' "$iid" >> "$IMAGE_IDS"`; `cleanup()` reads it back with
   `while IFS= read -r img … done < "$IMAGE_IDS"`. *Why it qualified:* the owner ordered the fix, so
   the *whether* was not mine — only the *how*. This is the shape that touches the fewest lines: two
   hunks, **zero call-site edits**, therefore zero risk of altering what the harness asserts, which
   the spawn prompt made the hard boundary ("if your fix would alter what the harness asserts,
   stop"). The alternative — making `build_img` set a global and rewriting all five call sites —
   is ten edited lines across the harness's assertion body. Obvious winner within the ruling's
   intent, verified by diffing the pre-fix and post-fix case lines: **identical**. The file lives in
   the harness's own `mktemp -d` dir (outside the repo) and is deleted by the same `rm -rf "$WORK"`
   that already ran, so nothing new is left on disk.

Nothing else was decided unilaterally. No finding was refuted; R7, R8 and the nit were each verified
against the source first, and R8 was reproduced before it was touched.

### Verification (raw)

- **R8 leak reproduced before the fix:** dangling `133` → run harness (exit 0,
  `Passed: 10   Failed: 0`) → `138`. **+5 per run.**
- **R8 leak closed after the fix:** dangling `138` → run (exit 0, `Passed: 10   Failed: 0`) →
  `138`. **Delta 0.** Docker was up on this host, so this is a real demonstration against the real
  reproduction, not an argument.
- **Harness behaviour unchanged:** pre-fix vs post-fix `PASS:`/`FAIL:`/`SKIP:` case lines diffed —
  **identical, same order**, 10 `PASS:` both times, marker `Passed: 10   Failed: 0` printed both
  times.
- **`npm test` — 113 suites / 1185 tests, all passing, exit 0.** Twice (post-fix, and as the final
  state). No red run, so no flake re-run was needed; neither `0197`'s `SIGSEGV` signature nor the
  supertest shapes appeared.
- **Gate still gates.** Inverted a real assertion (`assert_exit zero` → `nonzero`, "clean image
  passes") in the very file I had edited: `Test Suites: 1 failed` / `Tests: 1 failed, 2 passed`,
  harness's `Passed: 9   Failed: 1` and its case lines embedded in jest's output. Also proves
  `cleanup()` fires on a **failing** run — the dangling count did not move across the red run.
  **Restored by hand-edit, never `git checkout`/`git restore`**; the harness's `git diff` is
  byte-identical to the intended R8 fix (`shasum` of the diff: `0db563ad…` before and after).
- `npm run lint` clean. `prettier --check tests/scripts/ShellHarnesses.test.ts` clean. `tsc --noEmit`
  no diagnostics for that file. `bash -n` on the edited harness clean. **`CLAUDE.md` still fails
  `prettier --check` at HEAD** — pre-existing, `0223`'s, deliberately untouched.
- **No secret-shaped leftovers:** `.env.__t4f_fixture__.secret` absent from the repo root after every
  run; no secret value printed or recorded anywhere.

### ⚠️ Timing — deliberately not measured

`uptime` before the runs: load averages **26.69 / 27.33 / 31.00**, then **27.55 / 27.03 / 30.36**.
**No wall-clock number from this host today is reported as a measurement, and no cause is asserted**
for the earlier plan-vs-build discrepancy. Unusable, for the record only: the two full runs finished
in 23.5 s and 23.9 s. **Do not quote these.**

### ⚠️ Residue from my own reproduction, disclosed

Proving R8 required letting the leak happen once, so **5 dangling images from the pre-fix run remain
on this host** (133 → 138; the fix stops new leaks, it does not retro-clean). Every post-fix run left
the count at 138. Not cleared: `docker image prune` would also delete unrelated dangling images
belonging to other work on this machine. The owner's call.
