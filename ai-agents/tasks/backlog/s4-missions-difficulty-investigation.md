# Investigation — Missions Mode Difficulty Curve

## Sprint
Sprint 4

## Priority
High — active player complaints; difficulty tuning decision cannot be made until findings exist.

---

## Context

Players are finding missions mode too difficult. Before any tuning changes are made, we need to understand how difficulty is currently structured across missions and what parameters are available to adjust. Mark and the technical specialist will make the tuning decision together once findings are in.

**Do not propose or implement any difficulty changes in this task.** Produce findings, document them, and present them for a joint decision.

---

## What to Investigate

### 1. Mission structure
- How many missions currently exist? Are they numbered and sequential?
- How is each mission defined — dedicated config files, hardcoded values, a shared schema?
- Is there a formal "difficulty" property per mission, or is difficulty emergent from individual parameters?

### 2. Difficulty parameters — map per mission
For each mission, document the current value of every parameter that affects how hard the game is for the player. At minimum:

| Parameter | Description |
|---|---|
| Bot / nation count | Total number of AI opponents |
| Bot aggression level | How aggressively bots expand and attack |
| Bot starting territory / advantage | Any head-start territory or resources given to opponents |
| Player starting conditions | Spawn location, starting resources, starting territory |
| Map size | Available territory relative to opponents |
| Win threshold | The territory % needed to win (confirm whether this is per-mission or global) |
| Time limits or other constraints | Any time-based pressure |
| Any other parameters that affect perceived difficulty |

If some parameters are shared globals rather than per-mission, note that clearly.

### 3. Available tuning levers
For each parameter identified above, answer:
- Can it be changed per-mission with a config/data edit, or does it require code changes?
- Is there a defined range or min/max, or is it unconstrained?
- Are there any parameters that currently cannot be tuned without significant rework?

### 4. Analytics signal (if available)
- Do we have any data on which missions players fail most frequently or abandon? (Check GameAnalytics for mission-related events.)
- If data exists, include the drop-off point per mission in the findings.
- If no per-mission analytics exist, note the gap — it may be worth adding mission-completion tracking as part of the follow-up.

### 5. Comparison with tutorial
The tutorial was recently tuned (bot count reduced from 400 to 100, nations removed). Note whether missions 1–N use the same config path as the tutorial or a separate one, since this informs whether tutorial-style tuning patterns apply to missions.

---

## Deliverable

A short findings document covering:
1. Current mission structure and how many missions exist
2. A table of difficulty parameters with current values per mission
3. A list of tuning levers with editability notes (config vs. code change)
4. Analytics signal on drop-off, or a note that it doesn't exist
5. A short "recommended tuning options" section listing 2–4 concrete candidate changes with effort estimate — **no recommendation to pick one**, just the menu of options for Mark to evaluate

Post findings in a comment on this task or as a brief summary in the PR. Mark and the specialist will then decide which changes to make and scope the implementation brief.

---

## Notes

- This is research only. No code changes in this task.
- The investigation should take no more than half a day. If the missions config system is significantly more complex than expected, flag it before going deep.
- The tutorial comparison (point 5) is a low-effort check — do not let it expand the scope.
