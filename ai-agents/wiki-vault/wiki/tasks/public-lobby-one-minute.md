# Cut the Public Lobby Wait From 2 Minutes to 1 Minute — a Test (task 0367)

**Source**: `ai-agents/tasks/done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 31 (append position; owner-placed directly below `0366`, with the top group) / task `0367`

> ✅ **Built and closed 2026-10-02; committed in `2247699`.** ⚠️ **Not deployed** — it rides a weekend
> game-server slot (target 2026-10-03/04). Committed is not deployed.
>
> ⚠️ **Closed over a red full `npm test`** (owner ruling *"Close + file both tasks (Recommended)"*). The red was
> ruled **pre-existing** — the deploy-hardening shell harness overran its 150 s deadline, also on clean `HEAD`.
> Fixed the same day by `0371`, see [[tasks/hardening-harness-speedup]].
>
> 🆕 **2026-10-03 — DEPLOYED to production in game release `0.0.156`** (commit `f712263`, live ~09:32 UTC,
> [[systems/weekend-deploy-window]]). Live lobby countdown samples (40 s / 20 s / 58 s) fit a 60 s window; public
> lobbies per hour went 30 → 40 (the switch hour) → ~1 a minute. The "Not deployed" line above is history.
> **Verify `0370` ran Steps 1–3 on deploy day** (from its worklog; it is still `🔲 Backlog`):
> - **Step 1, before baseline re-run** (2026-09-26 → 10-03, deploy day excluded): lone-real-player share **11.8 %**
>   (545 / 4 636; ÷ all public lobbies 10.8 % — use the same form for both windows); ≈ 662 public matches with a real
>   player per day; avg 7.41 / median 6 real players. The six days shared with the 2026-10-02 reference reproduce it
>   row for row; the 12.4 % → 11.8 % move is only the window shift. ⚠️ **Day-to-day swing on the same 2-minute
>   window: 7.6 %–13.6 %**, falling through the week.
> - **Step 2, GameAnalytics** `Game:Mode:Multiplayer`, same 7 days: **31.98K entries, mean 4.57K/day** — entries
>   (one per client per match, private lobbies included), **not matches**. ⚠️ Read by `fkit-lead` through the owner's
>   own login at the owner's request, not by the owner as the brief says — recorded, not hidden. ⚠️ A hidden "demo
>   mode" element was in the page; the lead judged the data real by scale — **not proven**. GameAnalytics' day
>   boundary was not checked. Context signals (click-to-entry conversion, `Match:Spawned`, `Ad:Interstitial`) **not
>   read**.
> - **Step 3, OWNER RULING — "noticeably worse" means a 7-day after share above 15 %** (verbatim *"Above 15 %
>   (Recommended)"*), set before any after-data. About 3 points over 11.8 % and above the worst single day seen.
>   ⚠️ **Not an automatic revert** — crossing it puts going back to 2 minutes on the table; the owner still rules.
>   The brief words the rule as a rise; the owner set an absolute level; the 15 % governs.
> - **Next:** day-4 snapshot due **2026-10-08 00:00 UTC**; after window **2026-10-04 → 10-10**. Log retention is
>   ≈ 14 days, so the before window would have aged out by the day-7 read — which is why Step 1 ran on deploy day.
>
> 🧪 **This is a test, not a settled change.** Whether to keep 1 minute is decided by verify task `0370` (top of
> [[decisions/sprint-8]]), against the owner-ruled rule below.

## Goal

A public multiplayer lobby stayed open **2 minutes** before its match started. The owner asked for **1 minute**:
players asked for it, and online player counts are growing, so the owner judged there are now enough players to fill a
shorter lobby.

**Why one number is the whole wait** (brief's code reading, 2026-10-01):
- `gameCreationRate()` in `src/core/configuration/DefaultConfig.ts` sets the window. Prod and preprod do not override
  it; dev overrides it to 5 s.
- Only **one** public lobby is open at a time — the master creates a new one only when none is open. So "the delay
  between lobbies" **is** the lobby's own countdown.
- A lobby holding **any AI player never starts early**, and production has AI players on — so almost every public
  match waits the full window. Halving the number really halves the wait.
- It is **wall-clock ms, not ticks** — the 1.5× game speed-up never touched it ([[decisions/adr-107-turn-interval-1-5x]]).

**What moves with it, by design:** the countdown players see (1:00 instead of 2:00, no client change); the AI fill
ramp (AI players arrive twice as fast, same target — see [[features/ai-players]]); empty started-game cleanup
(window + 30 s, so 150 s → 90 s); the share of joins that get the join ad (shown only if ≥ 15 s remain — roughly 1 in
4 joins now land in the last 15 s instead of 1 in 8, if arrivals are even); and the time a slow device has to load the
map before the start.

## Key Changes

- `src/core/configuration/DefaultConfig.ts` — `gameCreationRate()` `120 * 1000` → `60 * 1000`, with a
  `// Flashist Adaptation` comment naming the task and the revert value. Prod + preprod inherit it; dev's 5 s untouched.
- `tests/server/PublicLobbyWindow.test.ts` (new, 6 tests) — pins prod/preprod at 60 000 and dev at 5 000, and drives a
  real `GameServer` with the real prod config under fake timers: still a lobby with AI at 59 999 ms, started at
  60 000 ms, cleaned up just after 90 000 ms with no humans. Mutation check: putting `120 * 1000` back fails 5 of 6.
- `ai-agents/knowledge-base/architecture.md` — *Lobby window* now 60,000 ms, with a dated "was 120,000 ms" note.
- ADR-107 (knowledge base) — one dated line under its "lobby cadence did not speed up" sentence; the sentence itself
  is kept as a record of its date.

**Owner rulings (2026-10-01, live via `AskUserQuestion`):**
- **Q1 keep/revert rule** — *"Matches + lone-player share (Recommended)"*: keep 1 minute if **multiplayer matches per
  day hold steady or rise** AND the **share of matches with only one real player does not jump noticeably**. The
  owner sets the number for "noticeably" once the "before" numbers are in. Otherwise revert.
- **Q2 window** — *"7 days vs 7 before (Recommended)"*. Later (2026-10-02, on `0370`): the deploy day is left out of
  both windows.
- **Q3 + Q4** — *"Change only the number (Recommended)"*: no runtime switch, no new environment setting, the 15 s
  join-ad rule unchanged (join-ad count only watched). **Revert = the same one-number change back to 120 s**, in a
  later weekend slot.

## Outcome

- Targeted test 6/6; lint and `tsc --noEmit` clean. Stateful review round 1: ready to merge, 0 confirmed defects; one
  low finding (an ADR-107 citation) fixed; one accepted residual — the second opinion was reasoning-only (Codex could
  not run tests in its sandbox).
- ⚠️ **Full `npm test` was RED twice** at close: the hardening-harness deadline (above), plus once a
  `AlertRoutes.test.ts` `socket hang up`, read as the known supertest flake family (that suite passed 94/94 alone).
- **"Before" baseline, read from the game server's own logs** (7 days, 2026-09-25 → 2026-10-01, all on 2 minutes):
  ≈ 720 public lobbies/day (the 2-minute cadence itself); ≈ 661/day public matches with at least one real player;
  **lone-player share 12.4 %** (573 of 4 630); average 7.31 real players, median 6. A weekend dip (≈ 5 vs ≈ 8 real
  players) was noted, not explained.
  - ⚠️ The **lobbies-per-day count roughly doubles by construction** at 1 minute — it is not a "people play more"
    signal.
  - ⛔ **The owner-ruled main signal — multiplayer matches per day — was NOT read** (it lives in GameAnalytics, which
    the coder could not reach). It fires once per client per match and includes private lobbies, so it counts match
    *entries*, not matches. The server-side count above is context, not a replacement.
  - ⛔ Join ads **cannot be separated** from end-of-match ads in the analytics data (`Ad:Interstitial` carries no
    placement) without new code.
  - Log retention was measured at **≈ 14 days**, not the configured 7 — so the "before" window survives long enough;
    re-check before relying on it.
- **Follow-ups:** verify task `0370` (top of [[decisions/sprint-8]]; its Step 1 re-runs the "before" query **at the
  weekend deploy**, when the owner asks — nobody runs it unprompted); harness task `0371`, done the same day
  ([[tasks/hardening-harness-speedup]]).

## Related

- [[systems/architecture-overview]] — the game-server tier's lobby scheduling, now stating 60,000 ms
- [[decisions/adr-107-turn-interval-1-5x]] — the tick speed-up that deliberately left lobby cadence alone; now carries a dated pointer here
- [[features/ai-players]] — the AI fill ramp that spans the lobby window
- [[decisions/sprint-7]] — the board (rank 31); closed 2026-10-02
- [[decisions/sprint-8]] — verify task `0370`, at the top
- [[tasks/hardening-harness-speedup]] — task `0371`, filed at this close to fix the red `npm test`
- [[systems/weekend-deploy-window]] — the 2026-10-03 window whose game deploy (`0.0.156`) put this live
- [[tasks/telemetry-deploy-version-tags-production-check]] — task `0363`: the telemetry restart an hour before `0370`'s Step 1 query (no data gap)
