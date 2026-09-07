# Plan — 0224 (narrowed): `PerformanceMonitor` interval 60s → 300s, plus the hidden-tab window fix

> **Provenance.** Produced by a spawned `fkit-coder` (plan-only, wrote no source), 2026-09-06, and
> corroborated by the lead reading `src/client/PerformanceMonitor.ts` in full the same day.
> **APPROVED BY THE OWNER 2026-09-06** via `AskUserQuestion` in the `fkit lead` session, together
> with three rulings recorded at the bottom of this file.
>
> ⚠️ **Honesty note on this artifact.** The lead wrote this file by transcribing the worker's returned
> plan out of the driver session's context. It was **not** copied from a pre-existing file, because
> none existed. Treat it as the driver's faithful transcription, not a byte-verified copy.

## Scope — set by owner ruling, deliberately narrow

The owner ruled on 2026-09-06 that **only the FPS/Performance event frequency is to be changed**, and
that they will **watch the analytics over the following days** before deciding anything further.

⛔ **Explicitly OUT of scope** (deferred, *not* rejected on merit): dropping the FPS bucket events,
per-session caps, cohort sampling, any `DEPLOY_ENV` / `Dockerfile` / `webpack.config.js` / build-chain
change, any change to `Player:*` / `Experiment:*` / `Session:*` / `Platform:*` / `Device:*` / `Match:*`,
and anything addressing the 3–4 Sep spike.

## 1. Change surface

| File | Change |
|---|---|
| `src/client/PerformanceMonitor.ts:56` | `60 * 1000` → a named constant `SAMPLE_INTERVAL_MS = 300 * 1000` (ruling 2) |
| `src/client/PerformanceMonitor.ts:19` | hidden-tab early return — close the sampling window before returning (ruling 1) |
| `ai-agents/knowledge-base/analytics-event-reference.md:347` | `every 60 seconds` → `every 300 seconds`, plus one clause on the first-sample-at-300s consequence |
| `ai-agents/knowledge-base/analytics-event-reference.md:355,:357` | `Performance:Memory:*` descriptions — **only if** the contradiction is confirmed (ruling 3) |

Verified: the literal `60 * 1000` appears **once** in the file and is referenced **nowhere else in the
repo**. There is no shared interval constant.

## 2. Emission arithmetic — verified against source

Per tick that is not skipped:

| # | Event | Line | Condition |
|---|---|---|---|
| 1 | one of `Performance:FPS:Above30` / `:15to30` / `:Below15` | `:37` | always |
| 2 | `Performance:FPSAverage` (value = fps) | `:38` | always |
| 3 | one of `Performance:Memory:High` / `:Medium` / `:Low` | `:54` | only if `(performance as any).memory` exists and `jsHeapSizeLimit > 0` — Chromium only |

⇒ **exactly 2 on non-Chromium, exactly 3 on Chromium.**

🚨 **The realised reduction will be MORE than 5×, not equal to it.** The monitor is **match-scoped, not
page-scoped** — started at game start (`Main.ts:757`), stopped on win/leave/unload. The first tick
therefore lands 300 s *after match start*, so **every match shorter than 5 minutes now emits zero
`Performance` events** instead of the 2–8 it emits today. Geoconflict is a short-session game; the
match-length distribution was **not measured**, so this is a direction, not a magnitude. Predict
**"≥5×"**. If the owner's watch shows `Performance` falling further than the estimated ~22–43
events/user/day, **that is expected, not an anomaly.**

## 3. The average does NOT silently change meaning

`:21-:26` computes `fps = frameCount / elapsed` where `elapsed = (now - lastSampleTime) / 1000` — i.e.
divided by **measured** elapsed time, never by an assumed 60. A longer window still yields a correct
mean-FPS-over-the-window. Confirmed independently by the lead.

**No rolling window, no N-sample accumulator, no buffer, no batching, no rate limiter, no dedupe
window.** `flashist_logEventAnalytics` (`FlashistFacade.ts:198`) is stateless with respect to cadence.
No test references `PerformanceMonitor`; the only repo references are `Main.ts:43` (import) and
`Main.ts:757` (call site). No in-repo dashboard config encodes 60 s.

## 4. The hidden-tab window bug — IN SCOPE by ruling 1

`PerformanceMonitor.ts:19` returns early when the tab is hidden **before** `frameCount` and
`lastSampleTime` are reset (`:25-:26`). A skipped tick therefore leaves the window **open**:
`lastSampleTime` goes stale while `frameCount` is frozen (browsers throttle/suspend
`requestAnimationFrame` in hidden tabs). The next visible tick divides a near-frozen frame count by a
much longer elapsed time and reports an **artificially low FPS** — potentially a false
`Performance:FPS:Below15`, the crash-risk bucket.

**Pre-existing at 60 s.** The interval change does not create it, but gives each corrupted sample **5×
the weight** in the aggregate, because there are 5× fewer samples.

**Owner ruled to fix it now** (against the coder's recommendation to defer), on the reasoning that the
owner is about to spend several days reading precisely this data, and the bug degrades it in a known
direction.

Fix: close the window before returning — reset `frameCount` and `lastSampleTime` above the
`visibilityState` early return, or reset on `visibilitychange`. Implementer's choice; state which and
why.

## 5. Verification

**Honest position: there is no test today and none worth inventing.** `CLAUDE.md` mandates tests for
`src/core/` changes; this is `src/client/`. A jest fake-timer test asserting "emit at 300000 ms" would
need jsdom plus mocked `requestAnimationFrame` and mocked `flashist_logEventAnalytics`, and would only
prove that `setInterval` received the number the diff already shows.

What is actually possible, in order of value:

1. **Local runtime observation — the only real behavioural check, and it is cheap.**
   `flashist_logEventAnalytics` console-logs instead of sending whenever `DEPLOY_ENV !== "prod"`
   (`FlashistFacade.ts:199-207`). Run `npm run dev`, start a match, watch the console: the
   `Performance:*` group should first appear at ~300 s and **nothing before it**. This demonstrates
   both the new cadence and the zero-events-under-5-minutes consequence.
2. **Demonstrate the hidden-tab fix** — background the tab across a tick, return, and confirm the next
   sample reports a plausible FPS rather than a near-zero one.
3. `npm run lint` — expect clean.
4. `npm test` — expect green and **expect it unaffected** (no test touches this file); a regression
   guard only. ⚠️ A red `supertest` suite here is the known flake: rule out `0197`'s `SIGSEGV` /
   `ClearStaleLeftTrimmedPointerVisitor` first, then re-run — **and say that you re-ran**.
5. Read back `analytics-event-reference.md` so the prose matches the shipped constant.

**Production confirmation is the owner's watch period and is NOT part of closing this task.**

## 6. Out of scope, reported not fixed

- **Leaked monitor path.** `Main.ts:676-678` calls `gameStop()` when joining a lobby while a game is
  running **without** calling `perfMonitorStop`. `Main.ts:757` then overwrites the stopper, so the
  previous monitor's `setInterval` **and** its `requestAnimationFrame` loop run until page unload.
  Some users therefore run several concurrent monitors — itself a contributor to event volume.
  **Candidate for its own brief. Do not fix here.**

---

## Owner rulings, 2026-09-06 (`AskUserQuestion`, `fkit lead` session)

| # | Question | Ruling |
|---|---|---|
| **Scope** | What changes? | ✅ **Only the FPS/Performance event frequency**, 60s → 300s. Owner will watch analytics for several days before deciding anything further. |
| **1** | Hidden-tab bug — fix or defer? | ✅ **FIX IT NOW.** Against the coder's recommendation to defer. Reason: the owner is about to read this exact data for several days, and the bug makes it noisier in a known direction. |
| **2** | Named constant or bare number? | ✅ **NAMED CONSTANT.** `60 * 1000` reads as "a minute"; `300 * 1000` reads as nothing. |
| **3** | `Performance:Memory:*` code/doc contradiction | ⚠️ **DOUBLE-CHECK IT FIRST — the owner is deliberately not ruling blind.** Owner, verbatim: *"Honestly, I am not sure, and I feel like the coder needs to do a double-check here to compare the differences between the code and the docs. But if the differences are confirmed and contradict each other, the code should be taken as the source of truth and the docs should be updated."* ⇒ **Verify the contradiction independently. If confirmed: code wins, update the docs. If NOT confirmed: change nothing and report that the contradiction does not hold.** |
