# Plan — 0201 Phase 2: fold the shell harnesses into `npm test`

> **Provenance.** Produced by a spawned `fkit-coder` (plan-only, wrote no source), 2026-09-05.
> **APPROVED BY THE OWNER 2026-09-05** via `AskUserQuestion` in the `fkit lead` session, together
> with rulings on Q1, Q2 and Q3 (recorded at the bottom of this file).
>
> ⚠️ **Honesty note on this artifact.** The lead wrote this file by transcribing the worker's
> returned plan text out of the driver session's context. It was **not** copied from a
> pre-existing file, because none existed — the plan was returned as text. A later reader should
> treat this as the driver's faithful transcription, not as a byte-verified copy of an earlier
> artifact.

---

## 🔴 CORRECTION APPENDED 2026-09-05 — the numbers in §1 DID NOT REPRODUCE

**Appended by the lead after the build phase. The plan text below is left exactly as approved; this
box corrects it rather than rewriting it, so the record of what the owner actually approved stays
intact.**

The build worker re-measured on the same host and got materially different figures:

| | §1 told the owner | Re-measured at build time |
|---|---|---|
| `npm test` before | 24.5 s | **3.0–3.6 s** (3 runs) |
| `npm test` after | ~38–40 s ("roughly doubles") | **22.4–24.7 s** (3 runs) |
| Cold jest cache | ~55–60 s | **23.5 s** |
| Hardening harness alone | 28.5–39.8 s (mean 34.2) | **15.7 s** |

⇒ **The real increase is ~7×, not ~2×.** ⚠️ **The owner's Q3 ruling confirmed a ratio that was not
real.** The **absolute** end state (22.4–24.7 s) nonetheless came in **below** the ~38–40 s ceiling
they accepted, so nothing was built beyond what was authorized — but the *reasoning* they were given
was wrong, and that is recorded here rather than quietly absorbed.

⚠️ **Neither set of numbers is established as the true one.** A plausible but **unverified**
explanation for the inflation in §1: the plan worker and a second spawned agent were running
**concurrently on this machine**, contending for CPU. That is a hypothesis, not a finding — nobody
has re-run under controlled conditions. **Do not quote either figure as settled without re-measuring.**

---

## 1. Measured runtimes on this host (verification step 1)

Wall-clock, `time bash <harness>`, macOS 25.2.0, this repo at `dev` `e9d8c95`. All four **pass** today.

| Harness | Wall-clock | External deps | Behavior with no Docker | Result |
|---|---|---|---|---|
| `tests/scripts/profile-deploy-hardening.test.sh` | **34.4 s / 28.5 s / 39.8 s** (3 runs; mean 34.2 s) | **none** — self-stubs `docker git ssh scp sshpass getent` | n/a | ALL PASS, exit 0 |
| `tests/profile-backup-redeploy.sh` | **2.1 s** | **none** (bash + coreutils) | n/a | 27 passed, 0 failed |
| `scripts/test-check-docker-secret-boundary.sh` | **9.4 s** (Docker up) / **0.013 s** (Docker down) | Docker | **self-skips, exit 0** | 10 passed, 0 failed |
| `tests/profile-backup-dryrun.sh` | **11.3 s** (warm images) | Docker + `age` + `age-keygen` + `rclone` + `curl` + `jq` | **hard-fails, exit 1** | 24 passed, 0 failed |

**Baseline `npm test`: 24.5 s wall — 112 suites, 1182 tests, all passing.**

🚨 **The load-bearing number: the hardening harness alone (~34 s) takes longer than the entire
existing test suite (~25 s).** It is process-spawn-bound, not CPU-bound (9–11 % CPU, no `sleep`
calls, 12 full end-to-end `run_deploy` invocations of the real `build-deploy-profile.sh`) — there is
no cheap way to speed it up.

Estimated `npm test` after folding in hardening + redeploy (~36 s of serial shell work):

- **Steady state ≈ 38–40 s** (jest's timing cache schedules the slow suite first; it overlaps the
  ~21 s of parallel jest work).
- **First run after a cache clear ≈ 55–60 s** (cold cache sorts by file size; a tiny wrapper file is
  scheduled *last*, so it does not overlap).

⚠️ **Both estimates are reasoned, not measured** — measuring them requires writing the wrapper file,
which the plan-only scope forbade. The four harness numbers above are measured.

Docker happened to be running on this host today, so all four could be timed. That is incidental —
the owner's constraint is that Docker cannot be *started* headlessly, not that it is never up.

**Verification step 2 discharged:** the hardening harness passes with `PATH` reduced to an empty dir
plus `/usr/bin:/bin:/usr/sbin:/sbin` — no `docker`, `git`, `ssh`, `scp`, `sshpass` or `getent` from
the host. 39.8 s, exit 0, `ALL PASS`, zero ❌ lines.

## 2. Mechanism — how `npm test` reaches a `.sh` file

`jest.config.ts:47` `testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$"` is TS/TSX-only by
construction.

**There is an exact in-repo precedent: `tests/scripts/ConfigParity.test.ts` is already a jest
`.test.ts` that shells out via `spawnSync` to `scripts/check-config-parity.mjs`.** Same directory,
same shape, already green in the 112-suite baseline.

### Options considered

| Option | How | Cost / risk |
|---|---|---|
| **A. Thin `.test.ts` wrapper that shells out** (**CHOSEN**) | New `tests/scripts/ShellHarnesses.test.ts`, one `it` per harness, `spawnSync("bash", [abs])`, assert exit 0, dump combined stdout+stderr into the failure message | Runs inside a jest worker → overlaps other suites. **Preserves `npm test -- tests/Attack.test.ts`**: a single-file run pays **zero** shell cost. No new dependency. `jest.config.ts` needs **no change** (verified: the path already matches `testRegex`; `testPathIgnorePatterns` excludes only `node_modules` and `tests/integration`). Changes suite/test counts (+1 suite) — verification step 4 allows this if explained. |
| B. jest `projects` entry + custom runner | Second project with `testMatch: ["**/tests/**/*.sh"]` and a shell runner | Jest ships **no** shell runner — needs a new devDependency or a hand-written runner module. Disproportionate for two files. **Rejected.** |
| C. Composed npm script (`posttest`, or `"test": "jest && bash …"`) | package.json only | Serial: always the full +36 s, never overlapped. **`posttest` fires on `npm test -- <one file>` too**, so CLAUDE.md's documented single-file workflow pays +36 s every run. `posttest` also only runs when jest passed, so a red jest run tells you nothing about the harnesses. **Rejected.** |

### Chosen: **Option A**

Deciding reason: it is the only option that keeps single-file test runs free. C taxes the tightest
inner loop a developer has.

### Exact change surface

1. **NEW `tests/scripts/ShellHarnesses.test.ts`** — modelled directly on `ConfigParity.test.ts`:
   - `REPO_ROOT = path.resolve(__dirname, "..", "..")`;
     `spawnSync("bash", [harnessPath], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })`.
   - Invoke via **`bash <path>`, never `./<path>`** — `tests/scripts/profile-deploy-hardening.test.sh`
     is mode `-rw-r--r--`, **not executable**, unlike the other three.
   - **An explicit per-test timeout is mandatory**, e.g. `it("…", () => {…}, 180_000)`. Jest's
     default is 5000 ms; a 34 s harness would otherwise fail with the exact string
     `Exceeded timeout of 5000 ms`, which CLAUDE.md documents as the **supertest flake signature**.
     Shipping a gate whose normal failure mode impersonates a known flake would be actively harmful.
   - On non-zero exit, assert with the harness's combined output embedded so the ❌ lines are visible
     in jest's report.
   - For any Docker harness included: probe once at module load (`spawnSync("docker", ["info"])`) and
     use `(dockerUp ? it : it.skip)`, so an unavailable daemon reports **skipped**, never a green
     pass.
2. **`CLAUDE.md`** Testing section — new subsection naming the gate, which harnesses are in, which are
   out, and why (verification step 7).
3. **`package.json`** — **no change to `"test"`.** Add `"test:scripts:docker"` per the Q2 ruling
   below.
4. **`jest.config.ts`** — **no change.**
5. Task-folder `worklog.md` — record the step-6 decision and its reason (verification step 6).

### Behavior change recorded for the owner

The hardening harness carries grep-level **structural assertions over `nginx.conf`,
`setup-profile.sh`, `setup-telemetry.sh`, `build-deploy-telemetry.sh` and `update.sh`**. After this
change, **editing any of those files can turn `npm test` red.** That is the gate working as designed
— but it is a second currency of cost beyond the seconds, and it lands on people who are not touching
test code.

## 3. Verification (build phase)

- **Step 3 — prove the gate goes red**: delete the `profile-backup.sh` fixture line from `run_deploy`,
  run `npm test`, show the new suite FAILING with the ❌ lines in the jest output; restore; show
  green. **A gate never observed failing is not a verified gate.**
- **Step 4** — baseline is **112 suites / 1182 tests**; expected after: **113 suites**, tests +N.
  Deliberate, explained.
- **Step 5** — n/a (CI rejected by the Phase 1 ruling).
- **Step 7** — no values anywhere; names only.

## 4. Other findings recorded

- **Husky: confirmed dead.** `core.hooksPath` = `.husky/_`; the shim `.husky/_/h` contains
  `[ ! -f "$s" ] && exit 0`, and **no top-level `.husky/*` hook files exist**. Every git hook silently
  exits 0 and the configured `lint-staged` block **never runs**. *Interaction with this plan:* none
  mechanically (candidate 3 was rejected). But it raises the stakes — with no commit-time gate,
  `npm test` and `npm run lint` are the only gates this repo has. If a `pre-commit` hook is later
  restored, nothing here conflicts. **Owned by `0223`, not by this task.**
- **`scripts/test-check-docker-secret-boundary.sh` writes a synthesized secret fixture into the repo
  root** during its run, removed by `cleanup()` on exit. If a run is interrupted (jest timeout,
  Ctrl-C), that file is **left in the repo root**. It is synthetic, not a real credential, but a
  leftover secret-shaped file in the tree is a bad surprise. **Accepted as a known risk under the Q1
  ruling.**

---

## Owner rulings, 2026-09-05 (`AskUserQuestion`, `fkit lead` session)

| # | Question | Ruling |
|---|---|---|
| **Plan gate** | Approve Option A? | ✅ **APPROVED** as written above. |
| **Q1** | Is `scripts/test-check-docker-secret-boundary.sh` in the `npm test` gate? | ✅ **IN, with the skip made visible.** The wrapper probes Docker at load and reports **skipped**, never a fake green pass. +9.4 s only when Docker is already up, +0 s otherwise. The leftover-fixture risk above is **accepted**. |
| **Q2** | Is `tests/profile-backup-dryrun.sh` in the gate? | ✅ **OUT**, exposed as an npm script (`test:scripts:docker`) with the reason recorded. Its real gate is **`0218`** (P3 durability/restore drill), which the brief already links. State plainly that no `npm test` gate is possible here rather than faking one. |
| **Q3** | `npm test` roughly doubles (~25 s → ~38–40 s steady, ~55–60 s cold cache). Confirm? | ✅ **CONFIRMED — unconditional.** **No `SKIP_SHELL_HARNESSES` escape hatch**, explicitly rejected: the valve would become the default and the gate would rot unrun again, which is precisely this task's failure mode. Single-file runs stay free, which is where the tight loop lives. |

**`tests/profile-backup-redeploy.sh` needs no ruling: 2.1 s, zero dependencies, its own header says
it "runs anywhere". IN.**
