# GameAnalytics "Limit Exceeded" — Events Per Active User Per Day Breached the 500 Limit

**Source**: `ai-agents/tasks/done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — task `0224`; owner-ruled `🔴 NEXT IN WORK ORDER` 2026-09-06, closed 2026-09-07

> 🚨 **CLOSED WITH TWO ACCEPTANCE CRITERIA EXPLICITLY UNMET. This task closing is NOT the problem being resolved.**
>
> **`✅ Done (agent-closed — not owner-verified)`.** Closed 2026-09-07 on an owner ruling given live — *"Close now with an honest note."* The owner approved **the decision to close** and has **verified nothing in production**. Closed by a spawned `fkit-producer` via `/fkit-task-done`; no commit was made by the close.
>
> ⛔ **NOTHING FROM THIS TASK IS DEPLOYED** as of 2026-09-07. It ships at the next deploy window. **Do not read any statement on this page as production behaviour.**

## Goal

GameAnalytics raised a **`Limit Exceeded`** banner: *events per active user per day* passed the **500** limit.

🔴 **Read the limit precisely — it is PER ACTIVE USER PER DAY, not a total-volume limit.** It is a statement about a **chatty client**, not about the game being popular. A brief or fix that frames it as "too much traffic" or "we outgrew the plan" has misread the banner and will chase a bigger plan instead of fewer events per player.

**Owner ruling 2026-09-06 narrowed the scope to one change**: raise the `Performance` sampling interval from 60 s to 300 s. Two of the three open questions were ones the owner declined to rule on. Verbatim: *"We should NOT try to fix all possible cases now."*

## Key Changes

Three things landed, all in commit **`35afc64`** ("Sprint push", 2026-09-07 11:40 +0300) — a **general sweep commit, not a task commit**. ⚠️ `git log` shows no commit whose message names `0224`; `35afc64` is the commit, and there is no other.

| # | What landed | Authority |
|---|---|---|
| 1 | `src/client/PerformanceMonitor.ts:6` — `const SAMPLE_INTERVAL_MS = 300 * 1000;`, used by the `setInterval` period | The 2026-09-06 scope-narrowing ruling |
| 2 | Hidden-tab sampling-window fix — a `visibilitychange` listener resetting `frameCount` / `lastSampleTime`, removed in the returned stopper | Owner ruling in `plan.md`: *"FIX IT NOW"*, **against the coder's own recommendation to defer** |
| 3 | `ai-agents/knowledge-base/analytics-event-reference.md:347-349` — cadence 60 s → 300 s, the match-scoped `<5 min` consequence, and the `Performance:Memory:*` High/Low gloss de-inverted to match the code | Owner ruling: verify first, then code wins |

⚠️ **Change 2 does not alter event VOLUME.** The `document.visibilityState === "hidden"` early return already existed and was untouched; the new listener only resets counters. It changes FPS **accuracy**, not count — do not attribute any part of an observed drop to it.

**Expected effect is an ESTIMATE derived by arithmetic, not a measurement.** `Performance` was observed at ~110–216 events/user/day at 60 s; at 300 s that is a 5× cut ⇒ roughly ~22–43. 🚨 **Predict "≥5×", not "5×"** — the monitor is **match-scoped, not page-scoped**, so the first sample lands 300 s *after the match begins* and **every match shorter than 5 minutes now emits ZERO `Performance:*` events**. Geoconflict is a short-session game and **the match-length distribution was never measured**, so the realised cut is more than 5× by an unknown margin. A drop below ~22–43/user/day is **expected, not an anomaly**.

## Outcome

### 🚨 The 3–4 Sep breach is UNEXPLAINED and UNADDRESSED by this change

**This change does not fix the breach and cannot.** The 4 Sep breach was **once-per-session** categories — `Player` (~34×), `Experiment` (~45×), `Session` (~10×), `Platform` and `Device` (~31× each). **`Performance` barely moved across the spike** (115.65 → 185.54, ~1.6×) and **`Match` did not move at all** (25.87 → 31.79). **None of the categories that actually breached were touched by this task.**

| | Before | After the 5× `Performance` cut |
|---|---|---|
| A normal day (30 Aug – 2 Sep, 5 Sep) | ~150–250/user | ~62–81/user — **12–16% of the 500 limit** |
| **4 Sep (the breach)** | **1,324.33/user — 265% of the limit** | **~1,176/user — still 235% of the limit** |

⛔ **A 4 Sep repeated today would still breach, by more than double.** This change lowers the **baseline**; it does not touch the **spike mechanism**, which is **unknown**. The owner's read — that it came from their own local/dev testing — is a **plausible hypothesis, never verified**. ⛔ **Do not write down that the spike was caused by dev testing.**

➡️ The spike has its own investigation task, **`0230`**, filed on an owner ruling 2026-09-07 and then **moved off Sprint 4 onto the Backlog board the same day** — deferred, cause unknown, reopen condition *"if the problem repeats"*. See [[decisions/sprint-backlog]].

### 🟢 `0208` is EXONERATED — recorded as refuted on purpose

The lead's **first** hypothesis on seeing the banner was that `0208`'s `WinCheckExecution` latch had failed and was emitting every 10 ticks. **The category table refutes it**: `Match` is flat across the spike. `0208`'s instrumentation went live in build `0.0.141` and is **not** the cause. ⛔ Do not re-open this line without new evidence contradicting the table. See [[tasks/measure-clientless-leader-and-solo-awards]].

### 🚨 Acceptance criteria 3 and 4 are NOT met and CANNOT be met as written

Criteria 3 and 4 require the post-deploy `Performance`-column drop to be read from the dashboard and **attributed to this task**. **That attribution is impossible.** Task `0225` — orphaned `PerformanceMonitor`s on lobby rejoin — landed in `702a8ea`, is undeployed, and ships in **the same build**. **It cuts the same `Performance` column**, and the dashboard reports one number per category per day.

⇒ **Any post-deploy drop in `Performance` is the JOINT effect of `0224` + `0225`.** ⛔ Nobody may attribute it to `0224` alone. Criteria 1, 2, 5, 6, 7 and 8 are met; **3 and 4 are recorded as unmet — not waived, not quietly satisfied.** See [[tasks/orphaned-performance-monitors-lobby-rejoin]].

### 🚨 "The banner is gone" is NOT evidence

The breached metric **fell back under the limit on 5 Sep, at 162.79, before a single line was written.** ⛔ A green banner, or a metric under 500, proves nothing about this change — it would have "passed" on 5 Sep with no work done at all.

### Verification actually performed, and its limits

| Check | Result |
|---|---|
| `src/client/PerformanceMonitor.ts:6` reads `300 * 1000` at `HEAD` | ✅ re-read at close |
| `npm run lint` | ✅ clean, exit 0 |
| `npm test` | ✅ 113 suites / 1185 tests, exit 0, first run, no flake |
| `analytics-event-reference.md` updated | ✅ `:347-349` |
| No secret in any artifact | ✅ `file:line` references only |
| Cadence change observed at runtime | ❌ **NOT DONE** — diff read only |
| Hidden-tab fix observed at runtime | ❌ **NOT DONE** — reasoned from code (a headless browser does not faithfully suspend rAF) |
| Production effect on the dashboard | ❌ **NOT DONE, and not attributable** |

⚠️ **What lint and test actually prove:** they ran against the **working tree** during the close, **not a clean checkout of `HEAD`**, while a concurrent session edited `PerformanceMonitor.ts`, `Main.ts` and `ClientGameRunner.ts`. Evidence the tree was green when they ran; **not** evidence about `HEAD` in isolation.

### ✅ The `TEMP-0227-REVERT-ME` instrumentation is gone — verified 2026-09-07 at `c910452`

The close note warned that a concurrent `0227` session held an uncommitted `SAMPLE_INTERVAL_MS = 3 * 1000` (a **3-second** interval — 100× faster than this task shipped, 20× faster than the 60 s original) which, if committed or deployed, would undo this task entirely. **That warning is now discharged.** At `HEAD` = `c910452`, `PerformanceMonitor.ts:6` reads `300 * 1000` and `grep -rn "TEMP-0227" src/` returns nothing. The warning is kept here because it describes a real hazard class, not because it is live.

### Two data caveats raised at close — unresolved, and NOT called wrong

1. **The dashboard's per-category figures do not sum to its own reported daily totals.** The *Breakdown by top-level category* and *Events per active user per day* tables do not reconcile. Nobody has established which is right, or whether a category is missing from the split.
2. **The brief's "7-day mean: 581.97" cannot be reproduced from its own daily rows** (~150, ~250, ~180, ~170, 414.88, 1324.33, 162.79 → **378.86**). ⚠️ This matters beyond bookkeeping: the "7-day mean is above 500" framing appears twice as the reason the baseline has no headroom. **If 378.86 is right, that framing is overstated.**

⛔ Neither is being called an error. Both were read off the GameAnalytics UI by a human and are **unexplained, not refuted**. Do not quote either as settled.

### ⏸️ What stays deferred — not deleted, not rejected on merit

| Item | Ruling |
|---|---|
| **Q1 — the reduction target** | ⏸️ **NOT SET.** No ceiling was ruled. The producer's earlier ~150/user/day recommendation is neither adopted nor rejected. |
| **Q2 — what else gets cut from `Performance:*`** | ✅ Answered: the interval change only. Dropping the three FPS bucket events, a per-session cap, and cohort/1-in-N sampling are **deferred, NOT rejected on merit** — nobody judged them worse. |
| **Q3 — the `DEPLOY_ENV` fail-open default** | ⏸️ **DEFERRED, NOT FIXED.** Split out 2026-09-07 as task `0226` on the Backlog board. **Still not fixed, still not scheduled.** |
| **Design-event cardinality** | ⏸️ **STILL OPEN AND TRENDING UP** — ~103–105 distinct names all week, **118 on 5 Sep**. This is a *different* metric from the one that breached, and it rose on the same day the breached one went green. |
| **Full event enumeration; `Platform`/`Device` closeout** | ⏸️ All deferred. |

🚨 **What could NOT be established, recorded as an open question and not a finding:** the cardinality chart carried no "Limit reached" badge and the "Dropped events" toggle was greyed out, so **nobody may write down "events are being dropped" or "cardinality is fine" — neither is known.**

### 🚨 Standing, unmitigated risk — `DEPLOY_ENV` fails open to `prod`

Any build that does **not** go through `build-deploy.sh` → `build.sh:129` — a direct `docker build`, a hand-rolled local build, a one-off image — **silently gets `DEPLOY_ENV=prod` and writes into the production GameAnalytics game.** There is one key pair, so nothing in the dashboard distinguishes that traffic. `Dockerfile:23` and `webpack.config.js:335-336` are the fail-open defaults; `build.sh:129` is the safe path.

⚠️ **The wrong outcome is the one you get by omission, and nothing warns you.** The owner knows and chose to wait. Now tracked as `0226` — ⛔ **a brief on an unranked board is a record, not a mitigation**, and `0226` does not close `0224`: it removes a *mechanism*, it does not identify the spike's cause.

### ➡️ The actual next step is the owner's watch period

The owner will watch the analytics over the coming days and report back. 🚨 **Completing this task is not the same as the problem being resolved**, and the watch period's result is **not** a pass/fail for this task.

## Related

- [[systems/analytics]] — the event taxonomy, the `Performance` category and the 500-per-user limit
- [[systems/client-game-teardown]] — why the `PerformanceMonitor` keeps running past a game's end, and the family of teardown sites
- [[tasks/orphaned-performance-monitors-lobby-rejoin]] — task `0225`, which cuts the same `Performance` column in the same build and makes criteria 3/4 unattributable
- [[tasks/crashed-game-teardown-seam]] — task `0227`, the crash-path half of the same missing wiring
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, exonerated by the category table
- [[tasks/mobile-quick-wins]] — where `Performance:FPS:*` was originally used as a measurement
- [[decisions/sprint-4]] — the sprint board carrying this task
- [[decisions/sprint-backlog]] — where `0226` (the `DEPLOY_ENV` fail-open) and `0230` (the spike investigation) are tracked
