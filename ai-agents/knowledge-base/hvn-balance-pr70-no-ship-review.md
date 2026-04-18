# Humans vs Nations Balance (PR 70) — No-Ship Review

**Date:** 2026-04-18  
**Status:** No-ship  
**Recommendation:** Do not deploy this implementation. Cancel or close the current implementation task/PR as unsuccessful, and only reopen the feature with a fresh design brief.

---

## Summary

The current implementation attempts to balance **Humans vs Nations** by deriving a `nationCount` and a `botCountOverride` during match creation, then spawning only a subset of map nations while leaving the remaining non-human pressure budget as regular bots.

The implementation was meant to:

- count the full human-side roster (`real humans + AI Players`)
- set the amount of Nations based on that count
- cap Nations by the available bot budget and by the number of named nation spawns on the map
- reduce the number of regular Bots accordingly

That implementation is **not safe to ship**.

The reason is not just "balance tuning is off." The code now breaks the product contract of **Humans vs Nations** by allowing a third hostile faction (`Bot`) inside a nominally two-sided mode, and it only applies the new balancing logic to public HvN matches even though HvN is still exposed in other supported flows.

---

## What The Implementation Does

### Public HvN path

In `src/core/GameRunner.ts`, public HvN matches are detected and normalized through:

- `isHumansVsNations(gameStart.config)`
- `normalizeHumansVsNationsConfig(...)`

That normalization computes:

- `nationCount`
- `botCountOverride`

Then the runner:

- spawns only `nationCount` Nations from the map manifest
- still spawns the remaining `botCountOverride` regular Bots

### Runtime consequences

Regular Bots in this codebase are **not** members of the `Nations` team.

- Bots are `PlayerType.Bot`
- Bots are assigned to `ColoredTeams.Bot`
- `WinCheckExecution` explicitly refuses to declare `ColoredTeams.Bot` the winner

So the implementation does not produce a pure Humans-vs-Nations match. It produces:

- `Humans` team
- `Nations` team
- `Bot` team

That is a mode-level behavioral break, not a minor balancing issue.

---

## Confirmed No-Ship Findings

### 1. Removed nation slots are converted into regular Bots, creating a third hostile faction

This is the most severe issue and is enough by itself to block ship.

Relevant code:

- `src/core/GameRunner.ts`
- `src/core/execution/ExecutionManager.ts`
- `src/core/execution/WinCheckExecution.ts`

What happens:

- The balancing logic reduces Nations from the full map set to `nationCount`
- The "removed" nation pressure is not eliminated
- Instead, it survives as `botCountOverride`
- `GameRunner.init()` still spawns those as ordinary Bots

Why this is broken:

- Bots are on `ColoredTeams.Bot`, not `ColoredTeams.Nations`
- Bots can attack both Humans and Nations
- Bots can absorb territory and distort team control
- `WinCheckExecution` will not end the match if the Bot team is leading

Effectively, a mode that should be **Humans vs Nations** can now contain a neutral third force that cannot legally win but can still block one of the real sides from winning. That is a user-visible gameplay failure.

**Conclusion:** confirmed, severe, no-ship.

---

### 2. The balancing logic is applied only to public HvN matches, while HvN is still exposed in private and singleplayer flows

Relevant code:

- `src/core/GameRunner.ts` — `isHumansVsNations(...)` checks `gameType === Public`
- `src/client/HostLobbyModal.ts`
- `src/client/SinglePlayerModal.ts`

What happens:

- The new balancing logic only runs for public HvN
- HvN is still available in hosted private lobbies
- HvN is still available in singleplayer setup
- Those modes keep the old "all map nations" behavior

Why this is broken:

- The product surface still exposes HvN as one mode to the player
- But the match behavior now diverges depending on how the user starts it
- The code does not communicate that difference anywhere user-facing

This is an inconsistency in supported behavior and a real regression risk. Even if the public implementation were correct, this would still need to be resolved before ship.

**Conclusion:** confirmed, significant, supports no-ship.

---

## Review Findings That Depend On Earlier Assumptions

Two additional review comments were raised during PR review. They are worth recording, but they are **not** the main reason for the no-ship decision because they depend on older assumptions that were superseded during implementation discussion.

### A. "Exclude AI lobby fillers from the human count"

This would be valid only if the intended rule were:

> Nations should match only real human players.

That was **not** the final clarified rule used for the implementation discussion. The clarified rule was:

> Nations should match **all players on the human side** (`real + AI`).

So this point reflects an earlier product interpretation, not the final one.

### B. "Cap nation count by lobby capacity, not bot count"

This would be valid only if the final design still followed:

> `min(humans, maxPlayers - humans)`

That was also superseded during clarification. The later agreed rule was:

> Nations are capped by the available bot-replacement budget, and in the extreme case where there are not enough bot places, Nations must cap to that available bot budget.

So this review point also reflects an earlier rule, not the final clarified one.

---

## Final Assessment

I agree with the **no-ship** conclusion.

The implementation should **not** be deployed, and the current PR / task implementation should be considered unsuccessful.

The strongest reasons are:

1. It breaks the Humans-vs-Nations contract by introducing a third faction (`Bot`) into the mode.
2. It only changes public HvN while private and singleplayer HvN remain supported and inconsistent.

Those two findings are sufficient to block ship regardless of later disagreements about whether Nations should count only real humans or all human-side participants.

---

## Recommended Outcome

### Immediate

- Do not merge or deploy the current implementation
- Mark the current implementation as **No-ship**
- Close or cancel the current PR/task implementation attempt

### If the feature is revisited later

Re-open it only with a fresh brief that clearly answers:

- Should HvN remain a strict **two-faction** mode with only `Humans` and `Nations`?
- Are regular `Bots` allowed at all in HvN?
- Should HvN balancing apply to public only, or to all supported HvN entry points (public, private, singleplayer)?
- Should Nations count against:
  - real humans only
  - all human-side participants (`real + AI`)
  - some other mode-specific roster rule

Until those points are locked, additional implementation work risks repeating the same failure mode.
