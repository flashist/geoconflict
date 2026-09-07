# Review — 0201

Task: `ai-agents/tasks/done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md`
File(s) under review: `tests/scripts/ShellHarnesses.test.ts` (new), `package.json`, `CLAUDE.md`
Scope: uncommitted working tree. Out of scope (a different worker's producer pass, not reviewed):
`ai-agents/sprints/backlog.md`, `ai-agents/sprints/plan-sprint-4.md`, the `0208`/`0214`/`0201`
`brief.md` edits, and `ai-agents/tasks/backlog/0223-*/`.
Status: in-review

Round 1 — 2026-09-05. Reviewers: fkit-reviewer (Claude) + Codex `gpt-5.5` (`codex exec`,
read-only, exit 0). **Both reviewers ran. Coverage is not partial.**

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | medium | `tests/scripts/ShellHarnesses.test.ts:111` (+ `:120`, `scripts/test-check-docker-secret-boundary.sh:20-23`) | **Confirmed fake green, reproduced.** The Docker probe is a point-in-time check taken ~17–19 s before the harness actually runs (the hardening harness runs first, ~15–16 s). If the daemon goes away in that window, the harness takes its own `exit 0` self-skip and the wrapper reports `✓ passed` in 66 ms. Violates the Q1 ruling ("SKIPPED, never a fake green pass") and contradicts the new CLAUDE.md line that states it. Raised by both reviewers. |
| R2 | 1 | medium | `tests/scripts/ShellHarnesses.test.ts:89` | The only assertion is `status !== 0`. All three harnesses print an explicit success marker (`ALL PASS`, `RESULT: N passed, 0 failed`, `Passed: N   Failed: 0`) and none is checked. A harness that regresses into asserting nothing — an inserted early `exit 0`, an internal self-skip, a deleted trailing section — still reports green. Exit-0-only is the weakest available check for a task whose premise is that a test nobody really runs is worthless. R1 is the concrete instance of this. |
| R3 | 1 | low | `tests/scripts/ShellHarnesses.test.ts:69` | `timedOut = signal === "SIGTERM" && error !== undefined` conflates ETIMEDOUT with ENOBUFS. Reproduced: >10 MB of harness output is reported as *"did not finish within 150000 ms and was killed … it is this harness hanging"* — a false diagnosis stated emphatically. Stays red, so not a gate hole. Remote reachability: measured harness outputs are 0.7–3.1 KB against a 10 MB cap (~3000× headroom). Raised by both reviewers. |
| R4 | 1 | low | `tests/scripts/ShellHarnesses.test.ts:68-71`, `:89` | `result.error` is never surfaced and never consulted on the `status === 0` path. (a) A spawn failure (e.g. `bash` absent, ENOENT) reports `failed with exit status null` with an empty output block and no reason. (b) Measured on this host: a child that backgrounds a process and exits 0 while the deadline fires returns `{status: 0, signal: null, error: ETIMEDOUT}` — `timedOut` is false and `status === 0`, so a **truncated run reports green**. Not reachable by any of the three current harnesses (none backgrounds anything, none runs near 150 s). |
| R5 | 1 | low | `tests/scripts/ShellHarnesses.test.ts:122-146` | The gate is a hardcoded list of three paths. Nothing fails when a fourth `.sh` harness is added and not listed — so 0201's own failure mode (a harness nobody runs) recurs for the next harness. All four harnesses that exist today are accounted for, so this is about recurrence, not present coverage. Likely a frontier-move if the owner accepts an explicit list. |
| R6 | 1 | low | `CLAUDE.md` (new "Shell harnesses are part of `npm test`" subsection) | The subsection states the cost for `npm test` only. `npm run test:coverage` (`jest --coverage`, documented four lines above it) also now runs all three harnesses — same ~20 s — and also writes the synthetic fixture into the repo root. Factual gap in the doc, not a code defect. |

## Coder response

Round 1 response — 2026-09-05, spawned `fkit-coder` under the lead's ADR-031 conductor remit, with
the owner's rulings on all six findings relayed from a live `AskUserQuestion` in the driver session.
Every finding was re-verified against the code before anything was changed. **Nothing is committed.**

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** — independently reproduced | Defect | Docker self-skip is now detected from the harness's own output and raised as a **loud FAILURE** naming the cause. Reproduced the reviewer's exact condition with a stateful `docker` PATH shim (probe answers healthy, every later call reports the daemon gone): previously `✓ passed` in 66 ms, now `✕ … exited 0 WITHOUT RUNNING: it self-skipped…`. Docker test also **reordered first** so the probe→run window is milliseconds, not ~17 s. ⚠️ **Deviation from the literal ruling, flagged:** the mid-run case surfaces as **FAILED, not SKIPPED** — jest-circus has no runtime skip (`pending()` exists only under the jasmine2 runner), so a test already started cannot become skipped. The *probe-time* case still reports a real `○ skipped` (re-verified this round). Never a green pass either way. | **fixed (with a flagged deviation)** |
| R2 | **CORRECT** | Defect | Each harness is now asserted on its own **positive success marker** as well as exit 0: `/^ALL PASS$/m`, `/RESULT: \d+ passed, 0 failed/`, `/^Passed: \d+\s+Failed: 0\s*$/m`. All three markers were read out of the harness sources, not taken from the ledger's transcription, and match. Proven: an early `exit 0` inserted into `tests/profile-backup-redeploy.sh` now FAILS with `exited 0 but never printed its success marker`. Harness restored by hand-edit; `git diff` empty. | **fixed** |
| R3 | **CORRECT** | Defect | `timedOut` now tests `error.code === "ETIMEDOUT"` instead of `signal === "SIGTERM" && error !== undefined`. Measured on this host (Node v24.13.0): timeout → `{status:null, signal:"SIGTERM", code:"ETIMEDOUT"}`, output overflow → `{status:null, signal:"SIGTERM", code:"ENOBUFS"}`. An overflow now falls through to the plain non-zero-exit message instead of asserting "it is this harness hanging". | **fixed** |
| R4 | **CORRECT** on both limbs; **(b) incidentally closed by the R3 fix** | Frontier | **Owner ruling: ACCEPT as residual** (unreachable by today's three harnesses). Recorded below under *Accepted residuals*. Note for the record: R4(b) is no longer reachable — measured `{status:0, signal:null, error:ETIMEDOUT}` for a backgrounded-grandchild timeout, and the new `error.code` check catches it, so a truncated run is now red. **R4(a) stands as the residual**: a spawn failure (e.g. `bash` absent, ENOENT) still reports `failed with exit status null` with an empty output block and no reason. Not fixed, by ruling. | **accepted (residual)** |
| R5 | **CORRECT** | Frontier | **Owner ruling: ACCEPT as residual** — the hardcoded three-path list stays. Recorded below, and written into CLAUDE.md in plain terms: `0201` fixes today's four harnesses, but a future unlisted `.sh` harness could still rot unrun. Not softened. | **accepted (residual)** |
| R6 | **CORRECT** | Defect (doc) | `npm run test:coverage` (`jest --coverage`, same config) now named in the CLAUDE.md cost note: it runs all three harnesses too, same ~20 s, and also writes the synthetic fixture into the repo root. | **fixed** |

**Disputed: nothing.** No finding was refuted; all six verified.

### Verification run for this round

- `npm test` — **113 suites / 1185 tests, all passing**, exit 0. ⚠️ **Wall-clock is unusable today:**
  89 s / 73 s / 208 s across three runs at load average **29–36** (`ConfigParity`, an unrelated suite,
  swung 18 s → 96 s in the same runs). The ~22 s figure from the build and review rounds is not
  contradicted, but nothing measured this round supports or refutes it. **Do not quote today's
  numbers.**
- ⚠️ One run went red: **1 suite crashed on `0197`'s V8 GC segfault**, not a test failure
  (`Tests: 1181 passed, 0 failed` + a jest-worker `_onExit`). Confirmed from
  `~/Library/Logs/DiagnosticReports/node-2026-09-05-190946.ips`: `SIGSEGV`, faulting stack starts at
  `ClearStaleLeftTrimmedPointerVisitor`. That is CLAUDE.md's documented `0197` signature, not the
  supertest flake and not this change. **Re-ran; green.**
- Red-then-green re-proved on a **genuine** harness failure (inverted assertion in
  `tests/profile-backup-redeploy.sh`): `✕ … failed with exit status 1` with `❌ promote should have
  failed` and `RESULT: 26 passed, 1 failed` visible in jest's output. Restored **by hand-edit, never
  `git checkout`/`git restore`**; all three harness files are byte-identical to HEAD
  (`git diff` empty, absent from `git status`).
- `npm run lint` — clean, no errors or warnings. `prettier --check` on the new test file — clean.
  `tsc --noEmit` — no diagnostics for this file. **`CLAUDE.md` still fails `prettier --check` at
  HEAD**; that is pre-existing and belongs to `0223`, deliberately not touched.

## Accepted residuals (shared, do-not-re-litigate)

- **No escape hatch** — What: the gate is unconditional; no `SKIP_SHELL_HARNESSES` or equivalent env
  valve exists. · Why (structural): owner ruling Q3, 2026-09-05 — a valve would become the default and
  the harnesses would rot unrun again, which is this task's own failure mode. Rejected alternative: an
  opt-out env var. · Re-raise only if: the owner reverses Q3.
- **Runtime cost accepted unconditionally** — What: `npm test` goes from ~3 s to ~22 s. · Why
  (structural): owner ruling Q3. The absolute end state is below the ~38–40 s ceiling the owner
  accepted. Single-file runs stay free. · Re-raise only if: a *specific avoidable* mechanism is shown
  (not "the suite got slower").
- **`tests/profile-backup-dryrun.sh` is out of `npm test`** — What: exposed as
  `npm run test:scripts:docker` instead. · Why (structural): owner ruling Q2 — it hard-fails without
  Docker plus `age`, `age-keygen`, `rclone`, `curl`, `jq`, so no honest `npm test` gate is possible;
  its real gate is `0218`. Rejected alternative: faking a gate. · Re-raise only if: its dependency set
  becomes satisfiable on a bare developer machine.
- **`jest.config.ts` unchanged** — What: no config edit. · Why (structural): the new path already
  matches `testRegex`, and `testPathIgnorePatterns` excludes only `node_modules` and
  `tests/integration`. Verified this round: 112/1182 → 113/1185, integration config untouched. ·
  Re-raise only if: `testRegex` changes.
- **R4(a) — a spawn failure is reported without its reason** (added round 1, owner ruling
  2026-09-05) — What: `result.error` is never surfaced, so if `bash` itself cannot be spawned
  (ENOENT), the failure reads `failed with exit status null` with an empty output block. · Why
  (structural): the owner accepted it as unreachable by today's three harnesses — `bash` is present
  on every machine that can run this repo, and a missing `bash` breaks far more than this gate. ·
  Note: R4(b) (a truncated backgrounded run reporting green) is **no longer a residual** — the R3 fix
  closed it, verified. · Re-raise only if: a harness is added that is spawned by something other than
  `bash`, or a real ENOENT is observed.
- **R5 — the harness list is hardcoded** (added round 1, owner ruling 2026-09-05) — What: the gate
  names three paths explicitly; nothing fails when a fourth `.sh` harness is added and not listed. ·
  Why (structural): the owner accepted this knowingly. **Stated without softening: `0201` fixes
  today's four harnesses, and a future unlisted `.sh` harness could still rot unrun — this task's own
  failure mode, recurring for the next harness.** Mitigation is documentation only: CLAUDE.md now
  says "Add your new harness to that file." Rejected alternative: globbing `**/*.sh` and inferring
  which are harnesses. · Re-raise only if: a new harness is added and is not listed, or the owner
  reverses.
- **`bash <path>` not `./<path>`** — What: all harnesses invoked through `bash`. · Why (structural):
  `tests/scripts/profile-deploy-hardening.test.sh` is mode 644. Verified this round: correct for all
  three and immune to a future mode change. · Re-raise only if: a harness needs its own shebang
  interpreter.

## Re-litigates settled decisions (suppressed)

None. No finding from either reviewer targeted a settled residual or ADR. (No ADR in
`ai-agents/knowledge-base/decisions/` bears on test gating.)

## Disproven — recorded so nobody is sent chasing them

- **Codex finding, "high #1"** — *"`spawnSync`'s `timeout` does not reliably bound a hang, because
  Node kills only the direct child; if a grandchild holds stdio, `spawnSync` stays blocked and jest's
  180 s timeout cannot fire."* **Disproven on this host.** Measured, Node v24.13.0, a 300 ms deadline:
  returned in 302–303 ms in every shape tested — `sleep 5`, `exec sleep 5`,
  `bash -c "sleep 5" & wait` (grandchild holds stdout), `sleep 5 | cat` (pipeline holds fd), and a
  busy loop. Codex's own supporting measurement was confounded: two of its three probe scripts died on
  a shell quoting error (`trap: cleanup": invalid signal specification`) and it timed a three-call
  loop, reporting the aggregate as one result.
- **The coder's timeout reasoning is sound, not a defect.** `spawnSync` does block the jest worker
  thread, so jest's timer cannot preempt it; the second `spawnSync` deadline is genuinely necessary,
  and 180 s > 150 s means the wrapper's own message always wins. Verified empirically: both forced
  failure paths produce messages that name the harness, and the literal string
  `Exceeded timeout of 5000 ms` appears nowhere.

## Independently verified clean (no finding)

- **The gate goes red and is legible.** Reproduced without touching the repo (a PATH-shimmed `bash`
  from the scratchpad): non-zero exit → suite FAIL, harness named, its `❌` lines and its stderr both
  present in jest's failure output.
- **Docker binary absent** → `○ skipped`, not green. **Daemon unreachable** → `○ skipped` plus the
  `console.warn`, not green. Both reproduced.
- `REPO_ROOT` and `cwd` correct; all harness scratch dirs are `mktemp -d` outside the repo.
- `npm run test:integration` unaffected — `integrationConfig` uses
  `testMatch: tests/integration/**/*.it.test.ts`.
- **No secret-leak path from embedding harness output in a jest failure message.**
  `scripts/check-docker-secret-boundary.sh:209-218` prints in-image *paths and names* on failure,
  never file contents.
- Working tree left byte-identical by this review; no `.env.__t4f_fixture__.secret` left behind.

## Independent timing measurement (requested by the lead)

Same host, `dev` @ `2d1135c`, Docker up, **load average 25.8–25.9 throughout** (7 users, concurrent
agents — i.e. a heavily contended machine).

| Measurement | Runs | Wall clock |
|---|---|---|
| Baseline, `ShellHarnesses` excluded (112 suites / 1182 tests) | 2 | **3.21 s / 2.98 s** |
| Full `npm test` with the gate (113 suites / 1185 tests) | 2 | **22.81 s / 22.03 s** |
| `tests/scripts/profile-deploy-hardening.test.sh` alone | 1 | **15.02 s** |
| `tests/profile-backup-redeploy.sh` alone | 1 | **1.18 s** |
| `scripts/test-check-docker-secret-boundary.sh` alone | 1 | **3.44 s** |

**My run supports the build worker's figures, not the plan's §1 figures** — on every line, within
noise (15.02 vs 15.68 s; 3.0–3.2 vs 3.0–3.6 s; 22.0–22.8 vs 22.4–24.7 s). The plan's 24.5 s baseline
and 34.2 s hardening mean did not reproduce.

**The CPU-contention hypothesis is not supported by this data, and is weakened by it.** I measured at
load average ~26 — the condition the hypothesis says should *inflate* the numbers — and got the low
figures. I have **not** shown what did cause the plan's numbers; candidates I did not test include a
cold jest/page cache, a different Docker state, and the different revision the plan names (`e9d8c95`
vs `2d1135c` today). **Do not quote a cause.**

Incidental, and consistent with both: CPU utilisation drops from ~663–715 % (baseline, parallel jest)
to ~118–121 % (with the gate), confirming the shell suite is serial and process-spawn-bound and is
essentially the whole critical path — jest reports 21.9 s of a 22.0 s run inside `ShellHarnesses`.

---

## Reviewer findings — Round 2

Round 2 — 2026-09-06. Reviewers: fkit-reviewer (Claude, a **fresh context that did not run Round 1**)
+ Codex `gpt-5.5` (`codex exec --sandbox read-only`, exit 0). **Both reviewers ran. Coverage is not
partial.** Scope re-reviewed: `tests/scripts/ShellHarnesses.test.ts` and the `CLAUDE.md` subsection,
against the three harness sources. Nothing in Round 1 or the Coder response was edited.

**Verdict: APPROVE with two low follow-ups. R1 and R2 independently hold — reproduced from scratch,
not taken from the coder's transcript. No new defect in the reviewed diff. Nothing found is a
blocker.**

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R7 | 2 | low | `scripts/test-check-docker-secret-boundary.sh:77-91`; comment at `tests/scripts/ShellHarnesses.test.ts:200` | **The marker proves the harness reached its end, not that every case ran.** Case 1 plants the bytes of a *real local* secret file found by `find` over the repo; with no such file it prints `SKIP: no local secret file found to plant (case 1)`, skips the case, and still prints `Passed: N   Failed: 0` and exits 0. The wrapper's regex accepts any `N`. Verified: on this host `Passed: 10` (untracked `.env.*` files exist); `git ls-files` matching that pattern set is **empty**, so on a **fresh clone** case 1 skips and the gate is green at `Passed: 9`. Not a fake green — nine real assertions ran — but coverage silently varies by host, and the wrapper comment "*after every case has run*" is factually wrong for this harness. Raised by both reviewers. Cheapest honest fix is the comment; asserting a minimum `N` would harden it. |
| R8 | 2 | low | `scripts/test-check-docker-secret-boundary.sh:28`, `:37-42`, and its callers `:68`, `:86`, `:100`, `:164`, `:182` | **The Docker harness leaks 5 dangling images per run, and `0201` is what makes that fire on every `npm test`.** `build_img()` does `IMAGES+=("$iid")`, but *every* call site is a command substitution (`CLEAN_ID=$(build_img "$WORK/clean")`), which bash runs in a subshell — the append never reaches the parent, so `cleanup()` iterates an always-empty array. **Reproduced: `docker images -f dangling=true` went 123 → 128 across one harness run.** Pre-existing harness defect, **outside the reviewed diff**, and dormant until now because nothing ran this harness. Bytes are trivial (`FROM scratch` + a few KB), but accumulation is unbounded and clutters every developer's `docker images` and build cache. **Codex-only finding.** Recommend a follow-up task on the harness — the coder deliberately left harness files untouched, and fixing it here would be a scope expansion. |
| R9 | 2 | informational | `tests/scripts/ShellHarnesses.test.ts:192-206` | **Test ordering is a real jest default, and it is defence-in-depth only.** jest 30.0.0 exposes `--randomize`; `jest-circus` shuffles `describeBlock.children` when it is set, so `npm test -- --randomize` would move the Docker test back behind the two ~17 s harnesses and reopen the wide probe→run window. `jest.config.ts` sets no `randomize` and nothing in the repo passes it; declaration order held in every run below. **Codex framed this as "silently disables the mitigation" — accurate, but the consequence is only a wider window, never a fake green:** the self-skip check still turns a mid-run daemon loss into a loud FAILURE (reproduced). Correctness does not rest on ordering. **No action.** The file's own comment at `:166-171` already frames it this way. |
| —  | 2 | nit | `tests/scripts/ShellHarnesses.test.ts:38` | Comment says the hardening harness "runs for ~30–40 s". Measured 15.0–16.7 s here, and CLAUDE.md says ~16 s. The comment's *point* (far above jest's 5000 ms default) stands; only the number is wrong. |

### R1 — independently holds (re-derived, transcript not accepted)

Built my own stateful `docker` PATH shim from scratch, outside the repo: exit 0 on call 1 (the
module-load probe), `Cannot connect to the Docker daemon.` + exit 1 on every later call, counter in a
scratch file. Result:

```
✕ docker secret boundary harness passes (…) (83 ms)
  Shell harness scripts/test-check-docker-secret-boundary.sh exited 0 WITHOUT RUNNING: it self-skipped…
✓ profile deploy hardening harness passes (16746 ms)
✓ profile backup redeploy harness passes (1367 ms)
```

Shim call count = **2** (probe + the harness's own `docker info`), confirming the window is exactly
one test-start wide and that the Docker test really did run first. **Never a green pass.** Per the
owner's 2026-09-05 ruling the FAILED-not-SKIPPED wording is accepted and is not re-raised.

Self-skip string verified against source, not against the ledger: `…:21` prints
`SKIP: Docker is not available — this test requires a running daemon.`; the wrapper's
`includes("SKIP: Docker is not available")` is a correct prefix of it.

### R2 — independently holds. I could not construct a fake green.

**Structural argument.** The marker check runs *after* the `status !== 0` check, so it can only
**add** failures — it can never remove one. A false green therefore needs exit 0 *as well*, i.e. the
harness's own counter must lie. I audited all three counters for the subshell/pipeline loss that
would allow that: hardening's `pass`/`fail` (`:26-27`) and redeploy's `ok`/`no` (`:26-27`) are only
ever called at top level in `A && ok || no` form (the `&&`/`||` binds to the pipeline and runs in the
parent shell); docker's `ok`/`bad` are called from `assert_exit` in the parent — its only subshell is
`out=$("$@" 2>&1)`. **No counter is lost.** (The one genuine subshell-loss in that harness is `IMAGES`
— R8 — which affects cleanup, not the verdict.)

**Empirical.** A `bash` PATH shim that made `tests/profile-backup-redeploy.sh` print two plausible
lines and `exit 0` (real `bash` exec'd for everything else) → `✕ … exited 0 but never printed its
success marker (RESULT: N passed, 0 failed)`. **No repo file was touched to prove this.**

**Markers verified against source and attacked:**

| Harness | Source | Marker | Failing variant matches? | False-red risk |
|---|---|---|---|---|
| `profile-deploy-hardening.test.sh:343` | `[ "$FAILED" -eq 0 ] && { echo "ALL PASS"; exit 0; } \|\| { echo "SOME FAILED"; exit 1; }` | `/^ALL PASS$/m` | no (`SOME FAILED`) | none reachable |
| `profile-backup-redeploy.sh:185-186` | `echo "==== RESULT: $pass passed, $fail failed ===="` then `[ "$fail" -eq 0 ]` | `/RESULT: \d+ passed, 0 failed/` | no (`26 passed, 1 failed`) | none reachable |
| `test-check-docker-secret-boundary.sh:191-193` | `echo "Passed: $pass   Failed: $fail"` then `[ "$fail" -eq 0 ]` | `/^Passed: \d+\s+Failed: 0\s*$/m` | no (`Passed: 9   Failed: 2`) | none reachable |

All three matched real captured output, concatenated `stdout + stderr` exactly as the wrapper does.
`ALL PASS` is the string's only occurrence in its file. The two anchored markers would false-red only
if stdout lacked its trailing newline while stderr was non-empty — unreachable: `echo` supplies the
newline, the trailing `[ … ]` prints nothing, and all three harnesses emitted **0 bytes of stderr** on
a pass. `\s+` in the docker regex can span a newline (`Passed: 3\n\nFailed: 0` matches) — unreachable,
the harness prints one line. Neither is a finding.

### Ordinary paths — re-verified, not broken by the R1/R2 fixes

- **Genuine pass, Docker up:** all three ✓ (4.6 s / 16.1 s / 1.4 s), Docker test first.
- **Docker down at probe:** `○ skipped` + the `console.warn`, suite passes — a real skip, not a green
  for that harness. Reproduced with an always-failing `docker` shim.
- **Docker binary missing:** `spawnSync("docker")` returns `{status: null, code: "ENOENT"}` (measured),
  so `probe.status === 0` is false → the same skip path.
- **Exit 0 without the marker:** red (above). **Genuine non-zero exit:** the `status !== 0` branch is
  unconditional and precedes both later checks; Round 1 already reproduced it with an inverted
  assertion, and I did not repeat it rather than edit a harness file.

### R3 — fix verified independently

Measured on this host, Node v24.13.0:

| Shape | Result |
|---|---|
| deadline fires | `{status: null, signal: "SIGTERM", code: "ETIMEDOUT"}` |
| `maxBuffer` overflow | `{status: null, signal: "SIGTERM", code: "ENOBUFS"}` |
| spawn failure | `{status: null, signal: null, code: "ENOENT"}` |
| backgrounded grandchild + deadline | `{status: 0, signal: null, code: "ETIMEDOUT"}` |

`error.code === "ETIMEDOUT"` is the correct discriminator: it separates the two SIGTERM shapes *and*
catches the `status: 0` shape. **R4(b) is genuinely closed**, as the coder claimed — independently
confirmed. ENOBUFS now falls through to `failed with exit status null` — true, if not diagnostic. Not
a defect.

### Codex round-2 pass

Codex raised exactly three findings — R7, R8, R9 above. **It did not re-raise its Round-1 top finding
about `spawnSync`'s timeout**; the Round-1 disproof was supplied in its prompt as a settled point.
R8 is the only finding Codex caught that my own pass did not; I reproduced it before recording it.
Nothing Codex raised was passed through unverified.

### Regression check

- `npm test` — **113 suites / 1185 tests, all passing, exit 0.** No red run, so no re-run was needed.
- `git diff --stat -- tests/ scripts/ jest.config.ts` — **empty**. No harness file modified,
  `jest.config.ts` untouched.
- `package.json` diff is the single `test:scripts:docker` line; its target
  `tests/profile-backup-dryrun.sh` exists and is executable.
- `git status` after all my runs is byte-identical to before: the same 12 entries, no
  `.env.__t4f_fixture__.secret` left behind. **This review modified nothing.**
- R6 confirmed present: the `npm run test:coverage` paragraph is in the CLAUDE.md subsection.

### Timing — deliberately not measured

`uptime` at the start of this round: load averages **26.02 / 33.50 / 36.50**. Per the lead's standing
instruction, **no wall-clock number from this host today is usable and I am reporting none as a
measurement, and asserting no cause.** For the record only, flagged as unusable: the full run above
finished in 24.5 s (jest's own estimate for the same run was 96 s). That neither supports nor refutes
the ~22 s figure, and must not be quoted.

### Convergence call

**Converged. Recommend closeout of the review loop.** Zero new defects in the reviewed diff. R1, R2,
R3 and R6 are all independently confirmed fixed. R7 and R9 are refinements of already-accepted points
rather than new defects; R8 is a genuine pre-existing defect in a file this task deliberately does not
touch, and belongs in a follow-up. **Nothing in Round 2 re-litigates a settled residual** — the
FAILED-vs-SKIPPED wording, the hardcoded list, the missing escape hatch, R4(a), and the timeout
construction were all held out of both passes as settled, and neither reviewer raised them. A Round 3
on this diff would produce nothing.

### Owner questions (returned to the lead — reviewer has no owner channel)

1. **R8 (image leak).** File a follow-up task on `scripts/test-check-docker-secret-boundary.sh`, or
   accept as a residual? Recommendation: **follow-up task**, low priority — the fix is a one-line
   change to how `build_img` returns, but it is a harness edit and outside `0201`'s scope.
2. **R7 (host-varying coverage + the wrong comment at `:200`).** Correct the comment only, harden the
   marker to require a minimum case count, or accept as a residual? Recommendation: **correct the
   comment** — it is the only part of R7 inside the reviewed diff, and the coverage variance is a
   property of the harness, not of this gate.

---

## Coder response — Round 2

Round 2 response — 2026-09-06, spawned `fkit-coder` under the lead's ADR-031 conductor remit,
carrying the owner's rulings on all four Round-2 items (given live via `AskUserQuestion` in the
driver session). Every finding was re-verified against the source before anything was changed.
**Nothing is committed.** Neither reviewer findings section nor the Round-1 coder response was
edited.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R7 | **CORRECT** — verified against source | Defect (comment) | **Owner ruling: correct the comment only; a minimum-case-count assertion was explicitly REJECTED** (the coverage variance belongs to the harness, not to the gate). Verified the mechanism at `scripts/test-check-docker-secret-boundary.sh:72-91`: case 1's `find` over `ROOT_DIR` selects a *real local* secret file; with none it prints `SKIP: no local secret file found to plant (case 1)` and the harness still ends `Passed: N   Failed: 0`, exit 0. Measured both counts on this host in one session — `Passed: 10` on a normal run (untracked `.env.*` present) and `Passed: 9` when case 1 is not exercised. The comment at `:200` now states that the marker proves the harness **reached its end with a zero failure counter, NOT that every case ran**, and names the host-varying N. **No assertion changed.** | **fixed (comment only, per ruling)** |
| R8 | **CORRECT** — independently reproduced before any edit | Defect (pre-existing, in a harness file) | **Owner ruling: FIX IT NOW, inside `0201`.** ⚠️ **Recorded as a deliberate owner-chosen scope widening, against both the reviewer's and the lead's recommendation to file a follow-up.** Diagnosis confirmed from source: `build_img()` appends to `IMAGES` at `:41`, but all five call sites (`:68`, `:86`, `:100`, `:164`, `:182`) are command substitutions, so the append dies with the subshell and `cleanup()` iterated an always-empty array. Reproduced independently: dangling image count **133 → 138** across one harness run (+5), matching the reviewer's 123 → 128. Fixed by recording built image IDs in a file under the harness's own `mktemp -d` scratch dir, which survives the subshell, and having `cleanup()` read them back. **No call site, no case, and no assertion was touched.** | **fixed** |
| R9 | **CORRECT**, and the reviewer's own call | Frontier | **Owner ruling: NO ACTION.** Consequence of `--randomize` is a wider probe→run window, never a fake green — the self-skip check still turns a mid-run daemon loss into a loud failure. Ordering is defence-in-depth, as the file's comment at `:166-171` already says. Nothing changed. | **no action (by ruling)** |
| nit | **CORRECT** | Defect (comment) | **Owner ruling: FIX.** The comment at `:38` claimed the hardening harness "runs for ~30–40 s"; measured 15.0–16.7 s by the reviewer, ~16 s in CLAUDE.md. Corrected to `~16 s`; the comment's load-bearing point (far above jest's 5000 ms default, so the timeouts must stay) is kept verbatim. | **fixed** |

**Disputed: nothing.** No Round-2 finding was refuted; R7, R8 and the nit were each verified against
the source before being acted on, and R8 was reproduced before it was fixed.

**No new accepted residual.** R9 is a no-action-by-ruling item, not a residual, and the reviewer did
not ask for it to be recorded as one.

### Change surface — Round 2

| File | Change |
| --- | --- |
| `scripts/test-check-docker-secret-boundary.sh` | R8 only. `IMAGES=()` array → an `IMAGE_IDS` file under the existing `$WORK` scratch dir; `build_img` appends the ID to it; `cleanup()` reads it back. Two hunks plus one comment word (`tracks` → `records`). Cleanup plumbing only — **no case, no assertion, no call site, no output line changed.** |
| `tests/scripts/ShellHarnesses.test.ts` | The two comment corrections only (R7 at `:200`, nit at `:38`). **No code changed.** |
| Task folder | This ledger section; `worklog.md` entry. |

**Not touched:** `jest.config.ts`, the `"test"` script, `package.json`, `CLAUDE.md`, the other three
harness `.sh` files, `ai-agents/sprints/*`, the `0208`/`0214` briefs, the whole `0223` folder.

### Verification run for this round (raw)

- **R8 leak reproduced BEFORE the fix**, on this host, Docker up:
  `dangling BEFORE: 133` → run `bash scripts/test-check-docker-secret-boundary.sh` (exit 0,
  `Passed: 10   Failed: 0`) → `dangling AFTER: 138`. **+5 per run**, one per `build_img` call site.
- **R8 leak closed AFTER the fix**, same measurement: `dangling BEFORE: 138` → run (exit 0,
  `Passed: 10   Failed: 0`) → `dangling AFTER: 138`. **Delta 0.**
- **The harness's behaviour is unchanged.** Diffed the pre-fix and post-fix `PASS:`/`FAIL:`/`SKIP:`
  case lines: **identical, in the same order**. 10 `PASS:` lines both times, `Failed: 0` both times,
  the exact success marker `Passed: 10   Failed: 0` printed both times.
- **`npm test` — 113 suites / 1185 tests, all passing, exit 0.** Run twice (once after the R8 fix,
  once as the final state); green both times. No red run, so no re-run for a flake was needed.
- **The gate still gates — genuine harness failure still goes red.** Inverted a real assertion
  (`assert_exit zero` → `nonzero` on "clean image passes") in the file I had just edited:
  `Test Suites: 1 failed` / `Tests: 1 failed, 2 passed`, with the harness's own `Passed: 9
  Failed: 1` and its per-case lines embedded in jest's failure output. This also proves `cleanup()`
  still fires on a **failing** run: the dangling count did not move across the red run either.
  **Restored by hand-edit, never `git checkout`/`git restore`** — `git diff` on the harness is
  byte-identical to the intended R8 fix (compared by `shasum` of the diff before and after:
  `0db563ad…` both times).
- `npm run lint` — clean, no errors or warnings. `prettier --check tests/scripts/ShellHarnesses.test.ts`
  — clean. `tsc --noEmit` — no diagnostics for that file. `bash -n` on the edited harness — clean.
  **`CLAUDE.md` still fails `prettier --check` at HEAD** — pre-existing, owned by `0223`, deliberately
  untouched.
- **No secret-shaped leftovers.** `.env.__t4f_fixture__.secret` absent from the repo root after every
  run. No secret value was printed or recorded anywhere. `git status` carries only the expected
  entries plus the now-modified `scripts/test-check-docker-secret-boundary.sh`.

### ⚠️ Timing — deliberately not measured

`uptime` before the runs: load averages **26.69 / 27.33 / 31.00**, and **27.55 / 27.03 / 30.36**
before the final run. Per the lead's standing instruction, **no wall-clock number from this host
today is reported as a measurement, and no cause is asserted** for the earlier plan-vs-build
discrepancy. For the record only, flagged unusable: the two full runs finished in 23.5 s and 23.9 s.
**Do not quote these.**

### ⚠️ Residue from my own reproduction, disclosed

Proving R8 required letting the leak happen once: **5 dangling images from the pre-fix run are still
on this host** (count went 133 → 138 and the fix, correctly, only stops *new* leaks). Every run after
the fix left the count at 138. The owner may clear them with `docker image prune` at their
discretion; I did not run it, because it would also remove unrelated dangling images belonging to
other work on this machine.

---

## Reviewer findings — Round 3

Round 3 — 2026-09-06. Reviewers: fkit-reviewer (Claude, a **fresh context that ran neither Round 1 nor
Round 2**) + Codex `gpt-5.5` (`codex exec --sandbox read-only`, exit 0). **Both reviewers ran. Coverage
is not partial.**

**Scope — deliberately narrow, per the lead.** Round 2 called convergence; the owner then ruled the R8
scope widening, which produced a diff that did not exist when convergence was called. This round
reviews **only that new diff**: `scripts/test-check-docker-secret-boundary.sh` (the R8 fix) and the two
comment-only edits in `tests/scripts/ShellHarnesses.test.ts` (`:38`, `:200`). R1–R7 and R9 were held out
of both passes as settled and neither reviewer raised them. Nothing in Rounds 1–2 was edited.

**Verdict: APPROVE. The R8 fix independently holds. Zero defects. Nothing found is a blocker, and
nothing found warrants a Round 4.**

| #   | Round | Sev | file:line | Claim |
|-----|-------|-----|-----------|-------|
| R10 | 3 | informational | `scripts/test-check-docker-secret-boundary.sh:34-36` | **Codex raised this as MEDIUM; I downgrade it to informational after refuting the mechanism against the real binary.** Claim: `docker image rm -f "$img"` inside the `while read` loop inherits the ID file as stdin, so a stdin-reading command would swallow the remaining IDs and leak them. Codex verified only with a *substitute* stdin-reader (`cat >/dev/null`), never with `docker`. **Measured with the real binary and three real images: 3 loop iterations of 3, all three removed** (dangling 141 → 138). The harness's own `docker` PATH shims (`make_shim`, `:113-126`) are applied per-command via `env PATH=…` (`:133`, `:141`) and are never on PATH during `cleanup()`, so no shim can intercept it either. `</dev/null` on the loop body would be free belt-and-braces hardening; it fixes nothing that is reachable. **No action needed.** |
| R11 | 3 | informational | `scripts/test-check-docker-secret-boundary.sh:34` | `while IFS= read -r img` drops a final record that lacks a trailing newline — reproduced by both reviewers (`printf 'sha256:unterminated'` → zero iterations). **Unreachable here:** the only writer is `printf '%s\n' "$iid" >> "$IMAGE_IDS"` (`:46`), which always terminates the line, and `: > "$IMAGE_IDS"` (`:31`) leaves the file legitimately empty. Codex's residual case — a truncated final append after an interruption — would leak one image where the **pre-fix code leaked all five**, so even that edge is a strict improvement. **No action needed.** |
| R12 | 3 | informational | `scripts/test-check-docker-secret-boundary.sh:36` | If `$IMAGE_IDS` were absent at cleanup time (scratch dir removed early, or `cleanup()` re-entered after `:38`), the redirect fails *before* the body's `\|\| true` can apply, so bash emits one `No such file or directory` line on stderr. Reproduced by both reviewers. **Cosmetic and unreachable:** nothing removes `$WORK` before `cleanup()`, and the trap is registered once. Verified in both bad cases that `cleanup()` still **reaches the fixture removal and the `rm -rf`**, still terminates, and **does not alter the script's exit status**. **No action needed.** |

**Disputed: R10's severity.** Codex's Medium rests on a conditional (*"if `docker` … reads stdin"*)
that I tested and found false for the actual command. Recorded as informational, not passed through at
Codex's label.

### 1. Is the R8 fix behaviour-preserving? — YES, re-derived independently

**The coder's transcript was not accepted.** I built an isolated mirror outside the repo
(`scripts/check-docker-secret-boundary.sh`, `Dockerfile` and `.dockerignore` copied; `ROOT_DIR` resolves
to the mirror), placed the **HEAD** harness (`git show HEAD:…`) and the **working-tree** harness side by
side in it, and ran both against the same daemon.

- I **planted a secret-shaped file in the mirror root first**, so **case 1 actually ran in both** — a
  stronger comparison than the coder's, whose evidence did not establish that.
- `diff` of the two full outputs: **byte-identical, same order.** 10 `PASS:` lines both times, zero
  `FAIL:`, zero `SKIP:`, and the exact marker `Passed: 10   Failed: 0` both times. Both exit 0.
- **No case, assertion, ordering, call site, or printed line changed.** By source inspection the diff
  touches only `cleanup()`, the `IMAGE_IDS` declaration, and one `>>` append inside `build_img()`; the
  new file lives at `$WORK/built-image-ids`, outside every build context (`$WORK/clean`,
  `$WORK/planted`, `$WORK/example`, `$WORK/named`, `$WORK/synth`), so no build sees it.
- `build_img()`'s stdout is unchanged — the append is redirected to the file, and its return status is
  still that of the final `printf '%s' "$iid"`.

### 2. Does the leak fix work, and is it robust? — YES on both

**Leak, independently reproduced and closed**, same mirror, same daemon, and **without a single
`docker image prune`** — I removed my own residue by exact ID diff (`comm -13`):

| Run | dangling before → after | Delta |
|---|---|---|
| **Pre-fix** harness (HEAD) | 138 → 143 | **+5** |
| **Post-fix** harness (working tree) | 138 → 138 | **0** |
| Post-fix via real `npx jest` | 138 → 138 | **0** |
| Post-fix on a **failing** run (inverted assertion) | 138 → 138 | **0** |
| Post-fix on a **mid-run `docker build` failure** | 138 → 138 | **0** |
| Post-fix with case 1 self-skipping (`Passed: 9`) | 138 → 138 | **0** |

**Attacks run, all survived:**

| Attack | Result |
|---|---|
| ID file empty (no builds) | Loop no-ops, rc 0, cleanup completes |
| ID file **absent** at cleanup | One stderr line; **fixture removal and `rm -rf` still reached**; exit status unchanged (R12) |
| `cleanup()` invoked **twice** | Second pass errors on the redirect only, reaches its tail, rc 0 |
| **SIGTERM** mid-run | EXIT trap runs, both IDs read and removed, rc 143 |
| **SIGINT** mid-run | EXIT trap runs, both IDs read and removed |
| **`docker build` fails midway** (case 3) | Harness exits 1 and the **two already-built images are still reaped** — the pre-fix array leaked them |
| `mktemp -d` under a nonexistent `TMPDIR` | Harness still completed `Passed: 10   Failed: 0`, dangling delta 0 |
| Loop body stealing stdin | Refuted with the real binary — 3/3 iterations (R10) |
| Last line without trailing newline | Not producible by `build_img` (R11) |

⚠️ **The highest-stakes question I asked that nobody had asked before: can the new `cleanup()` body
leak its own exit status and turn a failing harness green?** The harness's last command is
`[ "$fail" -eq 0 ]` (`:198`) and the EXIT trap runs after it. **Measured both directions: a successful
trap body does NOT mask a failing harness (rc stays 1), and an erroring trap body does NOT redden a
passing one (rc stays 0).** No fake green, no false red.

### 3. Is the ID-file approach sound in this harness's context? — YES

- **Lifetime ordering is correct.** `cleanup()` reads the file (`:34-36`) *before* `rm -rf "$WORK"`
  (`:38`); nothing else deletes `$WORK`. No read-after-free.
- `IMAGE_IDS` is assigned immediately after `WORK=$(mktemp -d)` (`:25`, `:30`) and truncated with
  `: >` (`:31`) *before* `trap cleanup EXIT` (`:40`), so the file always exists by the time the trap
  can fire.
- The read loop is correct for every line `build_img` can write (R11).
- The subshell diagnosis is right: all five call sites (`:73`, `:91`, `:105`, `:169`, `:187`) are
  command substitutions, and a file append survives where an array append did not.

### 4. Does the gate still gate? — YES, re-proved independently, **no repo file touched**

I did **not** edit a harness to force red. I put a `bash` PATH shim in front of `npx jest` that
redirects *only* the exact docker-harness argv to a mirror copy with one real assertion inverted:

```
FAIL tests/scripts/ShellHarnesses.test.ts (…)
  ✕ docker secret boundary harness passes (scripts/test-check-docker-secret-boundary.sh)
    Shell harness scripts/test-check-docker-secret-boundary.sh failed with exit status 1.
    --- harness output ---
    FAIL: clean image passes (expected nonzero, got exit 0)
    …
    Passed: 9   Failed: 1
```

The harness's own `FAIL:` line, the gate's stdout and the counter are all embedded in jest's report.
**`cleanup()` fired on that red run** (dangling 138 → 138). Green run, unmodified:
**1 suite / 3 tests passed, exit 0**, Docker test ordered first, dangling unchanged.
`shasum scripts/test-check-docker-secret-boundary.sh` = `a88a0dda…` before and after everything I ran.

### 5. Did anything leak out of the fence? — NO

- `git diff HEAD --name-only` names **exactly one** in-scope source file:
  `scripts/test-check-docker-secret-boundary.sh` (10 insertions / 5 deletions).
- **Untouched, confirmed by empty per-file diff:** `jest.config.ts`, the other three harness `.sh`
  files (`tests/scripts/profile-deploy-hardening.test.sh`, `tests/profile-backup-redeploy.sh`,
  `tests/profile-backup-dryrun.sh`), and the gate `scripts/check-docker-secret-boundary.sh`.
- `package.json` carries only the Round-1 `test:scripts:docker` line; `CLAUDE.md` only the Round-1
  subsection; the `"test"` script is still plain `jest`. `ai-agents/sprints/*`, the `0208`/`0214`
  briefs and the whole `0223` folder are unchanged by this round.
- **No secret value was printed or recorded** anywhere, by either reviewer. The mirror fixture I
  planted held non-secret placeholder bytes and was deleted. `.env.__t4f_fixture__.secret` is absent
  from the repo root. The `.env*` files in the repo root are the owner's pre-existing untracked files,
  not residue.
- `git status` is the same **13** entries as before this review. **This review modified nothing**, and
  the mirror was deleted.

### ⚠️ Timing — measured, then discarded as unusable

`uptime` at the start of this round: load averages **26.88 / 26.75 / 29.10**; **31.33 / 29.56 / 29.69**
mid-round. **No wall-clock number from this host today is usable, I am reporting none as a
measurement, and I assert no cause** for the plan-vs-build discrepancy. For the record only, flagged
unusable and **not to be quoted**: the green gate suite finished in 27.8 s, the red one in 36.1 s.
No red run occurred that needed a flake attribution, so neither `0197` nor the supertest shape applies.

### Docker residue

Unchanged from Round 2: the host still holds the **5 dangling images from the coder's pre-fix
reproduction** (count 138). My own pre-fix reproduction leaked 5 more and **I removed exactly those 5
by ID**; the count is back at 138 and every post-fix run left it there. **I did not run
`docker image prune`.**

### Convergence call

**Converged. Recommend closeout — this task is ready to close.**

**Nothing found this round is a genuine new defect.** All three findings are informational hardening
observations on a code path I could not make misbehave, and two of the three (R11, R12) describe edges
where the fixed code is still strictly better than the code it replaced. **None is re-litigation
either** — no settled residual, ruling or ADR was targeted by either reviewer, and the R8 fix is a new
diff that no earlier round saw.

The one thing this round existed to check — **a fix to the gate's own subject, verified by the context
that wrote it** — now has independent confirmation: behaviour byte-identical with case 1 exercised,
leak closed across six run shapes including two failure paths, exit-status integrity proved in both
directions, and red-then-green re-proved without touching a repo file. **A Round 4 would produce
nothing.**

### Owner questions

**None.** Every Round-3 finding is informational with no action recommended, so there is no disposition
for the owner to make.
