# GameAnalytics 500-Events-Per-User Limit Breached Again — Investigation of the Recurring Spikes (task 0456)

**Source**: `ai-agents/tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md` (its `plan.md` and `worklog.md` read as supporting evidence) and the findings report `ai-agents/knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 50 (ADR-035 append rank; "our next task in the Sprint 8" by owner ruling) / task `0456`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-14. **Investigation only — no code changed.** The plan's
> fix gate ended in **"no code fix"** by owner ruling, so there is no fix task and no verify task. An ephemeral
> `@fkit-reviewer` pass (coverage: reasoning-only second opinion) raised R1–R10, all applied in the report's revision —
> and **the mechanism verdict changed** in that revision.
>
> ⚠️ **The mechanism is NOT proven.** Read every "leading explanation" below at that strength.

## Goal

On **2026-10-14** the owner saw GameAnalytics' banner again: *"Limit Exceeded: Total number of events per active user
(per day) has exceeded the limit of 500."* Owner, verbatim: *"we need to investigate it and make it as our next task in
the Sprint 8 (it's important for us to keep collecting metrics)"*. Third sighting after 4 Sep and 11 Sep. The earlier
task `0224` ([[tasks/gameanalytics-per-user-event-limit]]) cut `Performance` sampling but could not touch the 3–4 Sep
spike, and `0230` (Backlog board) left that spike's cause unknown. 🔴 The limit is **per active user per day**, not
total traffic.

## Key Changes

No code. Three parts, all in the findings report:

1. **GameAnalytics read** — in the owner's Chrome, owner present, read-only, 2026-10-14, plus a second short read of
   session counts. Labels used: [obs] read off the UI, [code] file:line at tag `0.0.164`, [inference].
2. **Code read** — every emitter that can repeat; the once-per-page-load block; SDK double init and its offline queue
   (SDK `gameanalytics` 4.4.7); reload sites; `0226`'s status; an event budget.
3. **Mechanism, arithmetic, `0230`'s four hypotheses, fix options** — fix options kept as **analysis only**.

## Outcome

**What was found:**
- **Breach day: 12 Oct — 1,822.3 events per active user [obs]**, against ~106–121 on the days around it; DAU 5,822 sat
  inside the week's range, so the numerator rose ~15×. The 14 Oct banner is about 12 Oct.
- **The excess is extra copies of the once-per-page-load events** (`Session:Start`, `Device`, `Platform`, `Player`,
  `Experiment` …) with no play after them — and **they were NOT new page loads**: 12 Oct had ~844K extra `Platform`
  events but normal sessions (21.75K vs a ~21.9K mean). ~86.6 % of the extra `Platform` events carry **old build
  strings** (`0.0.136`, `0.0.140`, `0.0.151`, `0.0.154`); the rest the live build. Arithmetic: ~9.95M extra events ÷
  ~844K ≈ 11.8 each — consistent with the size of the once-per-page block, so those copies account for the whole excess.
- **Leading explanation [code + inference], NOT proven: the GameAnalytics SDK re-sending events already in a browser's
  queue.** Every 8 s it marks queued events "new" again and resends; a batch is deleted only if that same request
  answers OK before the next tick, so a slow or empty-answered upload repeats with no end. The queue lives in
  `localStorage` under the game key, **shared by all our builds**, and each event keeps the build string of the page
  that made it — which would explain old build strings without old copies running. **Unproven:** whether GameAnalytics
  drops duplicate event ids, how it dates weeks-old events, and the rate (~11× what one open page can resend). **Which
  browser(s) drive it was not identified.**
- **Weaker, not excluded:** old copies of the game run by someone — the repo is **public**, and anyone's production
  build of an old commit reports into our GameAnalytics (`0226`'s fail-open default). Smaller spike days (19 Sep, 3 Oct,
  3 Sep, 28 Sep) did show some extra sessions.
- **It recurs roughly weekly** since late August (25 Aug, 3–4 Sep, 9 Sep, 19 Sep, **26 Sep — the biggest, never
  noticed**, 28 Sep, 3 Oct, 12 Oct) and **does not line up with deploys** (seven of ten spike days had no production tag).
- **Normal days are fine: ~114 events per user (~23 % of 500)**; `0451`'s 16 `PrivateLobby:*` events and `0299` fit
  easily. Breaches come from spike days, not the normal budget.
- **GameAnalytics' own docs [obs]:** over a limit, an alert shows on the Integrations page; *"No data will be lost"* and
  *"There is no penalty or cost"* (worded for cardinality limits). The docs do **not** say the 500-per-user limit drops
  or throttles anything. Design cardinality ~170–190 names a day, ~1 % of the 15,000 limit.
- **Not reached by the code read:** our page code does not loop or re-run the block; polls and retries send no Design
  events; the only timers are `Performance:*` and `Session:Heartbeat:*` (max 12 per page). **Error events are uncapped**
  and four code shapes could storm, but **none is shown happening** (Error category not read) and none explains 12 Oct.
- **`0230`'s hypotheses:** 1 (owner's dev testing) **refuted**; 2 (`DEPLOY_ENV` fail-open) refuted only as worded — the
  channel is real and open to anyone; 3 (client re-entry) **refuted for our code**, but **open and leading** if read as
  "any client-side repeat" (the SDK re-send); 4 (something else) confirmed only as "outside 1–3 as worded".
- **Open caveats:** dashboard timezone not read; "Demo mode" text present with no visible banner (as in `0418`); Error
  category, SDK `user`/`session_end` counts, sessions by build and a per-user distribution not read; `0224`'s 7-day-mean
  discrepancy still unresolved.
- **Cheapest checks that would settle it** (read-only, not done): client spans in Uptrace by build commit; GameAnalytics
  sessions by build for 12 Oct; a daily `Platform` ÷ sessions ratio (≈ 0.9–0.95 normal, far above 1 = re-send).

**Owner rulings, 2026-10-14** (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent):
1. **No code fix.** The owner (free text): *"…I don't like the options of us "intruding" into the GameAnalytics logic of
   deduplication and filtering events from not latest builds (the last one is a no-no, because we need to collect the
   events from all builds to be able to spot any problems during releases)"*; then **"Yes, file it in Backlog
   (Recommended)"** — *"Monitoring only; no proposed solutions; nothing dropped or filtered."* → task **`0458`** (Backlog
   board) — and **"Yes, close with the report (Recommended)"**. ⛔ **Standing preference that follows: collect events
   from all builds; do not filter old builds or meddle with GameAnalytics' de-duplication.**
2. **`0230` stays open** — *"Not answered: keep 0230 open (Recommended)"*; the SDK re-send is recorded on it as its open
   lead. (A same-day earlier ruling to cancel it as absorbed was conditional and did not fire.)
3. **`0226` stays where it is** — *"Leave it where it is (Recommended)"*, with a dated note that the repo is public.
4. **The numeric GameAnalytics game ID** found in three tracked files → *"File in Sprint 8"* → `0459`, done the same day
   ([[tasks/gameanalytics-game-id-removed]]).

⛔ **Not verification, as before:** a green banner or a day under 500 proves nothing — the metric drops back by itself.

## Related

- [[systems/analytics]] — the 500-per-user limit section, updated with this task
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, the September breach and the `Performance` cut
- [[tasks/gameanalytics-game-id-removed]] — task `0459`, the game-ID clean-up this task's review found
- [[tasks/private-lobby-funnel-events]] — task `0451`, events budgeted here (not deployed, not a cause)
- [[tasks/tutorial-abandonment-platform-segmentation]] — task `0212`; the report's option F (register the custom dimensions) would unblock its segmentation
- [[decisions/sprint-8]] — the board (rank 50)
- [[decisions/sprint-backlog]] — `0458` (monitoring), `0230` (kept open), `0226` (fail-open, unchanged)
