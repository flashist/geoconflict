# Config-parity guard: first real report-only production run, then arm --enforce

## ID
0298

## Sprint
Sprint 5

## Priority
— ✅ **POSITION OWNER-CONFIRMED 2026-09-23** — given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. The owner said: keep it where it is on Sprint 5, **directly below `0286`**. **This is a ratification, not a re-rank. The value and position are unchanged.** *(Superseded flag, kept: ~~append rank on the Sprint 5 board. ⚠️ Priority is append rank, NOT a merit ranking — flagged for owner confirmation. On merit this belongs directly below `0286`, because its first half (verification step 8) is observed in the same deploy window as the other window tasks moved from Sprint 4 on 2026-09-23, and `0286` is the last of those rows.~~)*

## Status
🔲 Backlog

> ### 📌 2026-09-26 deploy window — results
>
> **PROVENANCE.** Executed by the **OWNER on the boxes on 2026-09-26**; output pasted into the `fkit lead`
> session and read/checked by `fkit-lead` (**(lead)** = a read-only check `fkit-lead` ran itself from a
> non-allowed host). Recorded by a spawned `fkit-producer` with no owner channel (ADR-021). ⛔ Relayed
> evidence — not an owner ruling, not producer precedent. ⛔ **`## Status` NOT changed; no mover invoked.**
> Full table: [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *2026-09-26 — THE WINDOW RAN*.
>
> **Part A — the first real run, W12** (`./build-deploy.sh prod` → 0.0.152). Names and verdicts only, as
> relayed:
> - **Parity guard:** REQUIRED **0** on game / profile / client. Game INFO 6 (`DOCKER_TOKEN`,
>   `OTEL_USERNAME`, `OTEL_PASSWORD`, `OTEL_ENDPOINT`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`), ALLOWED 4.
>   Client INFO 1 (`WEBSOCKET_URL`), ALLOWED 15, INERT 11. ⇒ **`0064`'s zero-required-violations prediction
>   HELD** for the parity guard.
> - **Value guard (prod):** REQUIRED **1** = `OTEL_AUTH_HEADER — forwarded but EMPTY` (the expected one —
>   the 2026-09-25 note above); OPTIONAL 5 (`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`,
>   `STORAGE_BUCKET`, `FEEDBACK_WEBHOOK_URL`); OK 18; UNCHECKED 6; last line `report-only — exit 0`.
> - No `PROFILE_INTERNAL_TOKEN=` string in the deploy log.
>
> | Verification step | Verdict |
> |---|---|
> | 1 — worklog holds W12 (and W3/W7) output, no values | ⚠️ **partial.** W12 relayed (above). **W3/W7's guard output was not relayed**, and this folder has no worklog yet. |
> | 2 — every REQUIRED / PARSE-FAILURE / DYNAMIC-READ line explained | ⚠️ **partial.** The one REQUIRED line is explained. **No PARSE-FAILURE / DYNAMIC-READ / VALUE-UNKNOWN line was mentioned either way** — confirm from the captured log. ⚠️ Whether each of the 7 INFO lines is **understood** is not yet recorded (Part A step 2). |
> | 3–7 | Part B — not started. |
>
> 🚨 **Before arming:** `OTEL_AUTH_HEADER` needs a decision (e.g. an OPTIONAL entry), or `--enforce`
> blocks every prod deploy.

## Owner
fkit-coder

## Context

**Split out of [`0064`](../../done/0064-deploy-time-config-parity-guard/brief.md) on 2026-09-23, on an OWNER
RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned
`fkit-producer` with no owner channel (ADR-021).** ⛔ Not producer precedent.

What the owner ruled, in order:

- **The rescope rule.** Sprint 4 keeps only work that can be built and tested locally. Checks that
  need a deploy go to Sprint 5. A task with both is **split**: the local part stays in Sprint 4 and the
  after-deploy part becomes a new Sprint 5 task.
- **The `0064` split (the answer to the producer's Q2, option (a)).** `0064` keeps Phase 2 (items 5–7)
  in Sprint 4. **This task** gets `0064`'s verification step 8 (the first real report-only production
  run, runbook W12) plus arming `--enforce` at both call sites.

🚩 **This supersedes one earlier owner ruling, by a later owner ruling.** `0064/plan.md` records ruling
**R3 (2026-09-02)**: *"wiring enforcing is a follow-up step **within this same task** — not a new task,
and not this week's work."* The 2026-09-23 ruling moves that step here. R3's other content still
stands: build `--enforce` first, leave it wired to nothing until the report-only run has been read, and
never go straight to enforcing.

**What exists today.** `0064`'s Phase 1 guard (`scripts/check-config-parity.mjs`) is built and reviewed,
and so is its `--enforce` flag. Nothing passes `--enforce`. Both deploy call sites run it report-only
and swallow the exit code: `deploy.sh:60-61` and `build-deploy-profile.sh:72-73` (both
`--pipeline=all --report-only || true`). So the guard **cannot** fail a deploy today, by construction.

**Why this cannot be done locally.** Step 8 is by definition a real deploy's output. The `0064` brief's
hazard section requires that the guard *"run against at least one real deploy, and only be switched to
failing the deploy once its output is clean and understood."* So arming cannot come before step 8 has
run and been read.

**Dependencies and conflicts, flagged, not planned around:**

- **The Saturday 2026-09-26 deploy window** (owner-dated 2026-09-23). Step 8 is observed at runbook W12
  (the game deploy). The profile deploys at W3 and W7 run the same report-only guard, so their output
  counts as evidence too.
- **[`0203`](../../done/0203-config-parity-guard-pre-arming-gate/brief.md): all of its pre-arming items must land
  before `--enforce` is wired.** This is a hard sequence (`0064` Notes, *"Arming depends on `0203`"*).
  `0203` stays in Sprint 4 by owner ruling of 2026-09-23 (Q3 = (b)), and its six pending decisions are
  to be taken **before** the window. That lifts runbook ruling 3 for `0203`. Whatever of `0203` is
  unfinished when Sprint 4 closes at the deploy (Q7) rolls to Sprint 5 via `/fkit-sprint-done`, and
  this task keeps waiting on it.
- 🚩 **If `0064` Phase 2 lands after Saturday**, its new checks (non-empty for required variables; the
  four URL variables `https` with no bare IP) will **not** have been in the step-8 run. **They need one
  further report-only real deploy, read and understood, before they are enforced.** This comes from the
  `0064` brief's requirement 2: *"Do not ship straight to enforcing."* Arming Phase 1 alone after step 8
  is fine. Arming a check that has never seen a real deploy is not.
- ⚠️ **Editing `build-deploy-profile.sh` can turn `npm test` red.**
  `tests/scripts/profile-deploy-hardening.test.sh` runs that script end to end and carries grep-level
  assertions over it (see the `CLAUDE.md` *Shell harnesses* section, consequence 1). Arming touches it.
  That is the gate working, not a broken test.
- **Deploy-time forget-risk, unchanged.** The guard compares variable **names**. It does not catch
  `PROFILE_INTERNAL_TOKEN` being **present when it should be blank**. The owner ruled on 2026-09-04 that
  no guard is built for that (see [`0296`](../0296-after-deploy-production-checks-profile-token-earned-citizenship-inbox/brief.md)'s
  top box). This task does not change that and must not re-recommend it.

## What to build

**Part A: the first real report-only production run (`0064` verification step 8). Owner-side, at the
window.**

1. At runbook W12 (`./build-deploy.sh prod`), and at the profile deploys W3/W7, capture the guard's full
   output. It prints **variable names and verdicts only, never values**. Check that this still holds on
   the real run.
2. Record in this task's worklog: the REQUIRED findings, the INFO (dead-config) findings, any
   `PARSE-FAILURE` / `DYNAMIC-READ` lines, and whether each is understood. `0064`'s approved plan
   **predicted** zero required-variable violations. That was a hand-count from grep, not a measured
   result. This run is where that prediction is either confirmed or refuted.
3. Any finding that is not understood blocks Part B until it is explained. A real gap gets its own
   task. Don't quietly add it to the allowlist.

**Part B: arm `--enforce` at both call sites. Coder, after Part A is read and `0203`'s items have
landed.**

4. Wire `--enforce` at `deploy.sh` and `build-deploy-profile.sh`, in place of `--report-only || true`,
   following `0203`'s owner-ruled decisions. Those decisions settle what refuses a deploy: R4a
   (unmapped folder), R4b (missing guard script vs missing input file), R13 (parse-failure blast radius),
   the second half of R14 (whether one pipeline's findings block another pipeline), R19 (dynamic reads)
   and R21 (scanner scope). The missing-script case is decided at these call sites (`0203`
   decision-prep, R4b), so it is this task's to implement.
   📌 **Settled 2026-09-23 in `0203` (owner rulings, live via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). This task implements them:**
   - **R4b — at the call sites:** a **missing guard script STOPS the deploy**, the same as a missing input. Today both call sites silently skip it (the `[ -f … ]` check at `deploy.sh:60` and `build-deploy-profile.sh:72`). Changing that is this task's. The same stop applies to a scanner parse failure and a computed/spread `DefinePlugin` key. (Authority: the owner delegated with *"We're not doing the deploy today. You can fix it"*, then confirmed the lead's recommendation with *"Yes, stop the deploy"*.)
   - **R14 (second half) — per-deploy blocking:** each deploy blocks **only on its own settings**: game + browser for `deploy.sh`, profile for `build-deploy-profile.sh`. Other pipelines' findings print loudly but don't block. Shared code (`core/configuration`) is still checked for both.
   - **R4a:** an unmapped new `src/` folder stops the deploy under `--enforce`, and the message names the one-line `DIR_PIPELINE` fix (built in `0203`).
   - ~~R13, item 11, R19 and R21 are **routed to `fkit-architect` for owner approval, not yet ruled**. Arming still waits on them.~~ **Later on 2026-09-23 all four are RULED** (architect's call, owner-approved; recorded in `0203`). Arming still waits on `0203` **building** them.
   - ✅ **The R4a vs R14 conflict is resolved (2026-09-23; architect's call, owner-approved live via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). This task's arming must implement it:** **failures that cannot be traced to a pipeline stop EVERY deploy**: an unmapped `src/` folder, broken allowlist JSON, a missing guard script. **Everything else stops only its own deploy.** ⚠️ **This requires per-pipeline tagging:** `DYNAMIC-READ` and scanner parse failures must carry their file's pipeline(s). Today they are one global list (`scripts/check-config-parity.mjs:686-697`, `:804`, `:1024`). Consuming the tags per deploy is this task's. ~~🚩 **Which task BUILDS the tagging (`0203`'s checker work or this task) was not ruled.**~~ ✅ **Ruled 2026-09-23** (OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent): **[`0203`](../../done/0203-config-parity-guard-pre-arming-gate/brief.md) builds the tagging** (its scope item 12), for every finding that must block per deploy. **This task only consumes the tags when arming.**
   - 📌 A "dead" (`INFO`) line **cannot** fail a deploy under `--enforce`: `failsClosed` (`:1042-1049`) covers `REQUIRED` / `PARSE-FAILURE` / `DYNAMIC-READ` / `SKIP` only.
5. If `0064` Phase 2 landed after the window, keep its checks report-only until one further real deploy
   has been read (see Context), or arm Phase 1 only and record which checks are armed.
6. Keep the tests green, including the shell harnesses that `npm test` now runs.

## Verification steps

1. **Part A:** the worklog holds the guard output from the real W12 deploy (and W3/W7), with names and
   verdicts only. A grep of the captured output for any env value shows none.
2. **Part A:** every REQUIRED / PARSE-FAILURE / DYNAMIC-READ line in that output is either explained in
   the worklog or filed as its own task. The worklog states whether the plan's zero-violation prediction
   held.
3. **Part B:** both call sites pass `--enforce`. A fixture with a seeded required-variable gap exits
   non-zero and the deploy script stops. The clean real tree exits zero. Show both deliberately
   (`0064` verification step 6, second half).
4. **Part B:** each of `0203`'s owner-ruled edges behaves as ruled, with one test per edge.
5. **Part B:** no Phase 2 check is armed unless it has seen at least one real report-only deploy (worklog
   names which run).
6. `npm test` green (including `tests/scripts/ShellHarnesses.test.ts`), `npm run lint` exit 0.
7. No value is printed anywhere, not in the guard output and not in the deploy output
   (`0064` verification step 7).

## Notes

- **Depends on:** [`0064`](../../done/0064-deploy-time-config-parity-guard/brief.md) (the guard and its `--enforce` flag, built; Phase 2 if it is to be armed) and [`0203`](../../done/0203-config-parity-guard-pre-arming-gate/brief.md) (all pre-arming items land before `--enforce` is wired), plus the 2026-09-26 deploy window for Part A (runbook W12)
- **Blocks:** nothing.
- ✅ **RECORDED 2026-09-24: [`0203`](../../done/0203-config-parity-guard-pre-arming-gate/brief.md) is DONE, so this task's dependency on it is met.** It was closed
  `(agent-closed — not owner-verified)` by a spawned `fkit-producer` at the ship-loop close step. `--enforce` is still
  wired nowhere; arming it is this task's job. Facts to know before arming, from `0203`'s
  [`worklog.md`](../../done/0203-config-parity-guard-pre-arming-gate/worklog.md) (run 2) and [`review.md`](../../done/0203-config-parity-guard-pre-arming-gate/review.md) (round 3, `closed-out`):
  - **Findings now carry per-pipeline tags.** `parseFailures`, `dynamicReads` and `skips` are
    `{ message, pipelines }`. `pipelines` lists `game`/`profile`/`client`, or is `"global"` when a finding
    cannot be traced to a pipeline. The text output shows the tag as a suffix: `[pipeline: game]`,
    `[pipelines: game, client]`, `[global]`. That is what lets each call site block only on its own
    pipeline's findings plus `global` ones (the R4a/R14 ruling).
  - **Two new fail-closed cases (owner ruling 2026-09-24, Q2 = A, *"Yes, flag it"*; answers `0203` review
    R6).** An unreadable `.ts` file under `src/` is now a PARSE-FAILURE tagged with **that file's pipelines**.
    An unreadable directory under `src/` is a PARSE-FAILURE tagged **`"global"`**. Before, both were
    skipped silently. Under `--enforce` both stop the deploy through the existing `failsClosed`.
  - **Owner-accepted residual (owner ruling 2026-09-24, Q1 = A, *"Accept as known limit"*; `0203` review
    R5).** A destructuring pattern written as a call argument, `f({ A } = process.env)`, stays **silent**:
    it is not reported as a whole-object use. It is documented under the checker's KNOWN LIMITS and pinned
    by a test. Re-raise only if a live instance appears under `src/`, or a real parser replaces the
    hand-written classifier.
- **Split from:** `0064` on 2026-09-23 (owner ruling, rescope Q2 = (a)). `0064` keeps Phase 2 in
  Sprint 4. This task holds step 8 and the arming.
- **Runbook:** [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md)
  W12 now points here for step 8.
- 🔐 **RECORDED 2026-09-24 — OWNER RULING 2026-09-23 (`0064` Phase 2 plan amendment 1): a blank `PROFILE_INTERNAL_TOKEN` is now REQUIRED-missing in the prod value check.** Given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`; recorded here by a spawned `fkit-producer` at `0064`'s close (ADR-021; ⛔ not producer precedent). Owner, verbatim: *"I don't think we can allow the PROFILE INTERNAL TOKEN to be empty anymore, because this token is a requirement for the profile/citizenship logic to work properly"*. Source: [`0064`](../../done/0064-deploy-time-config-parity-guard/brief.md) ([`plan-phase2.md`](../../done/0064-deploy-time-config-parity-guard/plan-phase2.md), *Owner amendments at approval*, amendment 1). **This supersedes the 2026-09-04 "deliberately blank" ruling FOR THE VALUE CHECK ONLY** (`scripts/check-config-values.mjs`, prod deploys only). Consequences, recorded not ruled: (1) **until `.env.prod` carries the token, every prod deploy prints `REQUIRED PROFILE_INTERNAL_TOKEN — forwarded but EMPTY`** — report-only, exit 0, it cannot fail a deploy; (2) 🚨 **once this task arms `--enforce`, a blank token BLOCKS prod deploys**; (3) `plan-phase2.md` §8 item 7 (*"`0217` go-live must remove the `PROFILE_INTERNAL_TOKEN` entry"*) is **void** — no such allowlist entry was ever shipped, so there is nothing to remove at go-live. ⚠️ **Bearing on this task:** arming Phase 2's checks arms the non-empty rule for `PROFILE_INTERNAL_TOKEN` with it. Confirm `.env.prod` carries the token (presence only — never the value) before `--enforce` is wired, or the first enforced prod deploy fails. The Context bullet above (*"does not catch `PROFILE_INTERNAL_TOKEN` being present when it should be blank"*) stays true; the new check catches the opposite case, a blank one.
  ✅ **2026-09-24 — the "blank it by hand" rule is RETIRED (owner, verbatim: *"Retire it"*): `PROFILE_INTERNAL_TOKEN` is always set in prod from now on.** See [`0296`](../0296-after-deploy-production-checks-profile-token-earned-citizenship-inbox/brief.md)'s top box.
- 🔎 **RECORDED 2026-09-25 — LEAD'S FINDING, not an owner ruling: before arming `--enforce`, reclassify `OTEL_AUTH_HEADER` as OPTIONAL in the value-guard allowlist (`scripts/config-parity-allowlist.json`).** The owner delegated the check only (*"You can check it yourself"*); `fkit-lead` ran it and a spawned `fkit-producer` recorded it here. The reclassification itself is a coder change inside this task's Part B scope and has **not** been ruled by the owner.
  - **What was seen:** a dry run of the prod value guard on 2026-09-25 prints `REQUIRED OTEL_AUTH_HEADER — forwarded but EMPTY`. Report-only today (`deploy.sh:332`, `run_config_value_guard || true`), so W12 is **not** blocked. 🚨 **Once this task arms `--enforce`, it would block every prod deploy.**
  - **Why blank is fine, by design (repo evidence):** the game server adds an `Authorization` header only when the value is set (`src/server/Logger.ts:23`, `src/server/WorkerMetrics.ts:33`, `src/server/OtelTracing.ts:14`). The telemetry side accepts OTLP with no auth: nginx `location /v1/` proxies straight to the collector (`setup-telemetry.sh:886-887`), and the collector's OTLP receiver has no auth and adds the Uptrace credential itself when forwarding (`setup-telemetry.sh:452-477`). `setup-telemetry.sh`'s own "add to .env.prod" output lists only `OTEL_EXPORTER_OTLP_ENDPOINT` (`:1168-1174`).
  - ⚠️ **Caveat:** this is the **repo config, not the live telemetry box**. Nobody looked at the box or at Uptrace itself on 2026-09-25. Confirm telemetry still arrives with the header blank before relying on this.
  - Side note: `setup.sh:11` refuses to run with it empty. That is the one-time game-box setup script, not used at W12, and this finding does not touch it.
  - Today the allowlist holds only a Phase 1 (`server-only`, parity) entry for this name, no value-guard OPTIONAL entry.
- **Do not invoke the mover skills.** They are producer-only (ADR-033). **No wiki writes.**
- 🔒 **No secrets in any artifact.** Variable names only, never values, hosts or lengths.
