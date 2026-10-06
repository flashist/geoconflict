# Plan — 0399: limit jest to 4 workers so `npm test` passes when Terminal is in the background

**Planning only.** This was a spawned consult with no plan-mode tool, so I followed the written rule instead. I wrote no source, config, `plan.md` or worklog, and ran no full `npm test`.

What I did run (all read-only, no tests executed):
- `npx jest --showConfig`. Today it resolves `"maxWorkers": 13`. With `--maxWorkers=2` it resolves `2`.
- Read jest's own timing cache from the 4-worker run that ended at 18:55.
- Checked the core counts: 14 total, 10 performance cores, 4 efficiency cores. `os.availableParallelism()` returns 14.

## Summary
- **Change:** one setting in `jest.config.ts`, `maxWorkers: 4`, inside `unitConfig`. `npm test` and `npm run test:coverage` pick it up. `npm run test:integration` is untouched and still runs one suite at a time (`--runInBand`).
- **Why 4:** it is the only value that has been measured. Today, with the game in front: 4 workers took 99 s and passed 199/199 suites. The default (13 workers) took 297 s and then 291 s, red both times. That is one sample, not a proven rule.
- **Cost with Terminal in front: estimated about zero, NOT measured.** The reasoning is under step 2.
- **A command-line override still works.** Jest's own code (`jest-config` `getMaxWorkers`) uses `--runInBand` first, then a `--maxWorkers` flag, then the config file. So `npm test -- --maxWorkers=N` beats the config for that one run.
- **This is not a fix for the `supertest` flake (`0200`) and not a fix for the segfault (`0197`).** The plan's checks are written so they do not claim either.
- **The owner must confirm before the edit:** that A2 is superseded, how the background run is handled given the panic, and the CLAUDE.md wording. These are in the open questions below.

## Step 1 — the config change (`jest.config.ts`)

Add `maxWorkers: 4` to `unitConfig`, not to `shared`, with a short comment. Proposed text:

```ts
const unitConfig = {
  ...shared,
  testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$",
  // At most 4 workers (task 0399). With another app in front, macOS moves the
  // whole Terminal process tree onto the efficiency cores (4 on the owner's Mac),
  // and jest's default (cores - 1) starves the shell harnesses past their 150 s
  // deadline. `npm test -- --maxWorkers=N` still overrides this for one run.
  // Not a supertest-flake fix (0200) and not a SIGSEGV fix (0197).
  maxWorkers: 4,
  ...
```

Nothing else changes:
- No timeout values.
- No deadlines in `tests/scripts/ShellHarnesses.test.ts`.
- No `package.json` scripts.
- The shape of `npm test` stays the same.

**Why it goes in `jest.config.ts` and not the `npm test` script:**
- The config covers every way jest gets started: `npm test`, `npm run test:coverage`, a bare `npx jest` (agents run this), and editor test runners. A flag in the script only covers `npm test`.
- With the flag in the script, `npm test -- --maxWorkers=N` would hand jest the flag twice (`--maxWorkers=4 --maxWorkers=N`). How the argument parser handles a repeated flag is not something I want to depend on. A config value with a flag on top has one clear winner.

**Why `unitConfig` and not `shared`:**
- The integration script already passes `--runInBand`, and that wins over everything.
- Putting the cap in `shared` would not protect a bare `RUN_DB_TESTS=1 jest` either. Four workers still run in parallel, and parallel runs broke that suite in `0197` (27 of 70 tests failed). Putting it there would suggest a protection that does not exist.

**Side effects to state openly:**
- `npm run test:coverage` gets the same cap, because it uses the same config. Coverage adds CPU work to every suite, so the coverage run could be somewhat slower. Not measured.
- `npm test -- --watch` gets 4 workers instead of jest's watch-mode default of 7 on this Mac. Harmless.

**Choosing the value:**
- **`4` (recommended).** Measured, and green. It equals the efficiency-core count on this Mac. Other machines:
  - An 8-core laptop gets 4 workers instead of 7.
  - A 4-core machine gets 4 instead of 3. Jest does not limit a plain number to the core count, so that machine runs slightly more workers than it has spare cores. Mild.
  - There is no CI.
- **`"50%"`.** Jest computes `floor(0.5 × 14)` = 7 here. Never measured in the background condition. That is still 7 workers squeezed onto 4 slow cores. A percentage also scales with the total core count, but the slowdown follows the efficiency-core count, which jest does not know about. Rejected.
- **A value computed from the efficiency-core count** (`sysctl hw.perflevel1.physicalcpu`). Mac-only, more code than the one-line change the owner asked for, and cannot be tested on any other machine. Rejected.

**Tests:** no new unit test. It is a config value, not code in `src/core`. Proof is `--showConfig` (step 3) plus the full runs. I am saying explicitly that no new test is added.

**Record keeping:**
- Fill the brief's *"Evidence still to come — Result"* placeholder with the 0397 numbers and a pointer to `ai-agents/tasks/done/0397-show-players-whether-their-session-is-verified/worklog.md`, entry "Post-review verify (maxWorkers=4)". The brief itself asks for the result to be recorded there.
- Keep the worklog decision log as usual.

## Step 2 — what the cap costs with Terminal in front

**Estimate: about zero, maybe a few seconds. Not measured. Step 4 measures it.**

1. **The shell-harness suite is the bottleneck.** `ShellHarnesses.test.ts` runs its 3 harnesses one after another, inside a single worker:
   - In the background 4-worker run, that suite took **91.3 s** of the 98 s total.
   - In front, the diagnosis measured hardening **17.6 s** and profile-checks **17.8 s**, plus redeploy at about 1–2 s.
   - So in front, the suite takes about 35–45 s. No number of workers can make it faster.
2. **Everything else is small.** The other 198 suites added up to **38.9 s** of suite time in that same run (read from jest's timing cache, file dated 18:55). That figure was measured while slowed down, so the real number in front is lower. With 4 workers, 3 are free for those suites, so they finish in about 13 s or less. That is well inside the harness suite's 35–45 s.
3. **Jest starts the slowest suite first.** It orders suites by their last recorded time, so the harness suite starts right away and is not delayed by the cap.
   - Exception: with an empty timing cache (a first run, or after the cache is cleared), jest falls back to ordering by file size. The harness suite could then start late, costing roughly 13 s more in the worst case. Rare.
4. **The baseline to compare against:** recent uncapped full runs took **~42 s** (`0391`) and **51 s** (`0372`). It is not recorded whether Terminal was in front for those.
5. **Why A2's cost argument was stronger in August:** the whole suite took about 2–4 s then (`0028`: 2.2 s; `0197`: ~3.7 s), and there were no shell harnesses in `npm test`. A cap was then a slowdown on every run. The harnesses now dominate, so that cost has mostly disappeared. This is an inference, not a measurement.

## Step 3 — cheap checks (no full suite run)

1. **The cap resolves:**
   - `npx jest --showConfig | grep maxWorkers` → `4`.
   - `npm run test:coverage -- --showConfig | grep maxWorkers` → `4`.
2. **Integration is still serial:** `RUN_DB_TESTS=1 npx jest --runInBand --showConfig | grep -E 'maxWorkers|runInBand'` → `1` / `true`. Also check the `test:integration` script text is unchanged.
3. **The override works:** `npx jest --showConfig --maxWorkers=2 | grep maxWorkers` → `2`. The same check on today's code already returns `2`.
4. **Single-file runs are unaffected:** `npm test -- tests/Attack.test.ts` passes. Jest runs a single file in one process anyway.
5. **Nothing else changed:** `git diff --stat` shows only `jest.config.ts`, plus CLAUDE.md if the owner approves the note. `git diff tests/scripts/ShellHarnesses.test.ts package.json` is empty.
6. **Lint:** `npx eslint jest.config.ts` and `npm run lint` are clean. Run Prettier on the changed file.

## Step 4 — full runs with Terminal in front (lower risk: this is the normal way the suite has always run)

The owner keeps Terminal in front for about 2 minutes. The worker confirms it with `lsappinfo front` before and after each run.

1. **Baseline:** `time -p npm test -- --maxWorkers=13` (the old default). Record the wall clock.
2. **Capped:** `time -p npm test`. It should pass. Record the wall clock.
3. Run 1 and 2 back to back, so the cost is a like-for-like comparison and does not rely on the `0391`/`0372` numbers.
4. Judge any `supertest` timeout by the flake rule: rule out `0197` first (`SIGSEGV`, or a new `node-*.ips` crash report), then re-run and **say that I re-ran**.

## Step 5 — the full run with another app in front (recreates the panic conditions; runs LAST, only after the owner says go)

**Conditions before starting:**
- The owner has been told the risk and has saved their work.
- Only one run.
- No other jest process is already running.

**Command:** `time -p npm test -- --verbose 2>&1 | tee <scratchpad>/0399-bg.log`. `--verbose` only changes the output: it prints a time per test, which gives each shell harness's time to compare against its 150 s deadline. It does not change how many workers run.

**Watching during the run:**
- Same method as 0397: `uptime` every 60 s.
- Abort (kill jest) if the 1-minute load goes above 30 or `ps` takes longer than 5 s.
- Afterwards, check for a new `panic-*` or `node-*.ips` report in `/Library/Logs/DiagnosticReports` or `~/Library/Logs/DiagnosticReports`.

**Record:** date, the app in front, wall clock, each harness's time against 150 s, suite counts, the 1 Docker-gated skip, and the load samples.

**How to judge the result:**
- **A shell harness hitting its 150 s deadline means this task FAILED.** Stop and return `NEEDS-DECISION`. No higher timeout, no retry.
- **A single `supertest` `Exceeded timeout of 5000 ms`** goes to CLAUDE.md's flake rule. It is not, on its own, a failure of this task. A re-run is also a background-condition run, so it needs the owner's go again.
- **If a panic recurs:** record it as observed, with its cause still unproven, and route it to a separate task. Do not record it as caused by this task or fixed by it.

## Step 6 — the CLAUDE.md note (only if the owner approves; proposed wording)

Insert a new subsection just before `### ⚠️ Known flake — supertest suites` (currently line 237):

```
### `npm test` runs at most 4 jest workers (task `0399`)

`jest.config.ts` sets `maxWorkers: 4` for the unit run — `npm test`, and `npm run test:coverage`,
which uses the same config. Jest's own default would be cores − 1 (13 on a 14-core Mac).
`npm run test:integration` is unaffected (still `--runInBand`).

**Why:** with another app in front, macOS moves the whole Terminal process tree into a throttled
background class that runs only on the efficiency cores (4 on the owner's Mac). Thirteen workers plus
the shell harnesses then fight over those cores and the harnesses hit their 150 s deadline. Measured
2026-10-06, one run each, game in front: default workers ~295 s and red; 4 workers 99 s and green.
That throttling causes the timeouts is likely, not proven.

- **Terminal in front is still fastest.** Cost of the cap there: <filled from step 4 — "X s vs Y s",
  or "estimated about zero, not measured">.
- **Override for one run:** `npm test -- --maxWorkers=N`. `--runInBand` still wins over both.
- **Not a flake fix, not a segfault fix.** The `supertest` flake below occurs at the same rate at 4 and
  13 workers (`0200`) — judge a single `Exceeded timeout of 5000 ms` by the flake rule. It does nothing
  for `0197`'s `SIGSEGV`.
- **Supersedes `0197`'s amendment A2 ("no `--maxWorkers` cap") for this reason only** (owner ruling
  2026-10-06). A2 declined a cap as a segfault mitigation; that judgement — a cap does not mitigate the
  segfault — still holds.
```

Notes on the wording:
- The existing line *"This makes `npm test` noticeably slower"* is about the harnesses and is still true. I left it alone.
- `AGENTS.md` has no testing section, so it needs no mirror edit.
- Updating the wiki (`0197` "no cap" history) is `fkit-wiki`'s job after close, through an ingest. Not part of this task.

## Order of work
1. Config edit.
2. Step 3 cheap checks.
3. Step 4 runs with Terminal in front.
4. Fill the measured cost into the CLAUDE.md note, then add the note (step 6).
5. Step 5 background run, last and owner-gated.
6. Review.

Safe evidence is banked first, before the risky run.

## Risks and edge cases
- **Single sample.** The 4-worker evidence is one run. 4 workers could still fail under heavier background load. If so, the fix is a smaller number, decided by the owner. Not a timeout raise.
- **Empty timing cache:** the harness suite may start late (see step 2).
- **Machines with 4 cores or fewer** run slightly more workers than they have spare cores. Not relevant today, since there is no CI.
- **No proof of the panic link.** The step 5 run cannot prove or disprove what caused the panic.
- **A harness file's own speed is unchanged.** `0371`'s accepted residual (hardening harness killed at 150 s under heavy machine-wide load) still stands. The cap reduces jest's own share of that load and nothing more.
