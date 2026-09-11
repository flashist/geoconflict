# GameAnalytics "Limit Exceeded" — events per active user per day breached the 500 limit

## ID
0224

## Sprint
Sprint 4

🔴 **OWNER RULING, given live 2026-09-06: this is taken into work as the NEXT task.**

⚠️ **The Sprint 4 row for this task is APPENDED at the BOTTOM of that board, and its position does
NOT express its rank.** fkit's **ADR-035** bars inserting a new row above a board's closed rows, so
appending is the only mechanically permitted placement. **The bottom row is a board-mechanics
constraint, not a ranking.** The owner ruling above is the rank.

📎 *ADR-035 is cited by name, never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs, which live in the fkit install share. This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link would not resolve.*

## Priority
🔴 **Next in work order (owner-ruled 2026-09-06).**

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder (the one code change) / Owner (watching the analytics over the coming days)

## Depends on
Nothing. **Startable immediately** — the in-scope change is a one-line interval constant, no server
contact and no deploy needed to make it.

---

# ✅ CLOSING NOTE — 2026-09-07 (agent-closed — not owner-verified)

**Closed on an owner ruling given live 2026-09-07: *"Close now with an honest note."*** The owner
approved the **decision to close**. The owner has **verified nothing in production** — hence the
`(agent-closed — not owner-verified)` marker on this task's status everywhere it appears. Closed by a
spawned `fkit-producer` via `/fkit-task-done`; **no commit was made by the close.**

## 1. The change landed in a sweep commit, not a task commit

`src/client/PerformanceMonitor.ts:6` reads `const SAMPLE_INTERVAL_MS = 300 * 1000;` at `HEAD`. It
landed in **`35afc64` ("Sprint push", 2026-09-07 11:40 +0300)** — a general sweep commit, **not** a
commit dedicated to this task. A spawned `fkit-coder` did the work on 2026-09-06 and, per the rules,
left it **uncommitted**; the owner then swept the working tree into their own commit **without knowing
what it was**. The doc half landed in the same commit
(`ai-agents/knowledge-base/analytics-event-reference.md:347-349` — 300 s, citing `0224`).

⚠️ **Consequence for anyone doing archaeology later:** `git log` will not show a commit whose message
names this task. `35afc64` is the commit. There is no other.

### 🚨 WORKING-TREE WARNING, observed 2026-09-07 15:00 during this close — READ BEFORE ANY DEPLOY

**The committed value is correct at `HEAD`. The WORKING TREE is not.** A concurrent session — the
one working `0227` — has this uncommitted edit in the tree right now:

```
-const SAMPLE_INTERVAL_MS = 300 * 1000; // 5 minutes
+const SAMPLE_INTERVAL_MS = 3 * 1000; // TEMP-0227-REVERT-ME was 300 * 1000
```

⛔ **`3 * 1000` is a 3-second interval — 100× faster than the value this task shipped, and 20× faster
than the 60 s original.** It is self-labelled `TEMP-0227-REVERT-ME`, so it is plainly a deliberate
short-lived test aid, **not a regression** — but **if it is ever committed or deployed it would undo
this task completely and blow the 500-event-per-user limit by a wide margin.**

⚠️ **This close deliberately did NOT revert it** — `src/` was out of scope for this producer run and
another session is actively working those files. **Recorded as an observation, and it needs someone to
confirm the revert before the next build.** `src/client/Main.ts` and `src/client/ClientGameRunner.ts`
were also being modified in the tree at the same time by that session.

## 2. 🚨 THE 3–4 SEP BREACH IS UNEXPLAINED AND UNADDRESSED BY THIS CHANGE

**This change does not fix the breach and cannot.** The 4 Sep breach was **once-per-session**
categories — `Player`, `Experiment`, `Session`, `Platform`, `Device`. `Performance` **barely moved
across the spike** (115.65 → 185.54, ~1.6×). **None of the categories that actually breached were
touched by this task.**

The arithmetic, stated plainly:

| | Before | After the 5× `Performance` cut |
|---|---|---|
| A normal day (30 Aug – 2 Sep, 5 Sep) | ~150–250/user | **~62–81/user — 12–16% of the 500 limit** |
| **4 Sep (the breach)** | **1,324.33/user — 265% of the limit** | **~1,176/user — still 235% of the limit** |

⛔ **A 4 Sep repeated today would still breach, by more than double.** This change **lowers the
baseline**; it **does not touch the spike mechanism**. The mechanism is **unknown**. The owner's read
— that it came from their own local/dev testing — remains a **plausible hypothesis, never verified**;
do not write it down as the cause.

➡️ **The spike now has its own investigation task: [`0230`](../../backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md)**, filed on
Sprint 4 on an owner ruling 2026-09-07. **That is the standing risk, and it is still open.**

## 3. 🚨 Acceptance criteria 3 and 4 are NOT met, and CANNOT be met as written

Criteria 3 and 4 require the post-deploy `Performance`-column drop to be read from the dashboard and
**attributed to this task**. **That attribution is impossible.**

[`0225`](../0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) — orphaned
`PerformanceMonitor`s on lobby rejoin — landed in **`702a8ea`**, is **undeployed**, and will ship in
**the same build** as this change. **It cuts the same `Performance` column.** The dashboard reports one
number per category per day; it **cannot separate two changes that move the same column in the same
build.**

⇒ **Any post-deploy drop in `Performance` is the JOINT effect of `0224` + `0225`.** ⛔ **Nobody may
attribute it to `0224` alone.** Criteria 1, 2, 5, 6, 7 and 8 are met (see §5); **3 and 4 are recorded
as unmet, not waived and not quietly satisfied.**

## 4. 🚨 "THE BANNER IS GONE" IS NOT EVIDENCE — the metric already self-resolved with zero code written

The breached metric **fell back under the limit on 5 Sep, at 162.79, before a single line was
written.** ⛔ **A green banner, or a metric under 500, proves nothing about this change.** It would
have "passed" on 5 Sep with no work done at all. Do not accept it as verification, now or later.

## 5. Verification actually performed — and its limits

| Check | Result |
|---|---|
| `src/client/PerformanceMonitor.ts:6` reads `300 * 1000` at `HEAD` | ✅ re-read 2026-09-07 at close |
| `npm run lint` | ✅ **clean**, exit 0, re-run at close 2026-09-07 |
| `npm test` | ✅ **113 suites / 1185 tests passed**, exit 0, first run, no flake — re-run at close 2026-09-07 |
| `analytics-event-reference.md` updated (criterion 6) | ✅ `:347-349`, 300 s, cites `0224` |
| No secret in any artifact (criterion 7) | ✅ `file:line` references only |
| Cadence change observed at runtime | ❌ **NOT DONE** — verified by reading the diff only |
| Hidden-tab fix observed at runtime | ❌ **NOT DONE** — reasoned from code only (a headless browser does not faithfully suspend rAF, so a green automated run would have bought false confidence) |
| Production effect on the dashboard | ❌ **NOT DONE, and not attributable — see §3** |

⚠️ **What the lint and test runs above actually prove, stated precisely:** they were run against the
**working tree** as it stood during this close, **not against a clean checkout of `HEAD`**. A
concurrent session was editing `src/client/PerformanceMonitor.ts`, `Main.ts` and `ClientGameRunner.ts`
at the same time (see the working-tree warning in §1). The runs are evidence that the tree was green
when they ran; they are **not** evidence about `HEAD` in isolation, and **not** evidence about the tree
right now.

## 6. Two data caveats raised at close, unresolved — recorded, NOT called wrong

1. **The dashboard's per-category figures do not sum to its own reported daily totals.** The
   *Breakdown by top-level category* table and the *Events per active user per day* table are both
   dashboard observations, and they do not reconcile. Nobody has established which is right, or
   whether a category is missing from the split.
2. **The brief's "7-day mean: 581.97" cannot be reproduced from its own daily rows** — those rows
   (~150, ~250, ~180, ~170, 414.88, 1324.33, 162.79) average **378.86**, not 581.97.

⛔ **Neither is being called an error.** Both were read off the GameAnalytics UI by a human and are
**unexplained**, not refuted. ⚠️ Caveat 2 matters beyond bookkeeping: the "7-day mean is above 500"
framing appears twice in this brief as a reason the standing baseline has no headroom. **If 378.86 is
the right figure, that framing is overstated.** Do not quote either number as settled. Re-read the
dashboard before relying on either.

## 7. What this close does NOT mean

⛔ **This task closing is NOT the problem being resolved.** Everything listed under *DEFERRED* below
is still deferred: the Q1 reduction target (never set), the `DEPLOY_ENV` fail-open risk (live, now
tracked as [`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md), still unfixed and unscheduled), the rising
cardinality (~103–105 → 118 distinct names, still trending up), and the full event enumeration. The
owner's watch period is the real next step, and its result is **not** a pass/fail for this task.

---

# 🔴 OWNER RULING 2026-09-06 — SCOPE NARROWED TO ONE CHANGE

**Read this section before anything below it. Everything after it was written BEFORE this ruling and
describes a much larger task that is NO LONGER the scope.**

The owner was asked the three open questions (Q1 reduction target, Q2 what to cut from
`Performance:*`, Q3 the `DEPLOY_ENV` fail-open default). Their ruling, given live:

> Two of the three questions are about parts of the system the owner is not confident ruling on right
> now. **The only change to make is reducing the FPS/Performance events — firing them every 300
> seconds instead of every 60.** We should NOT try to fix all possible cases now. The owner will
> **watch the analytics over the next few days** and report back whether the problem is still there.

## ✅ IN SCOPE — the emit interval, plus two items added by a later owner ruling

📌 **CORRECTED 2026-09-07 AT CLOSE.** This section was written on 2026-09-06 and went stale twice.
Both corrections are recorded here rather than by overwriting the original wording silently.

**Correction 1 — the `file:line` was wrong.** This section used to say *"the `setInterval` at `:56`"*.
Read at `HEAD` on 2026-09-07, the interval is a **module-level constant**, not an inline literal:

- `src/client/PerformanceMonitor.ts:6` — `const SAMPLE_INTERVAL_MS = 300 * 1000; // 5 minutes`
- `src/client/PerformanceMonitor.ts:29` — `const sampleInterval = window.setInterval(() => {`
- `src/client/PerformanceMonitor.ts:67` — `}, SAMPLE_INTERVAL_MS);` (was `}, 60 * 1000;`)

**Correction 2 — "exactly one change" / "Nothing else" was already false when written.** The heading
promised one change, but the plan the owner approved the same day
([`plan.md`](plan.md), *"APPROVED BY THE OWNER 2026-09-06 via `AskUserQuestion`"*) carried **three**
owner rulings, and the commit reflects all three:

| # | What landed | Authority |
|---|---|---|
| 1 | `SAMPLE_INTERVAL_MS = 300 * 1000`, `setInterval` period now uses it | The 2026-09-06 scope-narrowing ruling |
| 2 | Hidden-tab sampling-window fix — a `visibilitychange` listener resetting `frameCount` / `lastSampleTime`, removed in the returned stopper | `plan.md` **owner ruling 1**: *"FIX IT NOW"*, against the coder's own recommendation to defer |
| 3 | `analytics-event-reference.md` — cadence 60 s → 300 s, the match-scoped `<5 min` consequence, and the `Performance:Memory:*` High/Low gloss de-inverted to match the code | `plan.md` **owner ruling 3** — verify first, then code wins |

⚠️ **Ruling 2 does not change event VOLUME** — the `document.visibilityState === "hidden"` early
return already existed and was not touched; the new listener only resets the counters, so no event is
added or suppressed by it. It changes FPS **accuracy**, not count. Recorded so a later reader does not
attribute part of the observed drop to it.

**Expected effect — ⚠️ AN ESTIMATE, DERIVED BY ARITHMETIC FROM THE OBSERVED TABLE BELOW. IT IS NOT A
MEASUREMENT AND NOTHING HAS BEEN MEASURED YET.**

- `Performance` at a 60 s interval was observed at **~110–216 events/user/day**.
- At 300 s that is a 5× cut ⇒ roughly **~22–43 events/user/day**.
- A normal day of **~163 total** would fall to roughly **~75** — about **15% of the 500 limit**.

⚠️ The estimate assumes the only thing changing is the tick rate and that visible-page-time behaviour
stays the same. **Confirm it against the dashboard; do not quote it as a result.**

🚨 **PREDICT "≥5×", NOT "5×".** The monitor is **match-scoped, not page-scoped** — it starts at game
start and stops on win/leave/unload, so the first sample lands 300 s *after the match begins* and
**every match shorter than 5 minutes now emits ZERO `Performance:*` events** instead of the 2–8 it
used to. Geoconflict is a short-session game. **The match-length distribution was never measured**, so
the realised cut is **more than 5× by an unknown margin** — a direction, not a magnitude. A drop
below the estimated ~22–43/user/day is **expected, not an anomaly.**

## 🚨 THE HONEST LIMIT OF THIS FIX — THE MOST IMPORTANT LINE IN THIS BRIEF

**THIS CHANGE DOES NOT ADDRESS THE 4 SEP BREACH. IT CANNOT.**

The 4 Sep breach was **session-start** events — `Player`, `Experiment`, `Session`, `Platform`,
`Device` — and `Performance` **barely moved across the spike** (115.65 → 185.54, ~1.6×). Cutting the
`Performance` interval touches **none of the categories that actually breached**.

⛔ **If the same thing happens again, this change will NOT prevent it.** All it does is make the
breach start from a lower baseline.

🚨 **A LATER READER MUST NOT MISTAKE THIS TASK FOR HAVING FIXED THE BREACH.** It reduces the standing
baseline. The breach mechanism is untouched and unexplained.

## ⏸️ DEFERRED — not deleted, not rejected on merit

Everything below is **still on the table**, kept in this brief on purpose, and deliberately not being
worked now. The owner's reason in their own framing: *"We should NOT try to fix all possible cases
now."*

| Item | Ruling |
|---|---|
| **Q1 — the reduction target** | ⏸️ **NOT SET.** No ceiling is being ruled. The expected effect above stands in its place as an estimate only. The producer's earlier ~150/user/day recommendation is **not** adopted and **not** rejected. |
| **Q2 — what gets cut from `Performance:*`** | ✅ **ANSWERED: the interval change only.** The other candidates — dropping the three FPS bucket events, a per-session cap, cohort/1-in-N sampling — are ⏸️ **DEFERRED, NOT REJECTED ON MERIT.** Nobody judged them worse; they were simply not taken now. |
| **Q3 — the `DEPLOY_ENV` fail-open default** | ⏸️ **DEFERRED, NOT FIXED.** See the standing-risk box below. 📌 **2026-09-07: split out into its own Backlog task, [`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md), on an owner ruling. Still not fixed, still not scheduled.** |
| **The 3–4 Sep spike itself** | ⏸️ **NOT BEING FIXED and NOT BEING INVESTIGATED NOW.** See the hypothesis box below. |
| **Work-plan steps 1, 2, 4, 5** (shared-key verification, full event enumeration, cardinality, `Platform`/`Device` closeout) | ⏸️ **ALL DEFERRED.** Kept in full below as the record of what was found and what is still unanswered. |
| **Cardinality (~103–105 → 118 distinct names)** | ⏸️ **STILL OPEN AND STILL TRENDING UP.** Not resolved, not measured, not being worked. |

### 🚨 STANDING, UNMITIGATED RISK — `DEPLOY_ENV` fails open to `prod`

**This is not fixed and is not scheduled. It is live right now.**

Any build that does **not** go through the sanctioned `build-deploy.sh` → `build.sh:129` path — a
direct `docker build`, a hand-rolled local build, a one-off image — **silently gets `DEPLOY_ENV=prod`
and starts writing into the production GameAnalytics game.** There is exactly one key pair, so nothing
in the dashboard would distinguish that traffic. `Dockerfile:23` and `webpack.config.js:335-336` are
the two fail-open defaults; `build.sh:129` is the safe path.

⚠️ **The wrong outcome is the one you get by omission, and nothing warns you.** **The owner knows this
and chose to wait.** It is recorded here so it is not mistaken for handled.

📌 **UPDATE 2026-09-07 — this risk now has its own task:
[`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md), on the Backlog board, on an owner
ruling given live in session.** ⛔ **It is still NOT fixed and still NOT scheduled** — a brief on an
unranked board is a record, not a mitigation, and this box stands unchanged. ⚠️ **`0226` does not
close `0224`:** it removes a *mechanism*, it does not identify the cause of the 3–4 Sep spike, and
`0226` carries the same arithmetic caution recorded further below.

### ⚠️ The 3–4 Sep spike — the owner's read, recorded as a HYPOTHESIS

The owner's own read is that the spike **likely came from their local/dev testing rather than from
production code**.

🚨 **THIS IS A HYPOTHESIS THE OWNER FINDS PLAUSIBLE. IT IS NOT A VERIFIED CAUSE.** Nothing has been
measured, no build was traced, and the arithmetic (whether a few testers can move a metric averaged
over ~5K daily users) has **not** been shown to work. The pre-existing analysis further below explains
exactly how this read could be wrong — **that analysis still stands and was not refuted; it was simply
not pursued.**

⛔ **Do not write down that the spike was caused by dev testing.** The spike is **unexplained**.

## ➡️ THE ACTUAL NEXT STEP IS THE OWNER'S WATCH PERIOD

The owner will **watch the analytics over the coming days and report back** whether the problem is
still there.

🚨 **COMPLETING THIS TASK IS NOT THE SAME AS THE PROBLEM BEING RESOLVED.** This task closes when the
interval change lands. Whether the per-user event budget is actually healthy is decided later, by the
owner's observation — and if the problem persists, the deferred items above are where the work
resumes.

---

## The problem, stated precisely

GameAnalytics is showing this banner:

> **Limit Exceeded:** Total number of events per active user (per day) has exceeded the limit of
> **500**.

🔴 **READ THAT PRECISELY. This is a PER-ACTIVE-USER-PER-DAY limit. It is NOT a total-volume limit.**

It is a statement about **a chatty client** — how many events one player generates in a day — **not**
about the game being popular or getting too much traffic. **A brief, plan, or fix that frames this as
"too much traffic" or "we outgrew the plan" has misread the banner** and will chase the wrong
remedy (a bigger plan) instead of the right one (fewer events per player).

---

## The evidence

⚠️ **STATUS OF EVERY FIGURE IN THIS SECTION: these are OBSERVATIONS read off the GameAnalytics UI by
the lead session on 2026-09-06.** They are numbers a human read from a dashboard. They are **not**
derived, not recomputed, and not re-queried from an API. Treat them as reliable enough to direct the
investigation and **not** reliable enough to quote as exact in any downstream artifact without
re-reading the dashboard.

### Integration page — what is actually tracked

- 🔴 **Only Design events are tracked.** Resource, Progression, Health, Business, Ad and Impression
  events all read **"Not tracking"**. ⇒ **100% of the per-user budget is spent on design events.**
  There is no other event type competing for it, and no other event type to move volume into without
  building it first.
- Total design events sent **5 Sep: 667.97K**.

### Design-event cardinality — a SECOND, SEPARATE metric

Distinct design-event names per day: **~103–105 all week, rising to 118 on 5 Sep.**

⚠️ **This is NOT the metric that breached, and it is NOT resolved — it is trending UP.** The breached
metric (events per user) fell back under the limit on 5 Sep; cardinality rose on the same day. Do not
let the first one going green imply anything about the second.

🚨 **What could NOT be established, recorded as an OPEN QUESTION and not as a finding:** the
cardinality chart carried **no "Limit reached" badge**, and the **"Dropped events" toggle was
disabled/greyed out**, so the lead **could not determine** whether a cardinality limit is being
breached or whether anything is being dropped. ⛔ **Nobody may write down "events are being dropped"
or "cardinality is fine" — neither is known.** See work-plan step 4.

### Events per active user per day — THE BREACHED METRIC

| Day | Events per user |
|---|---|
| 30 Aug | ~150 |
| 31 Aug | ~250 |
| 1 Sep | ~180 |
| 2 Sep | ~170 |
| 3 Sep | **414.88** |
| 4 Sep | **1,324.33** ← **the breach — 2.6× the 500 limit** |
| 5 Sep | **162.79** ← back under the limit |

DAU is **~4.2K–5.5K/day** (22.71K unique users over 7 days) ⇒ 4 Sep was roughly **7 million events in
one day** against a normal ~700K.

🔴 **7-day mean: 581.97 events per user — ABOVE 500 as an average, even though only ONE day breached.**
⚠️ **This is the reason the task does not end when the spike is explained.** Even discounting 4 Sep
entirely, the baseline sits at roughly a third of the limit with no headroom for a bad day.

### 🚨 Breakdown by top-level category — `Custom event count per user`, split by `Event id 01`

| Day | Performance | Player | Experiment | Session | Match | Platform | Device | Game | UI | Worker |
|---|---|---|---|---|---|---|---|---|---|---|
| 30 Aug | 109.54 | 10.95 | 7.38 | 11.86 | 22.25 | 3.76 | 3.76 | 8.31 | 7.06 | 3.39 |
| 31 Aug | 215.87 | 15.16 | 10.01 | 18.74 | 31.72 | 5.11 | 5.11 | 13.28 | 8.77 | 4.85 |
| 1 Sep | 123.79 | 12.45 | 8.27 | 13.81 | 26.31 | 4.18 | 4.18 | 9.92 | 6.98 | 3.97 |
| 2 Sep | 115.65 | 11.97 | 7.99 | 12.71 | 25.87 | 4.00 | 4.00 | 9.26 | 6.66 | 3.83 |
| 3 Sep | 177.21 | 75.11 | 51.58 | 37.24 | 31.57 | 26.18 | 26.18 | 12.78 | 8.62 | 4.85 |
| **4 Sep** | 185.54 | **405.39** | **359.09** | **127.39** | 31.79 | **122.41** | **122.41** | 13.14 | 8.35 | 4.92 |
| 5 Sep | 114.03 | 11.67 | 7.84 | 12.45 | 26.16 | 3.94 | 3.94 | 8.81 | 7.03 | 3.65 |

---

## The four conclusions this table forces

### 1. 🟢 `0208` IS EXONERATED — state this plainly and do not re-raise it

The **`Match`** category **did not move across the spike**: `25.87` (2 Sep) → `31.79` (4 Sep) →
`26.16` (5 Sep). Normal week-day variance, nothing more.

[`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md)'s
`Match:WinCondition` and `Match:Leaderboard:Award` instrumentation went live in build **`0.0.141`**
and is **not the cause of this banner**.

🚨 **RECORDED AS REFUTED, ON PURPOSE.** The lead session's **first** hypothesis on seeing the banner
was that `0208`'s `WinCheckExecution` latch had failed and was emitting every 10 ticks. **The table
above refutes that hypothesis** — a broken latch in `Match` would show as a `Match` spike, and `Match`
is flat. ⛔ **Do not re-open this line of inquiry without new evidence that contradicts the table.**

### 2. 🔴 The SPIKE is `Player` + `Experiment` (plus `Session`, `Platform`, `Device`) — and it is GONE

| Category | 2 Sep → 4 Sep | Multiple |
|---|---|---|
| **Player** | 11.97 → **405.39** | **~34×** |
| **Experiment** | 7.99 → **359.09** | **~45×** |
| **Session** | 12.71 → **127.39** | **~10×** |
| **Platform** | 4.00 → **122.41** | **~31×** |
| **Device** | 4.00 → **122.41** | **~31×** |
| *Performance* | *115.65 → 185.54* | *~1.6× — barely moved* |
| *Match* | *25.87 → 31.79* | *~1.2× — did not move* |

It **ramps on 3 Sep, peaks on 4 Sep, and is completely gone on 5 Sep** — every category back to
baseline.

### 3. 🔴 The STANDING problem is DIFFERENT from the spike, and it is the real reduction target

**`Performance` is the largest consumer on a NORMAL day** — **109–216 events per user per day**,
which is roughly **two-thirds of the entire normal daily total of ~163**. On 31 Aug it alone reached
**215.87**, i.e. **43% of the whole 500 limit from one category, on a day with no spike at all.**

⚠️ **Even if the spike is fully explained and never recurs, this is the category to cut first.** It is
what makes the 7-day mean 581.97. It is what leaves zero headroom.

### 4. ⚠️ `Platform` and `Device` are byte-identical on EVERY day — and this brief believes it knows why

`3.76/3.76`, `5.11/5.11`, `4.18/4.18`, `4.00/4.00`, `26.18/26.18`, `122.41/122.41`, `3.94/3.94`.

The lead flagged this as a lead — *"not plausible as two independent counters"*. **This brief
investigated it in code and offers an explanation, labelled as an explanation and not as a verified
fact** (see *Code grounding* below): **both are emitted unconditionally, once per session, from the
same consecutive block of session-start code** (`src/client/flashist/FlashistFacade.ts:440` and
`:459`). Two counters that are always incremented together in the same code path will be identical
every day. ✅ **That is an expected identity, not a duplication bug.**

⚠️ **This is a code-reading inference, not a measurement.** Step 5 still confirms it against the data
rather than closing it on this paragraph.

---

## Code grounding — read from the repository on 2026-09-06

⚠️ **Everything in this section was read from source files this session and is verified as CODE.**
None of it is verified as the CAUSE of the numbers above. It is offered to make the work plan
concrete, not to pre-empt the investigation.

### 🔴 A. `Performance` is emitted on a wall-clock timer, not per match — this is why it dominates

`src/client/PerformanceMonitor.ts` runs a **`setInterval` at 60 000 ms** (`:56`) and, on every tick
that is not `document.visibilityState === "hidden"`, emits:

- one **FPS bucket** event (`Performance:FPS:Above30` / `:15to30` / `:Below15`) — `:37`
- one **`Performance:FPSAverage`** event carrying the fps value — `:38`
- one **memory-pressure** event (`Performance:Memory:High` / `:Medium` / `:Low`) — `:54`, emitted only
  where `performance.memory` exists (Chrome/Chromium)

⇒ **2 to 3 events per minute of visible page time, per player, forever.** One hour with the page open
is **120–180 events** — with or without a match being played.

📌 **This arithmetic is consistent with the observed 109–216/user/day** (≈40–70 minutes of visible
page time per user per day), but **consistency is not proof** — do not record it as confirmed.

🎯 **This is the single most promising reduction lever in the whole task, and it is cheap:** the fix
is sampling, a longer interval, a per-session cap, or dropping the redundant pair (`FPSAverage`
already carries the number that the three bucket events re-encode). ⚠️ **Which of those is a decision,
not an obvious call** — see *What to build*, Q2.

It is started once, from `src/client/Main.ts:757`, and returns a stop function — so a **duplicate
interval** is not obviously possible, but **step 3 should still confirm the stop function is actually
called on every teardown path**, because a leaked interval would multiply this category silently.

### 🔴 B. `Player`, `Experiment`, `Session`, `Platform`, `Device` are ALL once-per-SESSION emitters

They fire from the session-start path in `src/client/flashist/FlashistFacade.ts`:
`Session:Start` (`:415`), `Device:*` (`:440`), `Platform:*` (`:459`), `Player:New` / `Player:Returning`
(`:466`, `:468`), and the `Experiment:*` cohort events via `logExperimentEvents()` (`:584`).

🚨 **This produces a testable prediction that the observed table MATCHES.** If the number of
**sessions per user** exploded on 3–4 Sep while actual **play time and matches did not**, you would
see exactly the observed shape: every once-per-session category up 10–45×, while `Performance`
(per-minute-of-page-time) and `Match` (per-match) stay flat.

⇒ **The spike looks like SESSION CHURN — many page loads per user — not like a chatty new event.**

⚠️ **This is a hypothesis derived from reading code against the lead's table. It is NOT verified.** It
is written down because it sharpens step 1 into something specific to look for, not because it is
settled.

### 🔴 C. There is exactly ONE GameAnalytics key pair, and the dev/prod separation is `DEPLOY_ENV` alone

`src/client/flashist/FlashistFacade.ts:399` gates the entire GameAnalytics setup behind
**`process.env.DEPLOY_ENV === "prod"`**, and the `initialize()` call a few lines below passes **a
single hardcoded key pair**.

🔴 **CONSEQUENCE, AND IT IS THE CENTRAL FACT FOR STEP 1: dev and prod CANNOT be separated by key,
because there is only one key.** The separation is **entirely** `DEPLOY_ENV`. If a build reaches the
dev server with `DEPLOY_ENV=prod`, **its traffic lands in the production GameAnalytics game**, and
nothing in the dashboard would distinguish it.

🚨 **AND THE BUILD CHAIN DEFAULTS TO `prod`:**

| Location | What it does |
|---|---|
| `Dockerfile:23` | **`ARG DEPLOY_ENV=prod`** — the Docker build's **default** is `prod` |
| `webpack.config.js:335-336` | `process.env.DEPLOY_ENV ?? (isProduction ? "prod" : "dev")` — a **production webpack build with the variable unset also resolves to `prod`** |
| `build.sh:129` | ✅ **The sanctioned path is SAFE** — it passes `--build-arg DEPLOY_ENV="$DEPLOY_ENV"` explicitly, and `build.sh:30` rejects anything that is not `prod`/`staging`/`dev` |

⇒ **The sanctioned `build-deploy.sh` → `build.sh` path does the right thing. Any build that does NOT
go through it — a direct `docker build`, a hand-rolled local build, a one-off image — silently gets
`DEPLOY_ENV=prod` and starts writing into production analytics.** ⚠️ **This is a fail-OPEN default:
the wrong outcome is the one you get by omission.**

⛔ **Nothing here establishes what actually built the 4 Sep dev image.** That is exactly step 1.

### ⚠️ D. `Experiment:*` event names are built at RUNTIME from Yandex flags — unbounded cardinality

Per `ai-agents/knowledge-base/analytics-event-reference.md:387-395`: the convention is
`Experiment:{flagName}:{flagValue}`, the string is **built at runtime from the raw Yandex flag key and
value**, there is **no enum constant**, and *"adding a new flag in the Yandex dashboard is
sufficient"* for new event names to start firing.

🔴 **⇒ Design-event CARDINALITY can rise with NO code change and NO deploy, driven entirely by the
Yandex A/B dashboard.** This is a plausible mechanism for the 103 → 118 distinct-name trend, and it
means the cardinality question (step 4) cannot be answered by reading the enum alone.

### 📌 E. A hygiene observation, recorded but NOT this task's scope

The GameAnalytics key pair is **hardcoded in `src/client/flashist/FlashistFacade.ts` and committed**.
⚠️ **This is not automatically a leak** — GameAnalytics client SDK keys are shipped into every
browser bundle by design, so they are public by nature. It is recorded here **only** because it is the
reason C above holds (one key, no dev/prod key split). 🔒 **The values are deliberately not reproduced
in this brief, and must not be copied into any artifact.** If the owner wants this reviewed as a
hygiene matter, it is a **separate** brief.

---

## The lead's hypothesis for the 3–4 Sep spike — 🔴 UNVERIFIED

The owner said on ~4 Sep: *"I've just deployed the build to the dev server for test."*

**If the dev server's build shipped with `DEPLOY_ENV=prod`, dev/QA testing writes into the production
GameAnalytics game and inflates the per-user metric.** The timing fits exactly — ramp 3 Sep, peak
4 Sep, gone 5 Sep once testing stopped — and QA testing is **repeated page reloads**, which is
precisely the session-churn signature described in **B** above (once-per-session categories up 10–45×,
`Performance` and `Match` flat).

🚨 **THIS IS A HYPOTHESIS WITH A MATCHING TIMELINE AND A MATCHING MECHANISM. IT IS NOT A VERIFIED
CAUSE.** Three independent things point the same way — the owner's statement, the shape of the table,
and the fail-open `DEPLOY_ENV` default. **Three consistent indications are still not a measurement.**

⚠️ **The specific way this hypothesis could be WRONG, stated so nobody stops looking too early:** a
handful of QA testers cannot move a metric averaged over **~5,000 daily users** unless either (a) the
dev traffic is counted against a much smaller user base than the 22.71K figure suggests, or (b) each
tester generated an enormous number of sessions. ⛔ **If step 1 confirms a shared key, the arithmetic
must ALSO be shown to work.** A confirmed shared key that cannot account for a 34× move means
something else is also happening.

**Verifying it is step 1 because it is cheap and it would settle the largest unknown.**

---

## What to build

⚠️ **THIS WHOLE SECTION PREDATES THE 2026-09-06 NARROWING RULING AT THE TOP.** Only the interval
change inside step 3 is in scope. **Steps 1, 2, 4 and 5 are DEFERRED — kept here in full as the
record of what was found and what is still unanswered, not as work to do now.**

### Work plan — in this order

**⏸️ Step 1 — DEFERRED (owner ruling 2026-09-06). Verify or refute the shared-key hypothesis.**
- Determine how the build deployed to the dev server on ~3–4 Sep was produced, and what `DEPLOY_ENV`
  it carried. `Dockerfile:23`, `webpack.config.js:335-336`, `build.sh:129` are the three places that
  decide it.
- 🔴 **Do the arithmetic too** — show whether the volume of dev/QA traffic can actually account for a
  34–45× move in the once-per-session categories. **A confirmed shared key that does not account for
  the magnitude is a partial answer, and must be reported as partial.**
- **If confirmed:** propose a guard so it cannot recur silently — the fail-open `ARG DEPLOY_ENV=prod`
  default is the specific thing to fix. **Do not just note it and move on.**
- **If refuted:** say so plainly, and the spike becomes an open investigation. ⛔ **Do not quietly
  fold an unexplained 34× spike into "we reduced Performance events."**

**⏸️ Step 2 — DEFERRED (owner ruling 2026-09-06). Enumerate every analytics event: name, trigger, and
expected per-session frequency.**
- Sources of truth, per `CLAUDE.md`: **`ai-agents/knowledge-base/analytics-event-reference.md`** and
  the **`flashistConstants.analyticEvents` enum** in `src/client/flashist/FlashistFacade.ts`.
- ⚠️ **The enum is NOT sufficient on its own** — `Experiment:*` names are built at runtime and have no
  enum entry (**D** above). An enumeration that only walks the enum will miss the fastest-growing
  category.
- Produce a table: event → trigger → **expected events per session** and **per hour of page time**.
  🎯 **The per-hour column is the one that matters** — it is what a timer-driven emitter shows up in.

**✅ Step 3 — THE ONLY STEP IN SCOPE. Raise the `Performance:*` emit interval, 60 s → 300 s.**
- `src/client/PerformanceMonitor.ts` (**A** above): the `setInterval` at `:56` currently runs at
  **60 000 ms**, emitting 2–3 events per tick. **Change it to 300 000 ms.** That is the whole change.
- ⛔ **Do not also drop the FPS bucket events, add a per-session cap, or add sampling.** Those are Q2
  candidates the owner **deferred, not rejected** — adding one now exceeds the ruling.
- ⚠️ Keep the emitted event names and shapes unchanged, so nothing needs renaming and the enum stays
  the only source of event strings.
- 📌 **`analytics-event-reference.md` is only touched if an event is added, renamed, or removed.** A
  pure interval change removes no events — **check the reference for any documented emit frequency and
  correct it if it states one**, but do not invent an edit.
- ⏸️ **DEFERRED, not done here:** confirming the returned stop function is called on **every** teardown
  path from `src/client/Main.ts:757`. A leaked interval would still multiply this category invisibly —
  **that check remains unmade.**

**⏸️ Step 4 — DEFERRED (owner ruling 2026-09-06). Settle the cardinality question against the
account's ACTUAL plan.**
- Find GameAnalytics' **documented design-event cardinality allowance** and check it against **the
  plan this account is actually on**. ⛔ **Do not assume the plan** — check it.
- Establish whether anything **is being dropped**. The dashboard's "Dropped events" toggle was greyed
  out for the lead; if it cannot be enabled, **say that it could not be determined** rather than
  inferring.
- Feed **D** (runtime-built `Experiment:*` names) into the answer — cardinality here is driven by the
  Yandex flag dashboard, not only by code.

**⏸️ Step 5 — DEFERRED (owner ruling 2026-09-06). Close out the `Platform`/`Device` identity.**
- Confirm against the data that it is the expected same-code-path identity described in conclusion 4,
  **not** a duplicated emission. ⚠️ **The code reading in this brief is a strong lead, not a
  closure.** If it is confirmed expected, **write that down** so the identity is not re-raised as a
  bug later.

### The decisions — ✅ ALL THREE PUT TO THE OWNER AND ANSWERED 2026-09-06

**The three questions below were asked. The rulings are recorded at the top of this brief. They are
kept here in their original wording so a later reader can see what was actually asked.**

| Question | Ruling 2026-09-06 |
|---|---|
| **Q1** reduction target | ⏸️ **Not set.** Owner not confident ruling on it now. |
| **Q2** what gets cut from `Performance:*` | ✅ **Interval 60 s → 300 s, and nothing else.** Other candidates deferred, **not rejected on merit**. |
| **Q3** `DEPLOY_ENV` fail-open default | ⏸️ **Deferred, not fixed.** 🚨 Remains a **standing, unmitigated risk** — see the risk box at the top. |

**The original wording of the three questions, kept for the record:**

**Q1 — The reduction target.** What is "enough headroom"? The producer's recommendation is
**a ceiling of ~150 events per user per day (30% of the 500 limit)**, chosen so that a bad day at 3×
baseline still lands under the limit — 4 Sep was 8× baseline, and no realistic target survives that,
so the target is about **normal-day headroom**, not spike-proofing. ⚠️ **Recommendation only. The
owner sets the number, because a lower number costs analytics fidelity.**

**Q2 — What gets cut from `Performance:*`, and what analytics fidelity is being given up.**
Sampling (e.g. 1 in N users), a longer interval, a per-session cap, or dropping the three FPS bucket
events in favour of the `FPSAverage` value they re-encode. ⚠️ **Each one loses something different;
the owner should choose knowingly rather than have a coder pick.**

**Q3 — Whether the `DEPLOY_ENV` fail-open default gets fixed as part of this task** or split into its
own brief. ⚠️ **It is a build-chain change, not an analytics change** — different risk, different
verification. **Producer's recommendation: fix it here if step 1 confirms it caused the spike;
otherwise split it out.**

### 🔒 Constraints the fix must respect — from `CLAUDE.md`

- ⛔ **Event strings are NEVER written inline.** Always reference through the
  `flashistConstants.analyticEvents` enum key.
- 🔴 **`ai-agents/knowledge-base/analytics-event-reference.md` MUST be updated whenever events are
  added, renamed, or removed.** **This task will remove or change events — so this is not optional
  housekeeping, it is part of the deliverable.**
- All user-visible text via `translateText(key)`, with `en.json` **and** `ru.json` kept in sync — if
  any UI is touched at all (it probably is not).
- 🔒 **No secrets in any artifact.** ⚠️ **Specifically: do NOT record the GameAnalytics Game key or
  Secret key, and do NOT record the numeric dashboard ID or any URL containing it** — in this brief,
  the worklog, the plan, a report, or a commit message. **Names and file:line references only.**

---

## Acceptance criteria

**⚠️ REVISED 2026-09-06 to match the narrowed scope. The earlier criteria — spike cause, full event
enumeration, a Q1 target, a recurrence guard, cardinality answered — described the wide task and are
NOT the bar any more. They are ⏸️ deferred along with the work they measured, and are preserved in the
work plan above.**

🚨 **"THE BANNER IS GONE" IS STILL NOT ACCEPTANCE, AND THIS MATTERS MORE NOW, NOT LESS.** The metric
**already self-resolved on 5 Sep** (162.79, under 500) **with no change made whatsoever**. A criterion
of the form *"the warning went away"* or *"the metric is under 500"* **would pass today with zero code
written.** ⛔ **Never accept this task on that basis.**

📌 **OUTCOME AT CLOSE (2026-09-07): 1, 2, 5, 6, 7, 8 met — 🚨 3 and 4 NOT met and NOT meetable as
written.** See **§3 of the closing note** at the top of this brief: `0225` cuts the same
`Performance` column and ships in the same build, so the dashboard cannot attribute the drop to this
task. **They are recorded as unmet, not waived.**

Acceptance is **the interval change landing, and its effect being observable and attributable**:

1. **`src/client/PerformanceMonitor.ts` emits on a 300 000 ms interval**, changed from 60 000 ms. ✅
   Met — via the `SAMPLE_INTERVAL_MS` constant at **`:6`**, applied at `:67`. ⚠️ The `:56` this
   criterion originally cited is **stale**; see *Correction 1* in the IN SCOPE section.
   The event names and payload shapes are unchanged.
2. **Nothing else was changed.** ⛔ No FPS bucket events dropped, no per-session cap, no sampling, no
   `DEPLOY_ENV` change. Those are **deferred, not rejected** — shipping one anyway exceeds the ruling.
   ✅ Met **as amended** — none of the four forbidden items shipped. ⚠️ But *"nothing else"* read
   literally is **false**: the owner's own approved plan added the hidden-tab `visibilitychange` fix
   and the `Performance:Memory:*` doc de-inversion the same day. See *Correction 2* in the IN SCOPE
   section. **Neither changes event volume.**
3. **The `Performance` per-user figure is read from the dashboard before and after, as two numbers**,
   once the change has been live long enough for a clean day. **The observable effect is a drop in the
   `Performance` column specifically** — roughly 5×, per the estimate at the top. ⚠️ **That estimate
   is arithmetic, not a measurement — the after-number is what settles it.**
4. **The reduction is attributed to the `Performance` category, not asserted in aggregate.** A lower
   overall total with a flat `Performance` column would mean something else moved and this change did
   nothing.
5. 🚨 **The task's closing note states plainly that the 3–4 Sep breach is UNEXPLAINED and UNADDRESSED
   by this change**, and that the once-per-session categories that actually breached were not touched.
   ⛔ **Closing this task without that sentence written down is a failure of the task**, because it is
   the exact thing a later reader would get wrong.
6. **`analytics-event-reference.md` is checked** — updated if it documents an emit frequency that this
   change makes wrong; **explicitly recorded as "no change needed"** if it does not. No event is added,
   renamed, or removed, so a rewrite is not expected.
7. 🔒 **No key, secret, or dashboard ID appears in any artifact produced by this task.**
8. `npm test` green; `npm run lint` clean.

⏸️ **NOT acceptance criteria any more, and NOT resolved:** the spike's cause, the 7-day mean under a
target, a full event enumeration, the `DEPLOY_ENV` guard, the cardinality question. **All still open.**

---

## Verification steps

1. **Read `src/client/PerformanceMonitor.ts:6` and confirm the interval constant is 300 000 ms.**
   ⚠️ **`:56` was the original wording and is stale** — the value is a module constant
   (`SAMPLE_INTERVAL_MS`) at `:6`, applied to the `setInterval` at `:67`. ✅ Confirmed at close.
2. `npm test` green; `npm run lint` clean.
3. **After the change is live, re-read the dashboard's per-category breakdown** in the same shape as
   the table above, and **record the `Performance` per-user figure before and after as two numbers**.
   ⚠️ The before-number is **109–216/user/day**, itself a dashboard observation, not a derived value.
4. **State plainly whether the drop actually landed in the `Performance` column**, and do not let a
   green overall metric stand in for it — **5 Sep was already green with no change made.**
5. **State plainly that the 3–4 Sep spike remains unexplained** and that this change does not address
   it. ⛔ **Do not let a green metric imply the breach was fixed.**
6. **Hand the result to the owner for their watch period** — they decide whether the problem persists.
   ⚠️ **This task closing is not the problem being resolved.**

⏸️ **Deferred verification, not performed:** proving a `DEPLOY_ENV` guard fires; the full 7-day-mean
re-read against a target; confirming the `PerformanceMonitor` stop function runs on every teardown
path.

---

## Notes

- **Filed 2026-09-06 by a spawned `fkit-producer`**, from evidence the lead session read directly off
  the GameAnalytics dashboard the same day, on the owner's instruction that this be its own brief on
  Sprint 4 and taken next.
- **Two kinds of claim are deliberately kept apart in this brief:** dashboard **observations** (the
  tables — read by a human, not derived) and **code facts** (the *Code grounding* section — read from
  the repository this session). **Where this brief connects the two, it is labelled a hypothesis.**
  ⚠️ **The only thing verified as a CAUSE so far is what `0208` is NOT.**
- **Narrowed 2026-09-06 by a spawned `fkit-producer`**, recording an owner ruling given live in the
  lead session. **The scope went from a five-step investigation to a single interval change.** ⚠️ **The
  evidence tables and the deferred investigation steps were deliberately KEPT, not deleted** — they are
  the record of why this was looked at at all, and the owner explicitly plans to revisit if the problem
  recurs.
- ⚠️ **This brief now asserts two owner rulings:** that the task is next in work order (2026-09-06),
  and that its scope is the `PerformanceMonitor` interval change alone (2026-09-06). **Q2 is answered;
  Q1 and Q3 are deferred without an answer, and Q3 leaves a live, unmitigated risk.**
- 🚨 **The spike is unexplained and this task does not fix it.** The owner's read — local/dev testing
  rather than production code — is a **plausible hypothesis, not a verified cause.**
- ➡️ **The real next step is the owner's watch period**, not this task's completion.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — file names and `file:line` references only.
</content>
</invoke>
