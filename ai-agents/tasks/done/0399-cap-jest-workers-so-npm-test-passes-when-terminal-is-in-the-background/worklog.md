# Worklog — 0399: cap jest workers so `npm test` passes when Terminal is in the background

## Decision log

- **2026-10-06 — Plan approved by the owner** (via `AskUserQuestion` in the `fkit lead` session, relayed by
  `fkit-sprint-ship-loop`): *"Approve (Recommended)"*, plus the three open questions: *"Yes, replace A2
  (Recommended)"* (supersedes `0197`'s A2, for this reason only), *"Run once, last, on my go (Recommended)"* (step 5),
  *"Approve the note (Recommended)"* (step 6 CLAUDE.md note, cost line filled from step 4). `plan.md` blob
  `24034e76aee71c5381ceadc5a868dba3abd85862` — verified unchanged before building.
- **Value `4`, in `unitConfig` (not `shared`), as a config value (not a script flag)** — as the approved plan states.
  No new choice made at build time.
- **Fixes applied without asking (Build part 1): none. Obvious-winner calls: none.**
- **Fixes applied without asking (Build part 2): none. Obvious-winner calls: none.** CLAUDE.md cost line filled from
  step 4's measurement, as the approved plan and the owner's *"Approve the note"* ruling specify.
- **Process review round 1 (spawned `fkit-coder`, Process-review worker of `fkit-sprint-ship-loop`) — fixes applied without
  per-fix approval, all owner-authorized wording amendments** (owner rulings 2026-10-06, relayed by the driver, verbatim:
  R1+R4 *"Amend it (Recommended)"*, R2+R3 *"Yes, fix them too (Recommended)"*). Each was verified `CORRECT`, is a
  mechanical comment/doc wording change, and changes no config value (`maxWorkers` still resolves 4):
  - **R1** (trigger stated as fact; step 5 contradicts it): CLAUDE.md "Why" + jest.config.ts comment now say "with some
    apps in front (seen with a game; not with Telegram/Safari)", "appears to move", trigger hedged as likely-not-proven;
    "Terminal in front is still fastest" replaced by "Cost of the cap when nothing is throttled: none measured" with the
    42 s / 44 s numbers and the 42 s Telegram/Safari run. Qualified: verified `CORRECT` + localized + owner ruling.
  - **R2** ("one run each"): now "two runs, ~295 s and red, front app not recorded … not a like-for-like comparison".
    Qualified: verified against the `0397` worklog + owner ruling.
  - **R3** ("`--runInBand` still wins over both"): now "wins over the config, and can't be combined with `--maxWorkers`".
    Qualified: verified in jest-config `getMaxWorkers` and jest-cli `check()` + owner ruling.
  - **R4** (misstated A2 + unmeasured negative): dropped "It does nothing for `0197`'s `SIGSEGV`"; A2 line now "declined
    a cap on cost … This note makes no claim about whether a cap affects `0197`'s `SIGSEGV`." Qualified: verified against
    `0197` plan.md § A2 + owner ruling.
  - Obvious-winner calls: none. Kept unchanged by choice: the bullet heading "Not a flake fix, not a segfault fix" and the
    jest comment's "not a SIGSEGV fix" (intent, not a measured effect; not cited by R4).
  - Checks: `npx prettier --check jest.config.ts` clean; `npx eslint jest.config.ts` exit 0; `npx jest --showConfig` →
    `"maxWorkers": 4`, with `--maxWorkers=2` → `2`; the new CLAUDE.md lines produce no Prettier diff. No full `npm test`
    (comment/doc-only change, per the driver's instruction). `review.md` Status → `closed-out`. No commit.

## Entries

#### 2026-10-06 — Build part 1: plan steps 1 and 3 (spawned `fkit-coder`, Build step of `fkit-sprint-ship-loop`) — DONE

Scope: steps 1 and 3 only. **No full `npm test` run** (steps 4 and 5 are scheduled separately, owner present). CLAUDE.md
**not** edited (step 6 waits for step 4's measured cost). No commit.

**Step 1 — changes:**
- `jest.config.ts`: `maxWorkers: 4` plus the plan's 5-line comment, inside `unitConfig`, right after `testRegex`. Text
  exactly as in the plan. Nothing else in the file changed.
- `brief.md`: filled the *"Evidence still to come — Result"* placeholder with the `0397` numbers and a pointer to the
  `0397` worklog entry "Post-review verify (maxWorkers=4)". `## Status` untouched.
- No new unit test — config value, not `src/core` code (as the plan states).

**Step 3 — cheap checks (all `--showConfig`, no tests executed except the single-file run):**
1. `npx jest --showConfig` → `"maxWorkers": 4`. `npm run test:coverage -- --showConfig` → `"maxWorkers": 4`.
2. `RUN_DB_TESTS=1 npx jest --runInBand --showConfig` → `"maxWorkers": 1`, `"runInBand": true`. Also via the real
   script, `npm run test:integration -- --showConfig` → `1` / `true`, `testMatch` still `tests/integration/**/*.it.test.ts`.
   `package.json` `test:integration` text unchanged: `cross-env RUN_DB_TESTS=1 jest --runInBand`.
3. `npx jest --showConfig --maxWorkers=2` → `"maxWorkers": 2` (command-line override wins).
4. `npm test -- tests/Attack.test.ts` → 1 suite passed, 6 tests passed; jest 0.236 s, wall 0.88 s.
5. `jest.config.ts` was clean in git before the edit; `git diff jest.config.ts` shows only the 6 added lines.
   `git diff -- tests/scripts/ShellHarnesses.test.ts package.json CLAUDE.md` → empty. (The tree carries other
   uncommitted changes from earlier tasks, e.g. `0397`; none touched by this step.)
6. `npx prettier --check jest.config.ts` → clean. `npx eslint jest.config.ts` → exit 0. `npm run lint` → exit 0.

**Not verified here, by design:** cost with Terminal in front (step 4) and the background-condition run (step 5).

#### 2026-10-06 — Build part 2: plan steps 4 and 6 (spawned `fkit-coder`, Build step of `fkit-sprint-ship-loop`) — DONE

Owner ruling relayed by the driver, verbatim: *"Ready, Terminal in front"*. No step 5 run (owner-gated separately). No
commit. `plan.md` hash `24034e76aee71c5381ceadc5a868dba3abd85862` checked before and after (matches).

**Step 4 — full runs with Terminal in front, back to back:**
- Before: 19:24:23, `uptime` load 4.68 / 4.82 / 4.60, 14 cores. `lsappinfo front` → Terminal. No jest process running.
  Newest crash reports: `node-2026-10-01-175300.ips`, `panic-full-2026-10-06-181725.0002.panic`.
- Run 1 — baseline, `npm test -- --maxWorkers=13` (timed with `/usr/bin/time -p`; zsh's `time` keyword rejects `-p`):
  **exit 0**, wall clock **44.29 s** (jest 43.463 s). Suites 199 passed / 199; tests 3863 passed, 1 skipped, 3864 total.
  Load samples: 4.80, 4.52. After: `lsappinfo front` → Terminal.
- Run 2 — capped, `npm test` (resolves 4 workers): started right after run 1; front → Terminal, no leftover jest, load
  4.07. **exit 0**, wall clock **42.28 s** (jest 41.549 s). Suites 199 passed / 199; tests 3863 passed, 1 skipped, 3864
  total. Load samples: 4.38, 4.37. After: `lsappinfo front` → Terminal.
- Both runs valid (Terminal in front before and after each). The 1 skip in each: `scripts/test-check-docker-secret-boundary.sh`
  — Docker down, **skipped, not passed** (wrapper warning printed). No failures, so nothing to classify and **no re-run**.
  No supertest-family shape (`Exceeded timeout`, `did not exit`, `socket hang up`), no `SIGSEGV`, no new `node-*.ips` or
  `panic-*` report after the runs. Load never near the abort limit (30); no `ps` stall.
- **Measured cost: 42 s capped vs 44 s uncapped — no measurable cost.** One run each; a 2 s difference is inside normal
  run-to-run noise, so read it as "no cost", not "the cap is faster".
- ⚠️ Odd but recorded: the 1-min load average barely moved during either run (~4.4–4.8). Sampled every 20 s; the runs are
  short (~43 s), and the 1-min average lags. Not investigated.

**Step 6 — CLAUDE.md note:**
- Inserted the approved subsection `### \`npm test\` runs at most 4 jest workers (task \`0399\`)` in § Testing, directly
  before `### ⚠️ Known flake — \`supertest\` suites`. Outside the `fkit:begin-rules` / `fkit:end-rules` markers.
- Only change from the approved draft: the cost placeholder, now *"42 s vs 44 s (4 workers vs 13, one back-to-back run
  each, 2026-10-06, both green) — no measurable cost."*
- `npx prettier --check CLAUDE.md` warns, but every warning predates this change (`HEAD`'s CLAUDE.md fails the same
  check); the new section's lines produce no Prettier diff. File left unformatted, to avoid reformatting unrelated text.

**Fixes applied without asking (Build part 2): none. Obvious-winner calls: none.** (Filling the cost line is the
approved plan's own step, not a judgment call.)

#### 2026-10-06 — Step 5: one full run with another app in front (spawned `fkit-coder`, `fkit-sprint-ship-loop`) — GREEN, but the slowdown did NOT occur

Owner ruling relayed by the driver, verbatim: *"Go, work saved"*. One run only. No commit. `plan.md` hash
`24034e76aee71c5381ceadc5a868dba3abd85862` (matches).

- Before: 19:32:39. `lsappinfo front` → **Telegram** (not Terminal). No jest process running. `uptime` load 4.31 / 4.64 /
  4.63. Newest crash reports: `node-2026-10-01-175300.ips`, `panic-full-2026-10-06-181725.0002.panic`.
- `npm test -- --verbose` (config resolves 4 workers), timed with `/usr/bin/time -p`, output to the session scratchpad
  (`0399-bg.log`): **exit 0**, wall clock **42.20 s** (jest 41.509 s). Suites **199 passed / 199**; tests **3863 passed,
  1 skipped, 3864 total**.
- Shell harnesses vs the 150 s deadline (`--verbose`): `profile-deploy-hardening.test.sh` **22.3 s** ·
  `profile-backup-redeploy.sh` **1.5 s** · `profile-checks.sh` **17.3 s** · `test-check-docker-secret-boundary.sh`
  **skipped** (Docker down — skipped, not passed). `ShellHarnesses.test.ts` suite 41.4 s. No harness near its deadline.
- No `Exceeded timeout` / `did not exit` / `socket hang up` / `SIGSEGV` in the output. After the run: no new `panic-*` or
  `node-*.ips` report. No jest left running.
- Load samples (abort rule: 1-min > 30 or `ps` > 5 s): 19:33:17 load1 5.13, `ps` 0 s, front Safari. After the run
  (19:33:47): 12.69 / 6.52 / 5.31. Never near the abort limit. Only one in-run sample — the run finished in 42 s, under
  the 30 s sampling cycle's second tick.
- Front app after: Telegram. The front app was Safari at the mid-run sample, so another app was in front throughout,
  but it changed during the run.
- 🚨 **This run did NOT reproduce the slowdown it was meant to test.** Its wall clock (42.2 s) equals the
  Terminal-in-front runs (42.3 s / 44.3 s), and the harness times (22.3 s, 17.3 s) are the unthrottled speeds (the
  diagnosis measured 17.6 s / 17.8 s unthrottled vs 63 s / 80 s throttled). So the Terminal tree was evidently **not**
  moved onto the efficiency cores this time — with Telegram/Safari in front, unlike the game in the `0397` runs.
  Why: not known; "any other app in front" is evidently not sufficient (the brief already rated that link "likely, not
  proven"). Not investigated.
- So this run proves only: green with another app in front **when no throttling happened**. The only evidence for the
  throttled case remains the `0397` run (game in front, `--maxWorkers=4`, 99 s, green) — one sample.
- Fixes applied without asking: none. Obvious-winner calls: none. Returned NEEDS-DECISION on whether that is enough.
