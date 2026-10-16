# Investigation: a mobile player reports the Halkidiki map always lags at ~01:38 and they cannot finish "task 7"

## ID
0467

> ℹ️ **ID allocation, checked 2026-10-16 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0466`. `0467`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an owner request of 2026-10-16** in the `fkit lead` session — *"Add a task to backlog to investigate
> this user feedback"* — relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel). No sprint was named,
> so it is filed on the Backlog board, unscheduled. ⛔ Not producer precedent.

## Priority
Unscheduled

(Backlog board, unranked by design.)

## Status
🔲 Backlog

## Owner
fkit-coder

This is an **investigation, not a fix.** Its output is a findings report and a recommended fix task. Any fix gets
its own brief once the owner has read the findings.

## Context

**In plain terms.** A player on a low-end Android phone sent an in-game bug report: the Halkidiki map lags every
time, starting about 1 minute 38 seconds into the game, and because of it they cannot get past "task 7". We do not
know yet whether this is a real, repeatable slowdown, what causes it, or what "task 7" is. This task finds out.

**The report, as received.** ⚠️ **Privacy: the player's username is deliberately not recorded here — refer to them
only as "a mobile player". Never copy their name into the report, the worklog or any follow-up brief.**

| Field | Value |
|---|---|
| Type | `[Bug] Feedback` (in-game feedback button) |
| Text (Russian, verbatim) | «У вас карта Халкидики лагает вечно на 01:38 минуте игры начинает лагать я не могу пройти 7 задание» |
| Plain English | "Your Halkidiki map always lags — at 01:38 into the game it starts lagging; I can't complete task 7." |
| Sent from screen | `start` (main menu — so not mid-match; `Match: n/a`) |
| Platform | mobile, Yandex Games (`yandex`) |
| Build | `0.0.164` — the current game prod build (tag of 2026-10-13) |
| Recent matches | `MJjx8ToJ`, `S3KYoRD2`, `M7sThDRE` |
| Sent at | 2026-10-16T07:00:16.465Z |
| Device | Chrome 147.0.0.0, Android 10, screen 393×873, DPR 2.75, 8 CPU cores, 4 GB RAM, GPU ANGLE (Qualcomm, Adreno 610, OpenGL ES 3.2), `ru-RU` |

**What the producer found while filing (read-only, 2026-10-16 — a lead, NOT a finding; confirm it):**

- **The map exists.** `GameMapType.Halkidiki` (`src/core/game/Game.ts`), files under `resources/maps/halkidiki/`,
  strings `halkidiki` → "Halkidiki" / «Халкидики» in `resources/lang/en.json` / `ru.json`. Its manifest says
  **2200 × 1760 tiles (~3.87 M), ~1.73 M of them land** — among the larger maps by `map.bin` size (close to Europe and
  Africa; nearly twice World). Max players in `src/core/game/MapPlayers.ts`: `[100, 50, 40]`. 8 nations in
  `src/core/game/MapNationCounts.json`.
- **"Задание 7" is very likely single-player mission 7, and mission 7 appears to BE Halkidiki.** There is no
  "задание" string in `ru.json`; the closest feature is the single-player missions («Играть миссию: {level}»,
  `main.play_mission`). `selectMissionMap()` in `src/core/game/SinglePlayMissions.ts` sorts maps that have nations by
  nation count, then by name, and picks index `(level − 1) mod N`. Reading `MapNationCounts.json` by hand gives:
  1 Achiran (4) · 2 Faroe Islands · 3 Mars · 4 Yenisei (6 each) · 5 Australia · 6 Strait of Gibraltar (7 each) ·
  **7 Halkidiki** · 8 Iceland (8 each). That fits the report exactly — the player keeps replaying mission 7, which is
  always Halkidiki. ⚠️ **Hand-derived, not run.** Confirm by running `selectMissionMap(7, …)` against the real enum.
- **Why that matters for the investigation:** missions run **single-player on the device** (`src/client/LocalServer.ts`)
  — no game server simulates or relays anything — with **400 generic bots** plus the map's nations on a large map
  (mission config per the wiki page `missions-difficulty-investigation`, from task `0142`). So the whole cost lands on
  a 4 GB / Adreno 610 phone. And if these are single-player games, the three "recent matches" may have **no server
  record at all** — the investigator must check, not assume.
- **Fork context, relevant here:** turns are 1.5× faster than upstream (`// Flashist Adaptation`, ~66.7 ms per turn,
  `DefaultConfig.ts`), so a slow device has less time per tick than upstream OpenFront would give it. Whether the
  single-player local server uses the same interval is part of what to check.

**Related, not dependencies:** the missions investigation `0142` (done); mission progress reset `0344` / `0345`;
`0006` (slow-turn threshold vs the 66.7 ms interval); `PerformanceMonitor` tasks `0081`, `0225`, `0227`, `0233`.
Wiki: `wiki/tasks/missions-difficulty-investigation.md`, `wiki/features/feedback-button.md`, `wiki/tasks/tutorial.md`.

## What to build

A findings report — **no code change ships from this task.** Work through the four questions in order; each answer
goes in the report with its evidence (file paths, measurements, trace IDs — never a connection string or host).

1. **Pin down the map and "task 7".**
   - Confirm the Halkidiki map's identity and size against the other maps (tile count, land tiles, nation count, max
     players), in a small table.
   - Confirm what "задание 7" means in the product. Check the strings in `ru.json` / `en.json` and the code: single-
     player missions (`SinglePlayMissions.ts`, `SinglePlayMissionStorage.ts`, `LocalServer.ts`), the tutorial steps,
     and anything else a Russian player could call «задание». **Run** `selectMissionMap(7, …)` rather than trusting
     the hand-derived table above. State which other mission levels also land on Halkidiki (the cycle repeats every N).
   - Record the full config that mission 7 actually runs with: map, bots, nations and their difficulty mix, win
     threshold, turn interval.

2. **Is the lag at ~1:38 reproducible, and what causes it?**
   - Play mission 7 (or a single-player game with the same config) on Halkidiki and profile it. Use a desktop browser
     with **CPU throttling (e.g. 4–6×) and a mobile viewport at DPR ~2.75** as a stand-in for the device class, and a
     real low-end Android phone if one is available (say which you used — a desktop stand-in is evidence, not proof).
   - Look at what happens around 1:30–1:50 of game time: does anything step up then — bots or nations finishing
     spawn, a burst of attacks, troop or unit counts, borders getting longer, a rendering layer that switches on, the
     WebGL layer, memory growth / garbage-collection pauses, or the Web Worker simulation falling behind the turn
     clock? Separate **simulation cost** (worker tick time) from **render cost** (main-thread frame time).
   - Compare with one or two other maps of similar size and with a smaller map, same config, to tell "Halkidiki
     specifically" from "any large map with 400 bots on a weak phone".
   - Check what the existing `PerformanceMonitor` / client telemetry would have recorded for such a session.

3. **Look up the three recent matches** — `MJjx8ToJ`, `S3KYoRD2`, `M7sThDRE` — **read-only**, in whatever records
   exist: Uptrace traces/logs, game archives, server logs. Look for slow turns, desyncs or errors near 01:38. **If they
   are single-player games and no server record exists, say so plainly** — that itself is a finding (it means we have
   no visibility into this class of lag), not a dead end to paper over. Ask the owner for any credentials or box
   access you need; do not work around it.

4. **Is this one player or many?** Check the feedback channel history and analytics (GameAnalytics, any client
   performance events) for other reports or signals of lag on Halkidiki, on mission 7, or on low-end mobile in
   general. If the analytics cannot answer the question (e.g. no map or mission level is attached to events, as
   `0142` found), say exactly what is missing.

**Output:** `ai-agents/knowledge-base/reports/2026-MM-DD-0467-halkidiki-mission-7-lag-findings.md` containing:
- the answers to 1–4, each with its evidence and an honest confidence level;
- the **cause**, or if not proven, **hypotheses ranked** by likelihood with what would confirm or refute each;
- a **recommended fix task** (what, why, rough size) — and, if more than one fix is plausible, the one you recommend
  and its main trade-off. Possible directions to weigh, not to pre-decide: a cheaper Halkidiki (or mission-7) config,
  a device-aware setting for low-end phones, a specific render/sim hot spot, or better telemetry first.

## Verification steps

1. The report exists at the path above and answers all four questions; any question it could not answer says **why**
   and what would be needed.
2. The "task 7" identification is backed by a run of `selectMissionMap(7, …)` (or by the code path that is the real
   answer), not by the hand-derived table in this brief.
3. The repro section states the exact setup (device or throttle factor, viewport/DPR, build, map, config) and shows
   numbers — frame time and/or worker tick time — across the 1:30–1:50 window, compared with at least one other map.
4. The three match IDs each have a stated outcome: found (with what was seen) or not found (with where you looked).
5. The report and the worklog contain **no player username or real name**, and **no DSN, endpoint, host, password
   or token**. Grep both before handing off.
6. No source file changed (`git diff --stat -- src/ resources/` is empty for this task's work).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing (a fix task, if any, is filed after the findings are reviewed with the owner)
- **Owner rule for any follow-up:** spatial or gameplay changes (map config, bot or nation counts, spawn rules) must
  be validated on the **real Halkidiki map**, not only in synthetic tests.
- **Privacy rule for this task and anything it spawns:** refer to the reporter as "a mobile player". Match IDs and
  device specs are fine to record.
- If the investigation shows the lag is a general "large map + 400 bots on a weak phone" problem rather than a
  Halkidiki one, say so — the fix brief should then target the general case, and the owner should decide the scope.
