# Investigate tutorial abandonment — segment the 9.8% completion rate by platform / browser / device before proposing any fix

## ID
0212

> ℹ️ **ID allocation, checked 2026-09-04 before filing.**
> 1. **Task folders** — `ai-agents/tasks/{backlog,done,cancelled}/`. Highest ID in use: **`0211`**.
> 2. **All boards** — `backlog.md`, `sprint-backlog.md`, `plan-sprint-4.md` / `-5` / `-6`, `plan-index.md`.
> 3. **`grep -rn "0212" ai-agents/ .claude/ src/`** → **zero hits anywhere.** This is the check that
>    catches reservations no board can see (`0204` was reserved invisibly inside `.claude/skills/`).

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md).

**Board chosen honestly:** the owner asked for the investigation to be *written and filed*, live in
session on 2026-09-04. That authorises the brief; it does not schedule a sprint. Sprint 4's
monetization lane is the stated near-term priority and this was not put into it.
**Row appended, not inserted** (ADR-035).

## Priority
**Medium–High — the producer's rank, NOT an owner ruling. The owner did not rank this.**

Recorded as a recommendation with its reasoning so a later reader can disagree with the reasoning
rather than guess at the number.

**Why it ranks up:**
- The tutorial is **~22.9 % of all match starts** (106.08K starts against 462.56K total across
  `Game:Mode:Solo` 374.95K + `Game:Mode:Multiplayer` 87.61K). It is not a corner of the product.
- It is the **first-run experience** on a portal-acquisition funnel, so whatever it does, it does to
  new players specifically.

**Why it does not rank higher — read this before promoting it:**
- ⚠️ **The headline number is very likely overstated, for a structural reason, not a player-behaviour
  reason.** See *Correction 1* below. A large share of the "87 % abandonment" may be the **same
  players retrying**, which is not a defect and may not be worth fixing.
- **Phase 1 is cheap** — dashboard queries, likely no code (see *What may already be answerable with
  no code*). Rank the follow-up **after** Phase 1 lands, when the real size of the problem is known.
- ⛔ **If the finding is mobile-concentrated, the fix may be out of scope by an existing rule.**
  `ai-agents/knowledge-base/PROJECT.md:87-88`: deep mobile rendering optimization is **parked until
  mobile DAU exceeds 1,500**; mobile quick wins and honest expectation-setting are in scope, a mobile
  rewrite is not. **A future planner must not assume a mobile fix is automatically in scope.**

## Status
🔲 Backlog

## Owner
**Phase 1 (measurement):** the **owner**, or an agent with browser access to the GameAnalytics
dashboard. No agent can reach it otherwise — Phase 1 is not runnable from the repo alone.

**Phase 2 (only if Phase 1 shows instrumentation is missing):** `fkit-coder`.

## Context

### The finding — real production data, read from the dashboard 2026-09-04

Source: GameAnalytics, game `330439` ("Geoconfclict Yandex Games"), **Design events, Count
aggregation, past 30 days (5 Aug – 3 Sep 2026)**. Read directly by the lead session.

| Event | Count |
|---|---|
| `Tutorial:TooltipShown` | 116.69K |
| **`Tutorial:Started`** | **106.08K** |
| `Tutorial:TooltipClosed` | 83.80K |
| `Tutorial:Duration` | 14.00K |
| `Tutorial:Completed` | 10.43K |
| `Tutorial:Skipped` | 3.57K |

**As read at face value:** only 14.00K of 106.08K starts reach any end state — ~87 % abandoned
mid-tutorial — for a completion rate of **9.8 %** (10.43K / 106.08K).

⚠️ **Do not act on that reading yet.** Three corrections below change what it means, and two of them
were found by reading the code this session.

### The question the owner actually asked

> *"We need a better investigation of the situation, especially trying to figure out whether some
> platforms / combinations of platform / browser / device cause the majority of the problem"* —
> their example: *"the tutorial is mostly skipped on mobile, but played on desktop."*

**The core question is segmentation, not the aggregate rate.** An 87 % figure spread evenly across
all players and an 87 % figure that is really 98 % on one device class and 20 % on another are
different problems with different fixes.

---

## 🔑 What may already be answerable with NO CODE — check this first

`src/client/flashist/FlashistFacade.ts` sets two GameAnalytics custom dimensions at init:

- `:405` — `setCustomDimension01(isMobile ? "mobile" : "desktop")`
- `:406` — `setCustomDimension02(isYandex ? "yandex" : "web")`

**Verified present in source, 2026-09-04.** If these are live in the dashboard, the mobile/desktop
and yandex/web splits of every tutorial event **already exist today** and need only a query.
GameAnalytics also carries platform / device / country natively as global dimensions.

### ⚠️ But the "no code needed" premise is NOT established — one real risk

**`configureAvailableCustomDimensions01` / `02` is never called anywhere in `src/`.** Verified by
grep, 2026-09-04: the only two hits for `setCustomDimension`/`configureAvailableCustomDimensions` in
the whole tree are lines 405 and 406 above. The declaration method **does** exist in the installed
SDK (`node_modules/gameanalytics/dist/GameAnalytics.d.ts:676`).

GameAnalytics generally requires the allowed dimension values to be **declared before `initialize()`**
or `setCustomDimension*` calls are rejected. ⚠️ **I have NOT verified the runtime behaviour of this
SDK version** — this is a documented-API concern, not a confirmed defect. It may work fine.

**This is why step 1 is "look at the dashboard", not "write the analysis".** If the dimension values
come back empty, the task changes shape: it needs a code change, a deploy, and a wait for data —
which is a much larger and slower piece of work than a query.

**Also note:** both dimension calls sit inside `if (process.env.DEPLOY_ENV === "prod")`
(`FlashistFacade.ts:397`). Consistent with analytics being production-only; no dev signal exists.

---

## ⚠️ Corrections to the original framing — found by reading the code this session

These were checked against files this turn. They are recorded because acting on the uncorrected
reading would send the work in the wrong direction.

### Correction 1 — 🔴 THE BIGGEST ONE: repeat attempts inflate `Started`, and only `Started`

The tutorial auto-launches on a **`localStorage` gate only** (`src/client/Main.ts:993`):
`if (!localStorage.getItem(TUTORIAL_COMPLETED_KEY))`.

That key is written on **both** end paths and on **neither** abandonment path:

| Path | Sets `tutorialCompleted`? | File |
|---|---|---|
| Final tooltip dismissed → `Tutorial:Completed` | ✅ yes | `TutorialLayer.ts:298-299` |
| Won the tutorial match → `Tutorial:Completed` | ✅ yes | `WinModal.ts:579-580` |
| Skip button → `Tutorial:Skipped` | ✅ yes | `TutorialLayer.ts:312-317` |
| **Abandoned mid-tutorial (closed tab, navigated away)** | ❌ **no** | — |

**Therefore:** a player who completes or skips **never sees the tutorial again** and contributes
**one** `Tutorial:Started`. A player who abandons **gets it again next session**, and contributes
**another** `Tutorial:Started` every time.

🔴 **The ratio is structurally unfair to itself.** The denominator counts *attempts* and can grow
without bound for a single abandoning player; the numerator is capped at one per browser profile.
**A meaningful share of the 87 % may be a small number of people bouncing repeatedly, not 92K
distinct players walking away.** That is a different problem with a different fix — or with no fix
at all.

✅ **This is directly measurable and must be the first analytical step.** `Tutorial:Started` carries
the **lifetime attempt count as its event value**, persisted in `localStorage` under
`tutorialAttemptCount` (`src/client/TutorialStorage.ts:5-11`, `Main.ts:778-781`). The event
reference already names this use:
`ai-agents/knowledge-base/analytics-event-reference.md:313` — *"Use this to separate first-time
abandonment from repeat attempts."* **The tool to deflate or confirm the headline already exists in
the data.**

### Correction 2 — the internal consistency check is weaker than it was described

The framing offered `Completed` (10.43K) + `Skipped` (3.57K) = **14.00K** = `Duration` as a reason to
trust the numbers. The arithmetic is exact and worth keeping — but **it is guaranteed by
construction**, because every one of the three call sites fires `Duration` immediately beside its end
event:

- `TutorialLayer.ts:299-300` — `Completed` then `Duration`
- `TutorialLayer.ts:312-316` — `Skipped` then `Duration`
- `WinModal.ts:580-581` — `Completed` then `Duration`

**What the identity actually proves:** the analytics pipeline delivered these events without loss or
duplication — real and useful, it rules out a dropped-event explanation. **What it does not prove:**
that the counts mean what we think they mean. It is a delivery check, not a semantic one. Do not
present it as independent corroboration of the 9.8 %.

### Correction 3 — `Tutorial:Completed` has two different meanings fused into one event

It fires from two places with genuinely different semantics:

- `TutorialLayer.ts:299` — the player **dismissed the last tooltip** (`wasLastTooltip`).
- `WinModal.ts:580` — the player **won the tutorial match** (`isTutorial` win path).

**The dashboard cannot tell these apart.** "Read all seven tooltips" and "actually won the match" are
different outcomes with different meaning for whether the tutorial worked. Splitting them would need
a code change; flag it as a finding, do not assume it.

### Correction 4 — `TooltipShown` > `Started` is confirmed, and it is the most valuable lead

The framing marked the per-tooltip explanation a hypothesis. ✅ **Confirmed in code:** the event
string is assembled at runtime as prefix + tooltip number — `TutorialLayer.ts:215` emits
`TUTORIAL_TOOLTIP_SHOWN_FIRST_PART + n` for `n` = 1–7, and the enum constant is the bare prefix
`"Tutorial:TooltipShown:"` (`FlashistFacade.ts:104`, with `:106-112` showing the per-number constants
commented out in favour of runtime assembly). Same for `TooltipClosed` (`:105`, emitted at
`TutorialLayer.ts:290-293`).

🔑 **Why this is the lead, not a footnote.** If `Tutorial:TooltipShown` (116.69K) is the dashboard's
**roll-up across all seven** tooltips, then roughly **1.1 tooltips are shown per tutorial start** —
which would put the overwhelming majority of the drop-off at **tooltip 1 or 2**, not spread across
the tutorial. That localises the problem to a specific screen.

⚠️ **The roll-up assumption is NOT verified** — whether that dashboard row aggregates its children or
is a separate event must be confirmed in the dashboard. **If it holds, the per-tooltip breakdown
(`Tutorial:TooltipShown:1` … `:7`, crossed with the platform dimension) is the single highest-value
query in this investigation.**

### Correction 5 — the event reference's experiment-gating claim looks stale

`analytics-event-reference.md:309` says tutorial events fire *"only for players who see the tutorial
experiment"*. **The current code does not gate the tutorial on an experiment flag** — `Main.ts:993`
is a bare `localStorage` check, and `startTutorial` has exactly one caller (`Main.ts:994`).

Experiment cohort events are assembled at runtime from whatever flags Yandex returns
(`FlashistFacade.ts:823-833` iterates `Object.entries(this.yandexExperimentFlags)`), so whether an
`Experiment:Tutorial:*` flag still exists is a **Yandex dashboard fact, not a source fact** — it
cannot be settled from this repo.

**Why it matters here: it decides the denominator.** If the tutorial ships to every first-time
player, 106.08K starts is the whole first-run population. If a flag still splits the audience, it is
a cohort. **Resolve this before computing any rate.**

### Correction 6 — what `mobile` actually means in dimension 01

`isMobileDevice()` (`src/client/Utils.ts:276-281`) is
`window.matchMedia("(pointer: coarse)").matches || /Android|iPhone/i.test(navigator.userAgent)`.

So **touch-screen laptops classify as `mobile`**, and iPads land in `mobile` via `pointer: coarse`
rather than the UA test (the regex names only Android and iPhone). The split is a **coarse
input-modality proxy, not a device-class truth**. Cross-check against GameAnalytics' native platform
and device dimensions rather than trusting dimension 01 alone.

---

## Caveats that must survive into any write-up

1. ⚠️ **`Tutorial:Started` fires before the match actually starts.** In `src/client/Main.ts`,
   `startTutorial()` logs `TUTORIAL_STARTED` at `:779-781`, and only afterwards does
   `await fetchCosmetics()` (`:790`) and dispatch `join-lobby` (`:797+`). **A tutorial abandoned in
   that window logs a start with no match.** So 106.08K is an **upper bound** on tutorials that
   actually began, and 9.8 % is correspondingly a **lower bound** on completion. Quantifying this gap
   is an explicit investigation step — some of the "abandonment" may be an instrumentation artefact.
2. ⚠️ **The dashboard showed a persistent "You're viewing data in Demo mode" string in the page
   markup** on every read. The owner confirmed the figures match their real traffic and the session
   proceeded on that ruling — **but the banner never cleared.** Re-verify if the numbers ever look
   wrong. **These figures are owner-confirmed, not unconditionally verified.**
3. **Analytics are production-only** — dev and staging send nothing (`FlashistFacade.ts:397`, the
   `DEPLOY_ENV === "prod"` guard). **Any verification of any future fix must happen in production.**
4. **Event strings live only in the `flashistConstants.analyticEvents` enum**
   (`src/client/flashist/FlashistFacade.ts:103-115`). Never write an event string inline, and update
   `ai-agents/knowledge-base/analytics-event-reference.md` for any event change.

---

## Investigation — do these in order

**Phase 1 is dashboard-only. Do not open an editor during Phase 1.**

### Step 1 — Is the segmentation actually there? (gate for everything else)
Open the GameAnalytics dashboard and check whether **Custom Dimension 01** (`mobile`/`desktop`) and
**02** (`yandex`/`web`) carry non-empty values over the reporting window.
- ✅ **Populated** → continue to step 2; this is a query-only investigation.
- ❌ **Empty** → **stop and report.** The likely cause is the missing
  `configureAvailableCustomDimensions01/02` declaration (see above). That makes this a code +
  deploy + wait task, and the owner must be told the shape changed before anyone proceeds.

### Step 2 — Resolve the denominator
Determine whether an `Experiment:Tutorial:*` flag is active on the Yandex side (Correction 5). State
plainly which population 106.08K represents. **Do not compute rates before this is settled.**

### Step 3 — Deflate or confirm the headline (Correction 1 — do this before any segmentation)
Break `Tutorial:Started` down by its **event value** (lifetime attempt count). Report the
distribution, and compute a completion rate against **first attempts only** (value = 1) alongside the
all-attempts rate. **Report both numbers, always together.** If the first-attempt rate is materially
better than 9.8 %, say so loudly and up front — it changes what problem this is.

### Step 4 — The per-tooltip funnel (highest-value query)
First confirm whether `Tutorial:TooltipShown` rolls up its numbered children. Then pull
`Tutorial:TooltipShown:1` … `:7` and `Tutorial:TooltipClosed:1` … `:7` and build the step-by-step
funnel. **Identify the specific tooltip where players leave.**

### Step 5 — The segmentation the owner asked for
Cross the funnel from steps 3 and 4 with:
- Custom Dimension 01 — `mobile` / `desktop`
- Custom Dimension 02 — `yandex` / `web`
- GameAnalytics native platform / device / browser / country dimensions

**Answer the owner's actual question:** does one platform / browser / device combination account for
the majority of the loss, or is the loss spread evenly? **Say which, with the numbers.**

### Step 6 — Size the pre-match instrumentation gap (Caveat 1)
Estimate how many `Tutorial:Started` events have no corresponding match start — e.g. by comparing
against `Game:Mode:Solo` / tutorial-match signals over the same window. Report it as a bound, not a
point estimate, and state the method.

### Step 7 — Report, and stop
Write findings to `ai-agents/knowledge-base/reports/` as
`YYYY-MM-DD-0212-tutorial-abandonment-findings.md`. **Do not write to `ai-agents/wiki-vault/`** —
that is the wiki role's exclusively; route an ingest through `fkit-wiki` afterwards.

---

## ⛔ What this task does NOT do

- **It does not fix anything.** No tutorial redesign, no tooltip rewrite, no mobile work.
- **It does not scope an implementation.** Per `PROJECT.md`, investigation precedes implementation
  whenever meaningful unknowns exist, and this brief documents six of them.
- **It does not add instrumentation** — unless step 1 fails, in which case it *reports* that need and
  the owner decides.
- **It does not decide whether a mobile-concentrated finding may be fixed.** That is an owner call
  against the parked-mobile rule (`PROJECT.md:87-88`).

## Verification

This task is done when:
1. Steps 1–6 are answered with numbers, or explicitly marked unanswerable **with the reason**.
2. The findings report exists under `ai-agents/knowledge-base/reports/`.
3. **The report states the first-attempt completion rate and the all-attempts rate side by side**
   (step 3) — reporting only one is an incomplete result.
4. **The report names which platform / browser / device combinations carry the loss**, or states
   plainly that the loss is not concentrated.
5. Every caveat above that still stands is carried into the report. **Caveat 2 (the Demo-mode banner)
   must be carried verbatim** — a future reader has to know the provenance of these numbers.
6. Any recommended follow-up work is **filed as a separate brief**, not appended here.

## Notes

- ⚠️ **Line numbers in this brief were read from the WORKING TREE on 2026-09-04, and two of the cited
  files were UNCOMMITTED AT THE TIME.** `git status` showed `src/client/flashist/FlashistFacade.ts`
  modified (one added line at ~`:65`, i.e. **above** every line cited here — expect ±1 drift against
  `HEAD`) and `ai-agents/knowledge-base/analytics-event-reference.md` under a substantial in-flight
  rewrite (+133/−60 lines), which **will** move its `:309` / `:313` citations. **Every claim here also
  names its symbol** (`setCustomDimension01`, `configureAvailableCustomDimensions01`,
  `TUTORIAL_COMPLETED_KEY`, `TUTORIAL_TOOLTIP_SHOWN_FIRST_PART`, `isMobileDevice`,
  `logExperimentEvents`) — **search by symbol, not by line number**, and treat the numbers as a hint.
- **Two ADR series share this repo.** This project's own ADRs start at **ADR-101** (latest in
  `ai-agents/knowledge-base/decisions/` is `adr-110`). If this investigation produces a decision,
  number it **ADR-111 or later**.
- **No secrets in this brief, by rule.** The GameAnalytics game key and secret key are visible in
  `FlashistFacade.ts` near the dimension calls — **they are deliberately not reproduced here**, and
  must not be copied into any report, wiki page, or task file.
- **Related task:** `0120-tutorial-action-pause` is in `ai-agents/tasks/cancelled/` — prior tutorial
  work exists and was dropped; worth a read before proposing changes.
- **Wiki pages that exist and should be read first:** `ai-agents/wiki-vault/wiki/features/tutorial.md`
  and `ai-agents/wiki-vault/wiki/systems/analytics.md`. Read-only via `/fkit-query`.
- **Provenance:** the finding fell out of an unrelated analytics query on 2026-09-04. The owner asked
  for the investigation live in session. **The owner did not rank it and did not schedule it** — the
  Medium–High rank above is the producer's and is open to correction.
