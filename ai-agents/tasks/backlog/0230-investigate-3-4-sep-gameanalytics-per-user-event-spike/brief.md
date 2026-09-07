# INVESTIGATION — find the mechanism behind the 3–4 Sep GameAnalytics per-user event spike

## ID
0230

## Sprint
Sprint 4

## Status
🔲 Backlog

## Owner
fkit-coder

## Priority
Medium–High *(**position OWNER-RULED 2026-09-07**; the `Medium–High` label itself is the producer's)*

🔴 **THE OWNER RULED THIS ROW'S POSITION, 2026-09-07, given live in session and relayed through the
spawning session. Authority first: this is an OWNER RULING, not a producer re-rank, and it is NOT
producer precedent for re-ranking anything else.**

**The ruling: this row sits ABOVE the `PerformanceMonitor` family**
([`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md),
[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md),
[`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md)) on the Sprint 4 board — directly below
[`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md), the task that handed it
its unfinished half.

The owner accepted the producer's reasoning **verbatim**: this is the **only open task on the category
that actually breached**, while the `Performance` category those three tasks cut **barely moved across
the spike** (~109 → ~185, ~1.6×) against a total that went ~150 → 1,324.

⚠️ **It was first APPENDED at the bottom of the board on filing** — fkit's **ADR-035** bars a producer
from inserting a new row above a board's closed rows, so appending was the only mechanically permitted
placement — **and then moved on this ruling.** The move places an open row above closed rows, which
ADR-035 normally bars; **the owner lifted it for this one move.** ✅ **No closed row was altered:** this
board's Priority column carries word ranks, not `P<n>` numbers, so nothing was renumbered — only
position changed.

⚠️ **The `Medium–High` label is still the PRODUCER's and was not owner-ruled.** The owner ruled the
row's **position**, not its label.

📎 *ADR-035 is cited by name, never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs, which live in the fkit install share. This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link would not resolve.*

---

## Context

**Owner ruling, given live 2026-09-07: track this.** It was raised at the close of
[`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md) and added to Sprint 4 on the owner's
instruction.

### 🚨 This is the actual standing risk, and it survives every change shipped so far

GameAnalytics raised a **Limit Exceeded** banner: *total number of events per active user (per day)
exceeded the limit of **500***. 🔴 **Read that precisely — it is a PER-ACTIVE-USER-PER-DAY limit, not
a total-volume limit.** It is a statement about **a chatty client**, not about the game being popular.
A plan that frames this as "too much traffic" has misread the banner and will chase a bigger plan
instead of fewer events per player.

`0224` cut the `Performance` sampling interval from 60 s to 300 s. **That change lowers the standing
baseline and does not touch the spike mechanism.** The arithmetic, taken from `0224`'s evidence:

| | Before | After `0224`'s ≥5× `Performance` cut |
|---|---|---|
| A normal day | ~150–250 events/user | **~62–81/user — 12–16% of the 500 limit** |
| **4 Sep (the breach)** | **1,324.33/user — 265% of the limit** | **~1,176/user — still 235% of the limit** |

⛔ **A repeat of 4 Sep would still breach the limit by more than double.** That is why this task
exists.

### What is known — and the sharp line between observation and inference

⚠️ **Every figure below is an OBSERVATION read off the GameAnalytics UI by the lead session on
2026-09-06.** A human read them from a dashboard. They are **not** derived, not recomputed, and not
re-queried from an API. Reliable enough to direct this investigation; **not** reliable enough to quote
as exact without re-reading the dashboard.

**Events per active user per day:**

| Day | Events per user |
|---|---|
| 30 Aug | ~150 |
| 31 Aug | ~250 |
| 1 Sep | ~180 |
| 2 Sep | ~170 |
| 3 Sep | **414.88** ← ramping |
| 4 Sep | **1,324.33** ← the breach |
| 5 Sep | **162.79** ← back under, with no change made |

**Breakdown by top-level category (`Custom event count per user`, split by `Event id 01`):**

| Day | Performance | Player | Experiment | Session | Match | Platform | Device | Game | UI | Worker |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 Sep | 115.65 | 11.97 | 7.99 | 12.71 | 25.87 | 4.00 | 4.00 | 9.26 | 6.66 | 3.83 |
| 3 Sep | 177.21 | 75.11 | 51.58 | 37.24 | 31.57 | 26.18 | 26.18 | 12.78 | 8.62 | 4.85 |
| **4 Sep** | 185.54 | **405.39** | **359.09** | **127.39** | 31.79 | **122.41** | **122.41** | 13.14 | 8.35 | 4.92 |
| 5 Sep | 114.03 | 11.67 | 7.84 | 12.45 | 26.16 | 3.94 | 3.94 | 8.81 | 7.03 | 3.65 |

**Multiples, 2 Sep → 4 Sep:** `Player` ~34× · `Experiment` ~45× · `Session` ~10× ·
`Platform`/`Device` ~31× · *`Performance` ~1.6× (barely moved)* · *`Match` ~1.2× (did not move)*.

DAU is **~4.2K–5.5K/day** (22.71K unique users over 7 days) ⇒ 4 Sep was roughly **7 million events in
one day** against a normal ~700K.

### 🟢 Already settled — do NOT re-open without new evidence

- **[`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is EXONERATED.**
  The `Match` category did not move across the spike (25.87 → 31.79 → 26.16). The lead's first
  hypothesis — that `0208`'s `WinCheckExecution` latch had failed and was emitting every 10 ticks —
  is **refuted by that table**. A broken latch in `Match` would show as a `Match` spike.
- **The spiking categories are once-per-SESSION emitters.** `Player`, `Experiment`, `Session`,
  `Platform` and `Device` are emitted from one consecutive block in
  `src/client/flashist/FlashistFacade.ts` (`:415`, `:440`, `:459`, `:466`, `:584`) — read from the
  repo 2026-09-06. This is a **code fact**. That the block ran more often is the **inference**, and it
  is what this task must establish.
- **`Platform` and `Device` are byte-identical on every single day** — `3.76/3.76`, `4.00/4.00`,
  `122.41/122.41`. The same-code-path reading above explains it as an expected identity rather than a
  duplication bug. ⚠️ **A code-reading inference, still unconfirmed against data.**

### 🚨 Hypotheses on the table — NONE verified, and none may be written down as the cause

1. **The owner's read: the spike came from their own local/dev testing, not production code.** The
   owner finds this plausible. ⛔ **It is a HYPOTHESIS, not a verified cause.** No build was traced,
   and the arithmetic — whether a handful of testers can move a metric **averaged over ~5K daily
   users** — has never been shown to work. This is the single most important thing to settle, in
   either direction.
2. **The `DEPLOY_ENV` fail-open channel that would make (1) possible.** There is exactly **one**
   hardcoded GameAnalytics key pair, so dev and prod **cannot** be separated by key — the separation is
   `DEPLOY_ENV` alone (`FlashistFacade.ts:399`), **and the build chain fails open to `prod`**:
   `Dockerfile:23` defaults `ARG DEPLOY_ENV=prod`, and `webpack.config.js:335-336` resolves an unset
   variable to `prod` on a production build. The sanctioned `build-deploy.sh` → `build.sh:129` path is
   safe; anything bypassing it writes silently into production analytics. ⚠️ **This is the MECHANISM
   that would let (1) be true. It is not evidence that (1) IS true.** Tracked separately as
   [`0226`](../0226-deploy-env-fails-open-to-prod-analytics/brief.md) — **still unfixed and
   unscheduled.**
3. **A per-session re-entry mechanism inside the client** — anything that re-runs the once-per-session
   emitter block within one user's day. The three `PerformanceMonitor` leak tasks
   ([`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md),
   [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md),
   [`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md)) all show the client re-entering
   game-lifecycle paths without clean teardown. ⚠️ **None of them is known to touch the session
   emitters, and none is being asserted as the cause here** — the pattern is a place to look, nothing
   more.
4. **Something else entirely.** ⛔ **Do not pre-judge.** The spike ramped on 3 Sep, peaked on 4 Sep and
   was completely gone on 5 Sep, with **every** category back to baseline. Any explanation must
   account for all three days, including the clean disappearance.

### ⚠️ Two data caveats — unresolved, recorded, and NOT called wrong

Raised at `0224`'s close 2026-09-07. Neither is being called an error; both were read off the UI by a
human and are **unexplained**.

1. **The per-category figures do not sum to the reported daily totals.** The two tables above are both
   dashboard observations and they do not reconcile. Nobody has established which is right, or whether
   a category is missing from the split.
2. **`0224`'s "7-day mean: 581.97" cannot be reproduced from its own daily rows** — those rows average
   **378.86**. ⚠️ This matters beyond bookkeeping: the "the mean is above 500" framing appears twice in
   `0224` as the reason the baseline has no headroom. **If 378.86 is right, that framing is
   overstated.**

**Settling these is in scope**, because an investigation that trusts an unreconciled table can reach a
confident wrong answer.

---

## What to build

**Nothing. This is an INVESTIGATION.** ⛔ **Do not ship a fix from this task.** Its deliverable is a
**findings report** naming the mechanism — or naming precisely what was ruled out and what evidence is
still missing. A fix, if one is warranted, is a **separate brief** written after the owner reviews the
findings.

### Lines of inquiry — a starting order, not a fixed script

1. **Settle the arithmetic on hypothesis 1 first, because it is cheap and it is decisive in either
   direction.** Take the observed DAU (~4.2K–5.5K) and the observed 4 Sep per-user figure, and
   establish **how many extra sessions** would have to exist to move the average that far. Then ask
   whether that number is reachable by a handful of testers. ⚠️ **If the arithmetic does not work,
   hypothesis 1 is refuted and something else is happening — say so plainly.** ⚠️ **If it does work,
   that is consistency, not proof** — it makes the hypothesis viable, nothing more.
2. **Reconcile the two dashboard tables** (caveat 1) and **re-derive the 7-day mean** (caveat 2) from
   the daily rows. Re-read the dashboard rather than trusting the numbers transcribed above.
3. **Establish whether the once-per-session emitter block can run more than once per session**, and
   under what conditions. `FlashistFacade.ts:415/440/459/466/584` is the block; the question is what
   calls into it and whether any client path re-enters it. ⚠️ Note that `Experiment:*` event **names
   are built at RUNTIME from Yandex flags** — they have no enum entry, so **cardinality and volume can
   both change with no code change and no deploy.** That is a real, un-instrumented input.
4. **Try to distinguish dev traffic from production traffic in the data.** ⚠️ **Expect this to be
   impossible with the current setup** — one key pair, and `DEPLOY_ENV` fails open. If it is
   impossible, **record that as a finding**: it means the question can only be answered by tracing
   builds, not by reading the dashboard, and it is a direct argument for
   [`0226`](../0226-deploy-env-fails-open-to-prod-analytics/brief.md).
5. **Check what changed in the repo and in deployment on 2–4 Sep** — commits, builds, deploys, and any
   Yandex-side flag change. The spike ramped and vanished cleanly, which is the shape of something that
   was turned on and then off.

### 🔒 Constraints

- 🔒 **No key, secret, or dashboard ID in any artifact.** The GameAnalytics Game key, Secret key and
  numeric dashboard ID are deliberately absent from every artifact in this project and **must stay
  absent** — `file:line` references only. Findings go to git.
- ⛔ **Never write down a hypothesis as a cause.** Label every claim as observation, code fact, or
  inference — the way `0224` does. `0224`'s worst outcome would have been recording the owner's read as
  the answer; this task must not repeat it.
- ⛔ **Do not "fix" anything found along the way.** File it. This task investigates.

---

## Verification steps

This task is done when **all** of the following exist and are checkable:

1. **A findings report** at `ai-agents/knowledge-base/reports/<date>-0230-gameanalytics-spike-findings.md`,
   which for **each** of the four hypotheses above records exactly one of: **confirmed** (with the
   evidence), **refuted** (with the evidence), or **still open** (with what specifically is missing).
   ⛔ **"Probably X" is not one of the three.**
2. **The arithmetic of line 1 is written out with its inputs**, so a reader can check it — the DAU
   figure used, the per-user figure used, and the extra-session count it implies. A conclusion with no
   arithmetic shown does not satisfy this.
3. **The two data caveats are each resolved or explicitly re-recorded as unresolved**, with what was
   re-read from the dashboard and when.
4. **A plain statement of whether dev and production traffic could be distinguished at all**, and if
   not, that this is a limitation of the single-key setup rather than a gap in the investigation.
5. 🚨 **If no mechanism is found, the report says so plainly and lists what would be needed to find
   one.** ⛔ **An investigation that ends in "we could not determine the cause" is a VALID and complete
   outcome. Manufacturing a plausible-sounding cause to avoid that sentence is the failure mode this
   criterion exists to prevent.**
6. **Any fix the findings suggest is filed as a separate brief**, not implemented here.
7. 🔒 **No key, secret, or dashboard ID appears in any artifact produced by this task.**

⛔ **NOT verification, and it will be tempting:** *"the metric is under 500 now."* **It already was, on
5 Sep, with zero code written.** The metric being green says nothing about whether the mechanism was
found. See `0224`'s closing note §4.

---

## Notes

- **Depends on:** nothing. Startable immediately — it reads data and code, and needs no other task to
  land first.
- **Blocks:** nothing formally. ⚠️ But any future decision about the per-user event budget rests on
  this, and the four `PerformanceMonitor` tasks (`0224`, `0225`, `0227`, `0228`) collectively **do not**
  address the categories that breached.
- **Prompted by [`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md)**, which shipped the
  `Performance` interval cut and closed 2026-09-07 with the spike explicitly recorded as **unexplained
  and unaddressed**. `0224`'s evidence tables were deliberately kept in that brief rather than deleted,
  and they are the starting evidence for this one. **Read `0224`'s closing note before starting.**
- **Related, deliberately NOT merged into this task:**
  [`0226`](../0226-deploy-env-fails-open-to-prod-analytics/brief.md) removes the `DEPLOY_ENV` fail-open
  *mechanism*; it does **not** identify the cause of this spike. Fixing `0226` would prevent a future
  recurrence of one *possible* channel while leaving 3–4 Sep unexplained.
- ⚠️ **`0226` is still unfixed and unscheduled**, so the fail-open channel is **live right now**. Any
  build outside the sanctioned path still writes into production analytics, indistinguishably.
- **Filed 2026-09-07 by a spawned `fkit-producer`**, on an owner ruling given live in session. ⚠️ The
  producer had **no owner channel** — the ruling was relayed through the spawning session, and the
  Priority above is the producer's rank, **not** an owner ruling.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
