# Geoconflict — Sprint 2 — Fix Onboarding

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 2 — Fix Onboarding

**Goal:** Convert curious new players into players who complete at least one full match. This is the single biggest lever on long-term DAU quality.

### 4. Tutorial — Guided First Bot Match
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — the tutorial is purely additive and only triggers for first-time players. Players not in the experiment group simply don't see it. Success metrics: second-session rate (do players who completed the tutorial come back for a second match?), match completion rate for new players, and `Session:FirstAction` rate (Task 2d) — the tutorial should increase the proportion of new players who take any meaningful action at all.

Currently there is no tutorial. A first-time player opening Geoconflict faces a complex map with no context — territory expansion, economy, alliances, nukes — and will close the tab within 90 seconds without guidance.

The tutorial should:
- Auto-trigger on first game open (detect via a first-open flag)
- Run as a singleplayer bot match on a small map — not a separate tutorial mode
- Show 4–5 tooltip moments at natural decision points:
  - When troops first become available: *"Click a neighboring territory to attack"*
  - When gold accumulates enough to build: *"You can now build a City"*
  - When an alliance request arrives: explain accept/reject
  - When a nuke becomes affordable: brief explanation
- End with the player winning. This is a critical design requirement — a player who wins their first match has a positive first memory, which drives the second session. The bot map should be small and easy enough that victory is achievable in 3–4 minutes.

The singleplayer mission infrastructure is already built. A tutorial is essentially Mission Level 0 with a tooltip overlay system added on top.

**Note:** the spawn selection tooltip in the tutorial should reflect the auto-spawn mechanic introduced in Task 4a. Instead of *"Click the map to choose your starting location"*, it should say something like *"You've been placed automatically — tap anywhere to choose a different spot"*.

---

### 4a. Auto-Spawn — Automatic Starting Location on Join
**Effort:** 1–2 days
**Experiments:** ❌ Excluded — this is a universal UX fix that applies to all players in all matches. Running it as an experiment would mean a portion of new players continue to experience the broken state we already know is a problem. Ship to all players.

**How impact will be measured:** the `Match:SpawnAuto` and `Match:SpawnChosen` events (Task 2d) directly measure this task's effect. Before Task 4a ships, SpawnAuto should be zero (no auto-placement exists). After it ships, the ratio of SpawnAuto to total spawn events tells you how many players were being missed by the old flow. Over time, as players learn the mechanic, SpawnChosen should increase relative to SpawnAuto.

A significant number of new players never make their first action because they don't realize they need to click the map to choose a spawn location. Even though a text prompt exists, it is easy to miss — especially on mobile. The result is a player who sits through the entire spawn phase and enters the match without a territory, or misses the window entirely.

**The fix:** place every player automatically at a valid spawn location the moment they join the match. They retain the ability to tap or click a different location at any point during the spawn phase if they want to reposition. There is no delay — instant placement is strictly better because it immediately communicates to the player that they are in the game and have a position on the map. Experienced players who have a preferred location will simply click it immediately, overriding the auto-placement as before.

**Key behaviors:**
- Auto-placement happens instantly on join, before the player has taken any action
- Show a brief contextual message near their placed location: *"You've been placed here. Tap anywhere to choose a different starting point"*
- The message must be clearly visible on mobile screens
- The player can reposition at any point during the remaining spawn phase by tapping or clicking any valid location
- This applies to all match types — singleplayer, public, and private

**Spawn location quality:** purely random placement can put a new player in a poor strategic position — surrounded by strong opponents with no room to expand — leading to early elimination before they've understood the game. The developer should check whether the existing spawn logic can be extended to bias auto-placement toward lower-competition areas such as map edges or zones with fewer nearby opponents. If this is straightforward, it should be included. If it adds significant complexity, random placement is acceptable for V1 and can be refined later.

---

### 4c. Auto-Expansion for Inactive Players (Multiplayer Only)
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — affects ghost players who by definition aren't making decisions, so experiment group assignment is meaningless.

After spawning, ghost players who make no input sit as a static dot and get swallowed immediately. This adds a short-lived automatic expansion that activates only when a player has made no input since spawning, only in multiplayer, and only into unoccupied (terra nullius) tiles — never into opponent territory.

**Behavior:** one auto-expansion intent emitted every 10 seconds, for a maximum of 1 minute (6 expansions total). Uses the same `AttackExecution` intent pipeline as a normal player click — not a special case. Troop send amount follows the normal default (~30% of current troops). Stops immediately and permanently the moment the player makes any input.

**Critical constraints:**
- Multiplayer only — never activates in `GameType.Singleplayer`
- Never targets another player's or bot's territory
- Must be fully deterministic — use `PseudoRandom`, never `Math.random()`; tile selection must be consistent across all clients
- Duration (60s) and interval (10s) must be named constants, not hardcoded

**Depends on:** Task 4a (auto-spawn) — most valuable when combined, since auto-spawned players are more likely to be inactive. Can ship alongside 4a.

---

### 4b. Zoom to Territory — Pan & Zoom on Player Name Click
**Effort:** 1–2 days
**Experiments:** ❌ Excluded — UX fix, applies to all players.

Players are reporting they cannot find themselves on the map. The existing click-on-name behavior in the player table only pans the map — it does not change zoom level. If the map is zoomed out and the player's territory is small, the territory ends up centered but still an unreadable dot.

**Two changes:**

1. **Unified zoom-to-territory on all name clicks:** extend the existing pan logic to also set zoom level based on territory size. Small territories zoom in to a close-up; large territories zoom to fit with a minimum zoom cap so labels remain legible. Smooth animated transition. `TransformHandler` is the right entry point.

2. **Dedicated "find me" button:** adds a persistent button in the match UI that calls the same zoom-to-territory logic targeting the local player's own territory. Must be easily tappable on mobile (44×44px minimum). Addresses the player feedback directly without requiring the player to find their own name in the table.

Pure client-side change — no server involvement, no determinism concerns.

---