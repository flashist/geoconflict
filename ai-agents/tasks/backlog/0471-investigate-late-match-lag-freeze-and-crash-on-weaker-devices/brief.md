# Investigation: late-match lag, freezes and crashes on weaker devices (iPhone 11, Intel Mac) — player feedback after 0.0.165

## ID
0471

> ℹ️ **ID allocation, checked 2026-10-18 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0470`. `0471`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-18**, typed live in a Claude Code session and relayed by it to a spawned
> `fkit-producer` (no owner channel), verbatim: *"analyse the feedback of a user, brief a task for investigation of the
> problem to the backlog"* (with two Telegram screenshots of player feedback). No sprint named → Backlog board,
> unscheduled. ⛔ Not producer precedent.

## Priority
Unscheduled

(Backlog board, unranked by design. ⚠️ The board row is an **append** — a new row at the bottom of the Backlog board,
not a merit placement; see `## Notes` for where merit would put it.)

## Status
🔲 Backlog

## Owner
fkit-coder

This is an **investigation, not a fix.** Its output is a findings report and a fix plan. No fix ships from this task.

## Context

**In plain terms.** A player says that in long matches the game gets slower and slower on weaker devices until it is
unplayable: around minute 30–35 they can no longer attack, build or send help — they can only watch — their actions
show up on the map minutes late, and then their country is gone. On an iPhone 11 the game also crashes, sometimes
right at the start. On an M3 Mac it is fine. We do not yet know if this is real and repeatable, what causes it, or
whether it got worse recently. This task finds out.

**The feedback, as received** — the community Telegram chat, 2026-10-18, two days after game `0.0.165` went live
(tag of 2026-10-16). ⚠️ **Privacy: the player's name is deliberately not recorded. Refer to them only as "a player in
the community Telegram chat". Never copy a name, user id or screenshot into the report, worklog or any follow-up.**

| # | Russian, verbatim excerpt | Plain English |
|---|---|---|
| 1 | «с 11 тоже всегда вылетает, иногда даже в самом начале / в середине уже невозможно играть, задержка огромная, ничего тупо сделать не можешь» | iPhone 11: it always crashes, sometimes right at the start; mid-game it is unplayable, huge delay, you simply can't do anything. |
| 2 | «на маке с м3 все летает … а вот на intel такая же херь как на 11 айфоне, ну не вылетает, только под середину задержка большая, тупо зависнуть может» | M3 Mac: runs great. Intel Mac: same problem as the iPhone 11 — doesn't crash, but towards mid-game a big delay, may just freeze. |
| 3 | Asked "desktop or phone?" → «там и там» | Both. |
| 4 | «к 30-35 минуте катки зависает/тормозит игра и все события, сделать ничего не могу (ни атаковать, ни строить, ни отправить помощь/запрос), только смотреть … (сначала время может идти медленнее, потом резко быстрее и все, твоей страны нет)» | By minute 30–35 of a match the game and all events freeze/slow down; I can't do anything (attack, build, send help/request), only watch … (first time may run slower, then suddenly faster, and that's it — your country is gone). |
| 5 | «действие, которое я сделал 7-10 минут назад, появится на карте» | An action I made 7–10 minutes ago appears on the map (later). |
| 6 | (paraphrase) | On the phone it freezes sooner and may crash; rejoining shows "the past" plus loading, and still no interaction. |
| 7 | Thread title: «Почему игра стала вылетать во время игры? Проблема на всех те…» | "Why has the game **started** crashing during play? The problem on all de[vices]…" — suggests a **recent worsening** (not verified). |
| 8 | Another player in the same thread: «можно, пожалуйста, оптимизацию качнуть немного» | "Could you please improve the optimization a bit." |

The player likes the game otherwise.

**Hypotheses from the relaying session — NOT a diagnosis. Confirm or refute each:**

- **H1 — the client simulation falls behind the server's turn stream on weaker devices.** Game logic runs on each
  client in a Web Worker; the server is only a turn relay; turns arrive every ~66.7 ms (`100/1.5`, the fork's 1.5×
  speed-up, `DefaultConfig.ts`). If one tick costs more than the interval, a local turn backlog builds up. That would
  explain: worse as the match grows (more territory, units, attacks), fine on M3, bad on Intel Mac / iPhone 11;
  actions appearing minutes late (they sit behind the backlog); and "slower, then suddenly faster" (catch-up).
  `src/client/ClientGameRunner.ts` has catch-up logic (`catchingUp`, `CATCHUP_THRESHOLD`, `CATCHUP_BATCH_SIZE`, a
  catch-up overlay, auto-spawn held during catch-up — see wiki `decisions/autospawn-late-join-fix.md`).
- **H2 — the iPhone crashes are memory:** iOS kills the tab when it uses too much memory. Not checked.
- **H3 — "started" means a recent change made it worse.** Candidates, none checked: the 5-million-starting-gold
  random modifier (bigger late game; origin task `0042`), the 1-minute lobby, anything in `0.0.157`–`0.0.165`
  (tags 2026-10-08 → 2026-10-16). It may also be an old problem a player only now complained about.

**Signals that already exist:**
- GameAnalytics `Performance:FPS:*`, `Performance:FPSAverage`, `Performance:Memory:*`
  (`ai-agents/knowledge-base/analytics-event-reference.md`, "Performance Events"). ⚠️ Read that section's caveats
  first: sampled every 300 s, match-scoped, `Memory:*` is Chrome-only (so **no iOS Safari memory data**), and `High`
  means high heap **usage** (bad). FPS measures the **main-thread render**, not worker tick time — it may not see H1
  at all.
- Uptrace client/server telemetry (wiki `systems/telemetry.md`, `systems/server-performance.md`).

**Related, not dependencies — link, don't merge:**
- `0467` — Halkidiki lag on a low-end Android phone at ~01:38 (single-player mission). Different shape (early,
  single-player, one map), possibly the same root cost. Share findings both ways.
- `0006` — the server's slow-turn threshold (100 ms) vs the 66.7 ms turn interval (owner `fkit-architect`).
- `PerformanceMonitor` history: `0081`, `0224`, `0225`, `0227`, `0233`.

## What to build

A findings report and a fix plan — **no code change ships from this task.** The questions below are a suggested
order; the coder's plan confirms or adjusts it.

1. **Is it real and repeatable?** Reproduce a long (≥35 min) multiplayer-shaped match on a weak device class:
   a desktop browser with CPU throttling (e.g. 4–6×), and a real older iPhone / Intel Mac if available (say which —
   a throttled desktop is evidence, not proof). Record the exact setup: build, map, player/bot count, modifiers,
   throttle factor, device.
2. **Is the client falling behind (H1)?** Measure, over match time: local worker tick time vs the turn rate, and the
   size of the unprocessed-turn backlog. Show whether and when the backlog starts to grow, whether catch-up kicks in,
   and how long a player's own intent takes from click to effect on the map. Separate simulation cost (worker) from
   render cost (main thread).
3. **Memory over a long match (H2).** Measure heap growth over the match; say whether it plateaus or keeps
   climbing (a leak looks different from "the game state is just big"). Say what can and cannot be measured on iOS
   Safari, and how close it gets to the point where iOS kills a tab.
4. **Did it get worse recently (H3)?** Compare `Performance:FPS:*` / `Performance:Memory:*` shares (and any
   relevant Uptrace signal) before vs after recent deploys (`0.0.157`–`0.0.165`). If a candidate change stands out
   (e.g. the 5M-starting-gold modifier), test with and without it. If the data cannot answer the question, say
   exactly what is missing.
5. **What grows, and what is the hot path?** Which game state grows with match length (tiles owned, border length,
   units, attacks, players alive) and which code paths' cost grows with it. Profile and name the top hot spots with
   evidence.
6. **Rejoin behaviour.** Explain the "rejoining shows the past, plus loading, still no interaction" report — is it
   the same backlog replayed on a device that cannot keep up?

**Output:** `ai-agents/knowledge-base/reports/2026-MM-DD-0471-late-match-lag-weaker-devices-findings.md` containing:
- the answers to 1–6, each with evidence and an honest confidence level;
- the **cause**, or if not proven, **hypotheses ranked** with what would confirm or refute each;
- a **fix plan**: candidate fixes (what, why, rough size), the one you recommend and its main trade-off. Directions
  to weigh, not to pre-decide: a specific sim hot spot, cheaper late-game state, device-aware settings, better
  telemetry first (e.g. a worker tick-time / backlog signal), or undoing a recent change.

**Plan gate:** when the report is in, **stop**. The owner rules whether the fix is built inside this task or filed as
a follow-up brief. Do not start a fix before that ruling.

## Verification steps

1. The report exists at the path above and answers questions 1–6; any it could not answer says **why** and what
   would be needed.
2. The repro section states the exact setup (device or throttle factor, build, map, players/bots, modifiers, match
   length) and shows **numbers over match time** — worker tick time vs turn interval, backlog size, heap size — at
   least at the start, ~15 min and ~30–35 min.
3. Each of H1, H2, H3 has an explicit verdict — confirmed, refuted, or not determined — with the evidence behind it.
4. The before/after-deploy comparison names the builds and date ranges compared, or states what data is missing.
5. The fix plan names one recommended fix with its main trade-off.
6. The report and worklog contain **no player name, user id or screenshot path**, and **no DSN, endpoint, host,
   password or token**. Grep both before handing off.
7. No source file changed for this task's work (`git diff --stat -- src/ resources/` is empty), unless the owner
   ruled at the plan gate to build the fix here.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing (any fix is filed or ruled after the findings are reviewed with the owner)
- **Related (not dependencies):** `0467`, `0006`.
- ⚠️ **Priority is append rank, NOT a merit ranking — flagged for owner confirmation.** The Backlog board is
  unranked; this row was appended at the bottom. **On merit this belongs alongside `0467`**, because both are
  player-reported performance problems on weaker devices that may share a root cost, and this one hits live
  multiplayer matches on several device types (a player-retention risk). It is a candidate to pull into an active
  sprint — that is the owner's call.
- **Privacy rule for this task and anything it spawns:** refer to the reporter as "a player in the community Telegram
  chat". No names, ids or screenshot paths.
- **Owner rule for any follow-up:** gameplay/spatial changes must be validated on real maps, not only synthetic tests.
- Deploys of any eventual fix go in a weekend slot unless the owner calls it urgent; a verify task follows a build
  task at the top of the next sprint (owner's standing build/verify-split rule).
