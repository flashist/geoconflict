# Nothing runs the shell test harnesses — decide how to gate them so they cannot rot unnoticed

## ID
0201

## Sprint
Backlog

## Priority
Unscheduled

⚠️ **The rank below is the producer's, NOT an owner ruling — the owner has still not ruled on this
task's priority.** The owner authorized *filing this brief* on 2026-09-01 (via `AskUserQuestion` in the
`fkit lead` session, relayed through `fkit-sprint-ship-loop`).

✅ **The Backlog board placement STANDS — owner-confirmed 2026-09-01** (same ruling, covering both
`0201` and `0202`). That **confirms** the producer's board choice rather than changing it; it says
nothing about this task's priority, which remains the producer's `Medium` below.

**On merit the producer ranks this Medium and files it on the Backlog board rather than Sprint 4**, for
three reasons — stated so the owner can overrule in one edit:

1. **Nothing is broken for players, and nothing in production is affected.** This is developer tooling.
   It does not compete with Sprint 4's live-defect and launch-blocking work.
2. **The task opens with an owner decision, not with code.** The candidate answers differ by an order of
   magnitude in cost (see *What to build*), and one of them — introducing CI to a repository that has
   none — is a materially larger change than the others. Sprinting an implementation before that ruling
   exists would presume the answer.
3. **A Sprint 4 row could only be appended at the bottom of that board**, which would read as *lowest
   rank in the sprint* — a false signal in the other direction. fkit's **ADR-035** (*a mid-board
   insertion is not the owner-ruled re-rank exception*) bars inserting a new row above that board's
   closed rows, and a spawned producer has no owner channel to be granted a re-rank anyway. The honest
   placement is the unranked Backlog board, with the merit statement recorded here.

📎 **ADR-035 is cited by name, never linked, on purpose.** It is one of **fkit's own upstream ADRs**
(the `adr-0XX` series, which lives in the fkit install share). This project's
`ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it would
not resolve.

**If the owner judges that a silently-rotting deploy-safety harness is a release risk worth paying for
now, this is a Sprint 4 candidate and the producer would not argue.** The deploy path this harness
guards is the one that ships secrets to a live box.

## Status
🔄 In progress

🔄 **Started 2026-09-02**, driven from the lead session.

✅ **THE PHASE 1 PLAN-GATE DECISION IS ALREADY RULED — owner ruling 2026-09-02, given live in session.
Do NOT re-open it at the plan gate.**

> **Fold the shell harnesses into `npm test`** — candidate **2** in *What to build*.

The other three candidates are **rejected**: candidate 1 (its own npm script), candidate 3 (a pre-push
git hook), and candidate 4 (**CI — rejected explicitly: the owner is not introducing a CI platform for
this**). Phase 1 is closed; **go straight to Phase 2 and implement exactly and only the ruled option.**

⚠️ **The ruling does not waive candidate 2's stated cost.** Two things in this brief still bind:

- **Measure the harness runtime first** (Verification step 1) — actual seconds on this host, as a
  number. Folding into `npm test` makes every developer run and every review run pay it.
- **Step 6 is still open** — whether `scripts/test-check-docker-secret-boundary.sh` is in or out. Its
  header requires Docker, and Docker Desktop cannot be started headlessly on this owner's machine, so
  a `npm test` gate that hard-requires Docker fails for a reason unrelated to the code under test. The
  two harnesses may need different answers. **This was not ruled — surface it.**

📌 **Sequencing RAISED AND DECIDED 2026-09-02, same session: `0201` goes FIRST, `0202` second.** This
brief's Notes record a *preference* for `0202` first; the owner ruled against it, and `0202` stays
`Low`. **Recorded so it is not re-raised** — do not re-litigate the order.

## Owner
fkit-coder

## Context

### The problem, in one sentence

**`tests/scripts/profile-deploy-hardening.test.sh` sat broken for roughly two months and nobody noticed,
because nothing in this repository ever runs it.**

### The evidence — verified by the producer on 2026-09-01, not taken on report

Every claim below was re-checked against the repository before it was written down.

| Claim | How it was verified | Result |
|---|---|---|
| The harness has **no npm script** | `package.json` `scripts` block read in full | ✅ Confirmed — no entry invokes it |
| **`npm test` cannot reach it** | `jest.config.ts:47` — `testRegex: "/tests/.*\\.(test\|spec)?\\.(ts\|tsx)$"` | ✅ Confirmed — TypeScript/TSX only. A `.sh` file is out of jest's reach **by construction**, not by omission |
| **This repository has no CI** | `ls .github` | ✅ Confirmed — `No such file or directory`. No workflows exist at all |
| **No git hook runs it** | `git config core.hooksPath` → `.husky/_`; `ls .husky` | ✅ Confirmed — `.husky/` holds only husky's internal `_/` shim directory; there are **no top-level hook files** |
| Its only documented invocation is by hand | `tests/scripts/profile-deploy-hardening.test.sh:9` | ✅ Confirmed — the file's own header reads `# Run:  bash tests/scripts/profile-deploy-hardening.test.sh` |

### The rot this permitted — the concrete evidence for the task

**Verified by running the harness on a clean detached worktree at `f2b9422`, with no working-tree edits
present. All of T1–T9 contained failing assertions.**

The cause: the harness's `run_deploy` helper stages a fixture directory for the real
`build-deploy-profile.sh`, but never staged `./profile-backup.sh` — a precondition that script gained at
`build-deploy-profile.sh:76`. Every `run_deploy` therefore died at that precondition, before reaching any
of the preflight logic the harness exists to test.

**The timeline, and a correction to the commit attribution this brief was filed with:**

| Event | Commit | Date |
|---|---|---|
| Harness last touched | `5abf198` | 2026-06-23 |
| `profile-backup.sh` precondition added to `build-deploy-profile.sh` | **`b3909a7`** *("Claude: helpers for S3 storage")* | 2026-07-01 |
| Breakage observed and repaired | inside `0195` | 2026-09-01 |

⚠️ **The commit `282655c` cited in this task's filing instruction is NOT the one that introduced the
precondition.** `git log -S` over the precondition string returns exactly one commit — `b3909a7`
(2026-07-01) — and `git merge-base --is-ancestor 282655c b3909a7` shows `282655c` (2026-08-26, a docs
"Sprint push") is *later*, not earlier. **The correct attribution is `b3909a7`.** The shape of the
finding is unchanged: the harness was last edited **eight days before** the precondition landed, and
stayed broken for about two months.

### This is a class, not a one-off — there is a second ungated harness

`find` over the repository returns **two** shell test harnesses, and **neither is wired to anything**:

| Harness | Wired to | Notes |
|---|---|---|
| `tests/scripts/profile-deploy-hardening.test.sh` | **nothing** | The one that rotted |
| `scripts/test-check-docker-secret-boundary.sh` | **nothing** | Its header (`:8`) reads `# Requires Docker.` — see the warning below |

By contrast, the *subject* of that second harness — `scripts/check-docker-secret-boundary.sh` — **is**
wired: `package.json:32` exposes it as `check:docker-secret-boundary`, and `build.sh:110,157` and
`build-deploy-profile.sh:163` call it during real builds. **So the repository already has the precedent
for wiring a shell script to npm. What it lacks is any wiring for the shell scripts that TEST things.**

### What this harness actually covers, so the value is visible

`tests/scripts/profile-deploy-hardening.test.sh` runs the **real** `build-deploy-profile.sh` end-to-end
under a stub `PATH`. Its assertions cover the deploy path that ships secrets to the live profile box:
SSH-password argv safety (`sshpass -f`, never `-p`), the 0600 password-file lifecycle and its cleanup on
failure, the deploy mutex and atomic record-append, and the wrong-host preflight that aborts before any
SCP. **This is not a cosmetic test suite. It is the guard on the one script that carries credentials to a
production VPS.**

## What to build

### 🚦 Phase 1 — the owner picks the gate. Do not open this task by writing one.

**The producer is deliberately NOT prescribing the answer.** Bring the options to the owner at this
task's plan gate with real costs attached, get a ruling, and implement exactly what was ruled.

Candidate answers, listed as candidates and **not** as a recommendation:

1. **An npm script** — e.g. a `test:scripts` entry alongside the existing `check:docker-secret-boundary`
   precedent. Cheapest by far. **But it only makes the harness easy to run; it does not make anything
   run it**, so on its own it would not have caught this rot.
2. **Fold it into `npm test`** — e.g. a `posttest` step, or a small jest wrapper test that shells out.
   Makes every existing `npm test` a gate. Cost: every developer run and every review run gets slower by
   the harness's runtime, which **must be measured first** (see Verification).
3. **A git hook (pre-push)** — catches it before it reaches `dev`. ⚠️ **Note the actual state of husky
   here: there are no top-level hook files in `.husky/`, only husky's internal `_/` shims. A pre-push
   hook would be a NEW file, not an edit to an existing one.** Whether the configured `lint-staged`
   block is currently invoked by any hook at all is **outside this task's scope**, but it is the same
   observation and worth a separate look.
4. **A CI workflow** (`.github/workflows/`). The only option that catches it independently of any
   developer's machine.
   🚨 **Say this out loud to the owner: adding CI to a repository that has NONE is a materially bigger
   change than any of the three above.** It is a new platform surface with its own secrets model, its own
   runner cost, its own maintenance, and its own failure modes — and it would immediately raise the
   question of what *else* should run there (`npm test`, lint, the integration suite). That is a
   strategic decision about how this project is built, not a tooling tweak. **Do not slide into it as an
   implementation detail of a test-harness fix.**

### Phase 2 — implement exactly the ruled option

5. Implement the option the owner ruled, and **only** that option. If the ruling is *"npm script only,
   accept that nothing runs it automatically"*, that is a legitimate outcome — record it plainly rather
   than quietly adding a gate that was not approved.

6. **Whatever is chosen, decide explicitly whether `scripts/test-check-docker-secret-boundary.sh` is in
   or out**, and record the reason.
   ⚠️ **It is not a free ride-along: its own header says it requires Docker.** Docker Desktop on this
   owner's machine cannot be started headlessly, so a gate that hard-requires Docker will fail for a
   reason unrelated to the code under test. The two harnesses may well need different answers.

7. **Document the chosen gate in `CLAUDE.md`'s Testing section.** An undocumented gate is a gate the next
   contributor works around.

## Verification steps

1. **Measure the harness's runtime before choosing a gate that runs it often** — actual measured seconds
   on this host, reported as a number, not "it's fast". The producer observed a clean run complete
   quickly on 2026-09-01 but **did not time it**; treat that as unmeasured.
2. **Prove the harness needs no external dependencies.** The 2026-09-01 clean-worktree run completed with
   `docker`, `git`, `ssh`, `scp`, `sshpass` and `getent` all stubbed on `PATH` — **no Docker daemon, no
   network, no VPS**. Re-confirm this before wiring it anywhere, because it is what makes gating it
   viable at all.
3. **Prove the gate actually goes red.** Deliberately reintroduce the exact failure this task exists to
   catch — remove the `profile-backup.sh` fixture line from `run_deploy` — and show the chosen gate
   **fails**. ⚠️ **A gate that was never observed failing is not a verified gate.** Restore the line
   afterwards and show the gate goes green again.
4. **`npm test` still passes with unchanged suite/test counts**, unless a change was deliberately made
   and explained.
5. If the ruling was CI: the workflow is shown running green on a real push, **and** the deliberate-break
   run from step 3 is shown red in CI, not just locally.
6. The chosen gate is documented in `CLAUDE.md`, and the decision (including anything ruled *out*, and
   why) is recorded in the worklog.
7. 🔒 **No credential values anywhere** — not in a workflow file, a script, a hook, the worklog, or a log
   line. This harness deliberately handles a synthetic password string; keep every real value out, and
   name variables and filenames only. **If the ruling is CI, the secrets question must be answered before
   the first workflow file is written, not after.**

## Notes

- **Depends on:** `0195` landing on `dev` first — it was in review on 2026-09-01 and modifies this exact
  harness file (it adds test `T10` and the `run_deploy` fixture repair), so starting this task before
  `0195` lands would conflict in `tests/scripts/profile-deploy-hardening.test.sh`; nothing else gates it.
- **Blocks:** nothing formally. Like the test-reliability tasks, it protects a verification signal other
  tasks rely on rather than delivering player-facing value.
- **Related:** `0195` (its build found the breakage while doing unrelated work — the one-line fixture
  repair ships there, owner-ruled 2026-09-01, and is **not** part of this task), `0202` (the sibling
  brief: the harness's assertions also printed ✅ for things they had not tested — a gate that runs
  false-green assertions is worth less, so there is a **sequencing preference** for `0202` first, though
  neither technically blocks the other), and `0196` (which removed a different fabricated-confidence
  shape from the board; that folder is finished output — **reference it, do not edit it**).
- ⚠️ **The harness's own header comment is inaccurate and was left alone deliberately.** Line 10 claims
  *"Exits non-zero on the first failed assertion"*, but `fail()` only sets `FAILED=1` and the script runs
  every test to the end before exiting 1. Fixing that comment is fine to do in passing; it is **not** the
  point of this task and must not be mistaken for it.
- **Do not "fix" this by deleting the harness.** It is the only automated coverage of a credential-
  carrying deploy path. If anyone proposes removing it as the cheap answer, that is a proposal to put to
  the owner explicitly, not an implementation choice.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **No secrets in any artifact.** Variable names, container names and ports only — never a value.
