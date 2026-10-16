# INVESTIGATION + fix plan — GameAnalytics "500 events per active user per day" limit exceeded again (seen 2026-10-14)

## ID
0456

> ℹ️ **ID allocation, checked 2026-10-14 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0455` (folder names and `## ID` fields agree, base-10 arithmetic). `0456`: no task folder, no
> `## ID` hit, no `tasks/*/0456*` path in any branch's history; repo-wide only a substring in `0232`'s worklog.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-14, typed by the owner in the `fkit lead` session driving `fkit-sprint-ship-loop`**
> (verbatim, with a GameAnalytics screenshot), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel
> (ADR-021/037); ⛔ **not producer precedent**: *"we need to investigate it and make it as our next task in the Sprint 8
> (it's important for us to keep collecting metrics)"*.

## Priority
50

> ⚠️ **Priority 50 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0351` — i.e. above `0343`, the board's first open row**, because the owner
> ruled it *"our next task in the Sprint 8"* and because every day the limit stays breached risks the metrics the owner
> wants to keep collecting. ADR-035 forbids inserting above closed rows, so it appends after the
> [Sprint 8](../../../sprints/done/plan-sprint-8.md) board's highest (49, `0455`) — a position, not merit. **The work
> order is the owner's ruling, not the rank number: the ship loop takes this task next.**

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

> ⚠️ **Part 1 NEEDS THE OWNER'S BROWSER.** GameAnalytics is read through the owner's Chrome with the owner logged in
> himself (like [`0418`](../0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)).
> An agent may do the clicking and reading only with the owner present and logged in. **Read-only in GameAnalytics** —
> nothing is saved, changed or exported there. Parts 2–3 (code read, report, fix plan) are the coder's alone.

## Context

### What the owner saw

On **2026-10-14** the owner saw this banner in GameAnalytics (screenshot, relayed by `fkit-lead`):

> **"Limit Exceeded: Total number of events per active user (per day) has exceeded the limit of 500. Review
> integration here. Learn more."** — with **"Status: Collecting events…"**

⚠️ **Which day or days the breach covers is NOT known yet.** Nothing was measured — the banner was seen, no figure was
read. That is Part 1's first job.

🔴 **Read the limit precisely: it is PER ACTIVE USER, PER DAY — not total traffic.** It says the average player sends
too many events in a day (a chatty client, or a few extremely chatty clients pulling the average up). It is not a
"we are too popular / buy a bigger plan" signal. A fix framed as volume or plan size has misread it.

**Why it matters (the owner's goal):** *"keep collecting metrics."* "Status: Collecting events…" suggests data still
arrives, but what GameAnalytics does to a game or to users that stay over the limit (drop events? throttle? flag
only?) is **not known** — Part 1 records what GameAnalytics' own help text says, and does not guess.

### This is the third sighting — history to carry

| Date | What was seen | What was known |
|---|---|---|
| 2026-09-04 | Breach, read off the dashboard | 4 Sep **1,324.33 events/user** (265 % of limit), 3 Sep 414.88, gone 5 Sep (162.79) with **zero code written**. Spike was in **once-per-session** categories: `Player` ~34×, `Experiment` ~45×, `Session` ~10×, `Platform`/`Device` ~31× each. `Performance` ~1.6×, `Match` ~1.2× (flat). |
| 2026-09-11 | Banner seen again | **Nothing measured.** Recorded in `0230` for its date only. |
| **2026-10-14** | **Banner seen again (this task)** | **Nothing measured yet.** |

- [`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md) (done, agent-closed): cut
  `Performance` sampling 60 s → 300 s (`src/client/PerformanceMonitor.ts`, `SAMPLE_INTERVAL_MS`). **It did not and
  could not fix the 4 Sep breach** — the categories that breached were not touched; a repeat of 4 Sep would still
  breach at roughly 235 %. Its expected new normal (**~62–81 events/user/day**) is **arithmetic, never measured** —
  its acceptance criteria 3 and 4 closed unmet. ⛔ Read its closing note §2–§4 before starting.
- [`0230`](../../backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md) (Backlog board, deferred,
  *"we will get back to it if the problem repeats"*): the investigation of the 3–4 Sep spike, **cause unknown**. Its
  four hypotheses (owner's dev testing · `DEPLOY_ENV` fail-open · a client re-entry that re-runs the session-start
  block · something else) and its two unreconciled data caveats (category split does not sum to the daily total;
  581.97 vs 378.86 mean) are **the starting list for Part 2**. ⚠️ **Whether this task absorbs `0230` is an open owner
  question** — see Notes. Until ruled, treat `0230`'s hypotheses as inputs here, and do not touch `0230`.
- [`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md) (Backlog board, unfixed): GameAnalytics setup is
  gated on `DEPLOY_ENV === "prod"` with **one** key pair, and `Dockerfile` / `webpack.config.js` default to `prod`.
  Any build outside `build-deploy.sh` → `build.sh` writes into production analytics, indistinguishably. A live
  channel that could inflate the per-user count; **not evidence that it did.**
- [`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md),
  [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md),
  [`0231`/`0232`/`0233`](../../done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md),
  [`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md): leaked `PerformanceMonitor`s — all fixed
  (the desync site deliberately left running by owner ruling). A **leak that accumulates** multiplies `Performance`
  per user; confirm none is left, but ⛔ none of these explained the September session-category spike.
- [`0229`](../../backlog/0229-double-onjoin-constructs-a-second-clientgamerunner/brief.md) (Backlog board): a double `onJoin` can
  build a **second `ClientGameRunner`** — a duplicate-emitter candidate to check, nothing more.
- Wiki `systems/analytics` § *The 500-Events-Per-Active-User-Per-Day Limit* and § *Gotchas*: the **double-reload**
  history (before HF-9 a refresh ran two full inits and **doubled** `Session:Start`, `Device:*`, `Platform:*`,
  `Experiment:*`) — the exact category family that spiked in September; **only Design events are tracked**, so 100 %
  of the budget is design events; `Experiment:{flag}:{value}` names are built at runtime from Yandex flags (count and
  names can change with no deploy); design-event **cardinality** was trending up (~103 → 118 distinct names) and
  whether a cardinality limit applies was never settled.
- [`0299`](../../backlog/0299-tiered-ad-impression-analytics/brief.md) (Backlog board): plans per-tier ad-impression events — any
  fix plan must leave room for it.
- **New events since September that the fix must budget for:** many tasks added events since 4 Sep (login, session
  status, worker init causes and more — see `ai-agents/knowledge-base/analytics-event-reference.md`). A new event that
  fires on a timer, a poll or a retry is as suspect as the old session block.
- **`0451`'s 16 `PrivateLobby:*` events are built but NOT deployed** — ⛔ **not a cause of today's banner.** They will
  land in a coming deploy: about **≤ ~6 events per host lobby cycle** and **≤ ~3 per guest** (relayed by `fkit-lead`
  from `0451`). The fix plan must budget for them.

### Places in the code that reload the page (a page reload re-runs the once-per-session block)

Read 2026-10-14, **code facts only — none is claimed as a cause:** `src/client/Bootstrap.ts` (one recovery reload,
guarded by a `sessionStorage` latch), `src/client/flashist/FlashistFacade.ts` (`reloadApp()` and a hash-stripping
reload helper), `src/client/StaleBuildModal.ts`, `src/client/AccountModal.ts`, `src/client/TokenLoginModal.ts`,
`src/client/CitizenshipRestartOffer.ts`, `src/client/ProfileReadRestart.ts`. A reload loop on some platform or build
would produce exactly September's shape (session categories up many times, `Performance` and `Match` flat).

## What to build

**An investigation, a findings report, and a fix plan the owner approves.** The fix itself is built in this task
**only if the owner approves a small one at the plan gate**; otherwise it is filed as a follow-up brief. ⛔ No fix code
before the findings are written and reviewed with the owner (investigation-first).

### Part 1 — GameAnalytics read (owner's Chrome, owner present, read-only)

Do this **first and soon** — the longer it waits, the further the breach day slides back in the data. Record every
figure as an **observation read off the UI**, with the date it was read.

1. **Which day(s) breached**, and the **events per active user per day** trend for at least the last 30 days (and back
   to early September if the view allows, so today can be compared with the 4 Sep breach).
2. **Breakdown on the breach day vs a normal day:** per top-level category (`Performance`, `Player`, `Experiment`,
   `Session`, `Platform`, `Device`, `Match`, `Game`, `UI`, `Worker`, `Login`/`Account` or whatever exists now) **and**
   per event name inside the category that moved. Does the shape match September (session-start family) or something
   new (a single event name, a timer category)?
3. **Few heavy users or everyone?** Whatever GameAnalytics offers: distribution / percentiles of events per user, the
   top users by event count (counts only — ⛔ **no user ids copied**), sessions per user per day on the breach day vs a
   normal day.
4. **Splits:** by **build** (`configureBuild` sets the build version) — is the excess on the current production build,
   an old build (stale/zombie tabs), or a build that should never reach production (dev/staging → `0226`)? By
   **platform / device / browser / country** if available.
5. **DAU and total events** on the breach day vs a normal day (the arithmetic in Part 3 needs both).
6. **What GameAnalytics says the limit does** — its own help/"Learn more" text and the integration-review page it
   links: is data dropped, throttled, or only flagged? Does the count include SDK-generated events (session start/end,
   user events) as well as Design events? Is there a cardinality limit, and does anything show "Dropped events"?
   Quote GameAnalytics' wording; ⛔ do not infer what it does not say.
7. **Re-check `0224`'s two unreconciled figures** if the same views are available (category split vs daily total;
   the 7-day mean) — resolved, or re-recorded as still unresolved.

🔒 **Copy nothing identifying**: no game key, secret key, numeric dashboard/game ID, URL containing it, user id or
token — into any artifact. Names, counts and dates only.

### Part 2 — Code read (agent, no owner needed; can run before or alongside Part 1)

1. **Every emitter that can repeat**, with file:line: timers/intervals (`setInterval`, `setTimeout` chains),
   per-tick or per-frame emits, polls (lobby polls, profile reads, status checks), retry loops, reconnect/rejoin
   paths, re-init on platform recovery, emits inside loops, and every page-reload path listed in Context.
2. **The once-per-session block** (`Session:Start`, `Device:*`, `Platform:*`, `Player:New/Returning`,
   `Experiment:*`): can it run more than once per page load? Can the page reload repeatedly (e.g. a recovery or
   stale-build reload that loops on some platform)?
3. **Double init of the GameAnalytics SDK** (`initialize` / `configureBuild` called twice, two bundles, two iframes)
   and whether the SDK replays a stored offline queue on start (which could resend events).
4. **Dev/staging traffic reaching the production key** — the current state of `0226`'s fail-open defaults, and which
   builds were deployed around the breach day(s) (git tags / deploy commits; read-only).
5. **A per-session and per-day event budget estimate**: a table of event → trigger → expected count per session and
   per hour of play, then a typical day for a light, normal and heavy player, compared with 500 — **including
   `0451`'s `PrivateLobby:*` events** (≤ ~6 per host cycle, ≤ ~3 per guest) and room for `0299`.
6. Use `ai-agents/knowledge-base/analytics-event-reference.md` and the `flashistConstants.analyticEvents` enum, but
   ⚠️ the enum alone is not enough — `Experiment:*` names are built at runtime.

### Part 3 — Findings report + fix plan

Write `ai-agents/knowledge-base/reports/<YYYY-MM-DD>-0456-gameanalytics-per-user-event-limit-findings.md`:

- **The mechanism, with evidence** — or a plain statement that **it was not found**, with what was ruled out and what
  would be needed to find it. ⛔ An honest "not found" is a valid outcome; a plausible-sounding guess written as a
  cause is the failure this task must avoid (the `0224`/`0230` lesson).
- Every claim labelled **observation** (read off GameAnalytics), **code fact** (file:line) or **inference**.
- **The arithmetic written out with its inputs**: DAU, events/user, the extra events or sessions the mechanism implies,
  and whether that actually adds up to the observed excess. A mechanism that cannot account for the size of the
  excess is reported as partial.
- **Whether `0230`'s four hypotheses are each confirmed, refuted, or still open** (whatever the owner rules on `0230`,
  the evidence is the same).
- **A fix plan for the owner**: what to change, how many events per user per day it removes (estimate, labelled), what
  analytics detail is lost, and a target headroom so that `0451`'s events and `0299` fit. Candidate levers to weigh,
  not pre-chosen: fix a repeat/loop/double-init; cap or de-duplicate once-per-session events per page load; sample or
  cap a high-rate category; drop redundant events; fix `0226` if dev traffic is implicated.
- **Plan gate:** the owner reviews the report and plan, then rules: build a small fix inside this task, or file the
  fix as a follow-up brief (and whether `0226` gets pulled in). ⛔ No fix code before that ruling.

### If a fix is built here (owner-approved at the gate only)

- Event strings only via the `flashistConstants.analyticEvents` enum; **`analytics-event-reference.md` updated** for
  every added, removed, renamed or re-timed event.
- Tests for any changed emitter behaviour; `npm test` (full run through the npm script, one at a time) green and
  `npm run lint` clean.
- A fix that ships code joins `0426`'s wait set (Sprint 8's final deploy).

## Verification steps

1. **Part 1 done:** the report contains the breach day(s), the events/user/day trend, the category and event-name
   breakdown (breach day vs normal day), the heavy-users-vs-everyone answer, the build/platform split, and
   GameAnalytics' own wording on what the limit does — each figure dated and labelled as a UI observation; anything
   the UI could not show is written as "could not be determined", not guessed.
2. **Part 2 done:** the report has the repeat-emitter list with file:line, the double-init / offline-replay /
   reload-loop answers, the `0226` channel status, and the per-session / per-day budget table including `0451`'s
   events.
3. **Part 3 done:** the report names the mechanism with evidence and arithmetic, **or** states plainly it was not found
   and what is missing; `0230`'s four hypotheses each marked confirmed / refuted / still open.
4. **Plan gate held:** the fix plan was put to the owner and the owner's ruling (build here vs follow-up brief; `0226`
   in or out) is recorded in this task's worklog, verbatim.
5. **If a fix was built here:** enum-only event strings, reference doc updated, tests added, full `npm test` green,
   `npm run lint` clean.
6. 🔒 No key, secret, dashboard/game ID, URL containing one, user id or token in any artifact.
7. ⛔ **NOT verification:** "the banner is gone" or "today is under 500". The metric self-resolved on 5 Sep 2026 with
   zero code written — a green banner proves nothing about a fix.
8. **The live check is a separate verify task** (build/verify split rule, 2026-09-29): after the fix is deployed, the
   owner reads per-user events/day back under the limit **with the category that caused the excess shown to have
   dropped** (not just the total), over several days. Filed at this task's (or the follow-up fix's) close; its
   placement is the owner's call.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing formally. The follow-up fix brief (if any) and the verify task depend on this one.
- **Work order:** first open work for the ship loop, **by the owner's ruling** (*"our next task in the Sprint 8"*) —
  the rank number 50 is board mechanics only.
- **One brief, not several:** Part 1 (owner's browser) and Part 2 (code) feed one finding — the mechanism needs both,
  and neither is useful shipped alone. Part 2 may run while waiting for the owner's browser time. The fix is not split
  out yet because its shape is unknown until the findings exist; the plan gate decides.
- ✅ **CLOSED 2026-10-14 — `✅ Done (agent-closed — not owner-verified)`**, by a spawned `fkit-producer` (no owner
  channel, ADR-021/037) via `/fkit-task-done`, at the end of its `fkit-sprint-ship-loop` step, relayed by `fkit-lead`.
  **Investigation done; no code changed.** Deliverable: the
  [findings report](../../../knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md).
  Verdict at its stated strength: breach day **12 Oct** (1,822.3 events per active user); on the big spike days the
  excess was **extra copies of the once-per-page-load events and NOT new page loads** — session counts stayed normal;
  **leading explanation: the GameAnalytics SDK re-sending events already queued, in a queue shared by all our builds —
  NOT proven**; the source of the old-build-tagged events (~86.6 % of 12 Oct's extra `Platform` events) was **not
  identified**. Normal days ~114 events per user, well under 500. GameAnalytics' docs: over the limit = an alert; they
  do not say anything is dropped or throttled. An ephemeral `@fkit-reviewer` pass ran (coverage: reasoning-only second
  opinion), and all ten findings R1–R10 were applied in the report's revision. **The plan's fix gate ended in "no code
  fix"** by owner ruling 1 below, so acceptance criteria 5 and 8 (fix built here; live verify task) do not apply — no
  fix and no verify task exist. ⚠️ Not owner-verified: no human checked this close.
  **OWNER RULINGS, 2026-10-14**, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not
  producer precedent:
  1. **Fix path.** The owner wrote (verbatim, "Other" field): *"Do I understand correctly that you're saying that the
     problem is not going to be repeated in tegular situations? If yes, I suggest adding a task to the backlog sprint
     about monitoring the spikes in the future, but don't mention the proposed solutions there: to be honest, I don't
     like the options of us "intruding" into the GameAnalytics logic of deduplication and filtering events from not
     latest builds (the last one is a no-no, because we need to collect the events from all builds to be able to spot
     any problems during releases)"*. After `fkit-lead`'s answer (normal days fine, ~114 per user; spikes very likely
     to recur, ~10 since late August; docs say alert only, no data loss): **"Yes, file it in Backlog (Recommended)"** —
     *"Monitoring only; no proposed solutions; nothing dropped or filtered."* (→
     [`0458`](../../backlog/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md)) and **"Yes, close with the
     report (Recommended)"** — *"A producer closes 0456 (agent-closed marker); I put the 0230/0226/game-ID questions to
     you then."* ⇒ **No code fix, no follow-up fix task.** The report's §12 fix options stay in the report as analysis
     only.
  2. **`0230`** — see the next bullet (kept open).
  3. **`0226`** — **"Leave it where it is (Recommended)"** — *"You prefer not to change analytics now; it stays a
     separate Backlog task, with this new reason noted on it."* (→ dated note on
     [`0226`](../../backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md): public repo.)
  4. **Game ID** — question *"The numeric GameAnalytics game ID is written in 3 task files (backlog.md, 0212 brief, 0439
     brief) of a public repo, against the 'no IDs in files' rule. File a small task to remove it?"* → **"File in
     Sprint 8"** (→ [`0459`](../0459-remove-the-gameanalytics-game-id-from-tracked-task-files/brief.md)).
- 📌 **2026-10-14, at `0456`'s close — `0230` is NOT cancelled, by OWNER RULING. This supersedes the *At close*
  instruction in the next bullet (struck, kept as history).** Live `AskUserQuestion` in the `fkit lead` session, relayed
  by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim
  selection: **"Not answered: keep 0230 open (Recommended)"** — option text: *"0230 stays on Backlog, noting the re-send
  explanation as its open lead; the new monitoring task covers future spikes."* Why: the
  [report](../../../knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md) §11 leaves
  hypothesis 3 **open** on its broad reading — the leading lead is the GameAnalytics SDK re-sending queued events, **not
  proven** (§7, §10). `0230` stays `🔲 Backlog` on the Backlog board; future spikes are logged by
  [`0458`](../../backlog/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md).
- ~~📌 **At close: cancel [`0230`](../../backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md) as absorbed by
  `0456` — only if the findings report marks all four of 0230's hypotheses confirmed/refuted; else back to the
  owner.** The producer closing `0456` runs `/fkit-task-cancelled` on `0230` in the same act, with a reason naming
  `0456` and this ruling. ⚠️ *Producer's reading, not the owner's:* hypothesis 4 (*"something else entirely"*) counts as
  answered only if the report says plainly whether a mechanism outside 1–3 was found; if in doubt, back to the owner.~~ *(Superseded 2026-10-14 by the bullet above — not run.)* **OWNER RULING, 2026-10-14**, live `AskUserQuestion` in the `fkit lead`
  session (driver of `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner
  channel (ADR-021/037); ⛔ not producer precedent. Question: *"0230 (Backlog, September) investigated the 3–4 Sep spike
  of this same limit and never found the cause. 0456 looks at the same limit and starts from 0230's list of suspects.
  What happens to 0230?"* Verbatim selection: **"Absorb, cancel at 0456 close (Recommended)"** — option text: *"One
  investigation. When 0456 closes, a producer cancels 0230 as absorbed, but only if 0456's report answered all four of
  0230's suspects; otherwise it comes back to you."* This answers the open question in the next bullet (kept as history).
- ~~🚩 **Open owner question — what happens to `0230`?**~~ *(answered 2026-10-14 — see the bullet above.)* Recommended: **this task absorbs it** — same limit, same
  categories, same data, and its hypotheses are this task's starting list; when `0456` closes, a producer cancels
  `0230` as "absorbed by 0456" (only if the report covers its four hypotheses; else back to the owner). Alternatives:
  keep `0230` separate on the Backlog board (only the September spike); or explain more first. ⛔ Until ruled, nobody
  edits, moves or cancels `0230`.
- **Related:** `0224`, `0230`, `0226`, `0225`, `0227`, `0228`, `0229`, `0231`, `0232`, `0233`, `0299`, `0418` (same
  owner's-Chrome read pattern), `0451` (events to budget for), `0455` (also reads GameAnalytics in the owner's Chrome —
  the two sessions could share one sitting, but `0455` is time-gated on `0451`'s deploy).
- Filed 2026-10-14 by a spawned `fkit-producer` (no owner channel), relayed by `fkit-lead`.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — names, counts, dates and file:line references only.
