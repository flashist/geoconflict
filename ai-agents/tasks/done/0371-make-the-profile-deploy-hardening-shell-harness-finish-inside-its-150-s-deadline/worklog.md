# Worklog — 0371: make the profile-deploy-hardening harness finish inside its 150 s deadline

Build + verify by `fkit-coder`, spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`, Sprint 7), 2026-10-02, under
the loop's declared-approval marker. Approved plan: [`plan.md`](plan.md) (blob `bfbe233…`, unchanged by this build).
Nothing committed or pushed.

## Summary

- **Cause (measured):** macOS runs a first-execution check on every newly created executable the first time it is
  run directly (~0.16–0.96 s per file on this host, slower under load). The harness wrote 6 fresh stub executables
  on every `NEW`/`TNEW` — 59 calls since `49a419d`/`05c3cfa` (0355/0356), so ~354 checks per run.
- **Fix (test-only):** stubs written **once** per harness run into `STUB_HOME`; each stub reads the current `$WORK`
  at run time from the pointer file `$STUB_HOME/work`, which `make_stubs` refreshes on every `NEW`.
- **Result:** standalone 255 s → 54 s on the same loaded machine (load avg ~9); 34–47 s on later runs. Inside full
  `npm test` the harness took 45 s, 30 s, 24 s on runs 3–5.
- **Coverage:** 740 checks before and after, ALL PASS, output byte-identical (apart from the `time` lines).
- ⚠️ **One full `npm test` run (run 2) still breached the 150 s deadline** — see Verification step 4. Judged
  environmental (an untouched harness ran ~30× slower in the same run), but that is a judgment, not a proof.

## Step 1 — diagnosis

### From the plan step (measured 2026-10-02 by the planning `fkit-coder`, copied here as the plan requires)

| Run | Wall | CPU | Checks | NEW/TNEW |
|---|---|---|---|---|
| `68303d5` (before the suspect commits; full `git archive` copy run in scratchpad) | **37.3 s** | 14 % | 476, ALL PASS | 19 |
| Working tree (= HEAD for this file), standalone | **121.4 s** | 11 % | 740, ALL PASS | 59 |
| (0367 worklog, same file) | 114 s wrapper-only · 3m10s · 5m10s | ~7 % | 740 | 59 |
| Prototype A: one shared stub dir, stubs **rewritten in place** each NEW | 54.2 s | 27 % | 740 | 59 |
| **Prototype B: stubs written once, never rewritten (the chosen fix)** | **20.1 s** | **61 %** | **740, ALL PASS, output identical** | 59 |

- **Per section, working tree:** every deploy-running section ~1.3–4 s; none stood out. T1 once took 26.5 s (cold
  start), 2.0 s re-run alone. The time was spread over ~64 deploy runs, not one `sleep` or timeout.
- **One T1 deploy traced** (`bash -x` with timestamps, scratch copy): 1.9 s total, ~1.6 s of it the **first** call to
  each new stub — `ssh` (via `sshpass`) 0.67–0.69 s, `scp` 0.32–0.40, `docker login` 0.30–0.34, `git rev-parse` 0.31.
  Everything else in `build-deploy-profile.sh` < 0.04 s per step. A second deploy in the same `NEW`: 0.27 s total.
- **Isolated probe:** a freshly written `#!/bin/bash` script costs 0.16–0.75 s on first direct execution, 0.00 s
  after; run as `bash file` it costs 0.00 s. New files carry `com.apple.provenance`. ⚠️ **Which macOS component does
  the check (syspolicyd / XProtect / provenance) is inferred, not proven** — the cost is measured, the component is not.
- **Ruled out:** no `sleep`, retry or real network call in `build-deploy-profile.sh`, `build-deploy-telemetry.sh`,
  `scripts/deploy-version-tag.sh`; `ssh -o ConnectTimeout=10` is stubbed; DNS goes through the `getent` stub. Nothing
  that ships in a deploy is involved.

### Re-measured during this build (2026-10-02, this host, load average ~9–14 throughout from other sessions)

- Isolated probe repeated: 6 fresh scripts, first direct exec 0.307 / 0.160 / 0.863 / 0.959 / 0.158 / 0.156 s; second
  exec 0.002 s.
- Before-fix standalone run (unmodified file, = HEAD): **255.2 s** wall, user 5.65 s + sys 8.94 s (~6 % CPU), 740 ✅,
  0 ❌, ALL PASS. Slower than the planner's 121 s because the machine was busier (load ~9).
- After-fix section timings (standalone, 46.7 s run): T1 24.1 s (the cold start — first exec of the 6 new stubs plus
  whatever else is cold); next slowest Structural alert-probe 2.1 s (writes its 3 probe stubs once), T4 1.4 s, T2 1.2 s,
  everything else ≤ 1.1 s. In a second run under concurrent jest load (33.9 s total) T1 was 5.4 s — **the T1 cold start
  varies a lot (5–24 s) and is still the largest single item.** It is now paid once per run, not per test.
- Other new executables the harness creates were checked: `run_deploy`'s `setup-profile.sh` / `profile-backup.sh` /
  `profile-checks.sh` / `check-docker-secret-boundary.sh` fixtures are never executed directly (scp'd, or run via
  `bash`), so they pay no check. The probe stubs (`PROBE_RUN_DIR`) are already written once.

## Step 2 — what changed

**`tests/scripts/profile-deploy-hardening.test.sh`** (test-only; all hunks inside lines 29–240, i.e. the
`STUB_HOME` setup and `make_stubs`):
1. After `fail()`: `STUB_HOME=$(mktemp -d)` with a comment explaining the macOS first-run cost and that stubs must be
   written once and never rewritten.
2. `make_stubs`: writes `$WORK` to `$STUB_HOME/work` on every call; `BIN="$STUB_HOME/bin"`; returns early if `$BIN`
   exists, otherwise creates it and writes the stubs. Comment above it: only `NEW` may set `WORK`.
3. The six stub heredocs (docker, git, sshpass, ssh, scp, getent): `read -r W < "$STUB_HOME/work"` added after each
   `#!/bin/bash`; the **47** baked-in `$WORK` uses became the runtime `\$W`. Nothing else in the stubs changed.
4. `NEW`, `TNEW`, `run_deploy`, `run_telemetry_deploy`, the `env -i` allow-lists, every test body: unchanged.

**`tests/scripts/ShellHarnesses.test.ts`:** stale comment *"runs for ~16 s"* → *"runs for ~20–55 s (measured
2026-10-02 after task 0371; slower on a loaded machine)"*. Constants and marker untouched.

## Verification

1. **Timings + cause recorded:** Step 1 above.
2. **Standalone `bash tests/scripts/profile-deploy-hardening.test.sh`:** before **255.2 s** → after **53.9 s** (same
   hour, same load ~9), ALL PASS. Later after-fix runs: 46.7 s, 33.9 s (the latter with a concurrent jest run). Target
   < 75 s: met. The prototype's 20 s was not reproduced on this busier machine.
3. **Coverage:** 740 ✅ / 0 ❌ before and after. Full outputs diffed after deleting the `time` lines: **identical**
   (814 lines each; no temp paths or timestamps appear in the output). Harness diff reviewed: every removed line is a
   stub line whose only change is `$WORK` → `\$W` (checked mechanically: the removed and added lines match 1:1 after
   that substitution), plus the old `BIN="$WORK/bin"; mkdir -p "$BIN"` line. No `pass`/`fail`/`grep` assertion line
   removed or altered.
4. **Full `npm test`** (working tree also holds 0367's change; covered too):

   | Run | Wall | Suites | Tests | Hardening harness | Notes |
   |---|---|---|---|---|---|
   | 1 | 134.3 s | 187/187 | 3357/3357 | (not shown — non-verbose) | green |
   | 2 | 233.2 s | 186/187 | 3356/3357 | **killed at 150 004 ms** | ❌ — see below |
   | 3 | 83.9 s | 186/187 | 3356/3357 | 45.2 s ✓ | ❌ `NameChangeRoutes.test.ts`: `socket hang up` |
   | 4 | 97.6 s | 187/187 | 3357/3357 | 29.9 s ✓ | green |
   | 5 | 61.9 s | 187/187 | 3357/3357 | 24.0 s ✓ | green |

   - **Runs 4 and 5: green twice in a row.**
   - ⚠️ **Run 2 — deadline breach, not fixed by code.** Harness reached the Structural (0220) sections, all ✅, then
     was killed at 150 s. In the **same run** the untouched `tests/profile-backup-redeploy.sh` took **48.2 s** (1.1–1.8 s
     in runs 3–5) and `tests/profile-checks.sh` 26.1 s. Load average rose to ~11.7. Read as a machine-wide stall from
     other sessions on this host, not the harness. **Inferred, not proven.** No change made for it.
   - Run 3: supertest-family `socket hang up` (CLAUDE.md known-flake table: *"seen, never traced"*). No `SIGSEGV` in
     the output; newest `node-*.ips` report is from 2026-10-01, before this run. Re-ran per the rule (runs 4, 5).
5. **`ShellHarnesses.test.ts`:** `JEST_TIMEOUT_MS = 180_000` and `HARNESS_TIMEOUT_MS = 150_000` unchanged; no skip /
   opt-out added; marker `/^ALL PASS$/m` still matches the harness's final line (`echo "ALL PASS"`, unchanged).
6. **`npm run lint`:** exit 0. **`npx tsc --noEmit`:** exit 0. Prettier check on `ShellHarnesses.test.ts`: clean.

## Residuals

- **Intermittent machine stalls can still push the harness over 150 s** (run 2). Headroom on normal runs is 3–6×.
  The brief's step-3 options (raise the deadline, split the harness) were not used — the plan did not need them.
- **T1 cold start (5–24 s)** remains, once per run.
- `STUB_HOME` is left in the temp dir, like every `$WORK` (the harness never cleans those). Unchanged behaviour.
- A future test that sets `WORK=` without `NEW`, or adds a per-test stub write, would break or re-slow this — both
  named in the comments.

## Decision log (autonomous calls under the standing approval)

1. **47 substitutions, not the plan's "54".** The plan said 54 baked-in `$WORK` uses. The heredocs hold 47 unescaped
   (baked-in) uses, all replaced, plus 8 already-escaped `\$WORK` mentions inside stub *comments* (e.g. "pushed by this
   fixture (\$WORK/registry_pushed)"), which never expanded and were left as-is — they still describe the current
   fixture folder correctly. Qualified: mechanical, in-plan (the plan replaces baked-in uses and leaves comments).
2. **Wording of the `ShellHarnesses.test.ts` comment** ("~20–55 s … slower on a loaded machine"). The plan approved a
   refresh to "the new measured figure"; a range was used because the measured figure varies with load. Qualified:
   in-plan, comment-only.
3. **Run 2's deadline breach treated as environmental; no code change, re-ran.** Not a fix — a classification. Evidence:
   an untouched harness was ~30× slower in the same run; runs 3–5 put this harness at 24–45 s. Reported loudly above so
   the owner can disagree.
4. **Run 3's `socket hang up` treated as the known supertest flake; re-ran.** Followed CLAUDE.md's rule (check
   signature, rule out `SIGSEGV`, re-run, say so). Qualified: the documented procedure, not a new decision.

## Decision log — Process-review step (round 1), 2026-10-02

Process-review worker (`fkit-coder`, spawned by `fkit-sprint-ship-loop` under the declared-approval marker; approved
plan blob `bfbe233…` re-checked, unchanged).

- **Fixes applied without asking: none.** No source or test file touched this step.
- **Obvious-winner calls: none.**
- R1 was **not** an autonomous call: it is dispositioned `won't fix (frontier)` per the **owner's own ruling**
  (2026-10-02, *"Accept and record (Recommended)"*), and recorded in `review.md` § Accepted residuals as
  *hardening-harness-150s-under-heavy-load*. Ledger header set to `Status: closed-out`.
