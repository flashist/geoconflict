# Approved plan — 0371

> **Provenance (written by `fkit-lead`, `fkit-sprint-ship-loop`, 2026-10-02).** Approved by the owner via
> `AskUserQuestion` in the live `fkit lead` session on 2026-10-02 (answer: *"Approve (Recommended)"* — which
> includes the one-line stale-comment refresh in `tests/scripts/ShellHarnesses.test.ts`; the alternative
> "Approve, skip comment fix" was not chosen).
> ⚠️ **Honest note:** the owner was shown a plain-language rendering of this plan in the session, not these
> exact bytes. The text below the line is the plan the spawned `fkit-coder` returned, **transcribed by
> `fkit-lead` from that worker's message — not a byte copy** (every file:line, measurement, change, check, risk
> and scope item kept). Both the owner-facing rendering and this file derive from that same return. This is the
> `carried-not-approved` residual the skill names — approval leaves no artifact (ADR-021).

---

# Plan — 0371: make the profile-deploy-hardening harness finish inside its 150 s deadline

## Summary
- **Cause found and measured — it is in the test harness, not a deploy script.** macOS runs a first-execution check on every *newly created* executable file the first time it is run directly. The harness writes 6 new stub executables (docker, git, sshpass, ssh, scp, getent) on every `NEW`/`TNEW`, and that check costs **~0.16–0.75 s per new file**. The cost is mostly waiting, not computing, which matches the ~7–11 % CPU seen.
- **Why it got slow on 2026-10-01:** commits `49a419d`/`05c3cfa` (tasks 0355/0356) raised `NEW`/`TNEW` calls from **19 to 59** → ~114 → ~354 fresh executables per run.
- **Proposed fix:** write the stubs **once** per harness run, at a fixed location, and have them look up the current `$WORK` at run time (instead of having it baked in when written). Test-only change. No coverage change. No deadline change. No harness split.
- **Prototyped on a throwaway copy in the scratchpad (not in the repo): 121 s → 20 s, CPU 11 % → 61 %, 740 checks before and after, ALL PASS**, output **line-for-line identical** once timestamps and temp paths are stripped.
- **Not yet measured:** full `npm test` with the fix (the real file is unchanged, so the wrapper still runs the old one). That measurement is the build step's verification.
- **No owner decision needed.** The brief's step-3 options (raise the deadline, split the harness) are not needed.

## Step 1 — diagnosis (measured 2026-10-02, this host, read-only; the build copies these numbers into `worklog.md`)
| Run | Wall | CPU | Checks | NEW/TNEW |
|---|---|---|---|---|
| `68303d5` (before the suspect commits; full `git archive` copy run in scratchpad) | **37.3 s** | 14 % | 476, ALL PASS | 19 |
| Working tree (= HEAD for this file), standalone | **121.4 s** | 11 % | 740, ALL PASS | 59 |
| (0367 worklog, same file) | 114 s wrapper-only · 3m10s · 5m10s | ~7 % | 740 | 59 |
| Prototype A: one shared stub dir, stubs **rewritten in place** each NEW | 54.2 s | 27 % | 740 | 59 |
| **Prototype B: stubs written once, never rewritten (the proposed fix)** | **20.1 s** | **61 %** | **740, ALL PASS, output identical** | 59 |

**Per-section, working tree:** every deploy-running section took ~1.3–4 s; no single section stood out. One outlier: T1 took 26.5 s on the first run but 2.0 s re-run alone — a one-off cold start. The time is spread across ~64 deploy runs; it does not come from one `sleep` or one timeout.

**Per-command trace of one T1 deploy** (`bash -x` with timestamps, scratch copy): 1.9 s total, ~1.6 s of it the **first** call to each new stub — `ssh` (via `sshpass`) 0.67–0.69 s, `scp` 0.32–0.40, `docker login` 0.30–0.34, `git rev-parse` 0.31. Everything else in `build-deploy-profile.sh` < 0.04 s per step. A **second deploy in the same NEW** (stubs already checked): **0.27 s total**.

**Isolated probe:** a freshly written `#!/bin/bash` script costs 0.16–0.75 s on its first direct execution, 0.00 s after. Running it as `bash file` costs 0.00 s — why `check-docker-secret-boundary.sh` (run via `bash`) and the parity checker (via `node`) are unaffected. New files carry `com.apple.provenance`. ⚠️ **Which macOS component does the check (syspolicyd / XProtect / provenance) is inferred, not proven** — the *cost* is measured, the component is not. Rewriting a stub in place did **not** reliably avoid the check inside the harness (prototype A 54 s; its trace showed 0.2–0.43 s per rewritten stub) — hence the fix must be **write-once**, not just "one folder".

**Why the times varied (114 s – 5m10s):** the check's latency scales with machine load, so under full `npm test` it grows — why the harness passes alone but breaches the deadline inside the full suite.

**Ruled out:** no `sleep`, retry or real network call (grep of `build-deploy-profile.sh`, `build-deploy-telemetry.sh`, `scripts/deploy-version-tag.sh`: no `sleep`/`curl`; `ssh -o ConnectTimeout=10` is stubbed; DNS goes through the `getent` stub). Nothing that ships in a deploy is involved.

## Step 2 — changes
**`tests/scripts/profile-deploy-hardening.test.sh`** (test-only):
1. Near `:26` (after `FAILED=0`): `STUB_HOME=$(mktemp -d)` — one stub folder for the whole run — with a comment explaining the macOS first-run cost and that **stubs must be written once and never rewritten** (so a future test does not quietly bring the slowdown back).
2. `make_stubs`, `:31–32`: on every call write the current `$WORK` to a pointer file (`printf '%s\n' "$WORK" > "$STUB_HOME/work"`); set `BIN="$STUB_HOME/bin"`; if `$BIN` already exists `return 0`, else `mkdir -p` it and fall through to write the stubs.
3. The six stub heredocs, `:34–222` (docker, git, sshpass, ssh, scp, getent): add `read -r W < "$STUB_HOME/work"` right after each `#!/bin/bash` (bash builtin, no extra process); replace the **54** baked-in `$WORK` uses with the runtime `\$W`. Mechanical: each stub's logic, logging, knobs and exit codes stay byte-identical apart from that path variable. Comments outside the heredocs unchanged.
4. `NEW` (`:298`), `TNEW` (`:2683`), `run_deploy`, `run_telemetry_deploy`, the `env -i` allow-lists, every test body: **unchanged**. `PATH="$BIN:$PATH"` still works because `make_stubs` still sets `BIN`. The deploy scripts' environment gains no new variable — the stubs find the pointer through the path written into them, not via env.
5. Probe stubs (`PROBE_RUN_DIR`, `:2191–2226`) are already written once (≈1.7 s once) — leave as is.

**`tests/scripts/ShellHarnesses.test.ts:~37`:** refresh the stale comment only (*"The hardening harness alone runs for ~16 s"* → the new measured figure, citing 0371). **`JEST_TIMEOUT_MS = 180_000` and `HARNESS_TIMEOUT_MS = 150_000` unchanged.** No skip path. Success marker `ALL PASS` unchanged.

**`ai-agents/tasks/backlog/0371-…/worklog.md`** (new): the Step 1 tables above, plus after-fix timings and verification results.

## Why this approach
It removes the measured cause (a fresh executable per stub per test) without touching what is checked: every assertion, knob and stub behaviour stays the same; only *where a stub reads its fixture folder from* changes (a runtime pointer file instead of a path baked in at write time). Rejected: rewriting stubs in place (measured 54 s); passing `$WORK` via an environment variable (would widen the deliberate `env -i` allow-list into the real deploy scripts); reusing one fixed `$WORK` folder (tests keep paths from earlier NEWs — riskier). Raising the deadline or splitting the harness: unnecessary.

## Verification (per the brief's steps)
1. Before/after section timings and the cause recorded in `worklog.md`.
2. `bash tests/scripts/profile-deploy-hardening.test.sh` → ALL PASS; record wall before (121 s) and after. **Target < 75 s; prototype 20 s.**
3. Check count 740 before and after; strip timestamps/temp paths from both outputs and diff → identical. Review the harness diff for any removed/altered `pass`/`fail`/`grep` assertion line — expected none; only stub path plumbing and comments change.
4. Full `npm test` green **twice in a row**, wall recorded. Supertest-family failure → CLAUDE.md known-flake rule (check signature, re-run, say so); `SIGSEGV` → 0197.
5. `ShellHarnesses.test.ts`: both timeout constants unchanged, no skip/opt-out path, `ALL PASS` marker still matched.
6. `npm run lint` and `npx tsc --noEmit` clean.

## Risks / edge cases
- **Stubs now depend on the pointer always naming the current `$WORK`.** `WORK` is assigned only in `NEW` (`:298`, grep-checked) and tests run sequentially, so the pointer is always current. A future test that sets `WORK=` by hand without `NEW` would point stubs at the wrong folder — mitigated by a comment at `make_stubs`.
- **A careless future change could reintroduce the cost** (e.g. a new stub per test). The comment explains it; a timing assertion was rejected as flaky.
- **macOS-specific check.** On Linux the fix is harmless — no new tools; `read -r` is portable bash 3.2+.
- **Under full-suite load 20 s will stretch.** Headroom vs 150 s is large (~7×) but not yet measured inside the full suite — verification step 4 covers it.
- **Temp-folder hygiene:** `STUB_HOME` is left behind like every existing `$WORK` (the harness never cleans those). No behaviour change; out of scope.
- **The one-off 26 s T1 cold start** (seen once, first run) remains a one-time cost after the fix and is not counted in the 20 s.
