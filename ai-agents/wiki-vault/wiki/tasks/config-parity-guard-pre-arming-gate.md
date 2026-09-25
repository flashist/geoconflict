# Config Parity Guard — the Pre-Arming Gate (Items That Must Land Before `--enforce`)

**Source**: `ai-agents/tasks/done/0203-config-parity-guard-pre-arming-gate/brief.md` (plus `plan.md`, `plan-run2.md`, `decision-prep-2026-09-23.md`, `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 (pulled in from the Backlog board 2026-09-12, owner-ruled; unranked) · task `0203`

> 🚨 **READ THIS FIRST — THIS TASK HARDENS THE GUARD; IT DOES NOT ARM IT.**
> Closed **2026-09-24** by a spawned `fkit-producer` at the close step of `/fkit-sprint-ship-loop`,
> **no owner present** (ADR-033 §5) ⇒ **`(agent-closed — not owner-verified)`**.
> ⛔ **`--enforce` is wired nowhere** (re-verified at close: no `deploy.sh`, `build-deploy-profile.sh`
> or `package.json` passes it). Arming — including consuming the per-pipeline tags this task built —
> is **`0298`**'s (Sprint 5). ⛔ **Nothing here is verified in production.**

## Goal

`0064`'s two-round stateful review converged on *ship report-only*, and its reportable outcome was
**scheduling, not correctness**: arming `--enforce` needed **ten** items, not two — findings harmless
while the guard only reports, real once it can fail a deploy. Owner ruling 2026-09-02: file them as
their own task, so `0064` stayed a shippable unit. An eleventh item (`0203`'s own review R4 —
whole-object `process.env` uses were silent) was added 2026-09-14, and a twelfth (per-pipeline tagging)
on 2026-09-23. **Hard sequencing, unchanged throughout: every item lands before `--enforce` is wired.**

## Key Changes

Surface: `scripts/check-config-parity.mjs`, its allowlist, `tests/scripts/ConfigParity.test.ts`. **No
application code.**

**Run 1 (2026-09-14, no-decision fixes):**
- **R1 (HIGH, owner-ruled method D2)** — `src/core/configuration/**` is bundled into the **browser**, so its reads are now checked against **both** the deploy heredoc **and** webpack `DefinePlugin`. Before, a broken client supply channel printed green. The printed client caveat was removed with the gap.
- **R12** — the heredoc drop-detector now works **by inversion** (a line the key parser did not consume that still looks like an assignment), so `export KEY=` and lowercase keys are loud instead of silently dropped — previously `0195`'s exact false negative, inside the guard built to catch `0195`.
- **R15** — comment/string awareness in the read scanner (a prose comment could have failed a deploy). **R16** — the enforce footer now agrees with the exit code. **R18** — `DefinePlugin` is parsed from its block, not the whole file's raw text.

**Run 2 (2026-09-24, the ruled decisions):**
- **R4a** — under `--enforce`, an unmapped new `src/` folder **stops the deploy**, and the message names the one-line `DIR_PIPELINE` fix (owner: *"Stop, show the fix"*).
- **R4b** — a missing guard script **stops the deploy**, like a missing input (owner: ***"Yes, stop the deploy"***). ⚠️ The call-site change is `0298`'s, as part of the wiring; this task pinned the behaviour.
- **R13 (option 2)** — an unreadable heredoc line is `PARSE-FAILURE`, **but every line that did parse is still checked** (was: the whole heredoc discarded → ~21 false `REQUIRED`).
- **Item 11 + R19** — one rule: *every use of `process.env` is either a listable read or is announced.* Whole-object shapes (`Object.keys(process.env)`, spreads, passing it, returning it) are now `DYNAMIC-READ`; a written-out destructuring counts as normal reads (removing a false deploy stop); rest/computed keys stay `DYNAMIC-READ`, with one `INFO` caveat line when any is present.
- **R21 (option 2)** — the scanner stays **`src/` only**, documented as a known limit and pinned by a test; `webpack.config.js`'s build-machine reads are named as **unchecked**. Re-raise when a file outside `src/` first reads a deploy-forwarded setting.
- **Item 12 — per-pipeline tagging.** `DYNAMIC-READ` and scanner parse failures carry their file's pipeline(s); **untraceable failures (unmapped folder, broken allowlist JSON, missing guard script) are tagged `global` and are meant to stop every deploy**; everything else stops only its own deploy (owner's R14 second half, *"Only its own deploy"*, reconciled with R4a by the architect, owner-approved).
- Review round 3: an unreadable directory or `.ts` file now becomes a `PARSE-FAILURE` (owner Q2, *"Yes, flag it"*) instead of a silent skip.

Verification at close: `npm test` 139 suites / 1949 tests, first run; `ConfigParity.test.ts` 108 tests;
the whole mutation table (29 mutations) red and restored; **real-tree report byte-identical** to the
pre-change baseline (0 `DYNAMIC-READ`s); `ConfigValues.test.ts` unedited.

## Outcome

**Accepted residuals (owner-ruled or recorded):**
- **The call-argument pattern `f({ A } = process.env)` stays silent** — owner Q1, *"Accept as known limit"*; documented and pinned by a test.
- `const { env } = process` and `process["env"]` are a documented limit with a pinning test.
- Pre-existing: a member-access `…process.env.NAME` is still counted as a read (errs toward counting).
- The value checker (`0064` Phase 2) does **not** mirror R13's "check the lines that parsed" — unruled, not built.
- `0064`-ledger residuals R7, R8, R10, R11, R17, R20 stay on that ledger with their own re-raise triggers.

**Open questions, closed without a ruling (2026-09-23):**
- **Does Compose `env_file` accept an `export` prefix?** Closed as **moot, not answered** — local
  evidence only (Compose accepts it, `docker run --env-file` rejects it), and ⚠️ **the servers' Docker
  versions were never checked.** It no longer sets R12's severity because R12 is fixed and loud.
- **Q7 (print the client caveat?)** — settled: shipped, then dissolved when R1 closed the gap.

**Rulings that moved this task (history):** filed 2026-09-02 on the Backlog board; pulled into Sprint 4
2026-09-12 (the *"invisible gate"* reasoning); ordering on `0064`'s report-only run **waived** 2026-09-14
(*"Yes, build now"*); **not a gate on XP go-live** (2026-09-14, *"Take it off the list"*); runbook
ruling 3 deferred its decisions until after the deploy window (re-confirmed 2026-09-22), then **lifted
for this task on 2026-09-23 (rescope Q3 = (b), against the producer's recommendation)** so every
decision was taken before the window.

## Related

- [[tasks/deploy-time-config-parity-guard]] — task `0064`, the guard these items harden
- [[decisions/config-parity-failure-class]] — the failure class the guard catches
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, whose shape R12 had been silently dropping
- [[systems/weekend-deploy-window]] — ruling 3, and its lift for this task
- [[decisions/sprint-4]] — the board it closed on
- [[decisions/sprint-5]] — the board carrying `0298`, which consumes the tags and arms `--enforce`
- [[decisions/sprint-backlog]] — the board it was first filed on
