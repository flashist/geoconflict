# Plan — 0456: investigate the GameAnalytics "500 events per active user per day" breach and plan the fix

Planning only. I wrote no source, no repo files and no plan.md. EnterPlanMode was not available because I am a spawned consult, so I followed the written planning-only rule instead.

## Summary
- **Deliverables:** (1) a GameAnalytics read in the owner's Chrome, read-only; (2) a code read that needs no owner; (3) the findings report at `ai-agents/knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md` (use the actual write date); (4) the fix decision put to the owner. No fix code until the owner rules. No full `npm test` unless a fix is approved.
- **The code read can start before the owner's sitting.** A short targeted pass (about 20 min) gives the sitting a list of specific event names to look up. The full read can run during or after the sitting.
- **0230 risk, flagged early:** 0230's four hypotheses are about the **3–4 Sep** spike. To mark them confirmed or refuted, the sitting must re-read **3–4 Sep** splits (build, platform, DAU), not only today. Hypothesis 4, "something else", can only be refuted if one of 1–3 is confirmed **and** its arithmetic covers the whole excess. If any hypothesis stays open, 0230 is not cancelled. Per the owner's ruling it then goes back to the owner.
- **Preliminary arithmetic (an inference, to be re-checked against that day's real DAU):** 4 Sep needed about (1,324 − 163) × 4.2K–5.5K ≈ **4.9M–6.4M extra events**. Testers clicking by hand cannot produce that. **A few clients stuck in a reload loop can**: one reload every ~3 s for a whole day ≈ 29K reloads ≈ ~200K+ session-family events per client. So "a few heavy users or everyone?" is the deciding question for the sitting.
- Code facts found while planning (cause **not** claimed for any of them) are in §2.0.

## 0. Ground rules for the whole task
- Label every claim as **observation** (read off the GameAnalytics UI, with the date read), **code fact** (file:line) or **inference**. "Not found" is a valid outcome.
- 🔒 **No secrets.** The GameAnalytics game key and secret key are literals in source at `src/client/flashist/FlashistFacade.ts:933-936` (code fact). Cite only that file:line, never the values. Do not write down the numeric game/dashboard ID, any URL containing it, user ids or tokens. Screenshots taken in the lead session stay in the session and are never saved into the repo, because the address bar shows the ID.
- **Read the code that produced the banner, not the working tree.** Production is tag `0.0.164` (deployed 2026-10-13); read it with `git show 0.0.164:<path>`. The working tree carries 0451's undeployed `PrivateLobby:*` changes in `FlashistFacade.ts` and other files. Those count only for the forward budget (§2.5).
- Do not touch `0230`, any mover skill, `ai-agents/wiki-vault/`, or task statuses.

## 1. Part 1 — the GameAnalytics sitting (owner's Chrome, owner present and logged in, read-only)
**Who:** the lead drives the clicks with claude-in-chrome; the owner is present. **How long:** about 30–45 min, in one sitting. **When:** as soon as the owner can; recommended the same day as the short code pre-pass (see open question 1).

**Read-only means:** build ad-hoc Explore queries but never press Save, Export, Create alert/report or Share. Change no game or organisation settings. Do not dismiss or acknowledge the banner. Menu names below are the expected ones; if the UI differs, adapt and record what was actually used.

**Before the numbers:**
- S0.1 — Record the dashboard **timezone** (GameAnalytics days are usually UTC). Every date in the report uses it.
- S0.2 — Record whether the **"Demo mode" banner** is present (0418 saw it on 2026-09-29, 10-05 and 10-08) and what it says. If it suggests the figures are sample data, stop and tell the owner before going on.
- S0.3 — Copy the limit banner's exact wording and note which page(s) show it.

**Checklist.** Capture counts only. Exclude the current partial day from any average.
1. **Breach days and trend.** Events per active user per day, daily, for the last 30+ days, and back to 1 Sep if the view allows. Record each day's figure and mark every day above 500. For the same days also record **DAU** and **total events**. ⚠️ The metric is a ratio: a breach can come from more events **or** from fewer counted users (for example, the SDK's user event not arriving). Both parts are needed.
2. **Category breakdown: breach day vs a normal day** (pick the nearest normal day before it). Per-user count for each top-level Design category that exists: `Performance`, `Player`, `Experiment`, `Session`, `Platform`, `Device`, `Match`, `Game`, `UI`, `Build`, `Worker`, `Login`/`Account`, and any others listed. Then, inside each category that moved, the per-event-name counts. The pre-pass list (§2.0) names the events to check first: `Session:Start`, `Player:New`/`Player:Returning`, `Device:*`, `Platform:*`, the `Experiment:*` name count, `Build:StaleDetected`, the stale-build refresh click, `LongSessionRefresh` events, the platform-degraded/recovered and SDK-loader-retry events, and `Performance:*`.
3. **A few heavy users or everyone?** Use whatever GameAnalytics offers: a per-user distribution or percentiles if they exist; otherwise **sessions per user** and **session count** on the breach day vs a normal day, plus the segment splits in step 4 as a stand-in (an excess concentrated in one build/country/platform points to a few sources). ⛔ No user ids copied.
4. **Splits on the breach day vs a normal day:** **build** (is the excess on 0.0.164, an older build — zombie tabs — or a build string that should never reach production, which would point at 0226 or outside traffic?), custom dimension 01 (mobile/desktop), custom dimension 02 (yandex/web), platform/OS, browser, country.
5. **The same steps 1–4 for 3–4 Sep and 5 Sep**, needed for the 0230 verdicts: DAU, total events, build split and platform/country split on 3 Sep, 4 Sep and 5 Sep. If the UI can no longer show splits that far back, record "could not be determined".
6. **What the limit does, in GameAnalytics' own words:** follow the banner's "Review integration here" and "Learn more" links. Quote: whether events are dropped, throttled or only flagged; whether the count includes SDK-generated events (session start/end, user) as well as Design events; whether a cardinality limit applies; whether any "Dropped events" figure or toggle is active (it was greyed out in September). Record only what it says.
7. **Re-check 0224's two unreconciled figures:** (a) does the category split add up to the daily total (if not, does total events include non-Design SDK events that would explain the gap?); (b) the 7-day mean around 4 Sep (581.97 vs 378.86). Mark each resolved or still unresolved, with the date read.
8. **Design-event cardinality:** the distinct event-name count now vs the ~103–118 seen in September, and whether any "limit reached" badge shows.

**Output of the sitting:** the lead passes the numbers back as a plain table (date, view, figure). The coder writes them into the task's `worklog.md` (sitting record) and the report.

## 2. Part 2 — the code read (agent alone, no owner)
### 2.0 Short pre-pass (before the sitting) — code facts found while planning; none is claimed as a cause
- The send path is `FlashistFacade.ts:578-600`. Each event is one `GameAnalytics.addDesignEvent`, sent only when `DEPLOY_ENV === "prod"` at build time.
- The once-per-session block is `initializeImmediate()` at `FlashistFacade.ts:903-1000`. It is latched **once per page load** by `hasInitializedImmediate` (`:903-905`) and emits `Session:Start`, `Device:*`, `Platform:*`, `Player:New`/`Returning` and days-played. **So only a page reload can repeat it.** The question becomes: what reloads, and can it loop?
- Experiment events are latched by `hasLoggedExperimentEvents` (`:837`) and fired at `:1123-1125`, `:1266` and `:1463-1466` (a re-init path). Check that the latch holds across that re-init.
- Reload sites: `Bootstrap.ts:86` (latched in sessionStorage), `StaleBuildModal.ts:113/121` (user click), `AccountModal.ts:319`, `TokenLoginModal.ts:90`, `FlashistFacade.ts:542/1289/1300`, `Main.ts:209/368`, `CitizenshipCard.ts:845`, `LongSessionRefresh.ts` (forced reload at a page age of 23 h, checked every 60 s), and `jwt.ts:178` (Discord login redirect, probably unused). **The brief's list missed `LongSessionRefresh.ts`, `Main.ts` and `CitizenshipCard.ts`.**
- Timers: 24 `setInterval` sites in `src/client`. Seen so far: `PerformanceMonitor.ts:6` (300 s); `BuildVersionChecker.ts:9` (5 min poll, emit latched by `staleDetected`); `LongSessionRefresh.ts:34` (60 s check).
- **Candidate loop to check (an inference, not a finding):** a stale-build reload that gets the **old** HTML back (cached HTML, or a Yandex-hosted archive older than what the server's `/api/version` reports). Every load would then see a stale build, ask the player to refresh, the player clicks, and the cycle repeats, re-running the session block each time. Check the cache headers for both HTML entry points in `nginx.conf` and how the Yandex iframe HTML is served.
- **Deploy timing (code fact):** 8 production deploys 2026-10-08 → 10-13 (0.0.157–0.0.164), and 10 production deploys within one hour on 2026-09-12. **No production deploy on 3–4 Sep** (dev deploys and 0.0.141 came on 5 Sep). So "many deploys → stale reloads" cannot explain September by itself. Check it against today's breach day once Part 1 gives the day.

### 2.1 – 2.6 Full read (the brief's Part 2 items)
1. **Inventory of every repeating emitter**, with file:line, at tag 0.0.164: all `flashist_logEventAnalytics(` call sites (118 in `src/client` today) sorted by trigger. Timers and intervals, per-tick or per-frame emits, polls (`PublicLobby.ts`, `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts`, `Matchmaking.ts`, `ProfileSession.ts`, `PaymentsApiClient.ts`), retry loops (SDK loader retry `:1415`), reconnect/rejoin (`Transport.ts`, `ClientGameRunner.ts`), platform degraded/recovered (`:1249/1269`), emits inside loops, and `MultiTabDetector.ts` (several tabs = several sessions).
2. **Can the session block repeat?** Use 2.0: it repeats only by reload. For each reload site: can it fire without the user, can it loop, is a latch missing? Include Bootstrap's latch when sessionStorage behaves oddly in a sandboxed iframe.
3. **Double SDK init or replay:** the latch above; two bundles or two iframes (both HTML templates, `yandex-games_iframe.html`); and whether the `gameanalytics` SDK 4.4.7 (`node_modules/gameanalytics`) keeps a queue in localStorage and resends it on start. Read the SDK source; it uses localStorage.
4. **0226 channel status:** re-check `Dockerfile:23` and `webpack.config.js:335-336` at HEAD. Find which builds were live on each breach day (git tags and DEPLOY commits) and compare with Part 1's build split.
5. **Event budget table:** event → trigger → count per session and per hour of play, then a light, normal and heavy player's day compared with 500. It includes 0451's `PrivateLobby:*` (≤ ~6 per host lobby cycle, ≤ ~3 per guest), room for 0299, and the `Experiment:*` count (one per Yandex flag, decided at runtime). Cross-check against `ai-agents/knowledge-base/analytics-event-reference.md` and the `flashistConstants.analyticEvents` enum.
6. **Event diff between tags 0.0.141 and 0.0.164** (the enum plus new call sites): the list of events added since September that fire on a timer, poll or retry.

## 3. Part 3 — findings report
File: `ai-agents/knowledge-base/reports/<date>-0456-gameanalytics-per-user-event-limit-findings.md`. Sections:
1. What was seen (dated observations, timezone, the Demo-mode note).
2. Breach day(s), the trend, DAU and totals.
3. Category and event-name breakdown, breach day vs normal day.
4. Heavy users or everyone; the splits.
5. What GameAnalytics says the limit does (quoted).
6. The repeating-emitter inventory (file:line).
7. Answers on double init, offline replay and reload loops.
8. 0226 status.
9. Budget table.
10. **The mechanism with evidence and written-out arithmetic** (DAU, events/user, the extra events implied, whether that covers the excess). Otherwise a plain "not found", with what was ruled out and what is missing.
11. **0230's four hypotheses, each marked confirmed, refuted or still open, with evidence.** Plus its two data caveats and whether dev and production traffic could be told apart at all.
12. The fix plan: candidate levers weighed — fix a loop/repeat/double init; cap or de-duplicate the session block per page load or per day (localStorage); sample or cap a high-rate category; drop redundant events (for example, `Platform` and `Device` are byte-identical every day); fix 0226. For each: events removed per user per day (estimate, labelled), what analytics detail is lost, and a headroom target (suggested: normal-day total ≤ ~250, so a heavy player plus 0451 and 0299 stays under 500 — a proposal for the owner).
13. Not-verification note: a green banner proves nothing.

The task's `worklog.md` carries the sitting record, the decision log, and the owner's rulings verbatim.
Optional, the driver's call: one ephemeral `@fkit-reviewer` pass over the report (claims vs code at the tag, the secret check) before the owner gate.

## 4. Putting the fix decision to the owner
- Turn 1 (no question tool, per the "explain in its own turn" rule): a plain summary of the findings and the fix options with their numbers.
- Turn 2: one AskUserQuestion batch, each question with "Explain more, then ask again" last:
  - (A) Which fix lever(s). Options come from the findings.
  - (B) Build a small fix inside 0456, or file a follow-up brief through the producer.
  - (C) 0226: pull in, keep separate, or explain more.
  - (D) Where the verify task goes. The rule's default is the top of the next sprint, not blocking Sprint 8's deploy (0426).
- Rulings are recorded verbatim in the worklog. A fix built here would get its own plan, tests, one full `npm test` through the npm script, and `npm run lint`, then join 0426's wait set.
- Closing (producer, later): if the report marks all four 0230 hypotheses confirmed or refuted, the producer cancels 0230 as absorbed; otherwise it goes back to the owner.

## 5. Realistic failure modes this plan guards against
- The ratio trap (a DAU drop looks like more events).
- The timezone or partial-day trap.
- Reading the working tree instead of the deployed tag.
- Demo-mode data mistaken for real data.
- The category split not adding up because SDK events are not Design events.
- `Experiment:*` names changing with no deploy (Yandex flags).
- A few looping clients pulling up an average.
- Outside traffic, since the keys ship in the public bundle (an inference; the build split is the only way to see it).
- Writing a likely-sounding guess down as the cause (the 0224/0230 lesson).
- A secret leaking through screenshots or URLs.
- 0230 left unresolved because September's splits are no longer readable.

## 6. Tests and verification
- The investigation changes no code, so no tests and no full `npm test`.
- Before the owner gate, check the report against the brief's verification steps 1–3 and 6, and grep it for secrets (key-like hex strings, numeric game IDs, URLs).

## Owner decisions (2026-10-14, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session, relayed by fkit-lead)

These answer the plan's open questions and **override any conflicting text above**.

- **Plan approval — verbatim selection: "Approve (Recommended)".**
- **Sitting timing — verbatim selection: "Pre-pass, then sitting today (Recommended)".** Option text: "~20 min code read first gives a precise list of events to look up, then one sitting today."
- **Report check — verbatim selection: "Yes, one reviewer pass (Recommended)".** Option text: "Cheap insurance: 0224/0230 history shows guesses being taken as causes." ⇒ the optional ephemeral `@fkit-reviewer` pass over the findings report (claims vs code at the tag, secret check) is **required** before the fix decision is put to the owner.
