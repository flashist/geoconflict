# Investigate Tutorial Abandonment — Segment the 9.8 % Completion Rate Before Proposing Any Fix

**Source**: `ai-agents/tasks/backlog/0212-investigate-tutorial-abandonment-by-platform-segment/brief.md`
**Status**: backlog
**Sprint/Tag**: **Backlog board — unscheduled.** Task `0212`, filed 2026-09-04

> # 🔲 SCOPED, NOT STARTED — NOBODY IS WORKING ON THIS
>
> **`🔲 Backlog`, unscheduled, on the Backlog board.** ⛔ **No work has been done, no measurement has
> been taken, and nothing has been built.** This page records a **brief**, not a result.
>
> ⚠️ **The owner authorised WRITING AND FILING the investigation, live in session 2026-09-04 — that
> is not a scheduling decision.** Sprint 4's monetization lane is the stated near-term priority and
> this was deliberately not put into it. Row **appended, not inserted** (ADR-035).
>
> 🔴 **Priority `Medium–High` is the PRODUCER'S rank, NOT an owner ruling. The owner did not rank
> this.** ⛔ Do not restate it as the owner's.

## Goal

Answer the owner's actual question, which is **about segmentation, not the aggregate rate**:

> *"We need a better investigation of the situation, especially trying to figure out whether some
> platforms / combinations of platform / browser / device cause the majority of the problem"* — their
> example: *"the tutorial is mostly skipped on mobile, but played on desktop."*

**An 87 % abandonment figure spread evenly across all players and an 87 % figure that is really 98 %
on one device class and 20 % on another are different problems with different fixes.**

### The production reading that prompted it

GameAnalytics, Design events, Count, 5 Aug – 3 Sep 2026, read from the dashboard by the lead session:

| Event | Count |
|---|---|
| `Tutorial:TooltipShown` | 116.69K |
| **`Tutorial:Started`** | **106.08K** |
| `Tutorial:TooltipClosed` | 83.80K |
| `Tutorial:Duration` | 14.00K |
| `Tutorial:Completed` | 10.43K |
| `Tutorial:Skipped` | 3.57K |

**At face value:** ~87 % abandoned mid-tutorial; completion **9.8 %** (10.43K / 106.08K).

🚨 **DO NOT ACT ON THAT READING.** Six corrections below change what it means, and the first one may
substantially deflate it. The tutorial is **~22.9 % of all match starts**, so this is not a corner of
the product — but the headline is **very likely overstated for a structural reason, not a
player-behaviour reason.**

## Key Changes

⛔ **NONE. No code has been written and no query has been run.** The brief defines two phases:

- **Phase 1 — measurement.** Owned by **the owner, or an agent with browser access to the
  GameAnalytics dashboard.** 🚨 **Not runnable from the repo alone.** Expected to need **no code**
  — but see the risk below.
- **Phase 2 — only if Phase 1 shows instrumentation is missing.** Owned by `fkit-coder`.

### ⚠️ The "no code needed" premise is NOT established

`FlashistFacade.ts:405-406` sets two custom dimensions (`mobile`/`desktop`, `yandex`/`web`) —
**verified present in source.** If they are live, the splits already exist and need only a query.

🔴 **But `configureAvailableCustomDimensions01`/`02` is never called anywhere in `src/`** (verified by
grep). GameAnalytics generally requires allowed dimension values to be **declared before
`initialize()`**, or `setCustomDimension*` calls are rejected. ⚠️ **The runtime behaviour of this SDK
version has NOT been verified — this is a documented-API concern, not a confirmed defect. It may work
fine.** ⇒ **Step 1 is "look at the dashboard", not "write the analysis."** If the values come back
empty, the task changes shape entirely: code, a deploy, and a wait for data.

📌 Both dimension calls sit inside `if (process.env.DEPLOY_ENV === "prod")` — **no dev signal exists.**

## Outcome

⛔ **No outcome. Nothing has been measured.** What follows is what the brief established **by reading
code**, recorded so nobody re-derives it — and so nobody acts on the uncorrected headline.

### 🔴 Correction 1 — the biggest one: repeat attempts inflate `Started`, and ONLY `Started`

The tutorial auto-launches on a **`localStorage` gate only** (`Main.ts:993`). That key is written on
**both** end paths and on **neither** abandonment path:

| Path | Sets `tutorialCompleted`? |
|---|---|
| Final tooltip dismissed → `Tutorial:Completed` | ✅ yes |
| Won the tutorial match → `Tutorial:Completed` | ✅ yes |
| Skip button → `Tutorial:Skipped` | ✅ yes |
| **Abandoned mid-tutorial** | ❌ **no** |

⇒ A player who completes or skips **never sees it again** and contributes **one** `Tutorial:Started`.
A player who abandons **gets it again next session**, every time.

🚨 **The ratio is structurally unfair to itself:** the denominator counts *attempts* and can grow
without bound for one player; the numerator is capped at one per browser profile. **A meaningful share
of the 87 % may be a small number of people bouncing repeatedly, not 92K distinct players walking
away — a different problem with a different fix, or with no fix at all.**

✅ **This is directly measurable and must be the FIRST analytical step.** `Tutorial:Started` already
carries the **lifetime attempt count as its event value** (`TutorialStorage.ts:5-11`). **The tool to
deflate or confirm the headline already exists in the data.**

### Corrections 2–6

- **2 — the internal consistency check is weaker than described.** `Completed` + `Skipped` = `Duration`
  is exact, but **guaranteed by construction** — each end event fires `Duration` immediately beside
  it. ✅ It proves the pipeline delivered without loss or duplication. ⛔ **It is a delivery check, not
  a semantic one. Do not present it as corroboration of the 9.8 %.**
- **3 — `Tutorial:Completed` fuses TWO different meanings:** *dismissed the last tooltip*
  (`TutorialLayer.ts:299`) and *won the tutorial match* (`WinModal.ts:580`). **The dashboard cannot
  tell them apart.** Splitting them needs a code change — **flag it, do not assume it.**
- **4 — 🔑 `TooltipShown` > `Started` is CONFIRMED in code, and is the most valuable lead.** Event
  strings are assembled at runtime as prefix + tooltip number (1–7). **If** the 116.69K row is the
  roll-up across all seven, that is ~1.1 tooltips per start, putting the overwhelming majority of the
  drop-off at **tooltip 1 or 2** — a specific screen, not a spread. ⚠️ **The roll-up assumption is NOT
  VERIFIED** and must be confirmed in the dashboard. If it holds, the per-tooltip breakdown crossed
  with platform is **the single highest-value query in this investigation.**
- **5 — the event reference's experiment-gating claim looks STALE.** It says tutorial events fire only
  for players in the tutorial experiment; **the current code does not gate the tutorial on any
  experiment flag.** ⚠️ Whether a flag still exists is a **Yandex dashboard fact, not a source fact —
  it cannot be settled from this repo.** 🔑 **It decides the denominator: whole first-run population,
  or a cohort? Resolve it before computing any rate.**
- **6 — what `mobile` actually means.** `isMobileDevice()` is `(pointer: coarse)` **or** an
  Android/iPhone UA test, so **touch-screen laptops classify as `mobile`** and iPads arrive via
  `pointer: coarse`. It is a **coarse input-modality proxy, not a device-class truth** — cross-check
  against GameAnalytics' native platform/device dimensions.

### 🚨 Caveats that must survive into any write-up

1. ⚠️ **`Tutorial:Started` fires BEFORE the match starts**, so a tutorial abandoned in that window
   logs a start with no match. ⇒ **106.08K is an UPPER BOUND on tutorials that actually began, and
   9.8 % is a LOWER BOUND on completion.** Some of the "abandonment" may be an instrumentation
   artefact; quantifying it is an explicit step.
2. ⚠️ **The dashboard showed a persistent *"You're viewing data in Demo mode"* string on every read.**
   The owner confirmed the figures match their real traffic and the session proceeded on that ruling
   — **but the banner never cleared.** ⇒ **These figures are OWNER-CONFIRMED, NOT UNCONDITIONALLY
   VERIFIED.**
3. **Analytics are production-only.** ⇒ **Any verification of any future fix must happen in
   production.**

### ⛔ A mobile finding may be OUT OF SCOPE by an existing rule

`PROJECT.md` parks deep mobile rendering optimization **until mobile DAU exceeds 1,500**. Mobile quick
wins and honest expectation-setting are in scope; a mobile rewrite is not. **A future planner must not
assume a mobile fix is automatically in scope.**

## Related

- [[features/tutorial]] — the feature this investigates: the 7-step tooltip sequence, its storage keys and its end paths
- [[systems/analytics]] — the event conventions, the custom dimensions, and the production-only `DEPLOY_ENV` guard this task depends on
- [[decisions/sprint-backlog]] — the Backlog board this task sits on, unscheduled
- [[tasks/tutorial-reduce-bots]] — an earlier tutorial config change, for contrast: a shipped tweak rather than an investigation
