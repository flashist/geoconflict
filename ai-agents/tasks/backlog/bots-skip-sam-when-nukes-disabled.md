# Task — Bots: Stop Building SAM Launchers When Nukes Are Disabled

## Priority
Low / No sprint — player-reported gameplay quality fix, small scope, no dependencies

---

## Player Feedback

> "Идея (недоработка): Боты в режиме "без ядерок" всё также строят ПВО. Будет интереснее, если на эти деньги они будут активнее строить города и укрепления."

**Summary**: In "no nukes" matches, bots still build SAM launchers. Since no nukes can ever be launched, every SAM is wasted gold. The player suggests that money should go into cities and fortifications instead.

---

## Current Behavior

The player's report is verified accurate:

- The public "no nukes" modifier (`modifier_no_nukes`, one of `WEIRD_SETTING_OPTIONS` in `src/server/MapPlaylist.ts`) works by setting `disabledUnits: [UnitType.MissileSilo]`. **SAM launchers are not disabled** — but with silos disabled, no nuke can ever exist, so SAMs are dead weight. The same applies to custom/private lobbies and singleplayer games where nukes are disabled.
- Bot construction decisions live in `FakeHumanExecution.handleUnits()` (`src/core/execution/FakeHumanExecution.ts:437`) — a short-circuit priority chain: City → Port → Warship → Factory → DefensePost → SAMLauncher → MissileSilo, each gated by a perceived-cost multiplier in `maybeSpawnStructure()`.
- Build validation (`isUnitDisabled` via `Player.canBuild`, `src/core/game/PlayerImpl.ts:870`) already blocks disabled units, so bots silently skip silos in these matches — but nothing tells them SAMs are pointless, so they keep paying for them.
- **One fix covers all bot-like players**: both nations (`ExecutionManager.fakeHumanExecutions()`) and AI Players (`ExecutionManager.aiPlayerExecutions()`) run `FakeHumanExecution` (`src/core/execution/ExecutionManager.ts:143,160`).

Reach: `weird_setting` holds the full 20% modified-match budget, so no-nukes is roughly 5% of public matches, plus any custom game with nukes disabled.

---

## What to Build

In `FakeHumanExecution.handleUnits()`, skip the `SAMLauncher` spawn attempt when `MissileSilo` is disabled in the game config (`this.mg.config().isUnitDisabled(UnitType.MissileSilo)`).

**Locked decision — no multiplier rebalance.** Do not change the City/DefensePost perceived-cost multipliers. Skipping the SAM step is sufficient: the freed gold flows naturally to the earlier entries in the priority chain (cities, ports, factories, defense posts), which is exactly the behavior the player asked for, without new balance risk.

Implementation notes:
- The check belongs in bot decision logic, not in `canBuild` — SAMs remain legally buildable by human players in no-nukes matches; this task only stops *bots* from wasting gold on them.
- The silo check is the right v1 condition. A fully general condition would be "no nuke-capable path exists" (e.g. all nuke types disabled while silos remain enabled), but no current mode produces that configuration — do not over-engineer.
- The symmetric case (no-SAM mode: bots still build silos) needs no change — nukes remain effective there.

---

## Verification

1. **Unit tests (required — `src/core/` rule):**
   - With `disabledUnits: [UnitType.MissileSilo]`, `FakeHumanExecution` never issues a SAMLauncher construction over a long simulated run.
   - With default config, SAM construction behavior is unchanged.
2. **Live validation (per project feedback rule — don't trust synthetic tests alone for gameplay changes):** run a real match with nukes disabled (private lobby or forced modifier) on dev; observe that nations/AI players build no SAMs and accumulate more cities/defense posts than before.
3. No new analytics events needed — this is bot-internal behavior with no player-facing funnel.

---

## Notes

- Effort estimate: ~half a day including tests.
- Experiments: ❌ Excluded — bot behavior quality fix, ships to all players.
- No dependency on the citizenship/payments track; can be picked up opportunistically alongside any deploy.
